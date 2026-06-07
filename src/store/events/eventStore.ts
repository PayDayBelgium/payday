import { openDB, type IDBPDatabase } from 'idb';
import type { DomainEvent } from './types';

const STORE_NAME = 'events';

/**
 * Append-only IndexedDB event log, one record per event, keyed by `seq`.
 * One database per user keeps logs isolated (mirrors the per-user redux-persist key).
 */
export interface EventStore {
  appendMany(events: DomainEvent[]): Promise<void>;
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

  return {
    async appendMany(events) {
      if (events.length === 0) return;
      const db = await getDb();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      for (const e of events) {
        await tx.store.add(e);
      }
      await tx.done;
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
