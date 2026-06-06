import React from 'react';
import { X, Redo2, HelpCircle } from 'lucide-react';

interface RollModalShellProps {
  /** Closes the modal (used by backdrop, X button). */
  onClose: () => void;
  /** Title in the header (e.g. "Roll Optie"). */
  title: string;
  /** Subtitle below the title; may contain JSX for ticker/strike formatting. */
  subtitle: React.ReactNode;
  /** Tailwind classes for the background of the icon area. */
  iconWrapperClassName: string;
  /** Tailwind classes for the color of the Redo2 icon. */
  iconClassName: string;
  /** Max-width class of the card (e.g. "max-w-2xl"). */
  maxWidthClassName: string;
  /** Whether the help toggle is shown. */
  showHelpToggle?: boolean;
  /** Callback for the help toggle. */
  onToggleHelp?: () => void;
  /** Title attribute (tooltip) for the help toggle. */
  helpToggleTitle?: string;
  /** Content of the modal (help section + form). */
  children: React.ReactNode;
}

/**
 * Reusable shell for the roll modals: backdrop + card + header.
 * The colors, texts and max-width are fully parameterized via props
 * so each modal keeps its own appearance.
 */
export const RollModalShell: React.FC<RollModalShellProps> = ({
  onClose,
  title,
  subtitle,
  iconWrapperClassName,
  iconClassName,
  maxWidthClassName,
  showHelpToggle = false,
  onToggleHelp,
  helpToggleTitle,
  children,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        className={`relative bg-white dark:bg-trading-dark-800 rounded-lg shadow-xl w-full ${maxWidthClassName} mx-4 max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-line dark:border-trading-dark-600">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${iconWrapperClassName} rounded-lg`}>
              <Redo2 className={`w-5 h-5 ${iconClassName}`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-ink-900 dark:text-white">{title}</h2>
              <p className="text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showHelpToggle && (
              <button
                onClick={onToggleHelp}
                className="p-2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 rounded-lg hover:bg-surface-subtle dark:hover:bg-trading-dark-700"
                title={helpToggleTitle}
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
};
