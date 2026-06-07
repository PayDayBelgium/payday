import type { AppDispatch } from '../index';
import type { BackupData } from '../../utils/backup';
import { createEventStore } from '../events/eventStore';
import { replayEvents } from '../events/eventsSlice';

export const restoreFromBackup = (backup: BackupData) => async (dispatch: AppDispatch) => {
  const username = localStorage.getItem('payday-current-user') ?? undefined;
  const eventStore = createEventStore(username);

  // Atomic-ish restore: snapshot the current log first so a failed write (e.g. quota
  // exceeded, corrupted backup) can be rolled back instead of leaving an empty store.
  const previous = await eventStore.loadAll();
  try {
    await eventStore.clear();
    await eventStore.appendMany(backup.events);
  } catch (err) {
    try {
      await eventStore.clear();
      await eventStore.appendMany(previous);
    } catch {
      // best-effort rollback; surface the original error regardless
    }
    throw err;
  }

  dispatch(replayEvents(backup.events));
  return true;
};
