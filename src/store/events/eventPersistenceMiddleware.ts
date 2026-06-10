import type { Dispatch, Middleware } from '@reduxjs/toolkit';
import { appendEvents, seqSynced } from './eventsSlice';
import { addAlert } from '../slices/alertsSlice';
import i18n from '../../i18n/config';
import type { DomainEvent } from './types';
import type { AppendOutcome, EventStore } from './eventStore';

/** One extra attempt before alerting the user — transient IndexedDB errors happen. */
const TRANSIENT_RETRIES = 1;

/** Stable alert ids so repeated occurrences dedupe instead of stacking. */
const WRITE_FAILURE_ALERT_ID = 'event-log-write-failure';
const SEQ_CONFLICT_ALERT_ID = 'event-log-seq-conflict';

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
  // The retry try/catch wraps ONLY the write: if outcome handling below ever
  // threw, a catch around it would re-run appendMany for an already-persisted
  // batch and (after a conflict re-stamp) duplicate events in the durable log.
  let outcome: AppendOutcome | undefined;
  for (let attempt = 0; outcome === undefined; attempt++) {
    try {
      outcome = await eventStore.appendMany(events);
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

  if (outcome.conflictRecovered && outcome.events.length > 0) {
    const maxSeq = outcome.events[outcome.events.length - 1].seq;
    // Keep the next commit from re-using seqs another tab already claimed.
    dispatch(seqSynced(maxSeq));
    // Durable non-loss is guaranteed, but the in-memory projections of the
    // two tabs may have diverged — ask the user to reload this tab.
    dispatch(
      addAlert({
        id: SEQ_CONFLICT_ALERT_ID,
        positionId: '',
        ticker: 'PayDay',
        severity: 'warning',
        type: 'sync-conflict',
        message: i18n.t('alerts.eventLog.tabConflict'),
        actionable: true,
        suggestedAction: i18n.t('alerts.eventLog.tabConflictAction'),
      })
    );
  }
}
