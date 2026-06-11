import React, { useState, useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  AlertCircle,
  Search,
  X,
  Target,
} from 'lucide-react';
import { CoveredCallSuggestionBadge } from './CoveredCallSuggestionBadge';
import { useTranslation } from 'react-i18next';
import type { StockPosition, PriceAlert, Portfolio, CallOption, Ticker } from '../../types';
import { formatCurrency } from '../../utils/currencyHelpers';
import { formatNumber } from '../../utils/numberFormat';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { updatePositionLivePrice, selectPositions } from '../../store/slices/positionsSlice';
import { updateTickerPrice } from '../../store/slices/tickersSlice';
import { computeCoveredCallCapacity } from '../../utils/coveredCallEligibility';
import { isLEAPS } from '../../utils/campaignDetector';
import { OptionRow } from './OptionRow';
import type { CollateralType } from './OptionRow';
import { PositionColumnHeader } from './PositionColumnHeader';
// import { SellStockModal } from '../modals/SellStockModal';
// import { ConfirmModal } from '../modals/ConfirmModal';

export interface StrategyAlert {
  id: string;
  message: string;
  category: 'alert' | 'opportunity';
}

interface GroupedStockListProps {
  positions: StockPosition[];
  alerts: PriceAlert[];
  strategyAlertsMap?: Map<string, StrategyAlert[]>;
  allPortfolios: Portfolio[];
  onEditPosition: (position: StockPosition) => void;
  onDismissStrategyAlert?: (alertId: string) => void;
  /** When provided, the "CC" badge becomes a button that opens the covered-call wizard for the ticker.
   *  The optional second argument is the initiating position id (for future per-lot linking);
   *  stock-initiated covered calls pass no underlyingId — the wizard's default parent resolution applies. */
  onWriteCoveredCall?: (ticker: string, underlyingId?: string) => void;
  /** When provided, a sell button is shown that delegates selling a lot to the host's close/sell flow. */
  onSellPosition?: (position: StockPosition) => void;
  /** When provided, a buy button is shown to open the stock wizard pre-filled for this ticker. */
  onBuyPosition?: (ticker: string) => void;
  // ── Covered-call nesting (optional, additive) ──────────────────────────────
  /** Map of ticker (upper-cased) → covered calls assigned to that stock by the allocator. */
  coveredCallsByTicker?: Map<string, CallOption[]>;
  /** Ticker store slice for live price lookup on nested option rows. */
  tickers?: Ticker[];
  /** Currency symbol for formatting option-row amounts. */
  currencySymbol?: string;
  /** Map of position ID → whether it has an opportunity. */
  positionHasOpportunity?: Map<string, boolean>;
  /** Map of position ID → opportunity message. */
  positionOpportunityMessage?: Map<string, string>;
  /** Map of position ID → whether it has an alert. */
  positionHasAlert?: Map<string, boolean>;
  /** Map of position ID → alert message. */
  positionAlertMessage?: Map<string, string>;
  onRoll?: (position: CallOption) => void;
  onClose?: (position: CallOption) => void;
  onAssign?: (position: CallOption) => void;
  onView?: (position: CallOption) => void;
}

// Stable empty default so an omitted strategyAlertsMap prop doesn't create a new
// Map each render (which would invalidate the grouping memo below).
const EMPTY_STRATEGY_ALERTS: Map<string, StrategyAlert[]> = new Map();

interface TickerGroup {
  ticker: string;
  type: 'stock' | 'etf';
  positions: StockPosition[];
  totalShares: number;
  averageCost: number; // GAK - average purchase price
  totalValue: number;
  totalCostBasis: number;
  profitLoss: number;
  profitLossPercentage: number;
  alerts: PriceAlert[];
  strategyAlerts: StrategyAlert[];
}

export const GroupedStockList: React.FC<GroupedStockListProps> = ({
  positions,
  alerts,
  strategyAlertsMap = EMPTY_STRATEGY_ALERTS,
  allPortfolios,
  onEditPosition: _onEditPosition,
  onDismissStrategyAlert: _onDismissStrategyAlert,
  onWriteCoveredCall,
  onSellPosition,
  onBuyPosition,
  coveredCallsByTicker,
  tickers,
  currencySymbol = '$',
  positionHasOpportunity,
  positionOpportunityMessage,
  positionHasAlert,
  positionAlertMessage,
  onRoll,
  onClose,
  onAssign,
  onView,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const allStorePositions = useAppSelector(selectPositions);
  // Writing a covered call is an OPPORTUNITY → level-gated (covered_calls = medior).
  // Without this, the "CC" badge leaked to beginners on the stocks view.
  const { hasAccess: canUseCoveredCalls } = useFeatureAccess('covered_calls');
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [, setDismissConfirm] = useState<{
    isOpen: boolean;
    alert: PriceAlert | null;
  }>({
    isOpen: false,
    alert: null,
  });
  const [, setDismissStrategyConfirm] = useState<{
    isOpen: boolean;
    alertId: string | null;
    message: string;
  }>({
    isOpen: false,
    alertId: null,
    message: '',
  });

  // Group positions by ticker (only open positions). Memoized on its real inputs so
  // this whole pipeline does NOT recompute on every search-box keystroke.
  const groupedPositions = useMemo(() => {
    const groups = positions
      .filter((position) => position.status === 'open')
      .reduce<Record<string, TickerGroup>>((acc, position) => {
        if (!acc[position.ticker]) {
          acc[position.ticker] = {
            ticker: position.ticker,
            type: position.type,
            positions: [],
            totalShares: 0,
            averageCost: 0,
            totalValue: 0,
            totalCostBasis: 0,
            profitLoss: 0,
            profitLossPercentage: 0,
            alerts: [],
            strategyAlerts: [],
          };
        }

        acc[position.ticker].positions.push(position);
        acc[position.ticker].totalShares += position.shares;
        acc[position.ticker].totalValue += position.currentValue;
        acc[position.ticker].totalCostBasis += position.costBasis;

        // Get alerts for this position
        const positionAlerts = alerts.filter((a) => a.positionId === position.id && !a.isRead);
        acc[position.ticker].alerts.push(...positionAlerts);

        // Get strategy alerts for this position
        const posStrategyAlerts = strategyAlertsMap.get(position.id) || [];
        acc[position.ticker].strategyAlerts.push(...posStrategyAlerts);

        return acc;
      }, {});

    // Calculate GAK and P&L for each group
    Object.values(groups).forEach((group) => {
      group.averageCost = group.totalCostBasis / group.totalShares;
      group.profitLoss = group.totalValue - group.totalCostBasis;
      group.profitLossPercentage =
        group.totalCostBasis > 0 ? (group.profitLoss / group.totalCostBasis) * 100 : 0;

      // Sort positions by date (oldest first)
      group.positions.sort(
        (a, b) => new Date(a.openDate).getTime() - new Date(b.openDate).getTime()
      );
    });

    return groups;
  }, [positions, alerts, strategyAlertsMap]);

  // Filter + sort groups by search query (cheap; only this re-runs while typing).
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return Object.values(groupedPositions)
      .filter((group) => group.ticker.toLowerCase().includes(q))
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [groupedPositions, searchQuery]);

  const toggleExpanded = (ticker: string) => {
    setExpandedTickers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(ticker)) {
        newSet.delete(ticker);
      } else {
        newSet.add(ticker);
      }
      return newSet;
    });
  };

  const startEditingPrice = (ticker: string, currentPrice: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTicker(ticker);
    setEditPrice(currentPrice.toString());
  };

  const cancelEditingPrice = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTicker(null);
    setEditPrice('');
  };

  const savePrice = (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newPrice = parseFloat(editPrice);
    if (isNaN(newPrice) || newPrice <= 0) {
      return;
    }

    // First update the ticker price in tickersSlice - this will trigger middleware
    // to update all positions and portfolio values automatically
    dispatch(updateTickerPrice({ symbol: ticker, price: newPrice }));

    // Also update positions directly for immediate UI feedback
    const group = groupedPositions[ticker];
    if (group) {
      group.positions.forEach((position) => {
        dispatch(updatePositionLivePrice({
          id: position.id,
          currentPrice: newPrice,
          currentValue: newPrice * position.shares,
        }));
      });
    }

    setEditingTicker(null);
    setEditPrice('');
  };

  const handlePriceKeyDown = (ticker: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      savePrice(ticker, e as any);
    } else if (e.key === 'Escape') {
      cancelEditingPrice(e as any);
    }
  };

  // Kept for future use when per-lot strategy-alert dismissal is re-enabled.
  const _handleDismissStrategyAlert = (e: React.MouseEvent, alertId: string, message: string) => {
    e.stopPropagation();
    setDismissStrategyConfirm({ isOpen: true, alertId, message });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('widgetsB.searchTicker')}
          className="w-full pl-10 pr-4 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-800 text-ink-900 dark:text-white placeholder-ink-500 dark:placeholder-ink-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Grouped List */}
      {filteredGroups.length > 0 ? (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const isExpanded = expandedTickers.has(group.ticker);
            const isProfit = group.profitLoss >= 0;
            const hasUnreadAlerts = group.alerts.length > 0;
            const ruleAlerts = group.strategyAlerts.filter((a) => a.category === 'alert');
            const ruleOpportunities = group.strategyAlerts.filter(
              (a) => a.category === 'opportunity'
            );

            // Check if any position can write covered calls
            // First check if the portfolio supports options
            const portfolio = allPortfolios.find((b) => b.name === group.positions[0].portfolio);
            const portfolioSupportsOptions = portfolio?.hasOptions ?? false;

            // Calls that actually cover THIS stock come from the central allocator
            // (coveredCallsByTicker), NOT every sold call on the ticker: a covered
            // call linked to a LEAPS must not count as covering the shares (otherwise
            // the stock looks "covered" while the CC really sits on the LEAPS). Fall
            // back to the legacy per-ticker filter only when the allocator map is absent.
            const groupSoldCalls: CallOption[] = coveredCallsByTicker
              ? (coveredCallsByTicker.get(group.ticker.toUpperCase()) ?? [])
              : allStorePositions.filter(
                  (p): p is CallOption =>
                    p.type === 'call' &&
                    (p as CallOption).action === 'sell' &&
                    p.status === 'open' &&
                    p.portfolio === group.positions[0].portfolio &&
                    p.ticker === group.ticker
                );
            // In the fallback path the capacity computation needs the ticker's
            // LEAPS too, so PMCC calls allocated to a LEAPS don't count against
            // the shares. The allocator map already accounts for them.
            const groupLeaps: CallOption[] = coveredCallsByTicker
              ? []
              : allStorePositions.filter(
                  (p): p is CallOption =>
                    p.type === 'call' &&
                    (p as CallOption).action === 'buy' &&
                    p.status === 'open' &&
                    p.portfolio === group.positions[0].portfolio &&
                    p.ticker === group.ticker &&
                    isLEAPS(p as CallOption)
                );
            // Thread the ticker price so the allocator's tight-capacity
            // tie-break matches the dashboard (campaignDetector/alertEvaluator).
            const groupTickerPrice = tickers?.find(
              (tk) => tk.symbol.toUpperCase() === group.ticker.toUpperCase()
            )?.currentPrice;
            const ccCapacity = computeCoveredCallCapacity(
              group.positions as StockPosition[],
              groupSoldCalls,
              groupLeaps,
              groupTickerPrice
            );
            const canWriteCoveredCalls =
              portfolioSupportsOptions && ccCapacity.canWriteCoveredCall && canUseCoveredCalls;

            return (
              <div
                key={group.ticker}
                className="bg-white dark:bg-trading-dark-800 border border-surface-line dark:border-trading-dark-600 rounded-lg overflow-hidden"
              >
                {/* Group Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-surface dark:hover:bg-trading-dark-700/30 transition-colors"
                  onClick={() => toggleExpanded(group.ticker)}
                >
                  <div className="flex items-center gap-4">
                    {/* Left: Chevron + All data fields */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Chevron */}
                      <div className="text-ink-500 dark:text-ink-400 flex-shrink-0">
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </div>

                      {/* Content container */}
                      <div className="flex-1 min-w-0">
                        {/* Ticker row */}
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-xl font-bold text-ink-900 dark:text-white">
                            {group.ticker}
                          </h3>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              group.type === 'etf'
                                ? 'bg-surface-muted dark:bg-trading-dark-600 text-ink-700 dark:text-ink-300'
                                : 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                            }`}
                          >
                            {group.type === 'etf' ? 'ETF' : 'Stock'}
                          </span>
                          {hasUnreadAlerts && (
                            <div
                              className="flex items-center gap-1 px-2 py-1 bg-negative-50 dark:bg-negative-700/25 text-negative-700 dark:text-negative-500 rounded-full text-xs font-medium"
                              title={t('widgetsB.priceWarningsTitle')}
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              {group.alerts.length}
                            </div>
                          )}
                          {ruleAlerts.length > 0 && (
                            <div
                              className="flex items-center gap-1 px-2 py-1 bg-caution-50 dark:bg-caution-600/25 text-caution-600 dark:text-caution-500 rounded-full text-xs font-medium"
                              title={t('widgetsB.ruleWarningsTitle')}
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              {ruleAlerts.length}
                            </div>
                          )}
                          {ruleOpportunities.length > 0 && (
                            <div
                              className="flex items-center gap-1 px-2 py-1 bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500 rounded-full text-xs font-medium"
                              title={t('widgetsB.opportunitiesTitle')}
                            >
                              <Target className="w-3.5 h-3.5" />
                              {ruleOpportunities.length}
                            </div>
                          )}
                          {canWriteCoveredCalls && (
                            <CoveredCallSuggestionBadge
                              message={
                                positionOpportunityMessage?.get(group.positions[0].id) ||
                                t('widgetsA.writeCoveredCallsOpportunity', {
                                  count: ccCapacity.freeContracts,
                                })
                              }
                              onClick={onWriteCoveredCall ? () => onWriteCoveredCall(group.ticker) : undefined}
                            />
                          )}
                        </div>

                        {/* Data fields in a flex layout */}
                        <div className="flex items-end gap-6 text-sm">
                          <div className="w-24 flex-shrink-0">
                            <p className="text-ink-500 dark:text-ink-400 text-xs mb-1">
                              {t('widgetsB.firstPositionOn')}
                            </p>
                            <p className="text-ink-900 dark:text-white font-medium text-xs">
                              {new Date(group.positions[0].openDate).toLocaleDateString('nl-NL', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="w-16 flex-shrink-0">
                            <p className="text-ink-500 dark:text-ink-400 text-xs mb-1">
                              {t('widgetsB.quantity')}
                            </p>
                            <p className="text-ink-900 dark:text-white font-medium">
                              {group.totalShares}
                            </p>
                          </div>
                          <div className="w-20 flex-shrink-0">
                            <p className="text-ink-500 dark:text-ink-400 text-xs mb-1">
                              {t('widgetsB.averageCost')}
                            </p>
                            <p className="text-ink-900 dark:text-white font-medium">
                              {formatCurrency(group.averageCost, allPortfolios)}
                            </p>
                          </div>
                          <div className="w-28 flex-shrink-0">
                            <p className="text-ink-500 dark:text-ink-400 text-xs mb-1">
                              {t('widgetsB.purchaseValue')}
                            </p>
                            <p className="text-ink-900 dark:text-white font-medium">
                              {formatCurrency(group.totalCostBasis, allPortfolios)}
                            </p>
                          </div>
                          <div className="w-24 flex-shrink-0">
                            <p className="text-ink-500 dark:text-ink-400 text-xs mb-1">
                              {t('widgetsB.currentPrice')}
                            </p>
                            {editingTicker === group.ticker ? (
                              <div
                                className="flex items-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  onKeyDown={(e) => handlePriceKeyDown(group.ticker, e)}
                                  onBlur={(e) => savePrice(group.ticker, e as any)}
                                  className="w-full px-2 py-1 text-sm font-bold border-2 border-primary-500 dark:border-primary-400 rounded bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <p
                                onClick={(e) =>
                                  startEditingPrice(
                                    group.ticker,
                                    group.positions[0].currentPrice,
                                    e
                                  )
                                }
                                className="text-ink-900 dark:text-white font-bold text-base cursor-pointer hover:text-primary-700 dark:hover:text-primary-500 transition-colors"
                              >
                                {formatCurrency(group.positions[0].currentPrice, allPortfolios)}
                              </p>
                            )}
                          </div>
                          <div className="w-28 flex-shrink-0">
                            <p className="text-ink-500 dark:text-ink-400 text-xs mb-1">
                              {t('widgetsB.currentValue')}
                            </p>
                            <p className="text-ink-900 dark:text-white font-medium">
                              {formatCurrency(group.totalValue, allPortfolios)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Spacer */}
                    <div className="flex-1"></div>

                    {/* Right: P&L indicator */}
                    <div className="text-center flex-shrink-0">
                      <p
                        className={`text-2xl font-bold ${
                          isProfit
                            ? 'text-positive-600 dark:text-positive-500'
                            : 'text-negative-600 dark:text-negative-500'
                        }`}
                      >
                        {isProfit ? '+' : ''}
                        {formatCurrency(Math.abs(group.profitLoss), allPortfolios)}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          isProfit
                            ? 'text-positive-600 dark:text-positive-500'
                            : 'text-negative-600 dark:text-negative-500'
                        }`}
                      >
                        {isProfit ? '+' : ''}
                        {formatNumber(group.profitLossPercentage, 2)}%
                      </p>
                    </div>

                    {/* Buy / Sell buttons in gray zone.
                        Buy opens the stock wizard pre-filled for this ticker.
                        Sell delegates to the first lot as a representative for
                        the ticker group (per-lot selling is in the close flow). */}
                    {(onBuyPosition || onSellPosition) && (
                      <div className="flex-shrink-0 bg-surface-subtle dark:bg-trading-dark-700/50 rounded-lg px-3 py-3 flex items-center gap-1">
                        {onBuyPosition && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onBuyPosition(group.ticker);
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-ink-200 dark:bg-trading-dark-600 hover:bg-ink-300 dark:hover:bg-ink-400 text-ink-700 dark:text-ink-200 rounded font-semibold text-sm transition-colors"
                            title={t('widgetsB.buy')}
                          >
                            B
                          </button>
                        )}
                        {onSellPosition && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onSellPosition(group.positions[0]);
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-ink-200 dark:bg-trading-dark-600 hover:bg-ink-300 dark:hover:bg-ink-400 text-ink-700 dark:text-ink-200 rounded font-semibold text-sm transition-colors"
                            title={t('widgetsB.sell')}
                          >
                            S
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Content — shows covered calls written against this stock.
                    Share-purchase lot rows are transaction history; they belong in
                    the transaction log, not here. */}
                {isExpanded && (
                  <div className="border-t border-surface-line dark:border-trading-dark-600 bg-surface dark:bg-trading-dark-900/50">
                    {/* ── Covered calls nested under this stock ── */}
                    {(() => {
                      const calls =
                        coveredCallsByTicker?.get(group.ticker.toUpperCase()) ?? [];
                      if (calls.length === 0) {
                        return (
                          <div className="px-8 py-4">
                            <p className="text-sm text-ink-500 dark:text-ink-400">
                              {t('widgetsB.stockNoCoveredCallsYet')}
                            </p>
                          </div>
                        );
                      }
                      return (
                        <>
                          {/* Labels-only column header above nested call rows */}
                          <PositionColumnHeader isSubItem />
                          <div className="divide-y divide-surface-line dark:divide-trading-dark-600">
                            {calls.map((call) => {
                              const tickerEntry = tickers?.find(
                                (tk) => tk.symbol.toUpperCase() === call.ticker.toUpperCase()
                              );
                              const stockPrice = tickerEntry?.currentPrice ?? 0;
                              const totalShares = group.totalShares;
                              const totalCostBasis = group.totalCostBasis;
                              const collateralType: CollateralType = 'stock';
                              const collateralDescription = t('widgetsB.callCoveredByShares', {
                                shares: totalShares,
                                ticker: call.ticker,
                              });
                              const hasOpp = positionHasOpportunity?.get(call.id) ?? false;
                              const oppMsg = positionOpportunityMessage?.get(call.id) ?? '';
                              const hasAlertFlag = positionHasAlert?.get(call.id) ?? false;
                              const alertMsg = positionAlertMessage?.get(call.id) ?? '';
                              return (
                                <OptionRow
                                  key={call.id}
                                  option={call}
                                  currencySymbol={currencySymbol}
                                  tickerData={tickerEntry}
                                  stockPrice={stockPrice}
                                  onRoll={onRoll ? (opt) => onRoll(opt as CallOption) : undefined}
                                  onClose={onClose ? (opt) => onClose(opt as CallOption) : undefined}
                                  onAssign={onAssign ? (opt) => onAssign(opt as CallOption) : undefined}
                                  onClick={onView ? (opt) => onView(opt as CallOption) : undefined}
                                  showActions={true}
                                  collateralType={collateralType}
                                  collateralValue={totalCostBasis}
                                  collateralDescription={collateralDescription}
                                  hasOpportunity={hasOpp}
                                  opportunityMessage={oppMsg}
                                  hasAlert={hasAlertFlag}
                                  alertMessage={alertMsg}
                                  isSubItem={true}
                                />
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

                {/* Alerts Display */}
                {hasUnreadAlerts && !isExpanded && (
                  <div className="border-t border-surface-line dark:border-trading-dark-600 p-3 bg-negative-50 dark:bg-negative-700/15">
                    <div className="space-y-2">
                      {group.alerts.slice(0, 2).map((alert) => {
                        // Fallback to 'alert' if category is not set (for backwards compatibility)
                        const isOpportunity = alert.category === 'opportunity';
                        const bgColor = isOpportunity
                          ? 'bg-positive-50 dark:bg-positive-700/15 border-positive-500/20 dark:border-positive-700/30'
                          : 'bg-negative-50 dark:bg-negative-700/15 border-negative-500/20 dark:border-negative-700/30';
                        const iconColor = isOpportunity
                          ? 'text-positive-600 dark:text-positive-500'
                          : 'text-negative-600 dark:text-negative-500';
                        const textColor = isOpportunity
                          ? 'text-positive-700 dark:text-positive-500'
                          : 'text-negative-700 dark:text-negative-500';

                        return (
                          <div
                            key={alert.id}
                            className={`flex items-start gap-2 p-2 ${bgColor} border rounded text-xs`}
                          >
                            {isOpportunity ? (
                              <Target className={`w-3.5 h-3.5 ${iconColor} mt-0.5 flex-shrink-0`} />
                            ) : (
                              <AlertCircle
                                className={`w-3.5 h-3.5 ${iconColor} mt-0.5 flex-shrink-0`}
                              />
                            )}
                            <p className={`${textColor} flex-1`}>{alert.message}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDismissConfirm({ isOpen: true, alert });
                              }}
                              className={`p-0.5 hover:bg-surface-muted dark:hover:bg-trading-dark-700 rounded transition-colors flex-shrink-0`}
                              title={t('widgetsB.closeAlert')}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {group.alerts.length > 2 && (
                        <p className="text-xs text-ink-500 dark:text-ink-400 text-center">
                          {t('widgetsB.more', { count: group.alerts.length - 2 })}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-ink-500 dark:text-ink-400">
          {searchQuery ? (
            <>
              <p className="text-lg font-medium">{t('widgetsB.noResultsFound')}</p>
              <p className="text-sm mt-1">{t('widgetsB.tryAnotherSearch')}</p>
            </>
          ) : (
            <p>{t('widgetsB.noPositionsAvailable')}</p>
          )}
        </div>
      )}

      {/* Sell Stock Modal */}
      {/* {sellModalTicker && (
        <SellStockModal
          isOpen={true}
          onClose={() => setSellModalTicker(null)}
          ticker={sellModalTicker}
          positions={groupedPositions[sellModalTicker]?.positions || []}
          allPortfolios={allPortfolios}
        />
      )} */}

      {/* Confirm Dismiss Alert Modal */}
      {/* {dismissConfirm.isOpen && dismissConfirm.alert && (
        <ConfirmModal
          isOpen={dismissConfirm.isOpen}
          onClose={() => setDismissConfirm({ isOpen: false, alert: null })}
          onConfirm={() => {
            if (dismissConfirm.alert) {
              handleDismissAlert(dismissConfirm.alert);
            }
          }}
          title={dismissConfirm.alert.category === 'opportunity' ? 'Opportuniteit Sluiten' : 'Alert Sluiten'}
          message={`Weet je zeker dat je deze ${dismissConfirm.alert.category === 'opportunity' ? 'opportuniteit' : 'alert'} wilt sluiten?`}
          confirmText="Sluiten"
          cancelText="Annuleren"
          variant={dismissConfirm.alert.category === 'opportunity' ? 'warning' : 'danger'}
        />
      )} */}

      {/* Confirm Dismiss Strategy Alert Modal */}
      {/* {dismissStrategyConfirm.isOpen && (
        <ConfirmModal
          isOpen={dismissStrategyConfirm.isOpen}
          onClose={() => setDismissStrategyConfirm({ isOpen: false, alertId: null, message: '' })}
          onConfirm={confirmDismissStrategyAlert}
          title="Alert Verwijderen"
          message={`Weet je zeker dat je deze alert wilt sluiten?\n\n"${dismissStrategyConfirm.message}"\n\nDeze komt niet meer terug.`}
          confirmText="Verwijderen"
          cancelText="Annuleren"
          variant="danger"
        />
      )} */}
    </div>
  );
};
