import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, CheckCircle, Search, Edit2, Check, X, TrendingDown, Target } from 'lucide-react';
import type { StockPosition, PriceAlert, Portfolio, CallOption } from '../../types';
import { formatCurrency } from '../../utils/currencyHelpers';
import { formatNumber } from '../../utils/numberFormat';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { updatePosition, markPriceAlertAsRead, selectPositions } from '../../store/slices/positionsSlice';
import { updateTickerPrice } from '../../store/slices/tickersSlice';
import { computeCoveredCallCapacity } from '../../utils/coveredCallEligibility';
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
  /** When provided, the "CC" badge becomes a button that opens the covered-call wizard for the ticker. */
  onWriteCoveredCall?: (ticker: string) => void;
  /** When provided, a sell button is shown that delegates selling a lot to the host's close/sell flow. */
  onSellPosition?: (position: StockPosition) => void;
}

// Stable empty default so an omitted strategyAlertsMap prop doesn't create a new
// Map each render (which would invalidate the grouping memo below).
const EMPTY_STRATEGY_ALERTS: Map<string, StrategyAlert[]> = new Map();

interface TickerGroup {
  ticker: string;
  type: 'stock' | 'etf';
  positions: StockPosition[];
  totalShares: number;
  averageCost: number; // GAK - Gemiddelde aankoopkoers
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
  onEditPosition,
  onDismissStrategyAlert,
  onWriteCoveredCall,
  onSellPosition,
}) => {
  const dispatch = useAppDispatch();
  const allStorePositions = useAppSelector(selectPositions);
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTicker, setEditingTicker] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [dismissConfirm, setDismissConfirm] = useState<{ isOpen: boolean; alert: PriceAlert | null }>({
    isOpen: false,
    alert: null,
  });
  const [dismissStrategyConfirm, setDismissStrategyConfirm] = useState<{ isOpen: boolean; alertId: string | null; message: string }>({
    isOpen: false,
    alertId: null,
    message: '',
  });

  // Group positions by ticker (only open positions). Memoized on its real inputs so
  // this whole pipeline does NOT recompute on every search-box keystroke.
  const groupedPositions = useMemo(() => {
    const groups = positions
      .filter(position => position.status === 'open')
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
        const positionAlerts = alerts.filter(a => a.positionId === position.id && !a.isRead);
        acc[position.ticker].alerts.push(...positionAlerts);

        // Get strategy alerts for this position
        const posStrategyAlerts = strategyAlertsMap.get(position.id) || [];
        acc[position.ticker].strategyAlerts.push(...posStrategyAlerts);

        return acc;
      }, {});

    // Calculate GAK and P&L for each group
    Object.values(groups).forEach(group => {
      group.averageCost = group.totalCostBasis / group.totalShares;
      group.profitLoss = group.totalValue - group.totalCostBasis;
      group.profitLossPercentage = group.totalCostBasis > 0
        ? (group.profitLoss / group.totalCostBasis) * 100
        : 0;

      // Sort positions by date (oldest first)
      group.positions.sort((a, b) =>
        new Date(a.openDate).getTime() - new Date(b.openDate).getTime()
      );
    });

    return groups;
  }, [positions, alerts, strategyAlertsMap]);

  // Filter + sort groups by search query (cheap; only this re-runs while typing).
  const filteredGroups = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return Object.values(groupedPositions)
      .filter(group => group.ticker.toLowerCase().includes(q))
      .sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [groupedPositions, searchQuery]);

  const toggleExpanded = (ticker: string) => {
    setExpandedTickers(prev => {
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
      group.positions.forEach(position => {
        const updatedPosition = {
          ...position,
          currentPrice: newPrice,
          currentValue: newPrice * position.shares,
        };
        dispatch(updatePosition(updatedPosition));
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

  const handleDismissAlert = (alert: PriceAlert) => {
    dispatch(markPriceAlertAsRead(alert.id));
    setDismissConfirm({ isOpen: false, alert: null });
  };

  const handleDismissStrategyAlert = (e: React.MouseEvent, alertId: string, message: string) => {
    e.stopPropagation();
    setDismissStrategyConfirm({ isOpen: true, alertId, message });
  };

  const confirmDismissStrategyAlert = () => {
    if (dismissStrategyConfirm.alertId && onDismissStrategyAlert) {
      onDismissStrategyAlert(dismissStrategyConfirm.alertId);
    }
    setDismissStrategyConfirm({ isOpen: false, alertId: null, message: '' });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Zoek ticker..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Grouped List */}
      {filteredGroups.length > 0 ? (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const isExpanded = expandedTickers.has(group.ticker);
            const isProfit = group.profitLoss >= 0;
            const hasUnreadAlerts = group.alerts.length > 0;
            const ruleAlerts = group.strategyAlerts.filter(a => a.category === 'alert');
            const ruleOpportunities = group.strategyAlerts.filter(a => a.category === 'opportunity');

            // Check if any position can write covered calls
            // First check if the portfolio supports options
            const portfolio = allPortfolios.find(b => b.name === group.positions[0].portfolio);
            const portfolioSupportsOptions = portfolio?.hasOptions ?? false;

            // Sold calls for this ticker+portfolio come from the full store (the
            // positions prop only carries stock lots), so the badge reflects FREE
            // (uncovered) contracts — consistent with the wizard and alerts.
            const groupSoldCalls = allStorePositions.filter(
              (p): p is CallOption =>
                p.type === 'call' &&
                (p as CallOption).action === 'sell' &&
                p.status === 'open' &&
                p.portfolio === group.positions[0].portfolio &&
                p.ticker === group.ticker
            );
            const ccCapacity = computeCoveredCallCapacity(
              group.positions as StockPosition[],
              groupSoldCalls
            );
            const canWriteCoveredCalls = portfolioSupportsOptions && ccCapacity.canWriteCoveredCall;

            return (
              <div
                key={group.ticker}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
              >
                {/* Group Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  onClick={() => toggleExpanded(group.ticker)}
                >
                  <div className="flex items-center gap-4">
                    {/* Left: Chevron + All data fields */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Chevron */}
                      <div className="text-gray-500 dark:text-gray-400 flex-shrink-0">
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
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
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
                              title="Prijs waarschuwingen - De prijs is significant veranderd"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              {group.alerts.length}
                            </div>
                          )}
                          {ruleAlerts.length > 0 && (
                            <div
                              className="flex items-center gap-1 px-2 py-1 bg-caution-50 dark:bg-caution-600/25 text-caution-600 dark:text-caution-500 rounded-full text-xs font-medium"
                              title="Waarschuwingen - Regels die aandacht vereisen"
                            >
                              <AlertCircle className="w-3.5 h-3.5" />
                              {ruleAlerts.length}
                            </div>
                          )}
                          {ruleOpportunities.length > 0 && (
                            <div
                              className="flex items-center gap-1 px-2 py-1 bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500 rounded-full text-xs font-medium"
                              title="Kansen - Mogelijkheden om te handelen"
                            >
                              <Target className="w-3.5 h-3.5" />
                              {ruleOpportunities.length}
                            </div>
                          )}
                          {canWriteCoveredCalls && (
                            onWriteCoveredCall ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onWriteCoveredCall(group.ticker);
                                }}
                                className="flex items-center gap-1 px-2 py-1 bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500 rounded-full text-xs font-medium hover:bg-positive-100 dark:hover:bg-positive-700/40 transition-colors"
                                title="Schrijf een covered call op deze aandelen"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                CC
                              </button>
                            ) : (
                              <div
                                className="flex items-center gap-1 px-2 py-1 bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500 rounded-full text-xs font-medium"
                                title="Covered Calls mogelijk - Voldoende aandelen om covered calls te schrijven"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                CC
                              </div>
                            )
                          )}
                        </div>

                        {/* Data fields in a flex layout */}
                        <div className="flex items-end gap-6 text-sm">
                          <div className="w-24 flex-shrink-0">
                            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Eerste positie op</p>
                            <p className="text-gray-900 dark:text-white font-medium text-xs">
                              {new Date(group.positions[0].openDate).toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </p>
                          </div>
                          <div className="w-16 flex-shrink-0">
                            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Aantal</p>
                            <p className="text-gray-900 dark:text-white font-medium">{group.totalShares}</p>
                          </div>
                          <div className="w-20 flex-shrink-0">
                            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">GAK</p>
                            <p className="text-gray-900 dark:text-white font-medium">{formatCurrency(group.averageCost, allPortfolios)}</p>
                          </div>
                          <div className="w-28 flex-shrink-0">
                            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Aankoopwaarde</p>
                            <p className="text-gray-900 dark:text-white font-medium">{formatCurrency(group.totalCostBasis, allPortfolios)}</p>
                          </div>
                          <div className="w-24 flex-shrink-0">
                            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Huidige Prijs</p>
                            {editingTicker === group.ticker ? (
                              <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editPrice}
                                  onChange={(e) => setEditPrice(e.target.value)}
                                  onKeyDown={(e) => handlePriceKeyDown(group.ticker, e)}
                                  onBlur={(e) => savePrice(group.ticker, e as any)}
                                  className="w-full px-2 py-1 text-sm font-bold border-2 border-primary-500 dark:border-primary-400 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                  autoFocus
                                />
                              </div>
                            ) : (
                              <p
                                onClick={(e) => startEditingPrice(group.ticker, group.positions[0].currentPrice, e)}
                                className="text-gray-900 dark:text-white font-bold text-base cursor-pointer hover:text-primary-700 dark:hover:text-primary-500 transition-colors"
                              >
                                {formatCurrency(group.positions[0].currentPrice, allPortfolios)}
                              </p>
                            )}
                          </div>
                          <div className="w-28 flex-shrink-0">
                            <p className="text-gray-500 dark:text-gray-400 text-xs mb-1">Huidige Waarde</p>
                            <p className="text-gray-900 dark:text-white font-medium">{formatCurrency(group.totalValue, allPortfolios)}</p>
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
                          isProfit ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'
                        }`}
                      >
                        {isProfit ? '+' : ''}{formatCurrency(Math.abs(group.profitLoss), allPortfolios)}
                      </p>
                      <p
                        className={`text-sm font-medium ${
                          isProfit ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'
                        }`}
                      >
                        {isProfit ? '+' : ''}{formatNumber(group.profitLossPercentage, 2)}%
                      </p>
                    </div>

                    {/* Sell button in gray zone */}
                    {onSellPosition && (
                      <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-700/50 rounded-lg px-3 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (group.positions.length === 1) {
                              onSellPosition(group.positions[0]);
                            } else {
                              // Multiple lots: expand so the user can sell a specific lot
                              setExpandedTickers(prev => new Set(prev).add(group.ticker));
                            }
                          }}
                          className="w-8 h-8 flex items-center justify-center bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded font-semibold text-sm transition-colors"
                          title={group.positions.length === 1 ? 'Verkoop' : 'Verkoop een lot (klap uit)'}
                        >
                          S
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Expanded Content - Individual Positions */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {group.positions.map((position) => {
                        const posProfit = position.currentValue - position.costBasis;
                        const posProfitPct = position.costBasis > 0
                          ? (posProfit / position.costBasis) * 100
                          : 0;
                        const isPosProfit = posProfit >= 0;

                        // Get alerts for this specific position
                        const positionAlerts = alerts.filter(a => a.positionId === position.id && !a.isRead);
                        const positionStrategyAlerts = strategyAlertsMap.get(position.id) || [];

                        return (
                          <div key={position.id}>
                            <div
                              onClick={() => onEditPosition(position)}
                              className="p-4 hover:bg-white dark:hover:bg-gray-800 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-4">
                                {/* Left: Chevron spacer + Data fields matching header */}
                                <div className="flex items-center gap-3 flex-1">
                                  {/* Spacer for chevron alignment */}
                                  <div className="w-5 flex-shrink-0">
                                    {/* Alert/Opportunity indicators */}
                                    {(positionAlerts.length > 0 || positionStrategyAlerts.length > 0) && (
                                      <div className="flex flex-col gap-0.5">
                                        {positionAlerts.some(a => !a.category || a.category === 'alert') && (
                                          <AlertCircle className="w-3.5 h-3.5 text-negative-600 dark:text-negative-500" />
                                        )}
                                        {positionStrategyAlerts.some((a: StrategyAlert) => a.category === 'alert') && (
                                          <AlertCircle className="w-3.5 h-3.5 text-caution-600 dark:text-caution-500" />
                                        )}
                                        {(positionAlerts.some((a: any) => a.category === 'opportunity') || positionStrategyAlerts.some((a: StrategyAlert) => a.category === 'opportunity')) && (
                                          <Target className="w-3.5 h-3.5 text-positive-600 dark:text-positive-500" />
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Data fields matching header layout */}
                                  <div className="flex items-center gap-6 text-sm">
                                    <div className="w-24 flex-shrink-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {new Date(position.openDate).toLocaleDateString('nl-NL')}
                                      </p>
                                    </div>
                                    <div className="w-16 flex-shrink-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {position.shares}
                                      </p>
                                    </div>
                                    <div className="w-20 flex-shrink-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(position.purchasePrice, allPortfolios)}
                                      </p>
                                    </div>
                                    <div className="w-28 flex-shrink-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(position.costBasis, allPortfolios)}
                                      </p>
                                    </div>
                                    <div className="w-24 flex-shrink-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(position.currentPrice, allPortfolios)}
                                      </p>
                                    </div>
                                    <div className="w-28 flex-shrink-0">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {formatCurrency(position.currentValue, allPortfolios)}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* P&L - right-aligned */}
                                <div className="flex-shrink-0 text-right" style={{ width: '180px' }}>
                                  <p
                                    className={`text-lg font-bold ${
                                      isPosProfit ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'
                                    }`}
                                  >
                                    {isPosProfit ? '+' : ''}{formatCurrency(Math.abs(posProfit), allPortfolios)}
                                  </p>
                                  <p
                                    className={`text-xs font-medium ${
                                      isPosProfit ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'
                                    }`}
                                  >
                                    {isPosProfit ? '+' : ''}{formatNumber(posProfitPct, 2)}%
                                  </p>
                                </div>

                                {onSellPosition && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSellPosition(position);
                                    }}
                                    className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded font-semibold text-sm transition-colors"
                                    title="Verkoop dit lot"
                                  >
                                    S
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Position-specific alerts */}
                            {(positionAlerts.length > 0 || positionStrategyAlerts.length > 0) && (
                              <div className="px-4 pb-3 space-y-2">
                                {/* Price Alerts */}
                                {positionAlerts.map((alert) => {
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
                                      className={`flex items-start gap-2 p-2 ml-8 ${bgColor} border rounded text-xs`}
                                    >
                                      {isOpportunity ? (
                                        <Target className={`w-3.5 h-3.5 ${iconColor} mt-0.5 flex-shrink-0`} />
                                      ) : (
                                        <AlertCircle className={`w-3.5 h-3.5 ${iconColor} mt-0.5 flex-shrink-0`} />
                                      )}
                                      <p className={`${textColor} flex-1`}>{alert.message}</p>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDismissConfirm({ isOpen: true, alert });
                                        }}
                                        className={`p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0`}
                                        title="Alert sluiten"
                                      >
                                        <X className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  );
                                })}

                                {/* Strategy Alerts */}
                                {positionStrategyAlerts.map((alert: StrategyAlert) => {
                                  const isAlert = alert.category === 'alert';
                                  const Icon = isAlert ? AlertCircle : Target;
                                  const bgColor = isAlert
                                    ? 'bg-caution-50 dark:bg-caution-600/15 border-caution-500/30 dark:border-caution-600/40'
                                    : 'bg-positive-50 dark:bg-positive-700/15 border-positive-500/20 dark:border-positive-700/30';
                                  const iconColor = isAlert
                                    ? 'text-caution-600 dark:text-caution-500'
                                    : 'text-positive-600 dark:text-positive-500';
                                  const textColor = isAlert
                                    ? 'text-caution-600 dark:text-amber-200'
                                    : 'text-positive-700 dark:text-positive-500';

                                  return (
                                    <div
                                      key={alert.id}
                                      className={`flex items-start gap-2 p-2 ml-8 ${bgColor} border rounded text-xs`}
                                    >
                                      <Icon className={`w-3.5 h-3.5 ${iconColor} mt-0.5 flex-shrink-0`} />
                                      <p className={`${textColor} flex-1`}>{alert.message}</p>
                                      {onDismissStrategyAlert && (
                                        <button
                                          onClick={(e) => handleDismissStrategyAlert(e, alert.id, alert.message)}
                                          className={`p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0`}
                                          title="Alert sluiten"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Alerts Display */}
                {hasUnreadAlerts && !isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-negative-50 dark:bg-negative-700/15">
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
                              <AlertCircle className={`w-3.5 h-3.5 ${iconColor} mt-0.5 flex-shrink-0`} />
                            )}
                            <p className={`${textColor} flex-1`}>{alert.message}</p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDismissConfirm({ isOpen: true, alert });
                              }}
                              className={`p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors flex-shrink-0`}
                              title="Alert sluiten"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {group.alerts.length > 2 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                          +{group.alerts.length - 2} meer
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
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          {searchQuery ? (
            <>
              <p className="text-lg font-medium">Geen resultaten gevonden</p>
              <p className="text-sm mt-1">Probeer een andere zoekterm</p>
            </>
          ) : (
            <p>Geen posities beschikbaar</p>
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
