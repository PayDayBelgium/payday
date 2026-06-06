import React from 'react';
import { X, Redo2, HelpCircle } from 'lucide-react';

interface RollModalShellProps {
  /** Sluit de modal (gebruikt door backdrop, X-knop). */
  onClose: () => void;
  /** Titel in de header (bijv. "Roll Optie"). */
  title: string;
  /** Subtitel onder de titel; mag JSX bevatten voor ticker/strike-opmaak. */
  subtitle: React.ReactNode;
  /** Tailwind-classes voor de achtergrond van het icoon-vlak. */
  iconWrapperClassName: string;
  /** Tailwind-classes voor de kleur van het Redo2-icoon. */
  iconClassName: string;
  /** Max-width class van de card (bijv. "max-w-2xl"). */
  maxWidthClassName: string;
  /** Of de help-toggle getoond wordt. */
  showHelpToggle?: boolean;
  /** Callback voor de help-toggle. */
  onToggleHelp?: () => void;
  /** Title-attribuut (tooltip) voor de help-toggle. */
  helpToggleTitle?: string;
  /** Inhoud van de modal (help-sectie + form). */
  children: React.ReactNode;
}

/**
 * Herbruikbare shell voor de roll-modals: backdrop + card + header.
 * De kleuren, teksten en max-width worden volledig via props geparametriseerd
 * zodat elke modal zijn eigen uiterlijk behoudt.
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
        className={`relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full ${maxWidthClassName} mx-4 max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${iconWrapperClassName} rounded-lg`}>
              <Redo2 className={`w-5 h-5 ${iconClassName}`} />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showHelpToggle && (
              <button
                onClick={onToggleHelp}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                title={helpToggleTitle}
              >
                <HelpCircle className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
