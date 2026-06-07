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

  const dbPromise = (): Promise<IDBPDatabase> =>
    openDB(dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'seq' });
        }
      },
    });

  return {
    async appendMany(events) {
      if (events.length === 0) return;
      const db = await dbPromise();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      for (const e of events) {
        await tx.store.add(e);
      }
      await tx.done;
    },
    async loadAll() {
      const db = await dbPromise();
      const all = (await db.getAll(STORE_NAME)) as DomainEvent[];
      return all.sort((a, b) => a.seq - b.seq);
    },
    async clear() {
      const db = await dbPromise();
      await db.clear(STORE_NAME);
    },
  };
}
