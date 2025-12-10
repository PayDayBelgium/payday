import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, Clock } from 'lucide-react';
import { getDaysSinceLastBackup } from '../../utils/backup';

export const BackupWarning: React.FC = () => {
  const [daysSinceBackup, setDaysSinceBackup] = useState<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Delay initial load to prevent flash
    const timer = setTimeout(() => {
      setDaysSinceBackup(getDaysSinceLastBackup());
      setIsLoaded(true);
    }, 500);

    // Listen for backup events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'payday-last-backup') {
        setDaysSinceBackup(getDaysSinceLastBackup());
      }
    };

    // Listen for custom backup event
    const handleBackupEvent = () => {
      setDaysSinceBackup(getDaysSinceLastBackup());
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('backup-created', handleBackupEvent);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('backup-created', handleBackupEvent);
    };
  }, []);

  // Don't show anything until loaded
  if (!isLoaded) {
    return null;
  }

  // Don't show if no backup has ever been made
  if (daysSinceBackup === null) {
    return (
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Nog geen backup gemaakt
            </h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
              Het is aan te raden om regelmatig een backup van je data te maken. Klik op je profielicoon rechtsboven om je eerste backup te maken.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Warning if more than 7 days
  if (daysSinceBackup > 7 && daysSinceBackup <= 30) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
              Backup Reminder
            </h3>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Your last backup was {daysSinceBackup} days ago. Consider creating a new backup to ensure your data is safe.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Alert if more than 30 days
  if (daysSinceBackup > 30) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-100">
              Backup Required!
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300 mt-1">
              Your last backup was {daysSinceBackup} days ago. Create a backup now to protect your trading data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // All good - don't show anything
  return null;
};
