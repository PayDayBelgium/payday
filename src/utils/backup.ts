import type { RootState } from '../store';
import type { DomainEvent } from '../store/events/types';

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
