import React from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, AlertCircle, Target, X as XIcon, Redo2 } from 'lucide-react';
import type { Position, CallOption, PutOption } from '../../types';
import type { AlertItem } from '../../utils/alertEvaluator';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { calculateSpreadSummary } from '../../utils/positionHelpers';
import { AlertTooltipContent } from '../common/AlertTooltipContent';
import { PortalTooltip } from '../common/PortalTooltip';
import { POSITION_GRID_COLS } from './positionGrid';

/** Result of calculateSpreadSummary (non-null). */
type SpreadSummary = NonNullable<ReturnType<typeof calculateSpreadSummary>>;

interface SpreadSummaryRowProps {
  spread: { id: string; legs: Position[] };
  summary: SpreadSummary;
  isExpanded: boolean;
  currentStockPrice: number;
  priceDifference: number;
  spreadTickerData: { name?: string } | undefined;
  daysToExpiration: number;
  expiresWithinTwoWeeks: boolean;
  hasAlert: boolean;
  alertMessage: string;
  uniqueSpreadAlerts: AlertItem[];
  hasOpportunity: boolean;
  opportunityMessage: string;
  currencySymbol: string;
  spreadBorderColor: string;
  showTooltip: string | null;
  getTooltipRef: (id: string) => React.RefObject<HTMLDivElement | null>;
  onSetShowTooltip: (id: string | null) => void;
  onToggleSpread: (spreadId: string) => void;
  onViewSpread: (legs: Position[], currentStockPrice: number) => void;
  onRollSpread: (longLeg: CallOption | PutOption, shortLeg: CallOption | PutOption) => void;
  onCloseSpread: (firstLeg: Position) => void;
}

/**
 * Summary row for a spread (2 legs). Extracted from PortfolioView without
 * behavioral change; all derived values and callbacks come in via props.
 */
export const SpreadSummaryRow: React.FC<SpreadSummaryRowProps> = React.memo(
  ({
    spread,
    summary,
    isExpanded,
    currentStockPrice,
    priceDifference,
    spreadTickerData,
    daysToExpiration,
    expiresWithinTwoWeeks,
    hasAlert,
    alertMessage,
    uniqueSpreadAlerts,
    hasOpportunity,
    opportunityMessage,
    currencySymbol,
    spreadBorderColor,
    showTooltip,
    getTooltipRef,
    onSetShowTooltip,
    onToggleSpread,
    onViewSpread,
    onRollSpread,
    onCloseSpread,
  }) => {
    const { t } = useTranslation();
    return (
      <div
        className={`px-6 py-3 hover:bg-white dark:hover:bg-trading-dark-700/30 transition-colors border-b border-surface-line dark:border-trading-dark-600 bg-surface-subtle/30 dark:bg-trading-dark-700 border-l-4 ${spreadBorderColor}`}
      >
        <div className={`grid ${POSITION_GRID_COLS} gap-2 items-start`}>
          {/* Icon with expand/collapse indicator - clickable for expand */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSpread(spread.id);
            }}
            className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 bg-surface-muted dark:bg-trading-dark-600 text-ink-600 dark:text-ink-300 cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </div>
          {/* Rest of row - clickable to open editor */}
          <div
            onClick={() => {
              onViewSpread(spread.legs, currentStockPrice);
            }}
            className="contents cursor-pointer"
          >
            {/* Ticker with spread badges */}
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="text-sm font-bold text-ink-900 dark:text-white">
                  {summary.contracts}x {summary.ticker}
                </h4>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-surface-muted dark:bg-trading-dark-600 text-ink-700 dark:text-ink-300">
                  {summary.type.toUpperCase()} SPREAD
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                    summary.spreadType === 'credit'
                      ? 'bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500'
                      : 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  }`}
                >
                  {summary.spreadType === 'credit' ? 'CREDIT' : 'DEBIT'}
                </span>
                {hasAlert && (
                  <>
                    <div
                      ref={getTooltipRef(`spread-alert-${spread.id}`)}
                      onMouseEnter={() => onSetShowTooltip(`spread-alert-${spread.id}`)}
                      onMouseLeave={() => onSetShowTooltip(null)}
                      className="flex items-center gap-1 px-1.5 py-0.5 bg-caution-50 dark:bg-caution-600/25 rounded-full cursor-help"
                    >
                      <AlertCircle className="w-3 h-3 text-caution-600 dark:text-caution-500" />
                      <span className="text-[10px] font-semibold text-caution-600 dark:text-caution-500">
                        {uniqueSpreadAlerts.length || 1}
                      </span>
                    </div>
                    <PortalTooltip
                      triggerRef={getTooltipRef(`spread-alert-${spread.id}`)}
                      show={showTooltip === `spread-alert-${spread.id}`}
                    >
                      <div className="w-72 p-3 bg-white dark:bg-trading-dark-800 border border-caution-500/30 dark:border-caution-600/40 rounded-lg shadow-xl">
                        <AlertTooltipContent
                          items={
                            uniqueSpreadAlerts.length > 0
                              ? uniqueSpreadAlerts.map((a) => ({
                                  ticker: a.ticker,
                                  message: a.message,
                                }))
                              : [
                                  {
                                    ticker: summary.ticker,
                                    message: alertMessage,
                                  },
                                ]
                          }
                          type="alert"
                        />
                      </div>
                    </PortalTooltip>
                  </>
                )}
                {hasOpportunity && (
                  <>
                    <div
                      ref={getTooltipRef(`spread-opp-${spread.id}`)}
                      onMouseEnter={() => onSetShowTooltip(`spread-opp-${spread.id}`)}
                      onMouseLeave={() => onSetShowTooltip(null)}
                    >
                      <Target className="w-3.5 h-3.5 text-positive-600 dark:text-positive-500 cursor-help" />
                    </div>
                    <PortalTooltip
                      triggerRef={getTooltipRef(`spread-opp-${spread.id}`)}
                      show={showTooltip === `spread-opp-${spread.id}`}
                    >
                      <div className="w-72 p-3 bg-white dark:bg-trading-dark-800 border border-positive-500/20 dark:border-positive-700/30 rounded-lg shadow-xl">
                        <AlertTooltipContent
                          items={[
                            {
                              ticker: summary.ticker,
                              message: opportunityMessage,
                            },
                          ]}
                          type="opportunity"
                        />
                      </div>
                    </PortalTooltip>
                  </>
                )}
              </div>
              <p className="text-xs text-ink-500 dark:text-ink-400">
                {spreadTickerData?.name ||
                  t('widgetsA.width', { value: formatNumber(summary.spreadWidth, 2) })}
              </p>
            </div>

            {/* Expiration */}
            <div>
              <p className="text-sm font-medium text-ink-900 dark:text-white">
                {summary.expiration
                  ? new Date(summary.expiration).toLocaleDateString('nl-NL')
                  : 'N/A'}
              </p>
              <p
                className={`text-xs ${
                  daysToExpiration <= 7 && daysToExpiration > 0
                    ? 'text-negative-600 dark:text-negative-500 font-semibold'
                    : expiresWithinTwoWeeks
                      ? 'text-caution-500 dark:text-caution-500 font-semibold'
                      : 'text-ink-500 dark:text-ink-400'
                }`}
              >
                {daysToExpiration > 0
                  ? `${daysToExpiration}d`
                  : daysToExpiration === 0
                    ? t('widgetsA.today')
                    : t('widgetsA.expired')}
              </p>
            </div>

            {/* Strike Range - always show lowest first */}
            <div>
              <p className="text-sm font-semibold text-ink-900 dark:text-white">
                ${Math.min(summary.longStrike, summary.shortStrike)}-$
                {Math.max(summary.longStrike, summary.shortStrike)}
              </p>
            </div>

            {/* Stock price */}
            <div>
              {currentStockPrice > 0 ? (
                <p className="text-sm font-medium text-ink-700 dark:text-ink-300">
                  {formatCurrency(currentStockPrice, currencySymbol)}
                </p>
              ) : (
                <p className="text-sm text-ink-400 dark:text-ink-600">-</p>
              )}
            </div>

            {/* Difference (stock price - short strike) */}
            <div>
              {currentStockPrice > 0 ? (
                <p
                  className={`text-sm font-semibold ${(() => {
                    // Only show red for bad situations, otherwise neutral
                    // Call spread: positive difference is bad (stock above short strike)
                    // Put spread: negative difference is bad (stock below short strike)
                    const isCallSpread = summary.type === 'call';
                    const isBadForPosition = isCallSpread
                      ? priceDifference > 0
                      : priceDifference < 0;

                    if (isBadForPosition) return 'text-negative-600 dark:text-negative-500';
                    return 'text-ink-900 dark:text-white';
                  })()}`}
                >
                  {priceDifference > 0 ? '+' : ''}
                  {formatCurrency(priceDifference, currencySymbol)}
                </p>
              ) : (
                <p className="text-sm text-ink-400 dark:text-ink-600">-</p>
              )}
            </div>

            {/* Net Premium (Purchase) */}
            <div>
              {(() => {
                // Calculate per-contract premium: short - long
                const shortLegPremium = spread.legs.find(
                  (l) => (l as CallOption | PutOption).action === 'sell'
                ) as CallOption | PutOption;
                const longLegPremium = spread.legs.find(
                  (l) => (l as CallOption | PutOption).action === 'buy'
                ) as CallOption | PutOption;
                const netPremiumPerContract = shortLegPremium.premium - longLegPremium.premium;

                return (
                  <>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">
                      {formatCurrency(netPremiumPerContract, currencySymbol)}
                    </p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      {formatCurrency(Math.abs(summary.netPremium), currencySymbol)}
                    </p>
                  </>
                );
              })()}
            </div>

            {/* Current Value */}
            <div>
              {(() => {
                // Calculate per-contract value: short - long for current value
                const shortLegData = spread.legs.find(
                  (l) => (l as CallOption | PutOption).action === 'sell'
                ) as CallOption | PutOption;
                const longLegData = spread.legs.find(
                  (l) => (l as CallOption | PutOption).action === 'buy'
                ) as CallOption | PutOption;
                const shortPerContract =
                  Math.abs(shortLegData.currentValue) / (shortLegData.contracts * 100);
                const longPerContract =
                  Math.abs(longLegData.currentValue) / (longLegData.contracts * 100);
                const netPerContract = shortPerContract - longPerContract;

                return (
                  <>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">
                      {formatCurrency(netPerContract, currencySymbol)}
                    </p>
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      {formatCurrency(Math.abs(summary.totalCurrentValue), currencySymbol)}
                    </p>
                  </>
                );
              })()}
            </div>

            {/* P&L */}
            <div>
              <p
                className={`text-sm font-bold ${
                  summary.totalPnL > 0
                    ? 'text-positive-600 dark:text-positive-500'
                    : summary.totalPnL < 0
                      ? 'text-negative-600 dark:text-negative-500'
                      : 'text-ink-900 dark:text-white'
                }`}
              >
                {summary.totalPnL > 0 ? '+' : ''}
                {formatCurrency(summary.totalPnL, currencySymbol)}
              </p>
              <p
                className={`text-xs font-medium ${
                  summary.totalPnL > 0
                    ? 'text-positive-600 dark:text-positive-500'
                    : summary.totalPnL < 0
                      ? 'text-negative-600 dark:text-negative-500'
                      : 'text-ink-900 dark:text-white'
                }`}
              >
                {summary.totalPnL > 0 ? '+' : ''}
                {formatNumber((summary.totalPnL / Math.abs(summary.totalCostBasis)) * 100)}%
              </p>
            </div>

            {/* Collateral */}
            <div>
              {(() => {
                // Determine if this is a credit or debit spread
                // Credit spread: short strike > long strike (for puts), short strike < long strike (for calls)
                const isCredit =
                  summary.type === 'put'
                    ? summary.shortStrike > summary.longStrike
                    : summary.shortStrike < summary.longStrike;

                if (isCredit) {
                  // Credit spread - collateral is max loss (spread width × 100 × contracts)
                  const spreadWidth = Math.abs(summary.shortStrike - summary.longStrike);
                  const contracts = spread.legs[0]
                    ? (spread.legs[0] as CallOption | PutOption).contracts
                    : 1;
                  const maxLoss = spreadWidth * 100 * contracts;

                  return (
                    <>
                      <p className="text-sm font-semibold text-caution-600 dark:text-caution-500">
                        Cash
                      </p>
                      <p className="text-xs text-ink-500 dark:text-ink-400">
                        {formatCurrency(maxLoss, currencySymbol)}
                      </p>
                    </>
                  );
                } else {
                  // Debit spread - no collateral needed
                  return <p className="text-sm text-ink-400 dark:text-ink-600">-</p>;
                }
              })()}
            </div>
          </div>{' '}
          {/* Close "contents" wrapper for clickable row */}
          {/* Spacer */}
          <div></div>
          {/* Action buttons - outside the clickable area */}
          <div className="flex justify-end gap-1 pt-0.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Roll both legs of the spread
                const longLeg = spread.legs.find(
                  (leg) => (leg as CallOption | PutOption).action === 'buy'
                ) as CallOption | PutOption | undefined;
                const shortLeg = spread.legs.find(
                  (leg) => (leg as CallOption | PutOption).action === 'sell'
                ) as CallOption | PutOption | undefined;
                if (longLeg && shortLeg) {
                  onRollSpread(longLeg, shortLeg);
                }
              }}
              className="p-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/25 text-primary-700 dark:text-primary-300 rounded"
              title={t('widgetsA.rollSpread')}
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Close both legs - we'll set the first leg as the position to close
                // and handle the second leg in the modal
                onCloseSpread(spread.legs[0]);
              }}
              className="p-1.5 hover:bg-negative-50 dark:hover:bg-negative-700/25 text-negative-600 dark:text-negative-500 rounded"
              title={t('widgetsA.closeSpread')}
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>{' '}
        {/* Close grid */}
      </div>
    );
  }
);

SpreadSummaryRow.displayName = 'SpreadSummaryRow';
