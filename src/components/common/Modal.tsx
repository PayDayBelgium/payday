import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: ModalSize;
  /** Show close button in header */
  showCloseButton?: boolean;
  /** Close modal when clicking backdrop */
  closeOnBackdropClick?: boolean;
  /** Close modal when pressing Escape key */
  closeOnEscape?: boolean;
  /** Footer content (usually action buttons) */
  footer?: React.ReactNode;
  /** Additional class for the modal content */
  className?: string;
  /** Whether to show the backdrop blur effect */
  blur?: boolean;
  /**
   * Overrides the default width/size class (derived from `size`).
   * Useful for modals with a fixed width/height instead of a max-width.
   */
  sizeClassName?: string;
  /**
   * Overrides the default card styling (rounding/shadow/border).
   * Used when a different card shape is needed.
   */
  cardClassName?: string;
  /** Overrides the default padding wrapper around the children (defaults to `p-4`). */
  contentClassName?: string;
}

/** Default card styling (rounding, shadow, border, background). */
const defaultCardClassName =
  'bg-white dark:bg-trading-dark-800 rounded-lg shadow-xl border border-surface-line dark:border-trading-dark-600';

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-[90vw] max-h-[90vh]',
};

/**
 * A reusable modal component with consistent styling.
 * Supports various sizes, backdrop click, escape key closing, and optional header/footer.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  footer,
  className = '',
  blur = false,
  sizeClassName,
  cardClassName = defaultCardClassName,
  contentClassName = 'p-4',
}) => {
  // Handle escape key
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
        blur ? 'bg-black/50 backdrop-blur-sm' : 'bg-black/50'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`relative ${sizeClassName ?? `w-full ${sizeClasses[size]}`} ${cardClassName} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-surface-line dark:border-trading-dark-600">
            {title && (
              <h3 id="modal-title" className="text-lg font-semibold text-ink-900 dark:text-white">
                {title}
              </h3>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="p-2 text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className={contentClassName}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-line dark:border-trading-dark-600">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
