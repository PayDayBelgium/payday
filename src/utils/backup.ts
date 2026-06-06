import type { RootState } from '../store';

export interface BackupData {
  version: string;
  timestamp: string;
  data: {
    portfolios: RootState['portfolios'];
    positions: RootState['positions'];
    todos: RootState['todos'];
    alerts: RootState['alerts'];
    journal: RootState['journal'];
    trades: RootState['trades'];
    rules: RootState['rules'];
    tickers?: RootState['tickers'];
    strategies?: RootState['strategies'];
  };
}

export const createBackup = (state: RootState): BackupData => {
  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    data: {
      portfolios: state.portfolios,
      positions: state.positions,
      todos: state.todos,
      alerts: state.alerts,
      journal: state.journal,
      trades: state.trades,
      rules: state.rules,
      tickers: state.tickers,
      strategies: state.strategies,
    },
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

        // Validate backup structure
        if (!backup.version || !backup.timestamp || !backup.data) {
          reject(new Error('Invalid backup file format'));
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
