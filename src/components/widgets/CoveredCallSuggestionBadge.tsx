import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CoveredCallSuggestionBadgeProps {
  /** Multi-line tooltip message describing the opportunity. */
  message: string;
  /** Called when the badge pill is clicked. Omit to render display-only. */
  onClick?: () => void;
}

/**
 * Shared pill badge that signals a covered-call write opportunity.
 * Manages its own hover state and renders a white tooltip card via createPortal,
 * identical in style to the StockRow opportunity tooltip (thin border, small arrow).
 * Avoids the dark bg-ink-900 wrapper that PortalTooltip adds in hover-mode.
 */
export const CoveredCallSuggestionBadge: React.FC<CoveredCallSuggestionBadgeProps> = ({
  message,
  onClick,
}) => {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const pillRef = useRef<HTMLButtonElement | HTMLDivElement | null>(null);

  useEffect(() => {
    if (showTooltip && pillRef.current) {
      const rect = pillRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [showTooltip]);

  const pillClass =
    'flex items-center gap-1 px-2 py-1 bg-positive-50 dark:bg-positive-700/25 ' +
    'text-positive-700 dark:text-positive-500 rounded-full text-xs font-medium ' +
    (onClick
      ? 'hover:bg-positive-100 dark:hover:bg-positive-700/40 transition-colors cursor-pointer'
      : '');

  const tooltip = showTooltip
    ? createPortal(
        <div
          className="fixed w-64 p-3 bg-white dark:bg-trading-dark-800 border border-positive-500/20 dark:border-positive-700/30 rounded-lg shadow-xl z-[9999]"
          style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          {/* Small arrow */}
          <div className="absolute -top-1.5 left-3 w-3 h-3 bg-white dark:bg-trading-dark-800 border-l border-t border-positive-500/20 dark:border-positive-700/30 transform rotate-45" />
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-positive-600 dark:text-positive-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm text-ink-900 dark:text-white mb-1">
                {t('widgetsA.opportunity')}
              </p>
              <p className="text-xs text-ink-600 dark:text-ink-300 whitespace-pre-line">
                {message}
              </p>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  const handlers = {
    onMouseEnter: () => setShowTooltip(true),
    onMouseLeave: () => setShowTooltip(false),
  };

  if (onClick) {
    return (
      <>
        <button
          ref={pillRef as React.RefObject<HTMLButtonElement>}
          data-testid="cc-suggestion-badge"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className={pillClass}
          {...handlers}
        >
          <Target className="w-3.5 h-3.5" />
        </button>
        {tooltip}
      </>
    );
  }

  return (
    <>
      <div
        ref={pillRef as React.RefObject<HTMLDivElement>}
        data-testid="cc-suggestion-badge"
        className={pillClass}
        {...handlers}
      >
        <Target className="w-3.5 h-3.5" />
      </div>
      {tooltip}
    </>
  );
};
