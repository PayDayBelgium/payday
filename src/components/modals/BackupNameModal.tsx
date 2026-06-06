import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Download } from 'lucide-react';

interface BackupNameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (filename: string) => void;
  defaultFilename: string;
}

export const BackupNameModal: React.FC<BackupNameModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  defaultFilename,
}) => {
  const { t } = useTranslation();
  const [filename, setFilename] = useState(defaultFilename);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFilename(defaultFilename);
      // Focus and select the input when modal opens
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, defaultFilename]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalFilename = filename.trim() || defaultFilename;
    // Remove any existing extension and add .payday
    if (finalFilename.endsWith('.json') || finalFilename.endsWith('.payday')) {
      finalFilename = finalFilename.replace(/\.(json|payday)$/, '');
    }
    finalFilename += '.payday';
    onConfirm(finalFilename);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-trading-dark-800 rounded-xl shadow-2xl max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <div className="border-b border-surface-line dark:border-trading-dark-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
              <Download className="w-5 h-5 text-primary-700 dark:text-primary-300" />
            </div>
            <h2 className="text-lg font-bold text-ink-900 dark:text-white">
              {t('modalsB.backup.title')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block mb-2 text-sm font-medium text-ink-900 dark:text-white">
              {t('modalsB.backup.filename')}
            </label>
            <input
              ref={inputRef}
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
              placeholder={defaultFilename}
            />
            <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
              {t('modalsB.backup.extensionHint')}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-surface-muted dark:bg-trading-dark-700 hover:bg-ink-200 dark:hover:bg-trading-dark-600 text-ink-700 dark:text-ink-200 rounded-lg font-medium transition-colors"
            >
              {t('modalsB.backup.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              {t('modalsB.backup.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
