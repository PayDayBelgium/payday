import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, TrendingDown, Info, AlertTriangle } from 'lucide-react';

interface StatCardProps {
  title: string;
  description: string | React.ReactNode;
  value: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down';
  trendValue?: string;
  variant?: 'default' | 'warning';
  tooltip?: string;
  valueClassName?: string;
  showAlert?: boolean;
  alertMessage?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  description,
  value,
  icon,
  trend,
  trendValue,
  variant = 'default',
  tooltip,
  valueClassName,
  showAlert,
  alertMessage,
}) => {
  const isWarning = variant === 'warning';

  const [showAlertTooltip, setShowAlertTooltip] = useState(false);
  const [alertTooltipPosition, setAlertTooltipPosition] = useState({ top: 0, right: 0 });
  const alertIconRef = useRef<HTMLDivElement>(null);

  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [infoTooltipPosition, setInfoTooltipPosition] = useState({ top: 0, right: 0 });
  const infoIconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showAlertTooltip && alertIconRef.current) {
      const rect = alertIconRef.current.getBoundingClientRect();
      setAlertTooltipPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
  }, [showAlertTooltip]);

  useEffect(() => {
    if (showInfoTooltip && infoIconRef.current) {
      const rect = infoIconRef.current.getBoundingClientRect();
      setInfoTooltipPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    }
  }, [showInfoTooltip]);

  const defaultAlertMessage =
    'Kritiek: Je vrije cash is negatief. Dit betekent dat je meer collateral nodig hebt dan je beschikbare cash. Overweeg posities te sluiten of extra kapitaal toe te voegen.';

  return (
    <div
      className={`relative surface-card surface-card-hover overflow-hidden ${isWarning ? 'border-caution-500/40 bg-caution-50/40 dark:bg-caution-50/5' : ''}`}
    >
      {/* Top hairline accent on warning */}
      {isWarning && (
        <span className="absolute inset-x-0 top-0 h-[2px] bg-caution-500" aria-hidden />
      )}

      {showAlert && (
        <>
          <div
            ref={alertIconRef}
            className="absolute top-3 right-3 cursor-help"
            onMouseEnter={() => setShowAlertTooltip(true)}
            onMouseLeave={() => setShowAlertTooltip(false)}
          >
            <AlertTriangle className="w-4 h-4 text-negative-500" strokeWidth={1.75} />
          </div>
          {showAlertTooltip &&
            createPortal(
              <div
                className="fixed w-72 p-3 bg-white dark:bg-trading-dark-800 border border-negative-500/40 rounded-lg shadow-xl z-[9999]"
                style={{ top: alertTooltipPosition.top, right: alertTooltipPosition.right }}
                onMouseEnter={() => setShowAlertTooltip(true)}
                onMouseLeave={() => setShowAlertTooltip(false)}
              >
                <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white dark:bg-trading-dark-800 border-l border-t border-negative-500/40 transform rotate-45"></div>
                <div className="flex items-start gap-2">
                  <AlertTriangle
                    className="w-4 h-4 text-negative-500 flex-shrink-0 mt-0.5"
                    strokeWidth={1.75}
                  />
                  <div>
                    <p className="font-semibold text-sm text-negative-600 mb-1">Kritiek</p>
                    <p className="text-xs text-ink-700 dark:text-ink-300">
                      {alertMessage || defaultAlertMessage}
                    </p>
                  </div>
                </div>
              </div>,
              document.body
            )}
        </>
      )}

      {tooltip && !showAlert && (
        <>
          <div
            ref={infoIconRef}
            className="absolute top-3 right-3 cursor-help"
            onMouseEnter={() => setShowInfoTooltip(true)}
            onMouseLeave={() => setShowInfoTooltip(false)}
          >
            <Info
              className="w-4 h-4 text-ink-400 hover:text-ink-700 transition-colors"
              strokeWidth={1.75}
            />
          </div>
          {showInfoTooltip &&
            createPortal(
              <div
                className="fixed w-64 p-3 bg-white dark:bg-trading-dark-800 border border-[var(--line)] rounded-lg shadow-xl z-[9999]"
                style={{ top: infoTooltipPosition.top, right: infoTooltipPosition.right }}
                onMouseEnter={() => setShowInfoTooltip(true)}
                onMouseLeave={() => setShowInfoTooltip(false)}
              >
                <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white dark:bg-trading-dark-800 border-l border-t border-[var(--line)] transform rotate-45"></div>
                <div className="flex items-start gap-2">
                  <Info
                    className="w-4 h-4 text-primary-700 flex-shrink-0 mt-0.5"
                    strokeWidth={1.75}
                  />
                  <div>
                    <p className="font-semibold text-sm text-ink-900 dark:text-white mb-1">Info</p>
                    <p className="text-xs text-ink-700 dark:text-ink-300">{tooltip}</p>
                  </div>
                </div>
              </div>,
              document.body
            )}
        </>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <p className="eyebrow text-ink-500">{title}</p>
          <div
            className={`w-9 h-9 rounded-md flex items-center justify-center ${isWarning ? 'bg-caution-50 text-caution-600' : 'bg-primary-50 text-primary-700 dark:text-primary-100'}`}
          >
            <div className="[&_svg]:w-[18px] [&_svg]:h-[18px]" style={{ strokeWidth: 1.75 }}>
              {icon}
            </div>
          </div>
        </div>

        <p
          className={`text-[1.5rem] leading-tight font-semibold tracking-tight tabular-nums mb-2 ${valueClassName || 'text-ink-900 dark:text-white'}`}
        >
          {value}
        </p>

        <div className="text-[11.5px] leading-relaxed text-ink-500 dark:text-ink-400 tabular-nums">
          {description}
        </div>

        {trend && trendValue && (
          <div
            className={`mt-3 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums ${
              trend === 'up'
                ? 'bg-positive-50 text-positive-600'
                : 'bg-negative-50 text-negative-600'
            }`}
          >
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trendValue}
          </div>
        )}
      </div>
    </div>
  );
};
