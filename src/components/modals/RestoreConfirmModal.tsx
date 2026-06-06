import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X, Upload } from 'lucide-react';

interface RestoreConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  timestamp: string;
}

export const RestoreConfirmModal: React.FC<RestoreConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  timestamp,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-line dark:border-trading-dark-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-caution-50 dark:bg-caution-600/25 rounded-lg">
              <Upload className="w-6 h-6 text-caution-600 dark:text-caution-500" />
            </div>
            <h2 className="text-xl font-bold text-ink-900 dark:text-white">
              {t('modalsB.restore.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-ink-500 dark:text-ink-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning */}
          <div className="bg-caution-50 dark:bg-caution-600/15 border border-caution-500/30 dark:border-caution-600/40 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-ink-900 dark:text-white mb-2">
                  {t('modalsB.restore.warningTitle')}
                </h3>
                <p className="text-sm text-ink-700 dark:text-ink-300">
                  {t('modalsB.restore.warningTextBefore')}
                  <strong>{t('modalsB.restore.warningTextStrong')}</strong>
                  {t('modalsB.restore.warningTextAfter')}
                </p>
              </div>
            </div>
          </div>

          {/* Backup Info */}
          <div className="bg-surface dark:bg-trading-dark-900/50 rounded-lg p-4 border border-surface-line dark:border-trading-dark-600">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-ink-600 dark:text-ink-400">
                  {t('modalsB.restore.backupDate')}
                </span>
                <span className="font-medium text-ink-900 dark:text-white">
                  {new Date(timestamp).toLocaleDateString('nl-NL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-ink-600 dark:text-ink-400">
                  {t('modalsB.restore.backupTime')}
                </span>
                <span className="font-medium text-ink-900 dark:text-white">
                  {new Date(timestamp).toLocaleTimeString('nl-NL', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Confirmation Question */}
          <div className="pt-2">
            <p className="text-sm text-ink-700 dark:text-ink-300 text-center">
              {t('modalsB.restore.confirmQuestion')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-surface-line dark:border-trading-dark-600 bg-surface dark:bg-trading-dark-900/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-ink-200 dark:border-trading-dark-500 text-ink-700 dark:text-ink-300 rounded-lg hover:bg-surface-subtle dark:hover:bg-trading-dark-700 transition-colors font-medium"
          >
            {t('modalsB.restore.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-caution-600 hover:bg-caution-600 text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
          >
            {t('modalsB.restore.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
};
