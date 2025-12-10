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
  const bgColor = isWarning ? 'bg-orange-50 dark:bg-orange-900/20' : 'bg-white dark:bg-trading-dark-800';
  const borderColor = isWarning ? 'border-orange-200 dark:border-orange-500/50' : 'border-gray-200 dark:border-trading-dark-600';
  const iconBgColor = isWarning ? 'bg-orange-100 dark:bg-orange-500/20' : 'icon-bg-primary';
  const iconColor = isWarning ? 'text-orange-600 dark:text-orange-400' : 'icon-text-primary';

  // Alert tooltip state for portal-based rendering
  const [showAlertTooltip, setShowAlertTooltip] = useState(false);
  const [alertTooltipPosition, setAlertTooltipPosition] = useState({ top: 0, right: 0 });
  const alertIconRef = useRef<HTMLDivElement>(null);

  // Info tooltip state for portal-based rendering
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [infoTooltipPosition, setInfoTooltipPosition] = useState({ top: 0, right: 0 });
  const infoIconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showAlertTooltip && alertIconRef.current) {
      const rect = alertIconRef.current.getBoundingClientRect();
      setAlertTooltipPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showAlertTooltip]);

  useEffect(() => {
    if (showInfoTooltip && infoIconRef.current) {
      const rect = infoIconRef.current.getBoundingClientRect();
      setInfoTooltipPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, [showInfoTooltip]);

  const defaultAlertMessage = 'Kritiek: Je vrije cash is negatief. Dit betekent dat je meer collateral nodig hebt dan je beschikbare cash. Overweeg posities te sluiten of extra kapitaal toe te voegen.';

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4 hover:shadow-md transition-shadow relative`}>
      {showAlert && (
        <>
          <div
            ref={alertIconRef}
            className="absolute top-3 right-3 cursor-help"
            onMouseEnter={() => setShowAlertTooltip(true)}
            onMouseLeave={() => setShowAlertTooltip(false)}
          >
            <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400" />
          </div>
          {showAlertTooltip && createPortal(
            <div
              className="fixed w-72 p-3 bg-white dark:bg-gray-800 border-2 border-red-300 dark:border-red-700 rounded-lg shadow-xl z-[9999]"
              style={{ top: alertTooltipPosition.top, right: alertTooltipPosition.right }}
              onMouseEnter={() => setShowAlertTooltip(true)}
              onMouseLeave={() => setShowAlertTooltip(false)}
            >
              <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white dark:bg-gray-800 border-l border-t border-red-300 dark:border-red-700 transform rotate-45"></div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-red-600 dark:text-red-400 mb-1">Kritiek</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{alertMessage || defaultAlertMessage}</p>
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
            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          </div>
          {showInfoTooltip && createPortal(
            <div
              className="fixed w-64 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999]"
              style={{ top: infoTooltipPosition.top, right: infoTooltipPosition.right }}
              onMouseEnter={() => setShowInfoTooltip(true)}
              onMouseLeave={() => setShowInfoTooltip(false)}
            >
              <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white dark:bg-gray-800 border-l border-t border-gray-200 dark:border-gray-700 transform rotate-45"></div>
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Info</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300">{tooltip}</p>
                </div>
              </div>
            </div>,
            document.body
          )}
        </>
      )}
      <div className="flex items-start gap-3">
        <div className={`${iconBgColor} p-2.5 rounded-lg flex-shrink-0`}>
          <div className={iconColor}>{icon}</div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
          <p className={`text-2xl font-bold mb-0.5 ${valueClassName || 'text-gray-900 dark:text-white'}`}>{value}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500">{description}</p>
          {trend && trendValue && (
            <div
              className={`flex items-center gap-1 mt-1 text-xs font-medium ${
                trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}
            >
              {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trendValue}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
