import React, { useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CallOption, PutOption, Portfolio, Ticker } from '../../types';
import { formatCurrency } from '../../utils/numberFormat';
import { OptionRow } from './OptionRow';
import { CoveredCallSuggestionBadge } from './CoveredCallSuggestionBadge';
import type { LeapsGroup } from '../../utils/positionHelpers';

// Re-export so existing imports from this module continue to work.
export type { LeapsGroup };

interface GroupedLeapsListProps {
  groups: LeapsGroup[];
  allPortfolios: Portfolio[];
  currency: string;
  tickers: Ticker[];
  /** Map of position ID → whether it has an opportunity (from the central evaluator). */
  positionHasOpportunity?: Map<string, boolean>;
  /** Map of position ID → opportunity message. */
  positionOpportunityMessage?: Map<string, string>;
  /** Map of position ID → whether it has an alert. */
  positionHasAlert?: Map<string, boolean>;
  /** Map of position ID → alert message. */
  positionAlertMessage?: Map<string, string>;
  onView?: (position: CallOption | PutOption) => void;
  onRoll?: (position: CallOption | PutOption) => void;
  onClose?: (position: CallOption | PutOption) => void;
  onAssign?: (position: CallOption | PutOption) => void;
  /** Opens a pre-filled covered-call wizard for the LEAPS' ticker (PMCC short call). */
  onWriteCoveredCall?: (ticker: string) => void;
  /** Currency symbol for formatting amounts. */
  currencySymbol: string;
}

/**
 * Renders LEAPS positions grouped by ticker, with assigned short calls nested
 * underneath each LEAPS card (PMCC pattern). Visual design mirrors GroupedStockList.
 */
export const GroupedLeapsList: React.FC<GroupedLeapsListProps> = ({
  groups,
  allPortfolios: _allPortfolios,
  tickers,
  positionHasOpportunity,
  positionOpportunityMessage,
  positionHasAlert,
  positionAlertMessage,
  onView,
  onRoll,
  onClose,
  onAssign,
  onWriteCoveredCall,
  currencySymbol,
}) => {
  const { t } = useTranslation();
  const [expandedLeaps, setExpandedLeaps] = useState<Set<string>>(new Set());

  const toggleExpanded = (leapId: string) => {
    setExpandedLeaps((prev) => {
      const next = new Set(prev);
      if (next.has(leapId)) {
        next.delete(leapId);
      } else {
        next.add(leapId);
      }
      return next;
    });
  };

  if (groups.length === 0) return null;

  return (
    <div className="space-y-3">
      {groups.map(({ leap, assigned, currentPrice }) => {
        const isExpanded = expandedLeaps.has(leap.id);
        const tickerData = tickers.find(
          (tk) => tk.symbol.toUpperCase() === leap.ticker.toUpperCase()
        );
        const stockPrice = tickerData?.currentPrice ?? currentPrice;
        const dteMs =
          leap.expiration ? new Date(leap.expiration).getTime() - Date.now() : 0;
        const dteDays = Math.ceil(dteMs / (1000 * 60 * 60 * 24));

        const hasOpportunity = positionHasOpportunity?.get(leap.id) ?? false;
        const opportunityMessage = positionOpportunityMessage?.get(leap.id) ?? '';
        const hasAlert = positionHasAlert?.get(leap.id) ?? false;
        const alertMessage = positionAlertMessage?.get(leap.id) ?? '';

        return (
          <div
            key={leap.id}
            className="bg-white dark:bg-trading-dark-800 border border-surface-line dark:border-trading-dark-600 rounded-lg overflow-hidden"
          >
            {/* LEAPS card header */}
            <div
              className="p-4 cursor-pointer hover:bg-surface dark:hover:bg-trading-dark-700/30 transition-colors"
              onClick={() => toggleExpanded(leap.id)}
            >
              <div className="flex items-center gap-4">
                {/* Left: chevron + data */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Chevron */}
                  <div className="text-ink-500 dark:text-ink-400 flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Ticker row */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-ink-900 dark:text-white">
                        {leap.ticker}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                        LEAPS
                      </span>
                      {hasAlert && (
                        <div
                          className="flex items-center gap-1 px-2 py-1 bg-negative-50 dark:bg-negative-700/25 text-negative-700 dark:text-negative-500 rounded-full text-xs font-medium"
                          title={alertMessage || t('widgetsB.priceWarningsTitle')}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {/* Single covered-call suggestion: the central-evaluator opportunity
                          (carries the specific "sell N covered calls" message), shown in a
                          shared white tooltip card via CoveredCallSuggestionBadge. Clicking
                          it opens a pre-filled covered-call wizard; the allocator links the
                          new short call to this LEAPS (PMCC). */}
                      {hasOpportunity && (
                        <CoveredCallSuggestionBadge
                          message={opportunityMessage || t('widgetsB.leapsWriteShortCallTitle')}
                          onClick={onWriteCoveredCall ? () => onWriteCoveredCall(leap.ticker) : undefined}
                        />
                      )}
                    </div>

                    {/* Data fields matching GroupedStockList header style */}
                    <div className="flex items-end gap-6 text-sm">
                      <div className="w-24 flex-shrink-0">
                        <p className="text-ink-500 dark:text-ink-400 text-xs mb-1">
                          {t('widgetsB.firstPositionOn')}
                        </p>
                        <p className="text-ink-900 dark:text-white font-medium text-xs">
                          {new Date(leap.openDate).toLocaleDateString('nl-NL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="w-16 flex-shrink-0">
                        <p className="text-ink-500 dark:text-ink-400 text-xs mb-1">
                          {t('widgetsB.contracts')}
                        </p>
                        <p className="text-ink-900 dark:text-white font-medium">
                          {leap.contracts}
                        </p>
                      </div>
                      <div className="w-20 flex-shrink-0">
                        <p className="text-ink-500 dark:text-ink-400 text-xs mb-1">
                          {t('widgetsB.colStrike')}
                        </p>
                        <p className="text-ink-900 dark:text-white font-medium">
                          {formatCurrency(leap.strike, currencySymbol)}
                        </p>
                      </div>
                      <div className="w-28 flex-shrink-0">
                        <p className="text-ink-500 dark:text-ink-400 text-xs mb-1">
                          {t('widgetsB.colExpiration')}
                        </p>
                        <p className="text-ink-900 dark:text-white font-medium text-xs">
                          {leap.expiration
                            ? new Date(leap.expiration).toLocaleDateString('nl-NL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })
                            : '—'}
                        </p>
                      </div>
                      <div className="w-16 flex-shrink-0">
                        <p className="text-ink-500 dark:text-ink-400 text-xs mb-1">DTE</p>
                        <p className="text-ink-900 dark:text-white font-medium">
                          {dteDays > 0 ? dteDays : '—'}
                        </p>
                      </div>
                      <div className="w-24 flex-shrink-0">
                        <p className="text-ink-500 dark:text-ink-400 text-xs mb-1">
                          {t('widgetsB.currentPrice')}
                        </p>
                        <p className="text-ink-900 dark:text-white font-bold text-base">
                          {stockPrice > 0 ? formatCurrency(stockPrice, currencySymbol) : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Right: P&L */}
                <div className="text-center flex-shrink-0">
                  {(() => {
                    const pnl = leap.currentValue - leap.costBasis;
                    const isProfit = pnl >= 0;
                    const pct =
                      leap.costBasis !== 0 ? (pnl / Math.abs(leap.costBasis)) * 100 : 0;
                    return (
                      <>
                        <p
                          className={`text-2xl font-bold ${
                            isProfit
                              ? 'text-positive-600 dark:text-positive-500'
                              : 'text-negative-600 dark:text-negative-500'
                          }`}
                        >
                          {isProfit ? '+' : ''}
                          {formatCurrency(Math.abs(pnl), currencySymbol)}
                        </p>
                        <p
                          className={`text-sm font-medium ${
                            isProfit
                              ? 'text-positive-600 dark:text-positive-500'
                              : 'text-negative-600 dark:text-negative-500'
                          }`}
                        >
                          {isProfit ? '+' : ''}
                          {pct.toFixed(2)}%
                        </p>
                      </>
                    );
                  })()}
                </div>

                {/* Close button */}
                {onClose && (
                  <div className="flex-shrink-0 bg-surface-subtle dark:bg-trading-dark-700/50 rounded-lg px-3 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose(leap);
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-ink-200 dark:bg-trading-dark-600 hover:bg-ink-300 dark:hover:bg-ink-400 text-ink-700 dark:text-ink-200 rounded font-semibold text-sm transition-colors"
                      title={t('widgetsB.close')}
                    >
                      S
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Expanded content — nested short calls */}
            {isExpanded && assigned.length > 0 && (
              <div className="border-t border-surface-line dark:border-trading-dark-600 bg-surface dark:bg-trading-dark-900/50">
                <div className="divide-y divide-surface-line dark:divide-trading-dark-600">
                  {assigned.map((shortCall) => {
                    const shortTickerData = tickers.find(
                      (tk) => tk.symbol.toUpperCase() === shortCall.ticker.toUpperCase()
                    );
                    const shortStockPrice = shortTickerData?.currentPrice ?? currentPrice;

                    const scHasOpportunity = positionHasOpportunity?.get(shortCall.id) ?? false;
                    const scOpportunityMessage =
                      positionOpportunityMessage?.get(shortCall.id) ?? '';
                    const scHasAlert = positionHasAlert?.get(shortCall.id) ?? false;
                    const scAlertMessage = positionAlertMessage?.get(shortCall.id) ?? '';

                    return (
                      <OptionRow
                        key={shortCall.id}
                        option={shortCall}
                        currencySymbol={currencySymbol}
                        tickerData={shortTickerData}
                        stockPrice={shortStockPrice}
                        onRoll={onRoll}
                        onClose={onClose}
                        onAssign={onAssign}
                        onClick={onView}
                        showActions={true}
                        hasAlert={scHasAlert}
                        alertMessage={scAlertMessage}
                        hasOpportunity={scHasOpportunity}
                        opportunityMessage={scOpportunityMessage}
                        collateralType="leaps"
                        collateralValue={leap.costBasis}
                        collateralDescription={t('widgetsB.callCoveredByLeaps')}
                        leapsInfo={{ ticker: leap.ticker, expiration: leap.expiration }}
                        isSubItem={true}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Expanded content — no short calls yet */}
            {isExpanded && assigned.length === 0 && (
              <div className="border-t border-surface-line dark:border-trading-dark-600 bg-surface dark:bg-trading-dark-900/50 px-8 py-4">
                <p className="text-sm text-ink-500 dark:text-ink-400">
                  {t('widgetsB.leapsNoShortCallsYet')}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
