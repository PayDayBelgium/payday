import i18n from '../i18n/config';
import type { RootState } from '../store';
import { DOMAIN_EVENT_TYPES, type DomainEvent } from '../store/events/types';

export interface BackupData {
  version: string; // '2.0.0'
  timestamp: string;
  // The event log IS the backup: the financial/data model is fully event-sourced, so
  // replaying these events reproduces all derived state. (Non-event-sourced slices like
  // userProgress/community/mentorship are session/learning state persisted by redux-persist
  // and are intentionally not part of the backup — matching the original backup's scope.)
  events: DomainEvent[];
}

export const createBackup = (state: RootState): BackupData => {
  return {
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    events: state.events.log,
  };
};

export const downloadBackup = (backup: BackupData, filename?: string) => {
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `payday-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const KNOWN_EVENT_TYPES = new Set<string>(DOMAIN_EVENT_TYPES);

/**
 * Validates one backup entry against the persisted DomainEvent envelope.
 * A backup file is untrusted input: anything restored here is replayed into
 * the event store and feeds every projection, so each event must have a
 * known type, an object payload and the full envelope the store stamps.
 */
export const isValidBackupEvent = (e: unknown): e is DomainEvent => {
  if (typeof e !== 'object' || e === null || Array.isArray(e)) return false;
  const ev = e as Record<string, unknown>;
  return (
    typeof ev.id === 'string' &&
    typeof ev.seq === 'number' &&
    Number.isInteger(ev.seq) &&
    ev.seq >= 0 &&
    typeof ev.type === 'string' &&
    KNOWN_EVENT_TYPES.has(ev.type) &&
    typeof ev.payload === 'object' &&
    ev.payload !== null &&
    !Array.isArray(ev.payload) &&
    typeof ev.timestamp === 'string' &&
    typeof ev.actor === 'string' &&
    typeof ev.schemaVersion === 'number'
  );
};

export const parseBackupFile = async (file: File): Promise<BackupData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const backup = JSON.parse(e.target?.result as string) as BackupData;

        // Validate v2 backup structure: must have an events array
        if (!backup.version || !backup.timestamp || !Array.isArray(backup.events)) {
          reject(
            new Error('This backup was created by an older version and can no longer be restored.')
          );
          return;
        }

        // Validate every event; one malformed event rejects the whole file
        // (restore is all-or-nothing, so we never replay a partial log).
        if (!backup.events.every(isValidBackupEvent)) {
          reject(new Error(i18n.t('header.backupInvalidEvents')));
          return;
        }

        resolve(backup);
      } catch {
        reject(new Error('Failed to parse backup file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read backup file'));
    reader.readAsText(file);
  });
};

export const saveLastBackupTimestamp = () => {
  localStorage.setItem('payday-last-backup', new Date().toISOString());
};

export const getLastBackupTimestamp = (): Date | null => {
  const timestamp = localStorage.getItem('payday-last-backup');
  return timestamp ? new Date(timestamp) : null;
};

export const getDaysSinceLastBackup = (): number | null => {
  const lastBackup = getLastBackupTimestamp();
  if (!lastBackup) return null;

  const now = new Date();
  const diffTime = Math.abs(now.getTime() - lastBackup.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};
