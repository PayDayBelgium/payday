import React, { useMemo, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Building2, X as XIcon, ArrowUpCircle, ArrowDownCircle, MessageSquare, ChevronDown, ChevronUp, ChevronRight, Target, AlertCircle, Lightbulb, Filter, Redo2, Layers, ArrowDownLeft } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { closePosition, updatePosition } from '../../store/slices/positionsSlice';
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
import { addPosition } from '../../store/slices/positionsSlice';
import { updateWheelPhase, incrementWheelCycle, updateWheelPremium } from '../../store/slices/wheelsSlice';
import type { StockPosition } from '../../types';
import type { Position, CurrencyType, CallOption, PutOption } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { parseNumberInput, validateNumberInput } from '../../utils/inputFormat';
import { getSpreadId } from '../../utils/spreadHelpers';
import { computeCoveredCallCapacity } from '../../utils/coveredCallEligibility';
import { StockRow } from './StockRow';
import { OptionRow } from './OptionRow';
import type { CollateralType } from './OptionRow';
import { calculateOptionUnrealizedPnL, calculatePnLPercentage } from '../../utils/pnlCalculations';
import { AlertTooltipContent } from '../common/AlertTooltipContent';
import { PortalTooltip } from '../common/PortalTooltip';

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
}

interface GroupedPosition {
  ticker: string;
  name?: string;
  type: 'stock' | 'etf';
  positions: Position[];
  totalShares: number;
  avgPurchasePrice: number;
  totalCostBasis: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  positions,
  currency,
  portfolioName,
  portfolioCurrentValue,
  className = '',
  onNavigateToCampaigns,
}) => {
  const dispatch = useAppDispatch();
  const tickers = useAppSelector(selectAllTickers);
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);
  const storePositions = useAppSelector((state) => state.positions.positions);
  const unlockedLevels = useAppSelector(selectUnlockedLevels);
  const hasOptionsAccess = isFeatureAvailable('covered_calls', unlockedLevels);
  const currencySymbol = getCurrencySymbol(currency);

  // Use central alerts hook for this portfolio
  const { getAlertsForPosition, getOpportunitiesForPosition } = useAlerts(portfolioName);

  // Create a map of position IDs to their opportunities for quick lookup
  const positionOpportunities = useMemo(() => {
    const map = new Map<string, AlertItem[]>();
    positions.forEach(pos => {
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
    positions.forEach(pos => {
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
  const [spreadToRoll, setSpreadToRoll] = useState<{ longLeg: CallOption | PutOption; shortLeg: CallOption | PutOption } | null>(null);
  const [positionToView, setPositionToView] = useState<Position | null>(null);
  const [spreadToView, setSpreadToView] = useState<{ legs: Position[]; currentStockPrice: number } | null>(null);
  const [sortField, setSortField] = useState<SortField>('expiration');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [groupBy, setGroupBy] = useState<GroupBy>('none');
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
  const [groupFilters, setGroupFilters] = useState<Record<string, {
    expiration: string;
    opportunities: boolean;
    alerts: boolean;
    ideas: boolean;
  }>>({});

  // Helper to get or create ref for tooltip
  const getTooltipRef = (id: string) => {
    if (!tooltipRefs.current[id]) {
      tooltipRefs.current[id] = React.createRef<HTMLDivElement>();
    }
    return tooltipRefs.current[id];
  };

  // Helper to toggle spread expansion
  const toggleSpread = (spreadId: string) => {
    setExpandedSpreads(prev => {
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
    setCollapsedGroups(prev => {
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
    return groupFilters[groupName] || {
      expiration: 'all',
      opportunities: false,
      alerts: false,
      ideas: false,
    };
  };

  // Helper to update group filter
  const updateGroupFilter = (groupName: string, updates: Partial<{
    expiration: string;
    opportunities: boolean;
    alerts: boolean;
    ideas: boolean;
  }>) => {
    setGroupFilters(prev => ({
      ...prev,
      [groupName]: {
        ...getGroupFilter(groupName),
        ...updates,
      },
    }));
  };

  // Helper to reset group filter
  const resetGroupFilter = (groupName: string) => {
    setGroupFilters(prev => {
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

  // Helper to calculate DTE
  const calculateDTE = (expiration: string | undefined): number => {
    if (!expiration) return 0;
    return getDaysToExpiration(expiration);
  };

  // Helper to check if option is LEAP (>90 days / 3 months)
  const isLEAPS = (position: Position): boolean => {
    if (position.type !== 'call') return false;
    const option = position as CallOption;
    return calculateDTE(option.expiration) > 90;
  };

  // Helper to calculate spread summary
  const calculateSpreadSummary = (legs: Position[]) => {
    if (legs.length !== 2) return null;

    const options = legs as (CallOption | PutOption)[];
    const longLeg = options.find(o => o.action === 'buy');
    const shortLeg = options.find(o => o.action === 'sell');

    if (!longLeg || !shortLeg) return null;

    const isCredit = shortLeg.premium > longLeg.premium;
    const netPremium = (shortLeg.premium - longLeg.premium) * shortLeg.contracts * 100;
    const spreadWidth = Math.abs(shortLeg.strike - longLeg.strike);
    const totalCostBasis = longLeg.costBasis + shortLeg.costBasis;
    const totalCurrentValue = longLeg.currentValue + shortLeg.currentValue;
    const totalPnL = totalCurrentValue - totalCostBasis;

    const maxProfit = isCredit
      ? netPremium
      : (spreadWidth - Math.abs(netPremium / (shortLeg.contracts * 100))) * shortLeg.contracts * 100;

    const maxLoss = isCredit
      ? (spreadWidth - Math.abs(netPremium / (shortLeg.contracts * 100))) * shortLeg.contracts * 100
      : Math.abs(netPremium);

    return {
      ticker: longLeg.ticker,
      type: longLeg.type,
      spreadType: isCredit ? 'credit' : 'debit',
      contracts: shortLeg.contracts,
      longStrike: longLeg.strike,
      shortStrike: shortLeg.strike,
      expiration: longLeg.expiration,
      netPremium,
      spreadWidth,
      maxProfit,
      maxLoss,
      totalPnL,
      totalCostBasis,
      totalCurrentValue,
      collateral: isCredit ? spreadWidth * shortLeg.contracts * 100 : 0,
    };
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

  // Group positions by ticker
  const groupedPositions = useMemo(() => {
    const groups: Record<string, GroupedPosition> = {};

    positions
      .filter(p => p.status === 'open' && (p.type === 'stock' || p.type === 'etf'))
      .forEach((position) => {
        if (position.type !== 'stock' && position.type !== 'etf') return;

        const ticker = position.ticker;

        if (!groups[ticker]) {
          groups[ticker] = {
            ticker,
            name: position.name,
            type: position.type,
            positions: [],
            totalShares: 0,
            avgPurchasePrice: 0,
            totalCostBasis: 0,
            currentValue: 0,
            unrealizedPnL: 0,
            unrealizedPnLPercent: 0,
          };
        }

        const group = groups[ticker];
        group.positions.push(position);
        group.totalShares += position.shares;
        group.totalCostBasis += position.costBasis;
        group.currentValue += position.currentValue;
      });

    // Calculate averages and P&L for each group
    Object.values(groups).forEach((group) => {
      group.avgPurchasePrice = group.totalCostBasis / group.totalShares;
      group.unrealizedPnL = group.currentValue - group.totalCostBasis;
      group.unrealizedPnLPercent = (group.unrealizedPnL / group.totalCostBasis) * 100;
    });

    return Object.values(groups).sort((a, b) => a.ticker.localeCompare(b.ticker));
  }, [positions]);

  // Get ALL positions (stocks, ETFs, and options) with sorting
  const allPositions = useMemo(() => {
    const allPos = positions.filter(p => p.status === 'open');

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
        case 'expiration':
          const dateA = optionA.expiration ? new Date(optionA.expiration).getTime() : 0;
          const dateB = optionB.expiration ? new Date(optionB.expiration).getTime() : 0;
          compareValue = dateA - dateB;
          break;
        case 'ticker':
          compareValue = optionA.ticker.localeCompare(optionB.ticker);
          break;
        case 'strike':
          compareValue = optionA.strike - optionB.strike;
          break;
        case 'premium':
          compareValue = optionA.premium - optionB.premium;
          break;
        case 'dte':
          const dteA = optionA.expiration ? getDaysToExpiration(optionA.expiration) : 0;
          const dteB = optionB.expiration ? getDaysToExpiration(optionB.expiration) : 0;
          compareValue = dteA - dteB;
          break;
        case 'pnl':
          const pnlA = optionA.currentValue - optionA.costBasis;
          const pnlB = optionB.currentValue - optionB.costBasis;
          compareValue = pnlA - pnlB;
          break;
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
      filtered = filtered.filter(p => p.ticker.toLowerCase().includes(searchLower));
    }

    // Expiration filter
    if (filterExpiration !== 'all') {
      const weeks = parseInt(filterExpiration, 10);
      const daysThreshold = weeks * 7;
      filtered = filtered.filter(p => {
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
      filtered = filtered.filter(p => {
        if (p.type === 'stock' || p.type === 'etf') {
          // Check for Covered Call opportunity
          const stock = p as any;

          const tickerLots = positions.filter(
            (p): p is StockPosition =>
              (p.type === 'stock' || p.type === 'etf') &&
              p.status === 'open' &&
              p.portfolio === stock.portfolio &&
              p.ticker === stock.ticker
          );
          const tickerSoldCalls = positions.filter(
            (p): p is CallOption =>
              p.type === 'call' &&
              (p as CallOption).action === 'sell' &&
              p.status === 'open' &&
              p.portfolio === stock.portfolio &&
              p.ticker === stock.ticker
          );
          const ccCapacity = computeCoveredCallCapacity(tickerLots, tickerSoldCalls);
          return ccCapacity.canWriteCoveredCall;
        } else if (p.type === 'call' || p.type === 'put') {
          // Check for option opportunity - 80% of max profit reached
          const option = p as CallOption | PutOption;
          const isBuy = option.action === 'buy';
          const nominalProfit = option.currentValue - option.costBasis;
          const profitPercent = option.costBasis !== 0 ? (nominalProfit / Math.abs(option.costBasis)) * 100 : 0;

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
      filtered = filtered.filter(p => {
        if (p.type === 'call' || p.type === 'put') {
          const option = p as CallOption | PutOption;
          const isCall = option.type === 'call';

          // Calculate DTE
          const daysToExpiration = option.expiration
            ? getDaysToExpiration(option.expiration)
            : 0;

          // Check if put expires this week
          const expiresThisWeek = daysToExpiration > 0 && daysToExpiration <= 7;

          // For puts: Check if position is in trouble based on P&L
          // If it's a sold put (short) and we're losing money, the stock price is likely below strike
          // If it's a bought put (long) and we're making money, the stock price is likely below strike
          const nominalPnL = option.currentValue - option.costBasis;
          const putAlert = !isCall && (
            (option.action === 'sell' && nominalPnL < 0) || // Short put losing money (stock below strike)
            (option.action === 'buy' && nominalPnL > 0) // Long put making money (stock below strike)
          );

          return putAlert || (!isCall && expiresThisWeek);
        }
        return false;
      });
    }

    return filtered;
  }, [allPositions, tickerSearch, filterExpiration, filterOpportunities, filterAlerts, positions]);

  // Pre-process positions to identify spreads
  const { spreads, standalonePositions } = useMemo(() => {
    const spreadMap = new Map<string, Position[]>();
    const standalone: Position[] = [];

    filteredPositions.forEach(position => {
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

  // Group all positions by strategy if needed
  // This groups both standalone positions and spreads
  const groupedAllPositions = useMemo(() => {
    if (groupBy === 'none') {
      return { 'Alle Posities': filteredPositions };
    }

    const groups: Record<string, Position[]> = {};
    const processedSpreadIds = new Set<string>();

    filteredPositions.forEach(position => {
      // Check if this is part of a spread
      const spreadId = getSpreadId(position);

      // If it's part of a spread, only process once (when we encounter the first leg)
      if (spreadId) {
        if (processedSpreadIds.has(spreadId)) {
          return; // Skip - already processed this spread
        }
        processedSpreadIds.add(spreadId);

        // Find the spread type from the legs
        const spreadLegs = spreads.find(s => s.id === spreadId);
        if (spreadLegs && spreadLegs.legs.length === 2) {
          const firstLeg = spreadLegs.legs[0] as CallOption | PutOption;

          let groupName = 'Andere';
          if (groupBy === 'strategy') {
            groupName = firstLeg.type === 'call' ? 'Call Spreads' : 'Put Spreads';
          } else if (groupBy === 'expiry') {
            groupName = firstLeg.expiration;
          } else if (groupBy === 'ticker') {
            groupName = firstLeg.ticker;
          } else if (groupBy === 'action') {
            // For spreads, check the first leg action
            groupName = firstLeg.action === 'buy' ? 'Long' : 'Short';
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
      let groupName = 'Andere';

      if (groupBy === 'strategy') {
        // Stocks and ETFs
        if (position.type === 'stock' || position.type === 'etf') {
          groupName = 'Aandelen en ETFs';
        }
        // Options (standalone, not part of spreads)
        else if (position.type === 'put' || position.type === 'call') {
          const option = position as CallOption | PutOption;
          if (option.type === 'call') {
            groupName = 'Calls';
          } else {
            groupName = 'Puts';
          }
        }
      } else if (groupBy === 'expiry') {
        // Group by expiration date
        if (position.type === 'call' || position.type === 'put') {
          const option = position as CallOption | PutOption;
          groupName = option.expiration;
        } else {
          groupName = 'Geen expiratie';
        }
      } else if (groupBy === 'ticker') {
        // Group by ticker
        groupName = position.ticker;
      } else if (groupBy === 'action') {
        // Group by long/short
        // Stocks and ETFs are always Long
        if (position.type === 'stock' || position.type === 'etf') {
          groupName = 'Long';
        }
        // Options: buy = Long, sell = Short
        else if (position.type === 'put' || position.type === 'call') {
          const option = position as CallOption | PutOption;
          groupName = option.action === 'buy' ? 'Long' : 'Short';
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
        if (a === 'Geen expiratie') return 1;
        if (b === 'Geen expiratie') return -1;
        return new Date(a).getTime() - new Date(b).getTime();
      }
      return a.localeCompare(b);
    });

    sortedKeys.forEach(key => {
      sortedGroups[key] = groups[key];
    });

    return sortedGroups;
  }, [filteredPositions, groupBy, spreads]);

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
      if ('contracts' in positionToClose && 'action' in positionToClose && closeData.closePremium !== undefined) {
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
      const remainingCostBasis = (positionToClose.costBasis / positionToClose.shares) * remainingShares;
      const purchasePricePerShare = positionToClose.costBasis / positionToClose.shares;

      dispatch(updatePosition({
        ...positionToClose,
        shares: remainingShares,
        costBasis: remainingCostBasis,
        currentValue: remainingShares * purchasePricePerShare, // Will be updated by price service
      }));

      // Log transaction for partial sale
      const transaction = {
        id: `txn-${Date.now()}`,
        portfolio: portfolioName as any,
        date: closeData.closeDate,
        type: 'position_sell' as const,
        amount: closeValue,
        description: `Verkoop ${closeData.quantity} ${positionToClose.ticker} (gedeeltelijk)`,
        relatedPositionId: positionToClose.id,
        previousValue: portfolioCurrentValue,
        newValue: portfolioCurrentValue + realizedPnL,
        createdAt: new Date().toISOString(),
        notes: closeData.notes || `Verkocht ${closeData.quantity} van ${positionToClose.shares} aandelen. Realized P&L: ${formatCurrency(realizedPnL, currencySymbol)}`,
      };

      dispatch(addTransaction(transaction));
    } else {
      // Full close: close the position completely
      dispatch(closePosition({
        id: positionToClose.id,
        closeDate: closeData.closeDate,
        closePrice: closeData.closePrice,
        closePremium: closeData.closePremium,
        realizedPnL,
        notes: closeData.notes,
      }));

      // Log transaction for close
      // For bought options: we receive closeValue (can be 0 if worthless)
      // For sold options: we pay closeCost to buy back
      const transaction = {
        id: `txn-${Date.now()}`,
        portfolio: portfolioName as any,
        date: closeData.closeDate,
        type: 'position_sell' as const,
        amount: closeValue, // Cash received (can be 0 for worthless options)
        description: `Close ${positionToClose.type}: ${positionToClose.ticker}`,
        relatedPositionId: positionToClose.id,
        previousValue: portfolioCurrentValue,
        newValue: portfolioCurrentValue + realizedPnL,
        createdAt: new Date().toISOString(),
        notes: closeData.notes || `Realized P&L: ${formatCurrency(realizedPnL, currencySymbol)}`,
      };

      dispatch(addTransaction(transaction));
    }

    // Close modal
    setPositionToClose(null);
  };

  const handleCloseSpread = (spreadLegs: Position[], closeData: {
    closePremium: number;
    closeDate: string;
    notes?: string;
  }) => {
    // Close both legs of the spread
    const contractMultiplier = 100;
    let totalRealizedPnL = 0;
    let totalCloseValue = 0;

    spreadLegs.forEach(leg => {
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
      dispatch(closePosition({
        id: option.id,
        closeDate: closeData.closeDate,
        closePremium: closeData.closePremium,
        realizedPnL,
        notes: closeData.notes,
      }));
    });

    // Log a single transaction for the spread close
    const firstLeg = spreadLegs[0] as CallOption | PutOption;
    const transaction = {
      id: `txn-${Date.now()}`,
      portfolio: portfolioName as any,
      date: closeData.closeDate,
      type: 'position_sell' as const,
      amount: totalCloseValue,
      description: `Close ${firstLeg.type} spread: ${firstLeg.ticker}`,
      relatedPositionId: firstLeg.id,
      previousValue: portfolioCurrentValue,
      newValue: portfolioCurrentValue + totalRealizedPnL,
      createdAt: new Date().toISOString(),
      notes: closeData.notes || `Spread gesloten. Realized P&L: ${formatCurrency(totalRealizedPnL, currencySymbol)}`,
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
    dispatch(closePosition({
      id: positionToRoll.id,
      closeDate: rollData.closeDate,
      closePremium: rollData.closePremium,
      realizedPnL,
      notes: rollData.notes ? `Roll: ${rollData.notes}` : 'Rolled to new position',
    }));

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
      notes: `Rolled from ${positionToRoll.strike} strike (${new Date(positionToRoll.expiration).toLocaleDateString('nl-NL')})`,
      strategy: positionToRoll.strategy,
      // Preserve wheel and underlying links when rolling
      wheelId: positionToRoll.wheelId,
      underlyingId: positionToRoll.underlyingId,
    };

    dispatch(addPosition(newPosition));

    // 3. Log the roll transaction
    const optionType = positionToRoll.type === 'call' ? 'CALL' : 'PUT';
    const actionType = positionToRoll.action === 'sell' ? 'Short' : 'Long';

    // Calculate days difference between expirations
    const oldExpDate = new Date(positionToRoll.expiration);
    const newExpDate = new Date(rollData.newExpiration);
    const daysDiff = Math.round((newExpDate.getTime() - oldExpDate.getTime()) / (1000 * 60 * 60 * 24));

    // Determine roll type
    const isHorizontalRoll = positionToRoll.strike === rollData.newStrike && daysDiff !== 0;
    const isVerticalRoll = positionToRoll.strike !== rollData.newStrike && daysDiff === 0;
    const isDiagonalRoll = positionToRoll.strike !== rollData.newStrike && daysDiff !== 0;

    let rollTypeLabel = '';
    if (isHorizontalRoll) {
      rollTypeLabel = `Horizontaal (+${daysDiff}d)`;
    } else if (isVerticalRoll) {
      const direction = rollData.newStrike > positionToRoll.strike ? '↑' : '↓';
      rollTypeLabel = `Verticaal ${direction}`;
    } else if (isDiagonalRoll) {
      const direction = rollData.newStrike > positionToRoll.strike ? '↑' : '↓';
      rollTypeLabel = `Diagonaal ${direction} (+${daysDiff}d)`;
    }

    // Format dates for display
    const oldExpStr = oldExpDate.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short' });
    const newExpStr = newExpDate.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });

    const transaction = {
      id: `txn-${Date.now()}`,
      portfolio: portfolioName as any,
      date: rollData.closeDate,
      type: 'option_roll' as const,
      amount: netCashFlow, // Net cash received (credit) or paid (debit)
      description: `Roll ${actionType} ${optionType} ${positionToRoll.ticker} $${positionToRoll.strike} (${oldExpStr}) → $${rollData.newStrike} (${newExpStr})`,
      relatedPositionId: newPosition.id,
      previousValue: portfolioCurrentValue,
      newValue: portfolioCurrentValue + realizedPnL,
      createdAt: new Date().toISOString(),
      notes: rollData.notes || `${rollTypeLabel} • ${netCashFlow >= 0 ? 'Credit' : 'Debit'}: ${formatCurrency(Math.abs(netCashFlow), currencySymbol)}${daysDiff > 0 ? ` • +${daysDiff} dagen` : ''}`,
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
    const shortCloseValue = -rollData.shortLeg.closePremium * shortLeg.contracts * contractMultiplier;
    const shortRealizedPnL = -shortCloseValue - shortLeg.costBasis;

    // Calculate new position values
    const longNewCostBasis = rollData.longLeg.newPremium * longLeg.contracts * contractMultiplier;
    const shortNewCostBasis = -(rollData.shortLeg.newPremium * shortLeg.contracts * contractMultiplier);

    // Net cash flow for the roll
    const netCashFlow = longCloseValue + shortCloseValue
      - rollData.longLeg.newPremium * longLeg.contracts * contractMultiplier
      + rollData.shortLeg.newPremium * shortLeg.contracts * contractMultiplier;

    // 1. Close existing positions
    dispatch(closePosition({
      id: longLeg.id,
      closeDate: rollData.rollDate,
      closePremium: rollData.longLeg.closePremium,
      realizedPnL: longRealizedPnL,
      notes: rollData.notes ? `Spread Roll: ${rollData.notes}` : 'Rolled spread - long leg',
    }));

    dispatch(closePosition({
      id: shortLeg.id,
      closeDate: rollData.rollDate,
      closePremium: rollData.shortLeg.closePremium,
      realizedPnL: shortRealizedPnL,
      notes: rollData.notes ? `Spread Roll: ${rollData.notes}` : 'Rolled spread - short leg',
    }));

    // 2. Create new positions with linked spread ID
    const newSpreadId = `spread-${Date.now()}`;
    const spreadType = rollData.shortLeg.newPremium > rollData.longLeg.newPremium ? 'Credit' : 'Debit';

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
      cashReserved: Math.abs(rollData.shortLeg.newStrike - rollData.longLeg.newStrike) * shortLeg.contracts * 100,
      status: 'open',
      openDate: rollData.rollDate,
      notes: `${rollData.notes || ''}\nSpread ID: ${newSpreadId} (${spreadType} Spread - Short Leg)\nRolled from $${shortLeg.strike}`,
    };

    dispatch(addPosition(newLongPosition));
    dispatch(addPosition(newShortPosition));

    // 3. Log the roll transaction
    const optionType = longLeg.type === 'call' ? 'Call' : 'Put';
    const totalRealizedPnL = longRealizedPnL + shortRealizedPnL;
    const transaction = {
      id: `txn-${Date.now()}`,
      portfolio: portfolioName as any,
      date: rollData.rollDate,
      type: 'option_roll' as const,
      amount: netCashFlow,
      description: `Roll ${longLeg.ticker} ${optionType} Spread $${Math.min(longLeg.strike, shortLeg.strike)}/$${Math.max(longLeg.strike, shortLeg.strike)} → $${Math.min(rollData.longLeg.newStrike, rollData.shortLeg.newStrike)}/$${Math.max(rollData.longLeg.newStrike, rollData.shortLeg.newStrike)}`,
      relatedPositionId: newSpreadId,
      previousValue: portfolioCurrentValue,
      newValue: portfolioCurrentValue + totalRealizedPnL,
      createdAt: new Date().toISOString(),
      notes: rollData.notes || `Roll ${spreadType} ${optionType} Spread. ${netCashFlow >= 0 ? 'Credit' : 'Debit'}: ${formatCurrency(Math.abs(netCashFlow), currencySymbol)}`,
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
    dispatch(closePosition({
      id: option.id,
      closeDate: assignmentData.assignmentDate,
      closePremium: 0, // Option expires/assigned, no buyback
      realizedPnL,
      notes: assignmentData.notes ? `Assignment: ${assignmentData.notes}` : 'Assigned',
    }));

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

      dispatch(addPosition(newStockPosition));

      // Update Wheel phase if linked
      if (option.wheelId) {
        dispatch(updateWheelPhase({
          id: option.wheelId,
          phase: 'stock',
        }));
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
      const stockPosition = positions.find(p =>
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
          dispatch(closePosition({
            id: stockPosition.id,
            closeDate: assignmentData.assignmentDate,
            closePrice: option.strike,
            realizedPnL: stockRealizedPnL,
            notes: `Assigned from covered call at $${option.strike}`,
          }));
        } else {
          // Partial close - reduce shares
          const remainingShares = stockPosition.shares - shares;
          const remainingCostBasis = (stockPosition.costBasis / stockPosition.shares) * remainingShares;

          dispatch(updatePosition({
            ...stockPosition,
            shares: remainingShares,
            costBasis: remainingCostBasis,
            currentValue: remainingShares * (stockPosition.currentValue / stockPosition.shares),
          } as any));
        }

        // Update Wheel if linked
        if (option.wheelId) {
          // Increment cycle and move back to CSP phase
          dispatch(incrementWheelCycle(option.wheelId));
          dispatch(updateWheelPhase({
            id: option.wheelId,
            phase: 'csp',
          }));
          // Add the stock P&L to wheel
          dispatch(updateWheelPremium({
            id: option.wheelId,
            premiumCollected: 0,
            realizedPnL: stockRealizedPnL,
          }));
        }

        // Log transaction
        const transaction = {
          id: `txn-${Date.now()}`,
          portfolio: portfolioName as any,
          date: assignmentData.assignmentDate,
          type: 'position_sell' as const,
          amount: totalProceeds + premiumReceived,
          description: `Assignment: Verkoop ${shares} ${option.ticker} @ $${option.strike}`,
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
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center h-full min-h-[400px] ${className}`}>
        <div className="text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
          <p className="text-gray-600 dark:text-gray-400">Nog geen posities</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Voeg een positie toe om te beginnen
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-x-hidden ${className}`}>
      {/* Controls Bar - Fixed at top */}
      {allPositions.length > 0 && (
        <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 max-w-xs">
                <input
                  type="text"
                  placeholder="Zoek op ticker..."
                  value={tickerSearch}
                  onChange={(e) => setTickerSearch(e.target.value)}
                  className="w-full px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm"
                />
              </div>

              {/* Filter Button with Popup (only for users with options access) */}
              {hasOptionsAccess && (
              <div>
                <button
                  ref={filterButtonRef}
                  onClick={() => setShowFilterPopup(!showFilterPopup)}
                  className={`flex items-center gap-2 px-3 py-1 rounded text-sm font-medium transition-colors ${
                    filterExpiration !== 'all' || filterOpportunities || filterAlerts || filterIdeas
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-2 border-primary-500 dark:border-primary-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  {(filterExpiration !== 'all' || filterOpportunities || filterAlerts || filterIdeas) && (
                    <span className="ml-1 px-1.5 py-0.5 bg-primary-700 dark:bg-primary-500 text-white text-xs rounded-full">
                      {[
                        filterExpiration !== 'all' ? 1 : 0,
                        filterOpportunities ? 1 : 0,
                        filterAlerts ? 1 : 0,
                        filterIdeas ? 1 : 0
                      ].reduce((a, b) => a + b, 0)}
                    </span>
                  )}
                </button>

                {/* Filter Popup via Portal */}
                {showFilterPopup && createPortal(
                  <>
                    {/* Backdrop to close popup */}
                    <div
                      className="fixed inset-0 z-[9998]"
                      onClick={() => setShowFilterPopup(false)}
                    />

                    {/* Popup Content */}
                    <div
                      className="fixed w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-[9999] p-4"
                      style={{
                        top: `${filterPopupPosition.top}px`,
                        left: `${filterPopupPosition.left}px`,
                      }}
                    >
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                          <h3 className="font-semibold text-gray-900 dark:text-white">Filters</h3>
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
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Verloopt binnen:
                          </label>
                          <select
                            value={filterExpiration}
                            onChange={(e) => setFilterExpiration(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm"
                          >
                            <option value="all">Alle</option>
                            <option value="1">1 week</option>
                            <option value="2">2 weken</option>
                            <option value="4">4 weken</option>
                            <option value="8">8 weken</option>
                          </select>
                        </div>

                        {/* Category Filters */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Categorieën:
                          </label>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <input
                                type="checkbox"
                                checked={filterOpportunities}
                                onChange={(e) => setFilterOpportunities(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                              />
                              <Target className="w-4 h-4 text-positive-600 dark:text-positive-500" />
                              <span>Opportunities</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <input
                                type="checkbox"
                                checked={filterAlerts}
                                onChange={(e) => setFilterAlerts(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                              />
                              <AlertCircle className="w-4 h-4 text-negative-600 dark:text-negative-500" />
                              <span>Alerts</span>
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <input
                                type="checkbox"
                                checked={filterIdeas}
                                onChange={(e) => setFilterIdeas(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
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
                className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-sm"
              >
                <option value="none">Geen groepering</option>
                <option value="strategy">Groepeer op type</option>
                <option value="expiry">Groepeer op expiry</option>
                <option value="ticker">Groepeer op ticker</option>
                <option value="action">Groepeer op long/short</option>
              </select>
            )}
          </div>
        </div>
      )}

      {/* Position List - Scrollable */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 flex-1 overflow-y-auto">
        {/* Remove old grouped stocks display - now integrated in table below */}
        {false && groupedPositions.map((group) => {
          const isProfitable = group.unrealizedPnL >= 0;

          return (
            <div key={group.ticker} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              {/* Group Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    group.type === 'stock'
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                      : 'bg-positive-50 dark:bg-positive-700/25 text-positive-600 dark:text-positive-500'
                  }`}>
                    {group.type === 'stock' ? (
                      <TrendingUp className="w-6 h-6" />
                    ) : (
                      <Building2 className="w-6 h-6" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                        {group.ticker}
                      </h4>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        group.type === 'stock'
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500'
                      }`}>
                        {group.type === 'stock' ? 'Aandeel' : 'ETF'}
                      </span>
                    </div>
                    {group.name && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {group.name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Total P&L */}
                <div className="text-right">
                  <p className={`text-lg font-bold ${
                    group.unrealizedPnL > 0
                      ? 'text-positive-600 dark:text-positive-500'
                      : group.unrealizedPnL < 0
                      ? 'text-negative-600 dark:text-negative-500'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {group.unrealizedPnL > 0 ? '+' : ''}{formatCurrency(group.unrealizedPnL, currencySymbol)}
                  </p>
                  <p className={`text-sm font-medium ${
                    group.unrealizedPnL > 0
                      ? 'text-positive-600 dark:text-positive-500'
                      : group.unrealizedPnL < 0
                      ? 'text-negative-600 dark:text-negative-500'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {group.unrealizedPnL > 0 ? '+' : ''}{formatNumber(group.unrealizedPnLPercent)}%
                  </p>
                </div>
              </div>

              {/* Group Stats */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Totaal Aandelen</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {group.totalShares}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Gem. Prijs</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(group.avgPurchasePrice, currencySymbol)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Totale kost</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(group.totalCostBasis, currencySymbol)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Huidige Waarde</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(group.currentValue, currencySymbol)}
                  </p>
                </div>
              </div>

              {/* Individual Positions */}
              {group.positions.length > 1 && (
                <div className="space-y-2 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  {group.positions.map((position, index) => {
                    if (position.type !== 'stock' && position.type !== 'etf') return null;

                    const positionPnL = position.currentValue - position.costBasis;
                    const positionPnLPercent = (positionPnL / position.costBasis) * 100;
                    const isProfitable = positionPnL >= 0;

                    return (
                      <div
                        key={position.id}
                        className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg relative group"
                      >
                        <button
                          onClick={() => setPositionToClose(position)}
                          className="absolute top-2 right-2 p-1.5 bg-negative-50 dark:bg-negative-700/25 hover:bg-negative-50 dark:hover:bg-negative-700/50 text-negative-600 dark:text-negative-500 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Positie sluiten"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            Positie #{index + 1}
                          </p>
                          <p className={`text-sm font-semibold ${
                            positionPnL > 0
                              ? 'text-positive-600 dark:text-positive-500'
                              : positionPnL < 0
                              ? 'text-negative-600 dark:text-negative-500'
                              : 'text-gray-900 dark:text-white'
                          }`}>
                            {positionPnL > 0 ? '+' : ''}{formatCurrency(positionPnL, currencySymbol)} ({positionPnL > 0 ? '+' : ''}{formatNumber(positionPnLPercent)}%)
                          </p>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs">
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Aandelen</p>
                            <p className="font-medium text-gray-900 dark:text-white">{position.shares}</p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Prijs</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(position.purchasePrice, currencySymbol)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Kost</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {formatCurrency(position.costBasis, currencySymbol)}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-500 dark:text-gray-400">Datum</p>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {new Date(position.openDate).toLocaleDateString('nl-NL')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* All Positions Table */}
        {allPositions.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-800/50 overflow-x-auto">
            {/* Column Headers */}
            <div className="px-6 py-2 bg-gray-100 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 border-l-4 border-l-transparent">
              <div className="grid grid-cols-[32px_minmax(140px,1fr)_80px_70px_70px_70px_85px_85px_90px_70px_16px_130px] gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 items-center">
                <div></div> {/* Icon */}
                <button onClick={() => handleSort('ticker')} className="text-left hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1">
                  Ticker {sortField === 'ticker' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </button>
                <button onClick={() => handleSort('expiration')} className="text-left hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1">
                  Expiratie {sortField === 'expiration' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </button>
                <button onClick={() => handleSort('strike')} className="text-left hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1">
                  Strike {sortField === 'strike' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </button>
                <div>Stock prijs</div>
                <div>Verschil</div>
                <div>Open</div>
                <div>Huidige</div>
                <button onClick={() => handleSort('pnl')} className="text-left hover:text-gray-900 dark:hover:text-gray-200 flex items-center gap-1">
                  Winst/Verlies {sortField === 'pnl' && (sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                </button>
                <div>Onderpand</div>
                <div></div> {/* Spacer */}
                <div className="text-right">Actions</div> {/* Actions */}
              </div>
            </div>

            {/* Grouped Positions */}
            {Object.entries(groupedAllPositions).map(([strategyName, strategyPositions]) => {
              const isCollapsed = collapsedGroups.has(strategyName);
              const groupFilter = getGroupFilter(strategyName);
              const hasGroupFilter = hasActiveGroupFilter(strategyName);

              // Apply group-specific filters to positions
              const filteredGroupPositions = strategyPositions.filter(position => {
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
                    const tickerData = tickers.find(t => t.symbol.toUpperCase() === option.ticker.toUpperCase());
                    const currentPrice = tickerData?.currentPrice || 0;

                    // Check for opportunity (80% profit)
                    if (groupFilter.opportunities) {
                      const openValue = option.premium * option.contracts * 100;
                      const currentValue = (option.currentPremium || 0) * option.contracts * 100;
                      const pnl = option.action === 'sell' ? openValue - currentValue : currentValue - openValue;
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
                      if (option.notes && option.notes.toLowerCase().includes('idea')) matchesCategory = true;
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
                      className="px-6 py-2 bg-gray-200 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-600 cursor-pointer hover:bg-gray-250 dark:hover:bg-gray-750 transition-colors flex items-center justify-between"
                      onClick={() => toggleGroup(strategyName)}
                    >
                      <div className="flex items-center gap-2">
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        )}
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {strategyName} ({filteredGroupPositions.length}{filteredGroupPositions.length !== strategyPositions.length ? `/${strategyPositions.length}` : ''})
                        </h4>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setGroupFilterPopup(groupFilterPopup === strategyName ? null : strategyName);
                        }}
                        className={`p-1 rounded hover:bg-gray-300 dark:hover:bg-gray-700 ${hasGroupFilter ? 'text-primary-700 dark:text-primary-300' : 'text-gray-500 dark:text-gray-400'}`}
                        title="Filter groep"
                      >
                        <Filter className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Group Filter Popup */}
                    {groupFilterPopup === strategyName && (
                      <div className="absolute right-4 top-full mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl z-50 p-3">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">Filter</span>
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
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Verloopt binnen:
                            </label>
                            <select
                              value={groupFilter.expiration}
                              onChange={(e) => {
                                e.stopPropagation();
                                updateGroupFilter(strategyName, { expiration: e.target.value });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full px-2 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-xs"
                            >
                              <option value="all">Alle</option>
                              <option value="1">1 week</option>
                              <option value="2">2 weken</option>
                              <option value="4">4 weken</option>
                              <option value="8">8 weken</option>
                            </select>
                          </div>
                          {/* Category Filters */}
                          <div className="space-y-1">
                            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <input
                                type="checkbox"
                                checked={groupFilter.opportunities}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateGroupFilter(strategyName, { opportunities: e.target.checked });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-3 h-3 rounded border-gray-300 dark:border-gray-600"
                              />
                              <Target className="w-3 h-3 text-positive-600 dark:text-positive-500" />
                              <span>Opportunities</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <input
                                type="checkbox"
                                checked={groupFilter.alerts}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateGroupFilter(strategyName, { alerts: e.target.checked });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-3 h-3 rounded border-gray-300 dark:border-gray-600"
                              />
                              <AlertCircle className="w-3 h-3 text-negative-600 dark:text-negative-500" />
                              <span>Alerts</span>
                            </label>
                            <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer p-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <input
                                type="checkbox"
                                checked={groupFilter.ideas}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  updateGroupFilter(strategyName, { ideas: e.target.checked });
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-3 h-3 rounded border-gray-300 dark:border-gray-600"
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

                  filteredGroupPositions.forEach(position => {
                    const spreadId = getSpreadId(position);
                    if (spreadId) {
                      strategySpreadIds.add(spreadId);
                    } else {
                      strategyStandalonePositions.push(position);
                    }
                  });

                  // Get spreads that belong to this strategy
                  const strategySpreads = spreads.filter(spread => strategySpreadIds.has(spread.id));

                  return (
                    <>
                      {/* Render spreads */}
                      {strategySpreads.map(spread => {
                        const summary = calculateSpreadSummary(spread.legs);
                        if (!summary) return null;

                        const isExpanded = expandedSpreads.has(spread.id);
                        const isProfitable = summary.totalPnL >= 0;

                        // Calculate DTE
                        const daysToExpiration = summary.expiration
                          ? getDaysToExpiration(summary.expiration)
                          : 0;

                        // Get the short leg to calculate stock price difference
                        const shortLeg = spread.legs.find(leg => (leg as CallOption | PutOption).action === 'sell') as CallOption | PutOption | undefined;
                        // Get stock price from tickers store for live updates
                        const spreadTickerData = tickers.find(t => t.symbol.toUpperCase() === summary.ticker.toUpperCase());
                        const currentStockPrice = spreadTickerData?.currentPrice || 0;
                        const priceDifference = currentStockPrice - summary.shortStrike;

                        // Check if spread has reached 80% of max profit
                        const isExpired = daysToExpiration <= 0;
                        const profitPercent = summary.maxProfit !== 0 ? (summary.totalPnL / summary.maxProfit) * 100 : 0;
                        const hasOpportunity = !isExpired && isProfitable && profitPercent >= 80;
                        const opportunityMessage = hasOpportunity
                          ? `Opportunity: ${formatNumber(profitPercent, 0)}% van max winst - overweeg spread te sluiten`
                          : '';

                        // Check if expires this week (alert)
                        const expiresThisWeek = daysToExpiration > 0 && daysToExpiration <= 7;
                        const expiresWithinTwoWeeks = daysToExpiration > 7 && daysToExpiration <= 14;

                        // Check for external alerts from central evaluator (e.g., put spread alert)
                        // Get alerts for the spread by checking any leg's spread ID
                        const spreadExternalAlerts = spread.legs.flatMap(leg => {
                          const legAlerts = positionAlerts.get(leg.id) || [];
                          return legAlerts;
                        });
                        // Remove duplicates (same alert might match multiple legs)
                        const uniqueSpreadAlerts = spreadExternalAlerts.filter((alert, index, self) =>
                          index === self.findIndex(a => a.id === alert.id)
                        );
                        const hasExternalSpreadAlert = uniqueSpreadAlerts.length > 0;
                        const spreadAlertMessage = hasExternalSpreadAlert
                          ? uniqueSpreadAlerts.map(a => a.message).join('\n')
                          : '';

                        const hasAlert = isExpired || expiresThisWeek || hasExternalSpreadAlert;
                        // Alert message only shows spread-specific alerts (not expiration which is already visible)
                        const alertMessage = hasExternalSpreadAlert
                          ? spreadAlertMessage
                          : isExpired
                          ? 'Spread is verlopen - sluit deze positie'
                          : expiresThisWeek
                          ? `Spread verloopt binnen ${daysToExpiration} dagen`
                          : '';

                        // Determine border color based on expiration or alerts
                        const getSpreadBorderColor = () => {
                          if (isExpired || expiresThisWeek) return 'border-l-red-500';
                          if (hasExternalSpreadAlert || expiresWithinTwoWeeks) return 'border-l-amber-400';
                          return 'border-l-gray-300 dark:border-l-gray-600';
                        };

                        return (
                          <React.Fragment key={spread.id}>
                            {/* Spread Summary Row */}
                            <div className={`px-6 py-3 hover:bg-white dark:hover:bg-gray-700/30 transition-colors border-b border-gray-200 dark:border-gray-700 bg-surface-subtle/30 dark:bg-trading-dark-700 border-l-4 ${getSpreadBorderColor()}`}
                            >
                              <div className="grid grid-cols-[32px_minmax(140px,1fr)_80px_70px_70px_70px_85px_85px_90px_70px_16px_130px] gap-2 items-start">
                                {/* Icon with expand/collapse indicator - clickable for expand */}
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleSpread(spread.id);
                                  }}
                                  className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0 bg-surface-muted dark:bg-trading-dark-600 text-ink-600 dark:text-ink-300 cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
                                >
                                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </div>

                                {/* Rest of row - clickable to open editor */}
                                <div
                                  onClick={() => {
                                    setSpreadToView({ legs: spread.legs, currentStockPrice });
                                  }}
                                  className="contents cursor-pointer"
                                >
                                  {/* Ticker with spread badges */}
                                  <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                      {summary.contracts}x {summary.ticker}
                                    </h4>
                                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-surface-muted dark:bg-trading-dark-600 text-ink-700 dark:text-ink-300">
                                      {summary.type.toUpperCase()} SPREAD
                                    </span>
                                    <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                                      summary.spreadType === 'credit'
                                        ? 'bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500'
                                        : 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                    }`}>
                                      {summary.spreadType === 'credit' ? 'CREDIT' : 'DEBIT'}
                                    </span>
                                    {hasAlert && (
                                      <>
                                        <div
                                          ref={getTooltipRef(`spread-alert-${spread.id}`)}
                                          onMouseEnter={() => setShowTooltip(`spread-alert-${spread.id}`)}
                                          onMouseLeave={() => setShowTooltip(null)}
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
                                          <div className="w-72 p-3 bg-white dark:bg-gray-800 border-2 border-caution-500/30 dark:border-caution-600/40 rounded-lg shadow-xl">
                                            <AlertTooltipContent
                                              items={uniqueSpreadAlerts.length > 0
                                                ? uniqueSpreadAlerts.map(a => ({ ticker: a.ticker, message: a.message }))
                                                : [{ ticker: summary.ticker, message: alertMessage }]
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
                                          onMouseEnter={() => setShowTooltip(`spread-opp-${spread.id}`)}
                                          onMouseLeave={() => setShowTooltip(null)}
                                        >
                                          <Target className="w-3.5 h-3.5 text-positive-600 dark:text-positive-500 cursor-help" />
                                        </div>
                                        <PortalTooltip
                                          triggerRef={getTooltipRef(`spread-opp-${spread.id}`)}
                                          show={showTooltip === `spread-opp-${spread.id}`}
                                        >
                                          <div className="w-72 p-3 bg-white dark:bg-gray-800 border-2 border-positive-500/20 dark:border-positive-700/30 rounded-lg shadow-xl">
                                            <AlertTooltipContent
                                              items={[{ ticker: summary.ticker, message: opportunityMessage }]}
                                              type="opportunity"
                                            />
                                          </div>
                                        </PortalTooltip>
                                      </>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {spreadTickerData?.name || `Breedte: $${formatNumber(summary.spreadWidth, 2)}`}
                                  </p>
                                </div>

                                {/* Expiratie */}
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {summary.expiration ? new Date(summary.expiration).toLocaleDateString('nl-NL') : 'N/A'}
                                  </p>
                                  <p className={`text-xs ${
                                    daysToExpiration <= 7 && daysToExpiration > 0
                                      ? 'text-negative-600 dark:text-negative-500 font-semibold'
                                      : expiresWithinTwoWeeks
                                      ? 'text-caution-500 dark:text-caution-500 font-semibold'
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    {daysToExpiration > 0 ? `${daysToExpiration}d` : daysToExpiration === 0 ? 'Vandaag' : 'Verlopen'}
                                  </p>
                                </div>

                                {/* Strike Range - always show lowest first */}
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                    ${Math.min(summary.longStrike, summary.shortStrike)}-${Math.max(summary.longStrike, summary.shortStrike)}
                                  </p>
                                </div>

                                {/* Stock prijs */}
                                <div>
                                  {currentStockPrice > 0 ? (
                                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      {formatCurrency(currentStockPrice, currencySymbol)}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-gray-400 dark:text-gray-600">-</p>
                                  )}
                                </div>

                                {/* Verschil (stock price - short strike) */}
                                <div>
                                  {currentStockPrice > 0 ? (
                                    <p className={`text-sm font-semibold ${
                                      (() => {
                                        // Only show red for bad situations, otherwise neutral
                                        // Call spread: positive difference is bad (stock above short strike)
                                        // Put spread: negative difference is bad (stock below short strike)
                                        const isCallSpread = summary.type === 'call';
                                        const isBadForPosition = isCallSpread ? priceDifference > 0 : priceDifference < 0;

                                        if (isBadForPosition) return 'text-negative-600 dark:text-negative-500';
                                        return 'text-gray-900 dark:text-white';
                                      })()
                                    }`}>
                                      {priceDifference > 0 ? '+' : ''}{formatCurrency(priceDifference, currencySymbol)}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-gray-400 dark:text-gray-600">-</p>
                                  )}
                                </div>

                                {/* Net Premium (Aankoop) */}
                                <div>
                                  {(() => {
                                    // Calculate per-contract premium: short - long
                                    const shortLegPremium = spread.legs.find(l => (l as CallOption | PutOption).action === 'sell') as CallOption | PutOption;
                                    const longLegPremium = spread.legs.find(l => (l as CallOption | PutOption).action === 'buy') as CallOption | PutOption;
                                    const netPremiumPerContract = shortLegPremium.premium - longLegPremium.premium;

                                    return (
                                      <>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                          {formatCurrency(netPremiumPerContract, currencySymbol)}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
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
                                    const shortLegData = spread.legs.find(l => (l as CallOption | PutOption).action === 'sell') as CallOption | PutOption;
                                    const longLegData = spread.legs.find(l => (l as CallOption | PutOption).action === 'buy') as CallOption | PutOption;
                                    const shortPerContract = Math.abs(shortLegData.currentValue) / (shortLegData.contracts * 100);
                                    const longPerContract = Math.abs(longLegData.currentValue) / (longLegData.contracts * 100);
                                    const netPerContract = shortPerContract - longPerContract;

                                    return (
                                      <>
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                          {formatCurrency(netPerContract, currencySymbol)}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {formatCurrency(Math.abs(summary.totalCurrentValue), currencySymbol)}
                                        </p>
                                      </>
                                    );
                                  })()}
                                </div>

                                {/* P&L */}
                                <div>
                                  <p className={`text-sm font-bold ${
                                    summary.totalPnL > 0
                                      ? 'text-positive-600 dark:text-positive-500'
                                      : summary.totalPnL < 0
                                      ? 'text-negative-600 dark:text-negative-500'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {summary.totalPnL > 0 ? '+' : ''}{formatCurrency(summary.totalPnL, currencySymbol)}
                                  </p>
                                  <p className={`text-xs font-medium ${
                                    summary.totalPnL > 0
                                      ? 'text-positive-600 dark:text-positive-500'
                                      : summary.totalPnL < 0
                                      ? 'text-negative-600 dark:text-negative-500'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {summary.totalPnL > 0 ? '+' : ''}{formatNumber((summary.totalPnL / Math.abs(summary.totalCostBasis)) * 100)}%
                                  </p>
                                </div>

                                {/* Collateral */}
                                <div>
                                  {(() => {
                                    // Determine if this is a credit or debit spread
                                    // Credit spread: short strike > long strike (for puts), short strike < long strike (for calls)
                                    const isCredit = summary.type === 'put'
                                      ? summary.shortStrike > summary.longStrike
                                      : summary.shortStrike < summary.longStrike;

                                    if (isCredit) {
                                      // Credit spread - collateral is max loss (spread width × 100 × contracts)
                                      const spreadWidth = Math.abs(summary.shortStrike - summary.longStrike);
                                      const contracts = spread.legs[0] ? (spread.legs[0] as CallOption | PutOption).contracts : 1;
                                      const maxLoss = spreadWidth * 100 * contracts;

                                      return (
                                        <>
                                          <p className="text-sm font-semibold text-caution-600 dark:text-caution-500">
                                            Cash
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {formatCurrency(maxLoss, currencySymbol)}
                                          </p>
                                        </>
                                      );
                                    } else {
                                      // Debit spread - no collateral needed
                                      return <p className="text-sm text-gray-400 dark:text-gray-600">-</p>;
                                    }
                                  })()}
                                </div>
                              </div> {/* Close "contents" wrapper for clickable row */}

                                {/* Spacer */}
                                <div></div>

                                {/* Action buttons - outside the clickable area */}
                                <div className="flex justify-end gap-1 pt-0.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Roll both legs of the spread
                                      const longLeg = spread.legs.find(leg => (leg as CallOption | PutOption).action === 'buy') as CallOption | PutOption | undefined;
                                      const shortLeg = spread.legs.find(leg => (leg as CallOption | PutOption).action === 'sell') as CallOption | PutOption | undefined;
                                      if (longLeg && shortLeg) {
                                        setSpreadToRoll({ longLeg, shortLeg });
                                      }
                                    }}
                                    className="p-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/25 text-primary-700 dark:text-primary-300 rounded"
                                    title="Spread Rollen"
                                  >
                                    <Redo2 className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Close both legs - we'll set the first leg as the position to close
                                      // and handle the second leg in the modal
                                      setPositionToClose(spread.legs[0]);
                                    }}
                                    className="p-1.5 hover:bg-negative-50 dark:hover:bg-negative-700/25 text-negative-600 dark:text-negative-500 rounded"
                                    title="Spread Sluiten"
                                  >
                                    <XIcon className="w-4 h-4" />
                                  </button>
                                </div>
                              </div> {/* Close grid */}
                            </div> {/* Close row container */}

                            {/* Expanded Legs */}
                            {isExpanded && spread.legs.map((legPosition) => {
                              const option = legPosition as CallOption | PutOption;
                              const isCall = option.type === 'call';
                              const isBuy = option.action === 'buy';

                              // Get ticker data for leg
                              const legTickerData = tickers.find(t => t.symbol.toUpperCase() === option.ticker.toUpperCase());
                              const legStockPrice = legTickerData?.currentPrice || 0;

                              // Calculate collateral info for leg
                              let legCollateralType: CollateralType = 'none';
                              let legCollateralValue = 0;
                              let legCollateralDescription = '';

                              if (!isBuy) {
                                if (isCall) {
                                  // Short call in a spread - check if this is part of a spread
                                  const longCallLeg = spread.legs.find(leg =>
                                    leg.type === 'call' &&
                                    'action' in leg &&
                                    leg.action === 'buy'
                                  ) as CallOption | undefined;

                                  if (longCallLeg) {
                                    // This is a call spread - show the long call as the protective collateral
                                    legCollateralType = 'call';
                                    legCollateralValue = longCallLeg.strike;
                                    const spreadWidth = Math.abs(option.strike - longCallLeg.strike);
                                    legCollateralDescription = `Beschermd door long call @ $${longCallLeg.strike}. Max verlies: $${spreadWidth} × 100 × ${option.contracts} = $${spreadWidth * 100 * option.contracts}.`;
                                  } else {
                                    // Standalone short call - check for stock or LEAPS as collateral
                                    const stockPosition = positions.find(p =>
                                      (p.type === 'stock' || p.type === 'etf') &&
                                      p.ticker.toUpperCase() === option.ticker.toUpperCase() &&
                                      p.status === 'open'
                                    );

                                    if (stockPosition && 'shares' in stockPosition) {
                                      legCollateralType = 'stock';
                                      legCollateralValue = stockPosition.costBasis || 0;
                                      legCollateralDescription = `Deze call is gedekt door ${stockPosition.shares} aandelen ${option.ticker}. Bij assignment lever je de aandelen, geen cash nodig.`;
                                    } else {
                                      // Check for LEAPS as collateral (PMCC)
                                      const leapsPosition = positions.find(p =>
                                        p.type === 'call' &&
                                        'action' in p && p.action === 'buy' &&
                                        p.ticker.toUpperCase() === option.ticker.toUpperCase() &&
                                        p.status === 'open' &&
                                        isLEAPS(p as CallOption)
                                      ) as CallOption | undefined;

                                      if (leapsPosition) {
                                        legCollateralType = 'leaps';
                                        legCollateralValue = leapsPosition.costBasis;
                                        legCollateralDescription = 'Deze call is gedekt door je LEAPS call optie. De LEAPS fungeert als onderpand in plaats van aandelen (PMCC strategie).';
                                      }
                                    }
                                  }
                                } else {
                                  // Short put in a spread - check if this is part of a spread
                                  const longPutLeg = spread.legs.find(leg =>
                                    leg.type === 'put' &&
                                    'action' in leg &&
                                    leg.action === 'buy'
                                  ) as PutOption | undefined;

                                  if (longPutLeg) {
                                    // This is a put spread - show the long put as the protective collateral
                                    legCollateralType = 'put';
                                    legCollateralValue = longPutLeg.strike;
                                    const spreadWidth = Math.abs(option.strike - longPutLeg.strike);
                                    legCollateralDescription = `Beschermd door long put @ $${longPutLeg.strike}. Max verlies: $${spreadWidth} × 100 × ${option.contracts} = $${spreadWidth * 100 * option.contracts}.`;
                                  } else {
                                    // Standalone short put - cash secured
                                    legCollateralType = 'cash';
                                    legCollateralValue = option.strike * option.contracts * 100;
                                    legCollateralDescription = `Deze put vereist ${formatCurrency(legCollateralValue, currencySymbol)} cash als onderpand voor mogelijke assignment.`;
                                  }
                                }
                              }

                              // Get LEAPS info if collateral is LEAPS
                              let legLeapsInfo: { ticker: string; expiration: string } | undefined;
                              if (legCollateralType === 'leaps') {
                                const leapsPosition = positions.find(p =>
                                  p.type === 'call' &&
                                  'action' in p && p.action === 'buy' &&
                                  p.ticker.toUpperCase() === option.ticker.toUpperCase() &&
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
                        const isStockOrETF = position.type === 'stock' || position.type === 'etf';

                  if (isStockOrETF) {
                    // Render stock/ETF row using StockRow component
                    const stock = position as StockPosition;

                    // Get ticker data for current price from Redux store
                    const tickerData = tickers.find(t => t.symbol === stock.ticker);

                    // Check if there are existing covered calls
                    const existingCoveredCalls = positions.filter(p =>
                      p.type === 'call' &&
                      'action' in p && p.action === 'sell' &&
                      p.ticker === stock.ticker &&
                      p.status === 'open'
                    );

                    const coveredCallContracts = existingCoveredCalls.reduce((sum, cc: any) => sum + (cc.contracts || 0), 0);

                    // Check for opportunities from central evaluator
                    const stockOpportunities = positionOpportunities.get(stock.id) || [];
                    const hasStockOpportunity = stockOpportunities.length > 0;
                    const stockOpportunityMessage = hasStockOpportunity
                      ? stockOpportunities.map(o => o.message).join('\n')
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
                  const tickerData = tickers.find(t => t.symbol.toUpperCase() === option.ticker.toUpperCase());
                  const stockPrice = tickerData?.currentPrice || 0;

                  // Check if option is expired
                  const isExpired = daysToExpiration < 0;

                  // Check for external alerts from central evaluator
                  const externalAlerts = positionAlerts.get(option.id) || [];
                  const hasExternalAlert = externalAlerts.length > 0;

                  // Determine if there's an alert
                  const hasAlert = isExpired || hasExternalAlert;
                  const alertMessage = isExpired
                    ? 'Optie is vervallen - sluit deze positie'
                    : hasExternalAlert
                    ? externalAlerts.map(a => a.message).join('\n')
                    : '';

                  // Check for opportunities from central evaluator
                  const externalOpportunities = positionOpportunities.get(option.id) || [];
                  const hasOpportunity = externalOpportunities.length > 0;
                  const opportunityMessage = hasOpportunity
                    ? externalOpportunities.map(o => o.message).join('\n')
                    : '';

                  // Calculate collateral info
                  let collateralType: CollateralType = 'none';
                  let collateralValue = 0;
                  let collateralDescription = '';

                  if (!isBuy) {
                    if (isCall) {
                      // Short call - check for stock or LEAPS as collateral
                      const stockPosition = positions.find(p =>
                        (p.type === 'stock' || p.type === 'etf') &&
                        p.ticker.toUpperCase() === option.ticker.toUpperCase() &&
                        p.status === 'open'
                      );

                      if (stockPosition && 'shares' in stockPosition) {
                        collateralType = 'stock';
                        collateralValue = stockPosition.costBasis || 0;
                        collateralDescription = `Deze call is gedekt door ${stockPosition.shares} aandelen ${option.ticker}. Bij assignment lever je de aandelen, geen cash nodig.`;
                      } else {
                        // Check for LEAPS as collateral (PMCC)
                        const leapsPosition = positions.find(p =>
                          p.type === 'call' &&
                          'action' in p && p.action === 'buy' &&
                          p.ticker.toUpperCase() === option.ticker.toUpperCase() &&
                          p.status === 'open' &&
                          isLEAPS(p as CallOption)
                        ) as CallOption | undefined;

                        if (leapsPosition) {
                          collateralType = 'leaps';
                          collateralValue = leapsPosition.costBasis;
                          collateralDescription = 'Deze call is gedekt door je LEAPS call optie. De LEAPS fungeert als onderpand in plaats van aandelen (PMCC strategie).';
                        }
                      }
                    } else {
                      // Short put - cash secured
                      collateralType = 'cash';
                      collateralValue = option.strike * option.contracts * 100;
                      collateralDescription = `Deze put vereist ${formatCurrency(collateralValue, currencySymbol)} cash als onderpand voor mogelijke assignment.`;
                    }
                  }

                  // Get LEAPS info if collateral is LEAPS
                  let leapsInfo: { ticker: string; expiration: string } | undefined;
                  if (collateralType === 'leaps') {
                    const leapsPosition = positions.find(p =>
                      p.type === 'call' &&
                      'action' in p && p.action === 'buy' &&
                      p.ticker.toUpperCase() === option.ticker.toUpperCase() &&
                      p.status === 'open' &&
                      isLEAPS(p as CallOption)
                    ) as CallOption | undefined;

                    if (leapsPosition) {
                      leapsInfo = {
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
            dispatch(updatePosition(updatedPosition));
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
            updatedLegs.forEach(leg => {
              dispatch(updatePosition(leg));
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
