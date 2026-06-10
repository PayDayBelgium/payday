import { openDB, type IDBPDatabase } from 'idb';
import type { DomainEvent } from './types';

const STORE_NAME = 'events';

/** Bounded retries when another tab claimed our seq numbers (multi-tab race). */
const MAX_SEQ_CONFLICT_RETRIES = 3;

/**
 * True when an IndexedDB failure looks like a `seq` key conflict (another tab
 * wrote events with the same seq first). The error can surface on the `add()`
 * request itself (ConstraintError) or — because a failed request aborts the
 * whole transaction — on `tx.done` as an AbortError, so both count. Retrying
 * with re-stamped seqs is safe even for an AbortError with a different root
 * cause: the retry is bounded and the final error still propagates.
 */
export function isSeqConflictError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const name = (error as { name?: unknown }).name;
  return name === 'ConstraintError' || name === 'AbortError';
}

export interface AppendOutcome {
  /** The events as durably written — seqs may have been re-stamped on conflict. */
  events: DomainEvent[];
  /** True when a multi-tab seq conflict was detected and recovered from. */
  conflictRecovered: boolean;
}

/**
 * Append-only IndexedDB event log, one record per event, keyed by `seq`.
 * One database per user keeps logs isolated (mirrors the per-user redux-persist key).
 */
export interface EventStore {
  appendMany(events: DomainEvent[]): Promise<AppendOutcome>;
  loadAll(): Promise<DomainEvent[]>;
  clear(): Promise<void>;
}

export function createEventStore(username?: string): EventStore {
  const dbName = `payday-events-${username ?? 'root'}`;

  // Open the DB once per store instance and reuse the connection across calls.
  let dbPromise: Promise<IDBPDatabase> | null = null;
  const getDb = (): Promise<IDBPDatabase> => {
    if (!dbPromise) {
      dbPromise = openDB(dbName, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'seq' });
          }
        },
      });
    }
    return dbPromise;
  };

  /** Write one batch in a single all-or-nothing transaction. */
  const writeBatch = async (events: DomainEvent[]): Promise<void> => {
    const db = await getDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    try {
      for (const e of events) {
        await tx.store.add(e);
      }
      await tx.done;
    } catch (error) {
      // Let the (aborted) transaction fully settle before the caller retries,
      // and surface the original error — usually a ConstraintError — rather
      // than the follow-up AbortError from tx.done.
      await tx.done.catch(() => undefined);
      throw error;
    }
  };

  /** Highest seq currently in the durable log, or -1 when the log is empty. */
  const readMaxSeq = async (): Promise<number> => {
    const db = await getDb();
    const cursor = await db.transaction(STORE_NAME).store.openCursor(null, 'prev');
    return cursor ? (cursor.value as DomainEvent).seq : -1;
  };

  /**
   * Serialize writers across tabs via the Web Locks API so concurrent commits
   * queue up instead of racing into seq conflicts. The conflict recovery in
   * appendMany still covers browsers without the API (and pre-lock races).
   *
   * ORDERING INVARIANT: appendMany must reach this lock request synchronously
   * (no awaits between the middleware's call and navigator.locks.request).
   * Web Locks grants same-mode requests FIFO, so same-tab batches enter the
   * queue in dispatch order — that is what keeps the durable log an ordered
   * prefix of what the user did. Adding an await before the lock request
   * would silently break that ordering.
   */
  const withWriteLock = <T>(fn: () => Promise<T>): Promise<T> => {
    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(dbName, fn) as Promise<T>;
    }
    return fn();
  };

  return {
    async appendMany(events) {
      if (events.length === 0) return { events, conflictRecovered: false };
      return withWriteLock(async () => {
        let batch = events;
        let conflictRecovered = false;
        for (let attempt = 0; ; attempt++) {
          try {
            await writeBatch(batch);
            return { events: batch, conflictRecovered };
          } catch (error) {
            if (!isSeqConflictError(error) || attempt >= MAX_SEQ_CONFLICT_RETRIES) {
              throw error;
            }
            // Another tab wrote events with our seq numbers. Dropping the batch
            // would silently lose the user's change, so re-stamp it after the
            // current durable max and try again.
            const maxSeq = await readMaxSeq();
            batch = batch.map((e, i) => ({ ...e, seq: maxSeq + 1 + i }));
            conflictRecovered = true;
          }
        }
      });
    },
    async loadAll() {
      const db = await getDb();
      const all = (await db.getAll(STORE_NAME)) as DomainEvent[];
      return all.sort((a, b) => a.seq - b.seq);
    },
    async clear() {
      const db = await getDb();
      await db.clear(STORE_NAME);
    },
  };
}
