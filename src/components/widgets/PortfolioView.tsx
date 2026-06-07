import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Target,
  AlertCircle,
  Lightbulb,
  Filter,
} from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  selectAllPriceAlerts,
} from '../../store/slices/positionsSlice';
import { openPosition, closePosition, editPosition } from '../../store/commands/positionCommands';
import { selectUnlockedLevels, isFeatureAvailable } from '../../store/slices/userProgressSlice';
import { addTransaction } from '../../store/slices/portfoliosSlice';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import { useAlerts } from '../../hooks/useAlerts';
import type { AlertItem } from '../../utils/alertEvaluator';
import { getDaysToExpiration } from '../../utils/dateHelpers';
import { ClosePositionModal } from '../modals/ClosePositionModal';
import { PositionDetailModal } from '../modals/PositionDetailModal';
import { SpreadDetailModal } from '../modals/SpreadDetailModal';
import { RollOptionModal } from '../modals/RollOptionModal';
import { SpreadRollModal } from '../modals/SpreadRollModal';
import { AssignmentModal } from '../modals/AssignmentModal';
import {
  updateWheelPhase,
  incrementWheelCycle,
  updateWheelPremium,
} from '../../store/slices/wheelsSlice';
import type { StockPosition } from '../../types';
import type { Position, CurrencyType, CallOption, PutOption } from '../../types';
import { POSITION_GRID_COLS } from './positionGrid';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { getSpreadId } from '../../utils/spreadHelpers';
import { computeCoveredCallCapacity } from '../../utils/coveredCallEligibility';
import { allocateCallCoverage } from '../../utils/coverageAllocation';
import { isLEAPS as isLeapsForCoverage } from '../../utils/campaignDetector';
import { StockRow } from './StockRow';
import { GroupedStockList } from './GroupedStockList';
import { OptionRow } from './OptionRow';
import type { CollateralType } from './OptionRow';
import { SpreadSummaryRow } from './SpreadSummaryRow';
import { isLEAPS, calculateSpreadSummary } from '../../utils/positionHelpers';

type SortField = 'expiration' | 'ticker' | 'strike' | 'premium' | 'dte' | 'pnl';
type SortDirection = 'asc' | 'desc';
type GroupBy = 'none' | 'strategy' | 'expiry' | 'ticker' | 'action';

interface PortfolioViewProps {
  positions: Position[];
  currency: CurrencyType;
  portfolioName: string;
  portfolioCurrentValue: number;
  className?: string;
  onNavigateToCampaigns?: () => void;
  /** Opens the covered-call wizard for a ticker (threaded down to the grouped stock list). */
  onWriteCoveredCall?: (ticker: string) => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  positions,
  currency,
  portfolioName,
  portfolioCurrentValue,
  className = '',
  onNavigateToCampaigns,
  onWriteCoveredCall,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const tickers = useAppSelector(selectAllTickers);
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);
  const priceAlerts = useAppSelector(selectAllPriceAlerts);
  const unlockedLevels = useAppSelector(selectUnlockedLevels);
  const hasOptionsAccess = isFeatureAvailable('covered_calls', unlockedLevels);
  const currencySymbol = getCurrencySymbol(currency);

  // Per short-call coverage, derived from the shared deterministic allocator
  // (stocks before LEAPS, honouring underlyingId). This makes the "collateral"
  // column show the actual parent of each covered call, consistent with the
  // campaign view and the opportunity logic.
  const callCoverageByCallId = useMemo(() => {
    type CoverageInfo =
      | { kind: 'stock'; shares: number; costBasis: number }
      | { kind: 'leaps'; leap: CallOption };
    const map = new Map<string, CoverageInfo>();

    const openByTicker = new Map<string, Position[]>();
    for (const p of positions) {
      if (p.status !== 'open') continue;
      if ((p as { wheelId?: string }).wheelId) continue;
      const key = p.ticker.toUpperCase();
      const list = openByTicker.get(key) ?? [];
      list.push(p);
      openByTicker.set(key, list);
    }

    for (const [ticker, group] of openByTicker) {
      const shortCalls = group.filter(
        (p) => p.type === 'call' && (p as CallOption).action === 'sell'
      ) as CallOption[];
      if (shortCalls.length === 0) continue;
      const stocks = group.filter((p) => p.type === 'stock' || p.type === 'etf') as StockPosition[];
      const leaps = group.filter(
        (p) =>
          p.type === 'call' &&
          (p as CallOption).action === 'buy' &&
          isLeapsForCoverage(p as CallOption)
      ) as CallOption[];
      const price = tickers.find((t) => t.symbol.toUpperCase() === ticker)?.currentPrice;

      const alloc = allocateCallCoverage({ stocks, leaps, shortCalls, currentPrice: price });

      if (alloc.stock) {
        const totalShares = stocks.reduce((s, l) => s + l.shares, 0);
        const totalCost = stocks.reduce((s, l) => s + l.costBasis, 0);
        for (const c of alloc.stock.assigned) {
          map.set(c.id, { kind: 'stock', shares: totalShares, costBasis: totalCost });
        }
      }
      for (const la of alloc.leaps) {
        const leap = leaps.find((l) => l.id === la.parentId);
        if (!leap) continue;
        for (const c of la.assigned) {
          map.set(c.id, { kind: 'leaps', leap });
        }
      }
    }

    return map;
  }, [positions, tickers]);

  // Use central alerts hook for this portfolio
  const { getAlertsForPosition, getOpportunitiesForPosition } = useAlerts(portfolioName);

  // Create a map of position IDs to their opportunities for quick lookup
  const positionOpportunities = useMemo(() => {
    const map = new Map<string, AlertItem[]>();
    positions.forEach((pos) => {
      const opps = getOpportunitiesForPosition(pos.id);
      if (opps.length > 0) {
        map.set(pos.id, opps);
      }
    });
    return map;
  }, [positions, getOpportunitiesForPosition]);

  // Create a map of position IDs to their alerts for quick lookup
  const positionAlerts = useMemo(() => {
    const map = new Map<string, AlertItem[]>();
    positions.forEach((pos) => {
      const alerts = getAlertsForPosition(pos.id);
      if (alerts.length > 0) {
        map.set(pos.id, alerts);
      }
    });
    return map;
  }, [positions, getAlertsForPosition]);
  const [positionToClose, setPositionToClose] = useState<Position | null>(null);
  const [positionToRoll, setPositionToRoll] = useState<(CallOption | PutOption) | null>(null);
  const [positionToAssign, setPositionToAssign] = useState<(CallOption | PutOption) | null>(null);
  const [spreadToRoll, setSpreadToRoll] = useState<{
    longLeg: CallOption | PutOption;
    shortLeg: CallOption | PutOption;
  } | null>(null);
  const [positionToView, setPositionToView] = useState<Position | null>(null);
  const [spreadToView, setSpreadToView] = useState<{
    legs: Position[];
    currentStockPrice: number;
  } | null>(null);
  const [sortField, setSortField] = useState<SortField>('expiration');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  // Default to grouping by ticker so each stock/LEAPS sits next to the covered
  // calls it backs (the parent is also shown in the collateral column).
  const [groupBy, setGroupBy] = useState<GroupBy>('ticker');
  const [tickerSearch, setTickerSearch] = useState('');
  const [filterExpiration, setFilterExpiration] = useState<string>('all');
  const [filterOpportunities, setFilterOpportunities] = useState<boolean>(false);
  const [filterAlerts, setFilterAlerts] = useState<boolean>(false);
  const [filterIdeas, setFilterIdeas] = useState<boolean>(false);
  const [showFilterPopup, setShowFilterPopup] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const tooltipRefs = useRef<Record<string, React.RefObject<HTMLDivElement | null>>>({});
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [filterPopupPosition, setFilterPopupPosition] = useState({ top: 0, left: 0 });
  const [expandedSpreads, setExpandedSpreads] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [groupFilterPopup, setGroupFilterPopup] = useState<string | null>(null);
  const [groupFilters, setGroupFilters] = useState<
    Record<
      string,
      {
        expiration: string;
        opportunities: boolean;
        alerts: boolean;
        ideas: boolean;
      }
    >
  >({});

  // Helper to get or create ref for tooltip
  const getTooltipRef = (id: string) => {
    if (!tooltipRefs.current[id]) {
      tooltipRefs.current[id] = React.createRef<HTMLDivElement>();
    }
    return tooltipRefs.current[id];
  };

  // Helper to toggle spread expansion
  const toggleSpread = (spreadId: string) => {
    setExpandedSpreads((prev) => {
      const next = new Set(prev);
      if (next.has(spreadId)) {
        next.delete(spreadId);
      } else {
        next.add(spreadId);
      }
      return next;
    });
  };

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupName)) {
        next.delete(groupName);
      } else {
        next.add(groupName);
      }
      return next;
    });
  };

  // Helper to get group filter
  const getGroupFilter = (groupName: string) => {
    return (
      groupFilters[groupName] || {
        expiration: 'all',
        opportunities: false,
        alerts: false,
        ideas: false,
      }
    );
  };

  // Helper to update group filter
  const updateGroupFilter = (
    groupName: string,
    updates: Partial<{
      expiration: string;
      opportunities: boolean;
      alerts: boolean;
      ideas: boolean;
    }>
  ) => {
    setGroupFilters((prev) => ({
      ...prev,
      [groupName]: {
        ...getGroupFilter(groupName),
        ...updates,
      },
    }));
  };

  // Helper to reset group filter
  const resetGroupFilter = (groupName: string) => {
    setGroupFilters((prev) => {
      const next = { ...prev };
      delete next[groupName];
      return next;
    });
  };

  // Helper to check if group has active filters
  const hasActiveGroupFilter = (groupName: string) => {
    const filter = groupFilters[groupName];
    if (!filter) return false;
    return filter.expiration !== 'all' || filter.opportunities || filter.alerts || filter.ideas;
  };

  // Update filter popup position when it opens
  useEffect(() => {
    if (showFilterPopup && filterButtonRef.current) {
      const rect = filterButtonRef.current.getBoundingClientRect();
      setFilterPopupPosition({
        top: rect.bottom + 8, // 8px below the button
        left: rect.right - 320, // 320px is the popup width, align to right edge of button
      });
    }
  }, [showFilterPopup]);

  // Get ALL positions (stocks, ETFs, and options) with sorting
  const allPositions = useMemo(() => {
    const allPos = positions.filter((p) => p.status === 'open');

    // Sort positions
    const sorted = [...allPos].sort((a, b) => {
      // Handle stock/ETF positions differently from options
      const isAOption = a.type === 'call' || a.type === 'put';
      const isBOption = b.type === 'call' || b.type === 'put';

      // If one is option and other is stock/ETF, sort by type
      if (isAOption && !isBOption) return 1;
      if (!isAOption && isBOption) return -1;

      // If both are stocks/ETFs, sort by ticker
      if (!isAOption && !isBOption) {
        return a.ticker.localeCompare(b.ticker);
      }

      // Both are options, use existing sort logic
      const optionA = a as CallOption | PutOption;
      const optionB = b as CallOption | PutOption;
      let compareValue = 0;

      switch (sortField) {
        case 'expiration': {
          const dateA = optionA.expiration ? new Date(optionA.expiration).getTime() : 0;
          const dateB = optionB.expiration ? new Date(optionB.expiration).getTime() : 0;
          compareValue = dateA - dateB;
          break;
        }
        case 'ticker':
          compareValue = optionA.ticker.localeCompare(optionB.ticker);
          break;
        case 'strike':
          compareValue = optionA.strike - optionB.strike;
          break;
        case 'premium':
          compareValue = optionA.premium - optionB.premium;
          break;
        case 'dte': {
          const dteA = optionA.expiration ? getDaysToExpiration(optionA.expiration) : 0;
          const dteB = optionB.expiration ? getDaysToExpiration(optionB.expiration) : 0;
          compareValue = dteA - dteB;
          break;
        }
        case 'pnl': {
          const pnlA = optionA.currentValue - optionA.costBasis;
          const pnlB = optionB.currentValue - optionB.costBasis;
          compareValue = pnlA - pnlB;
          break;
        }
      }

      return sortDirection === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [positions, sortField, sortDirection]);

  // Filter positions by ticker search and other filters
  const filteredPositions = useMemo(() => {
    let filtered = allPositions;

    // Ticker search filter
    if (tickerSearch.trim()) {
      const searchLower = tickerSearch.toLowerCase();
      filtered = filtered.filter((p) => p.ticker.toLowerCase().includes(searchLower));
    }

    // Expiration filter
    if (filterExpiration !== 'all') {
      const weeks = parseInt(filterExpiration, 10);
      const daysThreshold = weeks * 7;
      filtered = filtered.filter((p) => {
        if (p.type === 'call' || p.type === 'put') {
          const option = p as CallOption | PutOption;
          if (option.expiration) {
            const daysToExpiration = getDaysToExpiration(option.expiration);
            return daysToExpiration > 0 && daysToExpiration <= daysThreshold;
          }
        }
        return false; // Filter out stocks/ETFs when expiration filter is active
      });
    }

    // Opportunities filter
    if (filterOpportunities) {
      filtered = filtered.filter((p) => {
        if (p.type === 'stock' || p.type === 'etf') {
          // Check for Covered Call opportunity
          const stock = p as any;

          const tickerLots = positions.filter(
            (pos): pos is StockPosition =>
              (pos.type === 'stock' || pos.type === 'etf') &&
              pos.status === 'open' &&
              pos.portfolio === stock.portfolio &&
              pos.ticker === stock.ticker
          );
          const tickerSoldCalls = positions.filter(
            (pos): pos is CallOption =>
              pos.type === 'call' &&
              (pos as CallOption).action === 'sell' &&
              pos.status === 'open' &&
              pos.portfolio === stock.portfolio &&
              pos.ticker === stock.ticker
          );
          const ccCapacity = computeCoveredCallCapacity(tickerLots, tickerSoldCalls);
          return ccCapacity.canWriteCoveredCall;
        } else if (p.type === 'call' || p.type === 'put') {
          // Check for option opportunity - 80% of max profit reached
          const option = p as CallOption | PutOption;
          const isBuy = option.action === 'buy';
          const nominalProfit = option.currentValue - option.costBasis;
          const profitPercent =
            option.costBasis !== 0 ? (nominalProfit / Math.abs(option.costBasis)) * 100 : 0;

          if (isBuy) {
            // LONG (bought) option: Check if 80% profit reached
            return nominalProfit >= 0 && profitPercent >= 80;
          } else {
            // SHORT (sold) option: Check if premium has decreased by 80%
            // If current value is close to 0, we've captured 80% of max profit
            return nominalProfit >= 0 && profitPercent >= 80;
          }
        }
        return false;
      });
    }

    // Alerts filter
    if (filterAlerts) {
      filtered = filtered.filter((p) => {
        if (p.type === 'call' || p.type === 'put') {
          const option = p as CallOption | PutOption;
          const isCall = option.type === 'call';

          // Calculate DTE
          const daysToExpiration = option.expiration ? getDaysToExpiration(option.expiration) : 0;

          // Check if put expires this week
          const expiresThisWeek = daysToExpiration > 0 && daysToExpiration <= 7;

          // For puts: Check if position is in trouble based on P&L
          // If it's a sold put (short) and we're losing money, the stock price is likely below strike
          // If it's a bought put (long) and we're making money, the stock price is likely below strike
          const nominalPnL = option.currentValue - option.costBasis;
          const putAlert =
            !isCall &&
            ((option.action === 'sell' && nominalPnL < 0) || // Short put losing money (stock below strike)
              (option.action === 'buy' && nominalPnL > 0)); // Long put making money (stock below strike)

          return putAlert || (!isCall && expiresThisWeek);
        }
        return false;
      });
    }

    return filtered;
  }, [allPositions, tickerSearch, filterExpiration, filterOpportunities, filterAlerts, positions]);

  // Pre-process positions to identify spreads
  const { spreads } = useMemo(() => {
    const spreadMap = new Map<string, Position[]>();
    const standalone: Position[] = [];

    filteredPositions.forEach((position) => {
      const spreadId = getSpreadId(position);
      if (spreadId) {
        if (!spreadMap.has(spreadId)) {
          spreadMap.set(spreadId, []);
        }
        spreadMap.get(spreadId)!.push(position);
      } else {
        standalone.push(position);
      }
    });

    return {
      spreads: Array.from(spreadMap.entries()).map(([id, legs]) => ({ id, legs })),
      standalonePositions: standalone,
    };
  }, [filteredPositions]);

  // Open stock/ETF lots for this portfolio â€” rendered as a grouped, expandable tree
  const stockLots = useMemo(
    () =>
      positions.filter(
        (p): p is StockPosition => (p.type === 'stock' || p.type === 'etf') && p.status === 'open'
      ),
    [positions]
  );

  // Group all positions by strategy if needed
  // This groups both standalone positions and spreads
  const groupedAllPositions = useMemo(() => {
    // Stocks/ETFs are rendered separately by GroupedStockList â€” keep them out of the
    // strategy/expiry/ticker grouping so they don't appear twice.
    const nonStockPositions = filteredPositions.filter(
      (p) => p.type !== 'stock' && p.type !== 'etf'
    );

    if (groupBy === 'none') {
      return { [t('widgetsB.groupAllPositions')]: nonStockPositions };
    }

    const groups: Record<string, Position[]> = {};
    const processedSpreadIds = new Set<string>();

    nonStockPositions.forEach((position) => {
      // Check if this is part of a spread
      const spreadId = getSpreadId(position);

      // If it's part of a spread, only process once (when we encounter the first leg)
      if (spreadId) {
        if (processedSpreadIds.has(spreadId)) {
          return; // Skip - already processed this spread
        }
        processedSpreadIds.add(spreadId);

        // Find the spread type from the legs
        const spreadLegs = spreads.find((s) => s.id === spreadId);
        if (spreadLegs && spreadLegs.legs.length === 2) {
          const firstLeg = spreadLegs.legs[0] as CallOption | PutOption;

          let groupName = t('widgetsB.groupOther');
          if (groupBy === 'strategy') {
            groupName =
              firstLeg.type === 'call'
                ? t('widgetsB.groupCallSpreads')
                : t('widgetsB.groupPutSpreads');
          } else if (groupBy === 'expiry') {
            groupName = firstLeg.expiration;
          } else if (groupBy === 'ticker') {
            groupName = firstLeg.ticker;
          } else if (groupBy === 'action') {
            // For spreads, check the first leg action
            groupName = firstLeg.action === 'buy' ? t('widgetsB.groupLong') : t('widgetsB.groupShort');
          }

          if (!groups[groupName]) {
            groups[groupName] = [];
          }
          // Add both legs to the group (they will be rendered as a single spread)
          groups[groupName].push(...spreadLegs.legs);
        }
        return;
      }

      // For standalone positions
      let groupName = t('widgetsB.groupOther');

      if (groupBy === 'strategy') {
        // Stocks and ETFs
        if (position.type === 'stock' || position.type === 'etf') {
          groupName = t('widgetsB.groupStocksEtfs');
        }
        // Options (standalone, not part of spreads)
        else if (position.type === 'put' || position.type === 'call') {
          const option = position as CallOption | PutOption;
          if (option.type === 'call') {
            groupName = t('widgetsB.groupCalls');
          } else {
            groupName = t('widgetsB.groupPuts');
          }
        }
      } else if (groupBy === 'expiry') {
        // Group by expiration date
        if (position.type === 'call' || position.type === 'put') {
          const option = position as CallOption | PutOption;
          groupName = option.expiration;
        } else {
          groupName = t('widgetsB.groupNoExpiration');
        }
      } else if (groupBy === 'ticker') {
        // Group by ticker
        groupName = position.ticker;
      } else if (groupBy === 'action') {
        // Group by long/short
        // Stocks and ETFs are always Long
        if (position.type === 'stock' || position.type === 'etf') {
          groupName = t('widgetsB.groupLong');
        }
        // Options: buy = Long, sell = Short
        else if (position.type === 'put' || position.type === 'call') {
          const option = position as CallOption | PutOption;
          groupName = option.action === 'buy' ? t('widgetsB.groupLong') : t('widgetsB.groupShort');
        }
      }

      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(position);
    });

    // Sort groups by name
    const sortedGroups: Record<string, Position[]> = {};
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      // For expiry grouping, sort by date
      if (groupBy === 'expiry') {
        if (a === t('widgetsB.groupNoExpiration')) return 1;
        if (b === t('widgetsB.groupNoExpiration')) return -1;
        return new Date(a).getTime() - new Date(b).getTime();
      }
      return a.localeCompare(b);
    });

    sortedKeys.forEach((key) => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [filteredPositions, groupBy, spreads, t]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleClosePosition = (closeData: {
    closePrice?: number;
    closePremium?: number;
    closeDate: string;
    notes?: string;
    quantity?: number;
    realizedPnL: number;
  }) => {
    if (!positionToClose) return;

    // Use the realizedPnL from the modal
    const realizedPnL = closeData.realizedPnL;
    let closeValue = 0;
    let isPartialClose = false;

    if (positionToClose.type === 'stock' || positionToClose.type === 'etf') {
      if ('shares' in positionToClose && closeData.closePrice) {
        const quantityToClose = closeData.quantity || positionToClose.shares;
        isPartialClose = quantityToClose < positionToClose.shares;
        closeValue = closeData.closePrice * quantityToClose;
      }
    } else if (positionToClose.type === 'call' || positionToClose.type === 'put') {
      if (
        'contracts' in positionToClose &&
        'action' in positionToClose &&
        closeData.closePremium !== undefined
      ) {
        const contractMultiplier = 100;
        if (positionToClose.action === 'buy') {
          closeValue = closeData.closePremium * positionToClose.contracts * contractMultiplier;
        } else {
          const closeCost = closeData.closePremium * positionToClose.contracts * contractMultiplier;
          closeValue = -closeCost;
        }
      }
    }

    if (isPartialClose && 'shares' in positionToClose && closeData.quantity) {
      // Partial close: update the existing position with remaining shares
      const remainingShares = positionToClose.shares - closeData.quantity;
      const remainingCostBasis =
        (positionToClose.costBasis / positionToClose.shares) * remainingShares;
      const purchasePricePerShare = positionToClose.costBasis / positionToClose.shares;

      dispatch(
        editPosition({
          ...positionToClose,
          shares: remainingShares,
          costBasis: remainingCostBasis,
          currentValue: remainingShares * purchasePricePerShare, // Will be updated by price service
        }, new Date().toISOString())
      );

      // Log transaction for partial sale
      const transaction = {
        id: `txn-${Date.now()}`,
        portfolio: portfolioName as any,
        date: closeData.closeDate,
        type: 'position_sell' as const,
        amount: closeValue,
        description: t('widgetsB.txnPartialSell', {
          quantity: closeData.quantity,
          ticker: positionToClose.ticker,
        }),
        relatedPositionId: positionToClose.id,
        previousValue: portfolioCurrentValue,
        newValue: portfolioCurrentValue + realizedPnL,
        createdAt: new Date().toISOString(),
        notes:
          closeData.notes ||
          t('widgetsB.txnPartialSellNotes', {
            quantity: closeData.quantity,
            total: positionToClose.shares,
            pnl: formatCurrency(realizedPnL, currencySymbol),
          }),
      };

      dispatch(addTransaction(transaction));
    } else {
      // Full close: close the position completely
      dispatch(
        closePosition({
          id: positionToClose.id,
          closeDate: closeData.closeDate,
          closePrice: closeData.closePrice,
          closePremium: closeData.closePremium,
          realizedPnL,
          notes: closeData.notes,
        }, new Date().toISOString())
      );

      // Log transaction for close
      // For bought options: we receive closeValue (can be 0 if worthless)
      // For sold options: we pay closeCost to buy back
      const transaction = {
        id: `txn-${Date.now()}`,
        portfolio: portfolioName as any,
        date: closeData.closeDate,
        type: 'position_sell' as const,
        amount: closeValue, // Cash received (can be 0 for worthless options)
        description: t('widgetsB.txnClose', {
          type: positionToClose.type,
          ticker: positionToClose.ticker,
        }),
        relatedPositionId: positionToClose.id,
        previousValue: portfolioCurrentValue,
        newValue: portfolioCurrentValue + realizedPnL,
        createdAt: new Date().toISOString(),
        notes:
          closeData.notes ||
          t('widgetsB.txnRealizedPnl', { pnl: formatCurrency(realizedPnL, currencySymbol) }),
      };

      dispatch(addTransaction(transaction));
    }

    // Close modal
    setPositionToClose(null);
  };

  const handleCloseSpread = (
    spreadLegs: Position[],
    closeData: {
      closePremium: number;
      closeDate: string;
      notes?: string;
    }
  ) => {
    // Close both legs of the spread
    const contractMultiplier = 100;
    let totalRealizedPnL = 0;
    let totalCloseValue = 0;

    spreadLegs.forEach((leg) => {
      const option = leg as CallOption | PutOption;
      let closeValue = 0;
      let realizedPnL = 0;

      if (option.action === 'buy') {
        // Sell the long leg
        closeValue = closeData.closePremium * option.contracts * contractMultiplier;
        realizedPnL = closeValue - option.costBasis;
      } else {
        // Buy back the short leg
        const closeCost = closeData.closePremium * option.contracts * contractMultiplier;
        closeValue = -closeCost;
        realizedPnL = option.costBasis - closeCost;
      }

      totalRealizedPnL += realizedPnL;
      totalCloseValue += closeValue;

      // Close each leg
      dispatch(
        closePosition({
          id: option.id,
          closeDate: closeData.closeDate,
          closePremium: closeData.closePremium,
          realizedPnL,
          notes: closeData.notes,
        }, new Date().toISOString())
      );
    });

    // Log a single transaction for the spread close
    const firstLeg = spreadLegs[0] as CallOption | PutOption;
    const transaction = {
      id: `txn-${Date.now()}`,
      portfolio: portfolioName as any,
      date: closeData.closeDate,
      type: 'position_sell' as const,
      amount: totalCloseValue,
      description: t('widgetsB.txnCloseSpread', {
        type: firstLeg.type,
        ticker: firstLeg.ticker,
      }),
      relatedPositionId: firstLeg.id,
      previousValue: portfolioCurrentValue,
      newValue: portfolioCurrentValue + totalRealizedPnL,
      createdAt: new Date().toISOString(),
      notes:
        closeData.notes ||
        t('widgetsB.txnSpreadClosedNotes', {
          pnl: formatCurrency(totalRealizedPnL, currencySymbol),
        }),
    };

    dispatch(addTransaction(transaction));

    // Close modal
    setPositionToClose(null);
  };

  const handleRollOption = (rollData: {
    closePremium: number;
    closeDate: string;
    newContracts: number;
    newStrike: number;
    newExpiration: string;
    newPremium: number;
    notes?: string;
  }) => {
    if (!positionToRoll) return;

    const contractMultiplier = 100;

    // Calculate close values
    let closeValue = 0;
    let realizedPnL = 0;

    if (positionToRoll.action === 'sell') {
      // SHORT option: buy back to close
      const closeCost = rollData.closePremium * positionToRoll.contracts * contractMultiplier;
      closeValue = -closeCost;
      realizedPnL = -closeCost - positionToRoll.costBasis;
    } else {
      // LONG option: sell to close
      closeValue = rollData.closePremium * positionToRoll.contracts * contractMultiplier;
      realizedPnL = closeValue - positionToRoll.costBasis;
    }

    // Calculate new position values
    let newCostBasis = 0;
    let openValue = 0;

    if (positionToRoll.action === 'sell') {
      // Selling new option: receive premium (credit)
      openValue = rollData.newPremium * rollData.newContracts * contractMultiplier;
      newCostBasis = -openValue; // Negative cost basis for short options
    } else {
      // Buying new option: pay premium (debit)
      openValue = -rollData.newPremium * rollData.newContracts * contractMultiplier;
      newCostBasis = Math.abs(openValue); // Positive cost basis for long options
    }

    // Net credit/debit for the roll
    const netCashFlow = closeValue + openValue;

    // 1. Close the existing position
    dispatch(
      closePosition({
        id: positionToRoll.id,
        closeDate: rollData.closeDate,
        closePremium: rollData.closePremium,
        realizedPnL,
        notes: rollData.notes ? `Roll: ${rollData.notes}` : 'Rolled to new position',
      }, new Date().toISOString())
    );

    // 2. Create the new position
    const newPosition: CallOption | PutOption = {
      id: `pos-${Date.now()}`,
      portfolio: positionToRoll.portfolio,
      ticker: positionToRoll.ticker,
      type: positionToRoll.type,
      action: positionToRoll.action,
      strike: rollData.newStrike,
      expiration: rollData.newExpiration,
      contracts: rollData.newContracts,
      premium: rollData.newPremium,
      costBasis: newCostBasis,
      currentValue: positionToRoll.action === 'sell' ? -newCostBasis : newCostBasis,
      status: 'open',
      openDate: rollData.closeDate,
      notes: t('widgetsB.rolledFrom', {
        strike: positionToRoll.strike,
        date: new Date(positionToRoll.expiration).toLocaleDateString('nl-NL'),
      }),
      strategy: positionToRoll.strategy,
      // Preserve wheel and underlying links when rolling
      wheelId: positionToRoll.wheelId,
      underlyingId: positionToRoll.underlyingId,
    };

    dispatch(openPosition(newPosition, new Date().toISOString()));

    // 3. Log the roll transaction
    const optionType = positionToRoll.type === 'call' ? 'CALL' : 'PUT';
    const actionType = positionToRoll.action === 'sell' ? 'Short' : 'Long';

    // Calculate days difference between expirations
    const oldExpDate = new Date(positionToRoll.expiration);
    const newExpDate = new Date(rollData.newExpiration);
    const daysDiff = Math.round(
      (newExpDate.getTime() - oldExpDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Determine roll type
    const isHorizontalRoll = positionToRoll.strike === rollData.newStrike && daysDiff !== 0;
    const isVerticalRoll = positionToRoll.strike !== rollData.newStrike && daysDiff === 0;
    const isDiagonalRoll = positionToRoll.strike !== rollData.newStrike && daysDiff !== 0;

    let rollTypeLabel = '';
    if (isHorizontalRoll) {
      rollTypeLabel = t('widgetsB.rollHorizontal', { days: daysDiff });
    } else if (isVerticalRoll) {
      const direction = rollData.newStrike > positionToRoll.strike ? 'â†‘' : 'â†“';
      rollTypeLabel = t('widgetsB.rollVertical', { direction });
    } else if (isDiagonalRoll) {
      const direction = rollData.newStrike > positionToRoll.strike ? 'â†‘' : 'â†“';
      rollTypeLabel = t('widgetsB.rollDiagonal', { direction, days: daysDiff });
    }

    // Format dates for display
    const oldExpStr = oldExpDate.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' });
    const newExpStr = newExpDate.toLocaleDateString('nl-NL', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const transaction = {
      id: `txn-${Date.now()}`,
      portfolio: portfolioName as any,
      date: rollData.closeDate,
      type: 'option_roll' as const,
      amount: netCashFlow, // Net cash received (credit) or paid (debit)
      description: `Roll ${actionType} ${optionType} ${positionToRoll.ticker} $${positionToRoll.strike} (${oldExpStr}) â†’ $${rollData.newStrike} (${newExpStr})`,
      relatedPositionId: newPosition.id,
      previousValue: portfolioCurrentValue,
      newValue: portfolioCurrentValue + realizedPnL,
      createdAt: new Date().toISOString(),
      notes:
        rollData.notes ||
        `${rollTypeLabel} â€¢ ${netCashFlow >= 0 ? 'Credit' : 'Debit'}: ${formatCurrency(Math.abs(netCashFlow), currencySymbol)}${daysDiff > 0 ? t('widgetsB.rollNotesDays', { days: daysDiff }) : ''}`,
    };

    dispatch(addTransaction(transaction));

    // Close modal
    setPositionToRoll(null);
  };

  const handleRollSpread = (rollData: {
    rollDate: string;
    longLeg: {
      closePremium: number;
      newStrike: number;
      newExpiration: string;
      newPremium: number;
    };
    shortLeg: {
      closePremium: number;
      newStrike: number;
      newExpiration: string;
      newPremium: number;
    };
    notes?: string;
  }) => {
    if (!spreadToRoll) return;

    const contractMultiplier = 100;
    const { longLeg, shortLeg } = spreadToRoll;

    // Calculate close values for long leg (sell to close)
    const longCloseValue = rollData.longLeg.closePremium * longLeg.contracts * contractMultiplier;
    const longRealizedPnL = longCloseValue - longLeg.costBasis;

    // Calculate close values for short leg (buy to close)
    const shortCloseValue =
      -rollData.shortLeg.closePremium * shortLeg.contracts * contractMultiplier;
    const shortRealizedPnL = -shortCloseValue - shortLeg.costBasis;

    // Calculate new position values
    const longNewCostBasis = rollData.longLeg.newPremium * longLeg.contracts * contractMultiplier;
    const shortNewCostBasis = -(
      rollData.shortLeg.newPremium *
      shortLeg.contracts *
      contractMultiplier
    );

    // Net cash flow for the roll
    const netCashFlow =
      longCloseValue +
      shortCloseValue -
      rollData.longLeg.newPremium * longLeg.contracts * contractMultiplier +
      rollData.shortLeg.newPremium * shortLeg.contracts * contractMultiplier;

    // 1. Close existing positions
    dispatch(
      closePosition({
        id: longLeg.id,
        closeDate: rollData.rollDate,
        closePremium: rollData.longLeg.closePremium,
        realizedPnL: longRealizedPnL,
        notes: rollData.notes ? `Spread Roll: ${rollData.notes}` : 'Rolled spread - long leg',
      }, new Date().toISOString())
    );

    dispatch(
      closePosition({
        id: shortLeg.id,
        closeDate: rollData.rollDate,
        closePremium: rollData.shortLeg.closePremium,
        realizedPnL: shortRealizedPnL,
        notes: rollData.notes ? `Spread Roll: ${rollData.notes}` : 'Rolled spread - short leg',
      }, new Date().toISOString())
    );

    // 2. Create new positions with linked spread ID
    const newSpreadId = `spread-${Date.now()}`;
    const spreadType =
      rollData.shortLeg.newPremium > rollData.longLeg.newPremium ? 'Credit' : 'Debit';

    const newLongPosition: CallOption | PutOption = {
      id: `${newSpreadId}-long`,
      portfolio: longLeg.portfolio,
      ticker: longLeg.ticker,
      type: longLeg.type,
      action: 'buy',
      strike: rollData.longLeg.newStrike,
      expiration: rollData.longLeg.newExpiration,
      contracts: longLeg.contracts,
      premium: rollData.longLeg.newPremium,
      costBasis: longNewCostBasis,
      currentValue: longNewCostBasis,
      status: 'open',
      openDate: rollData.rollDate,
      notes: `${rollData.notes || ''}\nSpread ID: ${newSpreadId} (${spreadType} Spread - Long Leg)\nRolled from $${longLeg.strike}`,
    };

    const newShortPosition: CallOption | PutOption = {
      id: `${newSpreadId}-short`,
      portfolio: shortLeg.portfolio,
      ticker: shortLeg.ticker,
      type: shortLeg.type,
      action: 'sell',
      strike: rollData.shortLeg.newStrike,
      expiration: rollData.shortLeg.newExpiration,
      contracts: shortLeg.contracts,
      premium: rollData.shortLeg.newPremium,
      costBasis: shortNewCostBasis,
      currentValue: shortNewCostBasis,
      cashReserved:
        Math.abs(rollData.shortLeg.newStrike - rollData.longLeg.newStrike) *
        shortLeg.contracts *
        100,
      status: 'open',
      openDate: rollData.rollDate,
      notes: `${rollData.notes || ''}\nSpread ID: ${newSpreadId} (${spreadType} Spread - Short Leg)\nRolled from $${shortLeg.strike}`,
    };

    dispatch(openPosition(newLongPosition, new Date().toISOString()));
    dispatch(openPosition(newShortPosition, new Date().toISOString()));

    // 3. Log the roll transaction
    const optionType = longLeg.type === 'call' ? 'Call' : 'Put';
    const totalRealizedPnL = longRealizedPnL + shortRealizedPnL;
    const transaction = {
      id: `txn-${Date.now()}`,
      portfolio: portfolioName as any,
      date: rollData.rollDate,
      type: 'option_roll' as const,
      amount: netCashFlow,
      description: `Roll ${longLeg.ticker} ${optionType} Spread $${Math.min(longLeg.strike, shortLeg.strike)}/$${Math.max(longLeg.strike, shortLeg.strike)} â†’ $${Math.min(rollData.longLeg.newStrike, rollData.shortLeg.newStrike)}/$${Math.max(rollData.longLeg.newStrike, rollData.shortLeg.newStrike)}`,
      relatedPositionId: newSpreadId,
      previousValue: portfolioCurrentValue,
      newValue: portfolioCurrentValue + totalRealizedPnL,
      createdAt: new Date().toISOString(),
      notes:
        rollData.notes ||
        `Roll ${spreadType} ${optionType} Spread. ${netCashFlow >= 0 ? 'Credit' : 'Debit'}: ${formatCurrency(Math.abs(netCashFlow), currencySymbol)}`,
    };

    dispatch(addTransaction(transaction));

    // Close modal
    setSpreadToRoll(null);
  };

  // Handle assignment of short option
  const handleAssignment = (assignmentData: {
    assignmentDate: string;
    assignmentPrice: number;
    notes?: string;
  }) => {
    if (!positionToAssign) return;

    const option = positionToAssign;
    const isPut = option.type === 'put';
    const contractMultiplier = 100;
    const shares = option.contracts * contractMultiplier;

    // Calculate realized P&L for the option
    // The option expires worthless (premium kept), but we need to account for assignment
    const realizedPnL = Math.abs(option.costBasis); // Premium received is our profit on the option

    // Close the option position
    dispatch(
      closePosition({
        id: option.id,
        closeDate: assignmentData.assignmentDate,
        closePremium: 0, // Option expires/assigned, no buyback
        realizedPnL,
        notes: assignmentData.notes ? `Assignment: ${assignmentData.notes}` : 'Assigned',
      }, new Date().toISOString())
    );

    if (isPut) {
      // Short PUT assigned: create stock position
      const totalCost = option.strike * shares;
      const premiumReceived = Math.abs(option.costBasis);
      const effectiveCost = totalCost - premiumReceived;

      const newStockPosition: StockPosition = {
        id: `stock-${Date.now()}`,
        type: 'stock',
        ticker: option.ticker,
        name: option.name,
        portfolio: option.portfolio,
        status: 'open',
        shares,
        costBasis: effectiveCost,
        purchasePrice: effectiveCost / shares,
        currentPrice: assignmentData.assignmentPrice,
        currentValue: shares * assignmentData.assignmentPrice,
        optionsSupported: true,
        miniContractsSupported: false,
        openDate: assignmentData.assignmentDate,
        notes: `Assigned from Cash Secured Put at $${option.strike}. Premium: $${formatNumber(premiumReceived, 2)}`,
        // Link to Wheel if the option was part of one
        wheelId: option.wheelId,
      };

      dispatch(openPosition(newStockPosition, new Date().toISOString()));

      // Update Wheel phase if linked
      if (option.wheelId) {
        dispatch(
          updateWheelPhase({
            id: option.wheelId,
            phase: 'stock',
          })
        );
      }

      // Log transaction
      const transaction = {
        id: `txn-${Date.now()}`,
        portfolio: portfolioName as any,
        date: assignmentData.assignmentDate,
        type: 'position_buy' as const,
        amount: -effectiveCost,
        description: `Assignment: ${shares} ${option.ticker} @ $${option.strike}`,
        relatedPositionId: newStockPosition.id,
        previousValue: portfolioCurrentValue,
        newValue: portfolioCurrentValue,
        createdAt: new Date().toISOString(),
        notes: `Assigned from Cash Secured Put. Effective cost: ${formatCurrency(effectiveCost, currencySymbol)}`,
      };

      dispatch(addTransaction(transaction));
    } else {
      // Short CALL assigned: remove stock and realize gain
      // Find the stock position
      const stockPosition = positions.find(
        (p) =>
          (p.type === 'stock' || p.type === 'etf') &&
          p.ticker.toUpperCase() === option.ticker.toUpperCase() &&
          p.status === 'open'
      );

      if (stockPosition && 'shares' in stockPosition) {
        const totalProceeds = option.strike * shares;
        const premiumReceived = Math.abs(option.costBasis);
        const stockCostBasis = (stockPosition.costBasis / stockPosition.shares) * shares;
        const stockRealizedPnL = totalProceeds - stockCostBasis;

        // Close or reduce stock position
        if (stockPosition.shares <= shares) {
          // Close entire stock position
          dispatch(
            closePosition({
              id: stockPosition.id,
              closeDate: assignmentData.assignmentDate,
              closePrice: option.strike,
              realizedPnL: stockRealizedPnL,
              notes: `Assigned from covered call at $${option.strike}`,
            }, new Date().toISOString())
          );
        } else {
          // Partial close - reduce shares
          const remainingShares = stockPosition.shares - shares;
          const remainingCostBasis =
            (stockPosition.costBasis / stockPosition.shares) * remainingShares;

          dispatch(
            editPosition({
              ...stockPosition,
              shares: remainingShares,
              costBasis: remainingCostBasis,
              currentValue: remainingShares * (stockPosition.currentValue / stockPosition.shares),
            } as any, new Date().toISOString())
          );
        }

        // Update Wheel if linked
        if (option.wheelId) {
          // Increment cycle and move back to CSP phase
          dispatch(incrementWheelCycle(option.wheelId));
          dispatch(
            updateWheelPhase({
              id: option.wheelId,
              phase: 'csp',
            })
          );
          // Add the stock P&L to wheel
          dispatch(
            updateWheelPremium({
              id: option.wheelId,
              premiumCollected: 0,
              realizedPnL: stockRealizedPnL,
            })
          );
        }

        // Log transaction
        const transaction = {
          id: `txn-${Date.now()}`,
          portfolio: portfolioName as any,
          date: assignmentData.assignmentDate,
          type: 'position_sell' as const,
          amount: totalProceeds + premiumReceived,
          description: t('widgetsB.txnAssignmentSell', {
            shares,
            ticker: option.ticker,
            strike: option.strike,
          }),
          relatedPositionId: option.id,
          previousValue: portfolioCurrentValue,
          newValue: portfolioCurrentValue + stockRealizedPnL + realizedPnL,
          createdAt: new Date().toISOString(),
          notes: `Assigned from covered call. Stock P&L: ${formatCurrency(stockRealizedPnL, currencySymbol)}, Premium: ${formatCurrency(premiumReceived, currencySymbol)}`,
        };

        dispatch(addTransaction(transaction));
      }
    }

    // Close modal
    setPositionToAssign(null);
  };

  if (allPositions.length === 0) {
    return (
      <div
        className={`bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 flex items-center justify-center h-full min-h-[400px] ${className}`}
      >
        <div className="text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-ink-400 dark:text-ink-500" />
          <p className="text-ink-600 dark:text-ink-400">{t('widgetsB.noPositions')}</p>
          <p className="text-sm text-ink-500 dark:text-ink-500 mt-1">
            {t('widgetsB.addPositionToStart')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 flex flex-col h-full overflow-x-hidden ${className}`}
    >
      {/* Controls Bar - Fixed at top */}
      {allPositions.length > 0 && (
        <div className="px-6 py-3 border-b border-surface-line dark:border-trading-dark-600 flex-shrink-0 bg-surface dark:bg-trading-dark-800/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 max-w-xs">
                <input
                  type="text"
                  placeholder={t('widgetsB.searchTickerPlaceholder')}
                  value={tickerSearch}
                  onChange={(e) => setTickerSearch(e.target.value)}
                  className="w-full px-3 py-1 bg-white dark:bg-trading-dark-700 border border-ink-200 dark:border-trading-dark-500 rounded text-sm"
                />
              </div>

              {/* Filter Button with Popup (only for users with options access) */}
              {hasOptionsAccess && (
                <div>
                  <button
                    ref={filterButtonRef}
                    onClick={() => setShowFilterPopup(!showFilterPopup)}
                    className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                      filterExpiration !== 'all' ||
                      filterOpportunities ||
                      filterAlerts ||
                      filterIdeas
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-2 border-primary-500 dark:border-primary-500'
                        : 'bg-surface-subtle dark:bg-trading-dark-700 text-ink-700 dark:text-ink-300 border border-ink-200 dark:border-trading-dark-500 hover:bg-surface-muted dark:hover:bg-trading-dark-600'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    {(filterExpiration !== 'all' ||
                      filterOpportunities ||
                      filterAlerts ||
                      filterIdeas) && (
                      <span className="ml-1 px-1.5 py-0.5 bg-primary-700 dark:bg-primary-500 text-white text-xs rounded-full">
                        {[
                          filterExpiration !== 'all' ? 1 : 0,
                          filterOpportunities ? 1 : 0,
                          filterAlerts ? 1 : 0,
                          filterIdeas ? 1 : 0,
                        ].reduce((a, b) => a + b, 0)}
                      </span>
                    )}
                  </button>

                  {/* Filter Popup via Portal */}
                  {showFilterPopup &&
                    createPortal(
                      <>
                        {/* Backdrop to close popup */}
                        <div
                          className="fixed inset-0 z-[9998]"
                          onClick={() => setShowFilterPopup(false)}
                        />

                        {/* Popup Content */}
                        <div
                          className="fixed w-80 bg-white dark:bg-trading-dark-800 border border-surface-line dark:border-trading-dark-600 rounded-lg shadow-xl z-[9999] p-4"
                          style={{
                            top: `${filterPopupPosition.top}px`,
                            left: `${filterPopupPosition.left}px`,
                          }}
                        >
                          <div className="space-y-4">
                            {/* Header */}
                            <div className="flex items-center justify-between pb-2 border-b border-surface-line dark:border-trading-dark-600">
                              <h3 className="font-semibold text-ink-900 dark:text-white">
                                {t('widgetsB.filters')}
                              </h3>
                              <button
                                onClick={() => {
                                  setFilterExpiration('all');
                                  setFilterOpportunities(false);
                                  setFilterAlerts(false);
                                  setFilterIdeas(false);
                                }}
                                className="text-xs text-primary-700 dark:text-primary-300 hover:underline"
                              >
                                Reset
                              </button>
                            </div>

                            {/* Expiration Filter */}
                            <div>
                              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                                {t('widgetsB.expiresWithin')}
                              </label>
                              <select
                                value={filterExpiration}
                                onChange={(e) => setFilterExpiration(e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-trading-dark-700 border border-ink-200 dark:border-trading-dark-500 rounded text-sm"
                              >
                                <option value="all">{t('widgetsB.all')}</option>
                                <option value="1">{t('widgetsB.week1')}</option>
                                <option value="2">{t('widgetsB.weeks2')}</option>
                                <option value="4">{t('widgetsB.weeks4')}</option>
                                <option value="8">{t('widgetsB.weeks8')}</option>
                              </select>
                            </div>

                            {/* Category Filters */}
                            <div>
                              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                                {t('widgetsB.categories')}
                              </label>
                              <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-300 cursor-pointer p-2 rounded hover:bg-surface dark:hover:bg-trading-dark-700/50">
                                  <input
                                    type="checkbox"
                                    checked={filterOpportunities}
                                    onChange={(e) => setFilterOpportunities(e.target.checked)}
                                    className="w-4 h-4 rounded border-ink-200 dark:border-trading-dark-500"
                                  />
                                  <Target className="w-4 h-4 text-positive-600 dark:text-positive-500" />
                                  <span>Opportunities</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-300 cursor-pointer p-2 rounded hover:bg-surface dark:hover:bg-trading-dark-700/50">
                                  <input
                                    type="checkbox"
                                    checked={filterAlerts}
                                    onChange={(e) => setFilterAlerts(e.target.checked)}
                                    className="w-4 h-4 rounded border-ink-200 dark:border-trading-dark-500"
                                  />
                                  <AlertCircle className="w-4 h-4 text-negative-600 dark:text-negative-500" />
                                  <span>Alerts</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-300 cursor-pointer p-2 rounded hover:bg-surface dark:hover:bg-trading-dark-700/50">
                                  <input
                                    type="checkbox"
                                    checked={filterIdeas}
                                    onChange={(e) => setFilterIdeas(e.target.checked)}
                                    className="w-4 h-4 rounded border-ink-200 dark:border-trading-dark-500"
                                  />
                                  <Lightbulb className="w-4 h-4 text-caution-600 dark:text-caution-500" />
                                  <span>Ideas</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>,
                      document.body
                    )}
                </div>
              )}
            </div>

            {/* Group By Dropdown - Right aligned (only for users with options access) */}
            {hasOptionsAccess && (
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="px-3 py-1 bg-white dark:bg-trading-dark-700 border border-ink-200 dark:border-trading-dark-500 rounded text-sm"
              >
                <option value="none">{t('widgetsB.groupNone')}</option>
                <option value="strategy">{t('widgetsB.groupByType')}</option>
                <option value="expiry">{t('widgetsB.groupByExpiry')}</option>
                <option value="ticker">{t('widgetsB.groupByTicker')}</option>
                <option value="action">{t('widgetsB.groupByLongShort')}</option>
              </select>
            )}
          </div>
        </div>
      )}

      {/* Position List - Scrollable */}
      <div className="divide-y divide-surface-line dark:divide-trading-dark-600 flex-1 overflow-y-auto">
        {/* Grouped Stock/ETF Tree */}
        {stockLots.length > 0 && (
          <div className="mb-4">
            <GroupedStockList
              positions={stockLots}
              alerts={priceAlerts}
              allPortfolios={portfolios}
              onEditPosition={setPositionToView}
              onWriteCoveredCall={onWriteCoveredCall}
              onSellPosition={setPositionToClose}
            />
          </div>
        )}

        {/* All Positions Table */}
        {allPositions.length > 0 && (
          <div className="bg-surface dark:bg-trading-dark-800/50 overflow-x-auto">
            {/* Column Headers */}
            <div className="px-6 py-2 bg-surface-subtle dark:bg-trading-dark-900/50 border-b border-surface-line dark:border-trading-dark-600 border-l-4 border-l-transparent">
              <div
                className={`grid ${POSITION_GRID_COLS} gap-2 text-xs font-semibold text-ink-600 dark:text-ink-400 items-center`}
              >
                <div></div> {/* Icon */}
                <button
                  onClick={() => handleSort('ticker')}
                  className="text-left hover:text-ink-900 dark:hover:text-ink-200 flex items-center gap-1"
                >
                  {t('widgetsB.colTicker')}{' '}
                  {sortField === 'ticker' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    ))}
                </button>
                <button
                  onClick={() => handleSort('expiration')}
                  className="text-left hover:text-ink-900 dark:hover:text-ink-200 flex items-center gap-1"
                >
                  {t('widgetsB.colExpiration')}{' '}
                  {sortField === 'expiration' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    ))}
                </button>
                <button
                  onClick={() => handleSort('strike')}
                  className="text-left hover:text-ink-900 dark:hover:text-ink-200 flex items-center gap-1"
                >
                  {t('widgetsB.colStrike')}{' '}
                  {sortField === 'strike' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    ))}
                </button>
                <div>{t('widgetsB.colStockPrice')}</div>
                <div>{t('widgetsB.colDifference')}</div>
                <div>{t('widgetsB.colOpen')}</div>
                <div>{t('widgetsB.colCurrent')}</div>
                <button
                  onClick={() => handleSort('pnl')}
                  className="text-left hover:text-ink-900 dark:hover:text-ink-200 flex items-center gap-1"
                >
                  {t('widgetsB.colProfitLoss')}{' '}
                  {sortField === 'pnl' &&
                    (sortDirection === 'asc' ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    ))}
                </button>
                <div>{t('widgetsB.colCollateral')}</div>
                <div></div> {/* Spacer */}
                <div className="text-right">{t('widgetsB.colActions')}</div> {/* Actions */}
              </div>
            </div>

            {/* Grouped Positions */}
            {Object.entries(groupedAllPositions).map(([strategyName, strategyPositions]) => {
              const isCollapsed = collapsedGroups.has(strategyName);
              const groupFilter = getGroupFilter(strategyName);
              const hasGroupFilter = hasActiveGroupFilter(strategyName);

              // Apply group-specific filters to positions
              const filteredGroupPositions = strategyPositions.filter((position) => {
                // Expiration filter
                if (groupFilter.expiration !== 'all') {
                  const weeks = parseInt(groupFilter.expiration);
                  if (position.type === 'call' || position.type === 'put') {
                    const option = position as CallOption | PutOption;
                    const dte = getDaysToExpiration(option.expiration);
                    if (dte > weeks * 7) return false;
                  } else {
                    // Stocks/ETFs don't expire, show them if filtering by expiration
                    return true;
                  }
                }

                // Category filters (opportunities, alerts, ideas)
                if (groupFilter.opportunities || groupFilter.alerts || groupFilter.ideas) {
                  let matchesCategory = false;

                  if (position.type === 'call' || position.type === 'put') {
                    const option = position as CallOption | PutOption;

                    // Check for opportunity (80% profit)
                    if (groupFilter.opportunities) {
                      const openValue = option.premium * option.contracts * 100;
                      const currentValue = (option.currentPremium || 0) * option.contracts * 100;
                      const pnl =
                        option.action === 'sell'
                          ? openValue - currentValue
                          : currentValue - openValue;
                      const profitPercent = openValue !== 0 ? (pnl / openValue) * 100 : 0;
                      if (pnl > 0 && profitPercent >= 80) matchesCategory = true;
                    }

                    // Check for alert (expiring within 7 days)
                    if (groupFilter.alerts) {
                      const dte = getDaysToExpiration(option.expiration);
                      if (dte <= 7) matchesCategory = true;
                    }

                    // Check for ideas (e.g., has notes with ideas)
                    if (groupFilter.ideas) {
                      if (option.notes && option.notes.toLowerCase().includes('idea'))
                        matchesCategory = true;
                    }
                  }

                  if (!matchesCategory) return false;
                }

                return true;
              });

              return (
                <div key={strategyName}>
                  {groupBy !== 'none' && (
                    <div className="relative">
                      <div
                        className="px-6 py-2 bg-surface-muted dark:bg-trading-dark-800 border-b border-ink-200 dark:border-trading-dark-500 cursor-pointer hover:bg-surface-muted dark:hover:bg-trading-dark-700 transition-colors flex items-center justify-between"
                        onClick={() => toggleGroup(strategyName)}
                      >
                        <div className="flex items-center gap-2">
                          {isCollapsed ? (
                            <ChevronDown className="w-4 h-4 text-ink-600 dark:text-ink-400" />
                          ) : (
                            <ChevronUp className="w-4 h-4 text-ink-600 dark:text-ink-400" />
                          )}
                          <h4 className="font-semibold text-ink-900 dark:text-white">
                            {strategyName} ({filteredGroupPositions.length}
                            {filteredGroupPositions.length !== strategyPositions.length
                              ? `/${strategyPositions.length}`
                              : ''}
                            )
                          </h4>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setGroupFilterPopup(
                              groupFilterPopup === strategyName ? null : strategyName
                            );
                          }}
                          className={`p-1 rounded hover:bg-ink-200 dark:hover:bg-trading-dark-700 ${hasGroupFilter ? 'text-primary-700 dark:text-primary-300' : 'text-ink-500 dark:text-ink-400'}`}
                          title={t('widgetsB.filterGroup')}
                        >
                          <Filter className="w-4 h-4" />
                        </button>
                      </div>
                      {/* Group Filter Popup */}
                      {groupFilterPopup === strategyName && (
                        <div className="absolute right-4 top-full mt-1 w-64 bg-white dark:bg-trading-dark-800 border border-surface-line dark:border-trading-dark-600 rounded-lg shadow-xl z-50 p-3">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-surface-line dark:border-trading-dark-600">
                              <span className="text-sm font-medium text-ink-900 dark:text-white">
                                {t('widgetsB.filter')}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resetGroupFilter(strategyName);
                                }}
                                className="text-xs text-primary-700 dark:text-primary-300 hover:underline"
                              >
                                Reset
                              </button>
                            </div>
                            {/* Expiration Filter */}
                            <div>
                              <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                                {t('widgetsB.expiresWithin')}
                              </label>
                              <select
                                value={groupFilter.expiration}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateGroupFilter(strategyName, { expiration: e.target.value });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full px-2 py-1 bg-white dark:bg-trading-dark-700 border border-ink-200 dark:border-trading-dark-500 rounded text-xs"
                              >
                                <option value="all">{t('widgetsB.all')}</option>
                                <option value="1">{t('widgetsB.week1')}</option>
                                <option value="2">{t('widgetsB.weeks2')}</option>
                                <option value="4">{t('widgetsB.weeks4')}</option>
                                <option value="8">{t('widgetsB.weeks8')}</option>
                              </select>
                            </div>
                            {/* Category Filters */}
                            <div className="space-y-1">
                              <label className="flex items-center gap-2 text-xs text-ink-700 dark:text-ink-300 cursor-pointer p-1 rounded hover:bg-surface dark:hover:bg-trading-dark-700/50">
                                <input
                                  type="checkbox"
                                  checked={groupFilter.opportunities}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateGroupFilter(strategyName, {
                                      opportunities: e.target.checked,
                                    });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-3 h-3 rounded border-ink-200 dark:border-trading-dark-500"
                                />
                                <Target className="w-3 h-3 text-positive-600 dark:text-positive-500" />
                                <span>Opportunities</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs text-ink-700 dark:text-ink-300 cursor-pointer p-1 rounded hover:bg-surface dark:hover:bg-trading-dark-700/50">
                                <input
                                  type="checkbox"
                                  checked={groupFilter.alerts}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateGroupFilter(strategyName, { alerts: e.target.checked });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-3 h-3 rounded border-ink-200 dark:border-trading-dark-500"
                                />
                                <AlertCircle className="w-3 h-3 text-negative-600 dark:text-negative-500" />
                                <span>Alerts</span>
                              </label>
                              <label className="flex items-center gap-2 text-xs text-ink-700 dark:text-ink-300 cursor-pointer p-1 rounded hover:bg-surface dark:hover:bg-trading-dark-700/50">
                                <input
                                  type="checkbox"
                                  checked={groupFilter.ideas}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateGroupFilter(strategyName, { ideas: e.target.checked });
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-3 h-3 rounded border-ink-200 dark:border-trading-dark-500"
                                />
                                <Lightbulb className="w-3 h-3 text-caution-600 dark:text-caution-500" />
                                <span>Ideas</span>
                              </label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Only render positions if group is not collapsed */}
                  {!isCollapsed && (
                    <>
                      {/* Render spreads first, then standalone positions */}
                      {(() => {
                        // Separate spreads and standalone positions for this strategy
                        const strategySpreadIds = new Set<string>();
                        const strategyStandalonePositions: Position[] = [];

                        filteredGroupPositions.forEach((position) => {
                          const spreadId = getSpreadId(position);
                          if (spreadId) {
                            strategySpreadIds.add(spreadId);
                          } else {
                            strategyStandalonePositions.push(position);
                          }
                        });

                        // Get spreads that belong to this strategy
                        const strategySpreads = spreads.filter((spread) =>
                          strategySpreadIds.has(spread.id)
                        );

                        return (
                          <>
                            {/* Render spreads */}
                            {strategySpreads.map((spread) => {
                              const summary = calculateSpreadSummary(spread.legs);
                              if (!summary) return null;

                              const isExpanded = expandedSpreads.has(spread.id);
                              const isProfitable = summary.totalPnL >= 0;

                              // Calculate DTE
                              const daysToExpiration = summary.expiration
                                ? getDaysToExpiration(summary.expiration)
                                : 0;

                              // Get stock price from tickers store for live updates
                              const spreadTickerData = tickers.find(
                                (t) => t.symbol.toUpperCase() === summary.ticker.toUpperCase()
                              );
                              const currentStockPrice = spreadTickerData?.currentPrice || 0;
                              const priceDifference = currentStockPrice - summary.shortStrike;

                              // Check if spread has reached 80% of max profit
                              const isExpired = daysToExpiration <= 0;
                              const profitPercent =
                                summary.maxProfit !== 0
                                  ? (summary.totalPnL / summary.maxProfit) * 100
                                  : 0;
                              const hasOpportunity =
                                !isExpired && isProfitable && profitPercent >= 80;
                              const opportunityMessage = hasOpportunity
                                ? t('widgetsB.opportunityMaxProfit', {
                                    percent: formatNumber(profitPercent, 0),
                                  })
                                : '';

                              // Check if expires this week (alert)
                              const expiresThisWeek = daysToExpiration > 0 && daysToExpiration <= 7;
                              const expiresWithinTwoWeeks =
                                daysToExpiration > 7 && daysToExpiration <= 14;

                              // Check for external alerts from central evaluator (e.g., put spread alert)
                              // Get alerts for the spread by checking any leg's spread ID
                              const spreadExternalAlerts = spread.legs.flatMap((leg) => {
                                const legAlerts = positionAlerts.get(leg.id) || [];
                                return legAlerts;
                              });
                              // Remove duplicates (same alert might match multiple legs)
                              const uniqueSpreadAlerts = spreadExternalAlerts.filter(
                                (alert, index, self) =>
                                  index === self.findIndex((a) => a.id === alert.id)
                              );
                              const hasExternalSpreadAlert = uniqueSpreadAlerts.length > 0;
                              const spreadAlertMessage = hasExternalSpreadAlert
                                ? uniqueSpreadAlerts.map((a) => a.message).join('\n')
                                : '';

                              const hasAlert =
                                isExpired || expiresThisWeek || hasExternalSpreadAlert;
                              // Alert message only shows spread-specific alerts (not expiration which is already visible)
                              const alertMessage = hasExternalSpreadAlert
                                ? spreadAlertMessage
                                : isExpired
                                  ? t('widgetsB.spreadExpired')
                                  : expiresThisWeek
                                    ? t('widgetsB.spreadExpiresInDays', { days: daysToExpiration })
                                    : '';

                              // Determine border color based on expiration or alerts
                              const getSpreadBorderColor = () => {
                                if (isExpired || expiresThisWeek) return 'border-l-red-500';
                                if (hasExternalSpreadAlert || expiresWithinTwoWeeks)
                                  return 'border-l-amber-400';
                                return 'border-l-gray-300 dark:border-l-gray-600';
                              };

                              return (
                                <React.Fragment key={spread.id}>
                                  {/* Spread Summary Row */}
                                  <SpreadSummaryRow
                                    spread={spread}
                                    summary={summary}
                                    isExpanded={isExpanded}
                                    currentStockPrice={currentStockPrice}
                                    priceDifference={priceDifference}
                                    spreadTickerData={spreadTickerData}
                                    daysToExpiration={daysToExpiration}
                                    expiresWithinTwoWeeks={expiresWithinTwoWeeks}
                                    hasAlert={hasAlert}
                                    alertMessage={alertMessage}
                                    uniqueSpreadAlerts={uniqueSpreadAlerts}
                                    hasOpportunity={hasOpportunity}
                                    opportunityMessage={opportunityMessage}
                                    currencySymbol={currencySymbol}
                                    spreadBorderColor={getSpreadBorderColor()}
                                    showTooltip={showTooltip}
                                    getTooltipRef={getTooltipRef}
                                    onSetShowTooltip={setShowTooltip}
                                    onToggleSpread={toggleSpread}
                                    onViewSpread={(legs, price) =>
                                      setSpreadToView({ legs, currentStockPrice: price })
                                    }
                                    onRollSpread={(longLeg, shortLeg) =>
                                      setSpreadToRoll({ longLeg, shortLeg })
                                    }
                                    onCloseSpread={(firstLeg) => setPositionToClose(firstLeg)}
                                  />
                                  {/* Expanded Legs */}
                                  {isExpanded &&
                                    spread.legs.map((legPosition) => {
                                      const option = legPosition as CallOption | PutOption;
                                      const isCall = option.type === 'call';
                                      const isBuy = option.action === 'buy';

                                      // Get ticker data for leg
                                      const legTickerData = tickers.find(
                                        (t) =>
                                          t.symbol.toUpperCase() === option.ticker.toUpperCase()
                                      );
                                      const legStockPrice = legTickerData?.currentPrice || 0;

                                      // Calculate collateral info for leg
                                      let legCollateralType: CollateralType = 'none';
                                      let legCollateralValue = 0;
                                      let legCollateralDescription = '';

                                      if (!isBuy) {
                                        if (isCall) {
                                          // Short call in a spread - check if this is part of a spread
                                          const longCallLeg = spread.legs.find(
                                            (leg) =>
                                              leg.type === 'call' &&
                                              'action' in leg &&
                                              leg.action === 'buy'
                                          ) as CallOption | undefined;

                                          if (longCallLeg) {
                                            // This is a call spread - show the long call as the protective collateral
                                            legCollateralType = 'call';
                                            legCollateralValue = longCallLeg.strike;
                                            const spreadWidth = Math.abs(
                                              option.strike - longCallLeg.strike
                                            );
                                            legCollateralDescription = t(
                                              'widgetsB.protectedByLongCall',
                                              {
                                                strike: longCallLeg.strike,
                                                width: spreadWidth,
                                                contracts: option.contracts,
                                                total: spreadWidth * 100 * option.contracts,
                                              }
                                            );
                                          } else {
                                            // Standalone short call - check for stock or LEAPS as collateral
                                            const stockPosition = positions.find(
                                              (p) =>
                                                (p.type === 'stock' || p.type === 'etf') &&
                                                p.ticker.toUpperCase() ===
                                                  option.ticker.toUpperCase() &&
                                                p.status === 'open'
                                            );

                                            if (stockPosition && 'shares' in stockPosition) {
                                              legCollateralType = 'stock';
                                              legCollateralValue = stockPosition.costBasis || 0;
                                              legCollateralDescription = t(
                                                'widgetsB.callCoveredByShares',
                                                {
                                                  shares: stockPosition.shares,
                                                  ticker: option.ticker,
                                                }
                                              );
                                            } else {
                                              // Check for LEAPS as collateral (PMCC)
                                              const leapsPosition = positions.find(
                                                (p) =>
                                                  p.type === 'call' &&
                                                  'action' in p &&
                                                  p.action === 'buy' &&
                                                  p.ticker.toUpperCase() ===
                                                    option.ticker.toUpperCase() &&
                                                  p.status === 'open' &&
                                                  isLEAPS(p as CallOption)
                                              ) as CallOption | undefined;

                                              if (leapsPosition) {
                                                legCollateralType = 'leaps';
                                                legCollateralValue = leapsPosition.costBasis;
                                                legCollateralDescription = t(
                                                  'widgetsB.callCoveredByLeaps'
                                                );
                                              }
                                            }
                                          }
                                        } else {
                                          // Short put in a spread - check if this is part of a spread
                                          const longPutLeg = spread.legs.find(
                                            (leg) =>
                                              leg.type === 'put' &&
                                              'action' in leg &&
                                              leg.action === 'buy'
                                          ) as PutOption | undefined;

                                          if (longPutLeg) {
                                            // This is a put spread - show the long put as the protective collateral
                                            legCollateralType = 'put';
                                            legCollateralValue = longPutLeg.strike;
                                            const spreadWidth = Math.abs(
                                              option.strike - longPutLeg.strike
                                            );
                                            legCollateralDescription = t(
                                              'widgetsB.protectedByLongPut',
                                              {
                                                strike: longPutLeg.strike,
                                                width: spreadWidth,
                                                contracts: option.contracts,
                                                total: spreadWidth * 100 * option.contracts,
                                              }
                                            );
                                          } else {
                                            // Standalone short put - cash secured
                                            legCollateralType = 'cash';
                                            legCollateralValue =
                                              option.strike * option.contracts * 100;
                                            legCollateralDescription = t(
                                              'widgetsB.putRequiresCash',
                                              {
                                                amount: formatCurrency(
                                                  legCollateralValue,
                                                  currencySymbol
                                                ),
                                              }
                                            );
                                          }
                                        }
                                      }

                                      // Get LEAPS info if collateral is LEAPS
                                      let legLeapsInfo:
                                        | { ticker: string; expiration: string }
                                        | undefined;
                                      if (legCollateralType === 'leaps') {
                                        const leapsPosition = positions.find(
                                          (p) =>
                                            p.type === 'call' &&
                                            'action' in p &&
                                            p.action === 'buy' &&
                                            p.ticker.toUpperCase() ===
                                              option.ticker.toUpperCase() &&
                                            p.status === 'open' &&
                                            isLEAPS(p as CallOption)
                                        ) as CallOption | undefined;

                                        if (leapsPosition) {
                                          legLeapsInfo = {
                                            ticker: leapsPosition.ticker,
                                            expiration: leapsPosition.expiration,
                                          };
                                        }
                                      }

                                      return (
                                        <OptionRow
                                          key={option.id}
                                          option={option}
                                          currencySymbol={currencySymbol}
                                          tickerData={legTickerData}
                                          stockPrice={legStockPrice}
                                          onRoll={(opt) => setPositionToRoll(opt)}
                                          onClose={(opt) => setPositionToClose(opt)}
                                          onAssign={(opt) => setPositionToAssign(opt)}
                                          onClick={(opt) => setPositionToView(opt)}
                                          showActions={true}
                                          collateralType={legCollateralType}
                                          collateralValue={legCollateralValue}
                                          collateralDescription={legCollateralDescription}
                                          leapsInfo={legLeapsInfo}
                                          isSubItem={true}
                                        />
                                      );
                                    })}
                                </React.Fragment>
                              );
                            })}

                            {/* Render standalone positions */}
                            {strategyStandalonePositions.map((position) => {
                              // Check if this is a stock/ETF or option
                              // NOTE: stocks/ETFs are excluded from groupedAllPositions and rendered
                              // by GroupedStockList above, so this branch is currently unreachable.
                              // If you ever re-add stocks to groupedAllPositions, remove this branch
                              // to avoid double-rendering them.
                              const isStockOrETF =
                                position.type === 'stock' || position.type === 'etf';

                              if (isStockOrETF) {
                                // Render stock/ETF row using StockRow component
                                const stock = position as StockPosition;

                                // Get ticker data for current price from Redux store
                                const tickerData = tickers.find((t) => t.symbol === stock.ticker);

                                // Compute aggregate covered-call capacity for this ticker
                                const stockTickerLots = positions.filter(
                                  (p): p is StockPosition =>
                                    (p.type === 'stock' || p.type === 'etf') &&
                                    p.status === 'open' &&
                                    p.portfolio === stock.portfolio &&
                                    p.ticker === stock.ticker
                                );
                                const stockTickerSoldCalls = positions.filter(
                                  (p): p is CallOption =>
                                    p.type === 'call' &&
                                    (p as CallOption).action === 'sell' &&
                                    p.status === 'open' &&
                                    p.portfolio === stock.portfolio &&
                                    p.ticker === stock.ticker
                                );
                                const stockCcCapacity = computeCoveredCallCapacity(
                                  stockTickerLots,
                                  stockTickerSoldCalls
                                );

                                const coveredCallContracts = stockCcCapacity.coveredContracts;

                                // Check for opportunities from central evaluator
                                const stockOpportunities =
                                  positionOpportunities.get(stock.id) || [];
                                const hasStockOpportunity = stockOpportunities.length > 0;
                                const stockOpportunityMessage = hasStockOpportunity
                                  ? stockOpportunities.map((o) => o.message).join('\n')
                                  : '';

                                return (
                                  <StockRow
                                    key={position.id}
                                    position={stock}
                                    ticker={tickerData}
                                    currency={currency}
                                    onClose={(pos) => setPositionToClose(pos)}
                                    onView={(pos) => setPositionToView(pos)}
                                    showActions={true}
                                    showOpportunityBadge={hasOptionsAccess}
                                    coveredCallContracts={coveredCallContracts}
                                    hasOpportunity={hasOptionsAccess && hasStockOpportunity}
                                    opportunityMessage={stockOpportunityMessage}
                                    canWriteCoveredCallsOverride={
                                      stockCcCapacity.canWriteCoveredCall
                                    }
                                  />
                                );
                              }

                              // Render option row using OptionRow component
                              const option = position as CallOption | PutOption;
                              const isCall = option.type === 'call';
                              const isBuy = option.action === 'buy';

                              // Calculate DTE
                              const daysToExpiration = option.expiration
                                ? getDaysToExpiration(option.expiration)
                                : 0;

                              // Get stock price from tickers store
                              const tickerData = tickers.find(
                                (t) => t.symbol.toUpperCase() === option.ticker.toUpperCase()
                              );
                              const stockPrice = tickerData?.currentPrice || 0;

                              // Check if option is expired
                              const isExpired = daysToExpiration < 0;

                              // Check for external alerts from central evaluator
                              const externalAlerts = positionAlerts.get(option.id) || [];
                              const hasExternalAlert = externalAlerts.length > 0;

                              // Determine if there's an alert
                              const hasAlert = isExpired || hasExternalAlert;
                              const alertMessage = isExpired
                                ? t('widgetsB.optionExpired')
                                : hasExternalAlert
                                  ? externalAlerts.map((a) => a.message).join('\n')
                                  : '';

                              // Check for opportunities from central evaluator
                              const externalOpportunities =
                                positionOpportunities.get(option.id) || [];
                              const hasOpportunity = externalOpportunities.length > 0;
                              const opportunityMessage = hasOpportunity
                                ? externalOpportunities.map((o) => o.message).join('\n')
                                : '';

                              // Calculate collateral info
                              let collateralType: CollateralType = 'none';
                              let collateralValue = 0;
                              let collateralDescription = '';

                              // Resolve the actual parent of this short call via the
                              // shared allocator (stocks before LEAPS, honouring underlyingId).
                              const coverage = callCoverageByCallId.get(option.id);
                              let leapsInfo: { ticker: string; expiration: string } | undefined;

                              if (!isBuy) {
                                if (isCall) {
                                  if (coverage?.kind === 'stock') {
                                    collateralType = 'stock';
                                    collateralValue = coverage.costBasis || 0;
                                    collateralDescription = `This call is covered by ${coverage.shares} shares of ${option.ticker}. On assignment you deliver the shares, no cash required.`;
                                  } else if (coverage?.kind === 'leaps') {
                                    collateralType = 'leaps';
                                    collateralValue = coverage.leap.costBasis;
                                    collateralDescription =
                                      'This call is covered by your LEAPS call. The LEAPS acts as collateral instead of shares (PMCC strategy).';
                                    leapsInfo = {
                                      ticker: coverage.leap.ticker,
                                      expiration: coverage.leap.expiration,
                                    };
                                  }
                                  // No coverage found → naked short call (collateralType stays 'none').
                                } else {
                                  // Short put - cash secured
                                  collateralType = 'cash';
                                  collateralValue = option.strike * option.contracts * 100;
                                  collateralDescription = `This put requires ${formatCurrency(collateralValue, currencySymbol)} cash as collateral for a possible assignment.`;
                                }
                              }

                              return (
                                <OptionRow
                                  key={option.id}
                                  option={option}
                                  currencySymbol={currencySymbol}
                                  tickerData={tickerData}
                                  stockPrice={stockPrice}
                                  onRoll={(opt) => setPositionToRoll(opt)}
                                  onClose={(opt) => setPositionToClose(opt)}
                                  onAssign={(opt) => setPositionToAssign(opt)}
                                  onClick={(opt) => setPositionToView(opt)}
                                  onNavigateToCampaigns={onNavigateToCampaigns}
                                  showActions={true}
                                  hasAlert={hasAlert}
                                  alertMessage={alertMessage}
                                  hasOpportunity={hasOpportunity}
                                  opportunityMessage={opportunityMessage}
                                  collateralType={collateralType}
                                  collateralValue={collateralValue}
                                  collateralDescription={collateralDescription}
                                  leapsInfo={leapsInfo}
                                />
                              );
                            })}
                          </>
                        );
                      })()}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Close Position Modal */}
      {positionToClose && (
        <ClosePositionModal
          isOpen={!!positionToClose}
          onClose={() => setPositionToClose(null)}
          onConfirm={handleClosePosition}
          position={positionToClose}
          currency={currency}
          allPositions={positions}
          onConfirmSpread={handleCloseSpread}
        />
      )}

      {/* Roll Option Modal */}
      {positionToRoll && (
        <RollOptionModal
          isOpen={!!positionToRoll}
          onClose={() => setPositionToRoll(null)}
          onConfirm={handleRollOption}
          position={positionToRoll}
          currency={currency}
        />
      )}

      {/* Spread Roll Modal */}
      {spreadToRoll && (
        <SpreadRollModal
          isOpen={!!spreadToRoll}
          onClose={() => setSpreadToRoll(null)}
          onConfirm={handleRollSpread}
          longLeg={spreadToRoll.longLeg}
          shortLeg={spreadToRoll.shortLeg}
          currency={currency}
        />
      )}

      {/* Assignment Modal */}
      {positionToAssign && (
        <AssignmentModal
          isOpen={!!positionToAssign}
          onClose={() => setPositionToAssign(null)}
          onConfirm={handleAssignment}
          position={positionToAssign}
          currency={currency}
        />
      )}

      {/* Position Detail Modal */}
      {positionToView && (
        <PositionDetailModal
          isOpen={!!positionToView}
          onClose={() => setPositionToView(null)}
          onSave={(updatedPosition) => {
            dispatch(editPosition(updatedPosition, new Date().toISOString()));
            setPositionToView(null);
          }}
          position={positionToView}
          currency={currency}
        />
      )}

      {/* Spread Detail Modal */}
      {spreadToView && (
        <SpreadDetailModal
          isOpen={!!spreadToView}
          onClose={() => setSpreadToView(null)}
          onSave={(updatedLegs) => {
            // Update both legs
            updatedLegs.forEach((leg) => {
              dispatch(editPosition(leg, new Date().toISOString()));
            });
            setSpreadToView(null);
          }}
          legs={spreadToView.legs}
          currentStockPrice={spreadToView.currentStockPrice}
          currency={currency}
        />
      )}
    </div>
  );
};
