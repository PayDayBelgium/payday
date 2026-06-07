import type { Store } from '@reduxjs/toolkit';
import { replayEvents } from './eventsSlice';
import type { EventStore } from './eventStore';

/**
 * Load the full persisted event log and replay it into the projections.
 * Call once at startup, before rendering the app.
 */
export async function bootstrapFromEventStore(
  store: Pick<Store, 'dispatch'>,
  eventStore: EventStore
): Promise<void> {
  const events = await eventStore.loadAll();
  store.dispatch(replayEvents(events));
}
