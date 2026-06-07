import type { AppDispatch } from '../index';
import type { BackupData } from '../../utils/backup';
import { createEventStore } from '../events/eventStore';
import { replayEvents } from '../events/eventsSlice';

export const restoreFromBackup = (backup: BackupData) => async (dispatch: AppDispatch) => {
  const username = localStorage.getItem('payday-current-user') ?? undefined;
  const eventStore = createEventStore(username);
  await eventStore.clear();
  await eventStore.appendMany(backup.events);
  dispatch(replayEvents(backup.events));
  // userProgress, community, and mentorship are persisted via redux-persist and have
  // no explicit hydrate reducers — leave them as-is; the page reload that follows
  // restore will re-hydrate them from the persisted store.
  return true;
};
