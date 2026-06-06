import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from '../common/Modal';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  /** Called when dialog is closed (cancel button or backdrop click) */
  onClose: () => void;
  /** @deprecated Use onClose instead */
  onCancel?: () => void;
  variant?: 'danger' | 'warning' | 'info';
  /** Visual style of the dialog */
  style?: 'header' | 'icon';
}

const variantStyles = {
  danger: {
    headerBg: 'bg-negative-50 dark:bg-negative-700/15',
    headerBorder: 'border-negative-500/20 dark:border-negative-700/40',
    iconColor: 'text-negative-600 dark:text-negative-500',
    iconBg: 'bg-negative-50 dark:bg-negative-700/25',
    button: 'bg-negative-600 hover:bg-negative-700 text-white',
  },
  warning: {
    headerBg: 'bg-caution-50 dark:bg-caution-600/15',
    headerBorder: 'border-caution-500/30 dark:border-caution-600/40',
    iconColor: 'text-caution-600 dark:text-caution-500',
    iconBg: 'bg-caution-50 dark:bg-caution-600/25',
    button: 'bg-caution-600 hover:bg-caution-500 text-white',
  },
  info: {
    headerBg: 'bg-primary-50 dark:bg-primary-900/20',
    headerBorder: 'border-primary-200 dark:border-primary-800',
    iconColor: 'text-primary-700 dark:text-primary-300',
    iconBg: 'bg-primary-100 dark:bg-primary-900/30',
    button: 'bg-primary-700 hover:bg-primary-800 text-white',
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Annuleren',
  onConfirm,
  onClose,
  onCancel,
  variant = 'danger',
  style = 'icon',
}) => {
  const handleClose = () => {
    // Support both onClose and legacy onCancel
    if (onClose) {
      onClose();
    } else if (onCancel) {
      onCancel();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    // Auto-close after confirm for consistency
    handleClose();
  };

  const styles = variantStyles[variant];

  // Icon style (default) - centered icon with rounded background
  if (style === 'icon') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        showCloseButton={false}
        // Identiek aan het origineel: wel sluiten via backdrop-klik, niet via Escape.
        closeOnEscape={false}
        size="md"
        contentClassName="p-6"
      >
        {/* Icon */}
        <div className={`inline-flex p-3 rounded-full mb-4 ${styles.iconBg}`}>
          <AlertTriangle className={`w-6 h-6 ${styles.iconColor}`} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">{title}</h3>

        {/* Message */}
        <p className="text-sm text-ink-600 dark:text-ink-400 mb-6">{message}</p>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-surface-muted dark:bg-trading-dark-700 hover:bg-ink-200 dark:hover:bg-trading-dark-600 text-ink-900 dark:text-white rounded-lg font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            className={`px-4 py-2 ${styles.button} rounded-lg font-medium transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </Modal>
    );
  }

  // Header style - colored header with icon
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      showCloseButton={false}
      blur
      // Identiek aan het origineel: wel sluiten via backdrop-klik, niet via Escape.
      closeOnEscape={false}
      size="md"
      cardClassName="bg-white dark:bg-trading-dark-800 rounded-lg shadow-2xl overflow-hidden border border-surface-line dark:border-trading-dark-600"
      // De secties brengen hun eigen padding mee; geen extra content-wrapper.
      contentClassName=""
    >
      {/* Header with colored background */}
      <div className={`${styles.headerBg} border-b ${styles.headerBorder} p-6`}>
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 ${styles.iconColor}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-ink-900 dark:text-white">{title}</h3>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <p className="text-ink-700 dark:text-ink-300 text-sm leading-relaxed">{message}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 p-6 pt-0">
        <button
          onClick={handleClose}
          className="px-4 py-2 text-sm font-medium text-ink-700 dark:text-ink-300 bg-surface-subtle dark:bg-trading-dark-700 hover:bg-surface-muted dark:hover:bg-trading-dark-600 rounded-lg transition-colors"
        >
          {cancelText}
        </button>
        <button
          onClick={handleConfirm}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${styles.button}`}
        >
          {confirmText}
        </button>
      </div>
    </Modal>
  );
};

// Export ConfirmModal as an alias for backwards compatibility
export const ConfirmModal = ConfirmDialog;
