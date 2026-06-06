import React, { useState } from 'react';
import { AlertCircle, CheckCircle, Target, X } from 'lucide-react';
import type { StockPosition, PriceAlert, Portfolio } from '../../types';
import { formatCurrency } from '../../utils/currencyHelpers';
import { formatNumber } from '../../utils/numberFormat';
import { ConfirmModal } from '../modals/ConfirmModal';

export interface StrategyAlert {
  id: string;
  message: string;
  category: 'alert' | 'opportunity';
}

interface StockETFCardProps {
  position: StockPosition;
  alerts?: PriceAlert[];
  strategyAlerts?: StrategyAlert[];
  allPortfolios: Portfolio[];
  onCardClick?: () => void;
  onEdit?: (position: StockPosition) => void;
  onDismissStrategyAlert?: (alertId: string) => void;
  /** Covered-call eligibility for the whole ticker group; overrides per-lot calc when provided. */
  canWriteCoveredCallsOverride?: boolean;
}

export const StockETFCard: React.FC<StockETFCardProps> = ({
  position,
  alerts = [],
  strategyAlerts = [],
  allPortfolios,
  onCardClick,
  onEdit,
  onDismissStrategyAlert,
  canWriteCoveredCallsOverride,
}) => {
  const [confirmDismiss, setConfirmDismiss] = useState<{
    isOpen: boolean;
    alertId: string | null;
    message: string;
  }>({
    isOpen: false,
    alertId: null,
    message: '',
  });

  // Calculate metrics
  const profitLoss = position.currentValue - position.costBasis;
  const profitLossPercentage = position.costBasis > 0 ? (profitLoss / position.costBasis) * 100 : 0;
  const isProfit = profitLoss >= 0;

  // Determine if covered calls can be written
  const minShares = position.miniContractsSupported ? 10 : 100;
  const canWriteCoveredCalls =
    canWriteCoveredCallsOverride ?? (position.shares >= minShares && position.optionsSupported);

  // Count unread alerts and separate by type
  const unreadAlerts = alerts.filter((a) => !a.isRead);
  const ruleAlerts = strategyAlerts.filter((a) => a.category === 'alert');
  const ruleOpportunities = strategyAlerts.filter((a) => a.category === 'opportunity');

  const handleDismissAlert = (e: React.MouseEvent, alertId: string, message: string) => {
    e.stopPropagation();
    setConfirmDismiss({ isOpen: true, alertId, message });
  };

  const confirmDismissAlert = () => {
    if (confirmDismiss.alertId && onDismissStrategyAlert) {
      onDismissStrategyAlert(confirmDismiss.alertId);
    }
    setConfirmDismiss({ isOpen: false, alertId: null, message: '' });
  };

  return (
    <div
      onClick={onEdit ? () => onEdit(position) : onCardClick}
      className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:shadow-md transition-all ${
        onEdit || onCardClick
          ? 'cursor-pointer hover:border-primary-400 dark:hover:border-primary-500'
          : ''
      }`}
    >
      {/* Header with P&L on the right */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{position.ticker}</h3>
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                position.type === 'etf'
                  ? 'bg-surface-muted dark:bg-trading-dark-600 text-ink-700 dark:text-ink-300'
                  : 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
              }`}
            >
              {position.type === 'etf' ? 'ETF' : 'Stock'}
            </span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {position.shares} shares @ {formatCurrency(position.purchasePrice, allPortfolios)}
          </p>
        </div>

        {/* P&L Display - Top Right */}
        <div className="text-right">
          <p
            className={`text-lg font-bold ${
              isProfit
                ? 'text-positive-600 dark:text-positive-500'
                : 'text-negative-600 dark:text-negative-500'
            }`}
          >
            {isProfit ? '+' : ''}
            {formatCurrency(Math.abs(profitLoss), allPortfolios)}
          </p>
          <p
            className={`text-sm font-medium ${
              isProfit
                ? 'text-positive-600 dark:text-positive-500'
                : 'text-negative-600 dark:text-negative-500'
            }`}
          >
            {isProfit ? '+' : ''}
            {formatNumber(profitLossPercentage, 2)}%
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* Cost Basis */}
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cost Basis</p>
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {formatCurrency(position.costBasis, allPortfolios)}
          </p>
        </div>

        {/* Current Value */}
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Value</p>
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {formatCurrency(position.currentValue, allPortfolios)}
          </p>
        </div>

        {/* Current Price */}
        <div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Price</p>
          <p className="text-base font-semibold text-gray-900 dark:text-white">
            {formatCurrency(position.currentPrice, allPortfolios)}
          </p>
        </div>
      </div>

      {/* Badges at Bottom */}
      {(unreadAlerts.length > 0 ||
        ruleAlerts.length > 0 ||
        ruleOpportunities.length > 0 ||
        canWriteCoveredCalls) && (
        <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          {/* Price Alerts Indicator */}
          {unreadAlerts.length > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-1 bg-negative-50 dark:bg-negative-700/25 text-negative-700 dark:text-negative-500 rounded-full text-xs font-medium"
              title="Prijs waarschuwingen - De prijs is significant veranderd"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {unreadAlerts.length}
            </div>
          )}

          {/* Rule-based Alerts */}
          {ruleAlerts.length > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-1 bg-caution-50 dark:bg-caution-600/25 text-caution-600 dark:text-caution-500 rounded-full text-xs font-medium"
              title="Waarschuwingen - Regels die aandacht vereisen"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              {ruleAlerts.length}
            </div>
          )}

          {/* Rule-based Opportunities */}
          {ruleOpportunities.length > 0 && (
            <div
              className="flex items-center gap-1 px-2 py-1 bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500 rounded-full text-xs font-medium"
              title="Kansen - Mogelijkheden om te handelen"
            >
              <Target className="w-3.5 h-3.5" />
              {ruleOpportunities.length}
            </div>
          )}

          {/* Covered Call Opportunity Badge */}
          {canWriteCoveredCalls && (
            <div
              className="flex items-center gap-1 px-2 py-1 bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500 rounded-full text-xs font-medium"
              title="Covered Calls mogelijk - Voldoende aandelen om covered calls te schrijven"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Covered Call
            </div>
          )}
        </div>
      )}

      {/* Alerts Display */}
      {(unreadAlerts.length > 0 || strategyAlerts.length > 0) && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {/* Price Alerts */}
          {unreadAlerts.slice(0, 2).map((alert) => (
            <div
              key={alert.id}
              className="flex items-start gap-2 p-2 bg-negative-50 dark:bg-negative-700/15 border border-negative-500/20 dark:border-negative-700/30 rounded text-xs"
            >
              <AlertCircle className="w-3.5 h-3.5 text-negative-600 dark:text-negative-500 mt-0.5 flex-shrink-0" />
              <p className="text-negative-700 dark:text-negative-500 flex-1">{alert.message}</p>
            </div>
          ))}

          {/* Strategy Alerts */}
          {strategyAlerts.map((alert) => {
            const isAlert = alert.category === 'alert';
            const Icon = isAlert ? AlertCircle : Target;
            const bgColor = isAlert
              ? 'bg-caution-50 dark:bg-caution-600/15'
              : 'bg-positive-50 dark:bg-positive-700/15';
            const borderColor = isAlert
              ? 'border-caution-500/30 dark:border-caution-600/40'
              : 'border-positive-500/20 dark:border-positive-700/30';
            const iconColor = isAlert
              ? 'text-caution-600 dark:text-caution-500'
              : 'text-positive-600 dark:text-positive-500';
            const textColor = isAlert
              ? 'text-caution-600 dark:text-amber-200'
              : 'text-positive-700 dark:text-positive-500';

            return (
              <div
                key={alert.id}
                className={`relative flex items-start gap-2 p-2 pr-8 ${bgColor} border ${borderColor} rounded text-xs`}
              >
                <Icon className={`w-3.5 h-3.5 ${iconColor} mt-0.5 flex-shrink-0`} />
                <p className={`${textColor} flex-1`}>{alert.message}</p>
                {onDismissStrategyAlert && (
                  <button
                    onClick={(e) => handleDismissAlert(e, alert.id, alert.message)}
                    className="absolute top-1.5 right-1.5 p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    title="Sluiten"
                  >
                    <X className="w-3 h-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  </button>
                )}
              </div>
            );
          })}

          {unreadAlerts.length > 2 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              +{unreadAlerts.length - 2} more price alert{unreadAlerts.length - 2 !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}

      {/* Confirm Dismiss Modal */}
      {confirmDismiss.isOpen && (
        <ConfirmModal
          isOpen={confirmDismiss.isOpen}
          onClose={() => setConfirmDismiss({ isOpen: false, alertId: null, message: '' })}
          onConfirm={confirmDismissAlert}
          title="Alert Verwijderen"
          message={`Weet je zeker dat je deze alert wilt sluiten?\n\n"${confirmDismiss.message}"\n\nDeze komt niet meer terug.`}
          confirmText="Verwijderen"
          cancelText="Annuleren"
          variant="danger"
        />
      )}
    </div>
  );
};
