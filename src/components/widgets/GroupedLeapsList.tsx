import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { CallOption, PutOption, Portfolio, Ticker } from '../../types';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { formatCurrency } from '../../utils/numberFormat';
import { OptionRow } from './OptionRow';

/**
 * A single LEAPS entry with its allocator-assigned short calls and coverage info.
 */
export interface LeapsGroup {
  leap: CallOption;
  /** Short calls assigned to this LEAPS by the allocator. */
  assigned: CallOption[];
  /** How many contracts of this LEAPS are NOT yet covered by a short call. */
  freeContracts: number;
  /** How many contracts of this LEAPS are covered by a short call. */
  coveredContracts: number;
  /** Current price of the underlying, used by OptionRow for price display. */
  currentPrice: number;
}

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
  currencySymbol,
}) => {
  const { t } = useTranslation();
  // "@" badge (free contracts = can write more short calls) is an opportunity
  // → level-gated at covered_calls (medior), same as GroupedStockList.
  const { hasAccess: canUseCoveredCalls } = useFeatureAccess('covered_calls');
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
      {groups.map(({ leap, assigned, freeContracts, currentPrice }) => {
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

        // "@" badge: can still write short calls against this LEAPS
        const showTargetBadge = canUseCoveredCalls && freeContracts > 0;

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
                          title={alertMessage}
                        >
                          ⚠ {t('widgetsB.colActions')}
                        </div>
                      )}
                      {hasOpportunity && (
                        <div
                          className="flex items-center gap-1 px-2 py-1 bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500 rounded-full text-xs font-medium"
                          title={opportunityMessage}
                        >
                          <Target className="w-3.5 h-3.5" />
                        </div>
                      )}
                      {/* "@" badge — write a short call against this LEAPS (gated) */}
                      {showTargetBadge && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onView?.(leap as CallOption | PutOption);
                          }}
                          className="flex items-center gap-1 px-2 py-1 bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500 rounded-full text-xs font-medium hover:bg-positive-100 dark:hover:bg-positive-700/40 transition-colors"
                          title={t('widgetsB.leapsWriteShortCallTitle')}
                        >
                          <Target className="w-3.5 h-3.5" />
                        </button>
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
