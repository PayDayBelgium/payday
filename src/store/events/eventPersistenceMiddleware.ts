import type { Middleware } from '@reduxjs/toolkit';
import { appendEvents } from './eventsSlice';
import type { EventStore } from './eventStore';

/**
 * Persists every committed event to the IndexedDB event store.
 * Listens to the `appendEvents` action (runtime commits only — `replayEvents`
 * comes FROM storage, so it is intentionally not re-persisted).
 */
export const createEventPersistenceMiddleware = (eventStore: EventStore): Middleware => {
  return () => (next) => (action) => {
    const result = next(action);
    if (appendEvents.match(action)) {
      void eventStore.appendMany(action.payload.events);
    }
    return result;
  };
};
