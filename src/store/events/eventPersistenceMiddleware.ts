import type { Dispatch, Middleware } from '@reduxjs/toolkit';
import { appendEvents } from './eventsSlice';
import { addAlert } from '../slices/alertsSlice';
import i18n from '../../i18n/config';
import type { DomainEvent } from './types';
import type { EventStore } from './eventStore';

/** One extra attempt before alerting the user — transient IndexedDB errors happen. */
const TRANSIENT_RETRIES = 1;

/** Stable alert id so repeated failures update/dedupe instead of stacking. */
const WRITE_FAILURE_ALERT_ID = 'event-log-write-failure';

/**
 * Persists every committed event to the IndexedDB event store.
 * Listens to the `appendEvents` action (runtime commits only — `replayEvents`
 * comes FROM storage, so it is intentionally not re-persisted).
 *
 * The IndexedDB log is the ONLY durable storage for this data: redux state is
 * rebuilt from it on every boot. A swallowed write failure therefore means the
 * change silently disappears on the next reload, so failures are surfaced as a
 * critical user-visible alert instead.
 */
export const createEventPersistenceMiddleware = (eventStore: EventStore): Middleware => {
  return ({ dispatch }) =>
    (next) =>
    (action) => {
      const result = next(action);
      if (appendEvents.match(action)) {
        // Fire-and-forget by design: the reducer path must never block on
        // IndexedDB. Failures are handled (and surfaced) inside persistEvents.
        void persistEvents(eventStore, action.payload.events, dispatch);
      }
      return result;
    };
};

async function persistEvents(
  eventStore: EventStore,
  events: DomainEvent[],
  dispatch: Dispatch
): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await eventStore.appendMany(events);
      return;
    } catch (error) {
      if (attempt < TRANSIENT_RETRIES) continue; // single retry for transient IDB hiccups
      // The events now exist in redux memory but NOT in the durable log —
      // without this the change would vanish silently on the next reload.
      console.error('[events] failed to persist committed events to the event log', error);
      dispatch(
        addAlert({
          id: WRITE_FAILURE_ALERT_ID,
          positionId: '',
          ticker: 'PayDay',
          severity: 'critical',
          type: 'persistence-failure',
          message: i18n.t('alerts.eventLog.writeFailed'),
          actionable: true,
          suggestedAction: i18n.t('alerts.eventLog.writeFailedAction'),
        })
      );
      return;
    }
  }
}
