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
import { closePosition, editPosition } from '../../store/commands/positionCommands';
import { selectUnlockedLevels, isFeatureAvailable } from '../../store/slices/userProgressSlice';
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
import { rollOption, rollSpread, recordAssignment } from '../../store/commands/rollCommands';
import type { StockPosition } from '../../types';
import type { Position, CurrencyType, CallOption, PutOption } from '../../types';
import { POSITION_GRID_COLS } from './positionGrid';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { getSpreadId } from '../../utils/spreadHelpers';
import { GroupedStockList } from './GroupedStockList';
import { GroupedLeapsList } from './GroupedLeapsList';
import { OptionRow } from './OptionRow';
import type { CollateralType } from './OptionRow';
import { SpreadSummaryRow } from './SpreadSummaryRow';
import { CollapsibleSection } from './CollapsibleSection';
import { isLEAPS, calculateSpreadSummary, buildPortfolioSections } from '../../utils/positionHelpers';

type SortField = 'expiration' | 'ticker' | 'strike' | 'premium' | 'dte' | 'pnl';
type SortDirection = 'asc' | 'desc';

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
  portfolioCurrentValue: _portfolioCurrentValue,
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

  /**
   * ONE memo for ALL fixed-section data: stockGroups, leapsGroups, and the
   * shared sectionIds dedup set. Uses buildPortfolioSections which runs ONE
   * allocateCallCoverage pass per ticker — groups and sectionIds can never
   * diverge.
   */
  const { leapsGroups, stockGroups, sectionIds } = useMemo(() => {
    const openPositions = positions.filter((p) => p.status === 'open');
    return buildPortfolioSections(openPositions, tickers);
  }, [positions, tickers]);

  /**
   * Covered calls keyed by ticker (upper-cased) for GroupedStockList nesting.
   * Built directly from the stockGroups returned above — same allocator pass.
   */
  const coveredCallsByTicker = useMemo(() => {
    const map = new Map<string, CallOption[]>();
    for (const sg of stockGroups) {
      if (sg.assigned.length > 0) {
        map.set(sg.ticker.toUpperCase(), sg.assigned);
      }
    }
    return map;
  }, [stockGroups]);

  /**
   * Per short-call coverage map (used by the standalone OptionRow block to
   * resolve collateral descriptions). Built from the same stockGroups/leapsGroups
   * so it always matches sectionIds.
   */
  const callCoverageByCallId = useMemo(() => {
    type CoverageInfo =
      | { kind: 'stock'; shares: number; costBasis: number }
      | { kind: 'leaps'; leap: CallOption };
    const map = new Map<string, CoverageInfo>();

    // Stock-assigned calls
    for (const sg of stockGroups) {
      const totalShares = sg.lots.reduce((s, l) => s + l.shares, 0);
      const totalCost = sg.lots.reduce((s, l) => s + l.costBasis, 0);
      for (const c of sg.assigned) {
        map.set(c.id, { kind: 'stock', shares: totalShares, costBasis: totalCost });
      }
    }
    // LEAPS-assigned calls
    for (const lg of leapsGroups) {
      for (const c of lg.assigned) {
        map.set(c.id, { kind: 'leaps', leap: lg.leap });
      }
    }
    return map;
  }, [stockGroups, leapsGroups]);

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
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

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

  const toggleSection = (sectionId: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
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
        if (p.type === 'call' || p.type === 'put') {
          const option = p as CallOption | PutOption;
          const isBuy = option.action === 'buy';
          const nominalProfit = option.currentValue - option.costBasis;
          const profitPercent =
            option.costBasis !== 0 ? (nominalProfit / Math.abs(option.costBasis)) * 100 : 0;

          if (isBuy) {
            return nominalProfit >= 0 && profitPercent >= 80;
          } else {
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
          const daysToExpiration = option.expiration ? getDaysToExpiration(option.expiration) : 0;
          const expiresThisWeek = daysToExpiration > 0 && daysToExpiration <= 7;
          const nominalPnL = option.currentValue - option.costBasis;
          const putAlert =
            !isCall &&
            ((option.action === 'sell' && nominalPnL < 0) ||
              (option.action === 'buy' && nominalPnL > 0));
          return putAlert || (!isCall && expiresThisWeek);
        }
        return false;
      });
    }

    return filtered;
  }, [allPositions, tickerSearch, filterExpiration, filterOpportunities, filterAlerts]);

  // Pre-process positions to identify spreads
  const { spreads } = useMemo(() => {
    const spreadMap = new Map<string, Position[]>();

    filteredPositions.forEach((position) => {
      const spreadId = getSpreadId(position);
      if (spreadId) {
        if (!spreadMap.has(spreadId)) {
          spreadMap.set(spreadId, []);
        }
        spreadMap.get(spreadId)!.push(position);
      }
    });

    return {
      spreads: Array.from(spreadMap.entries()).map(([id, legs]) => ({ id, legs })),
    };
  }, [filteredPositions]);

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

    const realizedPnL = closeData.realizedPnL;
    let isPartialClose = false;

    if (positionToClose.type === 'stock' || positionToClose.type === 'etf') {
      if ('shares' in positionToClose && closeData.closePrice) {
        const quantityToClose = closeData.quantity || positionToClose.shares;
        isPartialClose = quantityToClose < positionToClose.shares;
      }
    }

    if (isPartialClose && 'shares' in positionToClose && closeData.quantity) {
      const remainingShares = positionToClose.shares - closeData.quantity;
      const remainingCostBasis =
        (positionToClose.costBasis / positionToClose.shares) * remainingShares;
      const purchasePricePerShare = positionToClose.costBasis / positionToClose.shares;

      dispatch(
        editPosition({
          ...positionToClose,
          shares: remainingShares,
          costBasis: remainingCostBasis,
          currentValue: remainingShares * purchasePricePerShare,
        }, new Date().toISOString())
      );
    } else {
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
    }

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
    const contractMultiplier = 100;

    spreadLegs.forEach((leg) => {
      const option = leg as CallOption | PutOption;
      let realizedPnL = 0;

      if (option.action === 'buy') {
        const closeValue = closeData.closePremium * option.contracts * contractMultiplier;
        realizedPnL = closeValue - option.costBasis;
      } else {
        const closeCost = closeData.closePremium * option.contracts * contractMultiplier;
        realizedPnL = option.costBasis - closeCost;
      }

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

    dispatch(
      rollOption(
        {
          positionId: positionToRoll.id,
          closePremium: rollData.closePremium,
          closeDate: rollData.closeDate,
          newContracts: rollData.newContracts,
          newStrike: rollData.newStrike,
          newExpiration: rollData.newExpiration,
          newPremium: rollData.newPremium,
          notes: rollData.notes,
        },
        new Date().toISOString()
      )
    );

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

    dispatch(
      rollSpread(
        {
          rollDate: rollData.rollDate,
          longLegId: spreadToRoll.longLeg.id,
          shortLegId: spreadToRoll.shortLeg.id,
          longLeg: rollData.longLeg,
          shortLeg: rollData.shortLeg,
          notes: rollData.notes,
        },
        new Date().toISOString()
      )
    );

    setSpreadToRoll(null);
  };

  const handleAssignment = (assignmentData: {
    assignmentDate: string;
    assignmentPrice: number;
    notes?: string;
  }) => {
    if (!positionToAssign) return;

    dispatch(
      recordAssignment(
        {
          optionId: positionToAssign.id,
          assignmentDate: assignmentData.assignmentDate,
          assignmentPrice: assignmentData.assignmentPrice,
          notes: assignmentData.notes,
        },
        new Date().toISOString()
      )
    );

    setPositionToAssign(null);
  };

  /**
   * Render a standalone option row (CSP, naked call, long option, etc.).
   * Resolves collateral via the shared callCoverageByCallId map (built from
   * the same allocator pass that produced sectionIds) — no re-derivation.
   */
  const renderOptionRow = (position: Position) => {
    const option = position as CallOption | PutOption;
    const isCall = option.type === 'call';
    const isBuy = option.action === 'buy';

    const daysToExpiration = option.expiration ? getDaysToExpiration(option.expiration) : 0;

    const tickerData = tickers.find(
      (tk) => tk.symbol.toUpperCase() === option.ticker.toUpperCase()
    );
    const stockPrice = tickerData?.currentPrice || 0;

    const isExpired = daysToExpiration < 0;

    const externalAlerts = positionAlerts.get(option.id) || [];
    const hasExternalAlert = externalAlerts.length > 0;
    const hasAlert = isExpired || hasExternalAlert;
    const alertMessage = isExpired
      ? t('widgetsB.optionExpired')
      : hasExternalAlert
        ? externalAlerts.map((a) => a.message).join('\n')
        : '';

    const externalOpportunities = positionOpportunities.get(option.id) || [];
    const hasOpportunity = externalOpportunities.length > 0;
    const opportunityMessage = hasOpportunity
      ? externalOpportunities.map((o) => o.message).join('\n')
      : '';

    let collateralType: CollateralType = 'none';
    let collateralValue = 0;
    let collateralDescription = '';
    let leapsInfo: { ticker: string; expiration: string } | undefined;

    const coverage = callCoverageByCallId.get(option.id);

    if (!isBuy) {
      if (isCall) {
        if (coverage?.kind === 'stock') {
          collateralType = 'stock';
          collateralValue = coverage.costBasis || 0;
          collateralDescription = t('widgetsB.callCoveredByShares', {
            shares: coverage.shares,
            ticker: option.ticker,
          });
        } else if (coverage?.kind === 'leaps') {
          collateralType = 'leaps';
          collateralValue = coverage.leap.costBasis;
          collateralDescription = t('widgetsB.callCoveredByLeaps');
          leapsInfo = {
            ticker: coverage.leap.ticker,
            expiration: coverage.leap.expiration,
          };
        }
        // No coverage → naked short call (collateralType stays 'none')
      } else {
        // Short put — cash secured
        collateralType = 'cash';
        collateralValue = option.strike * option.contracts * 100;
        collateralDescription = t('widgetsB.putRequiresCash', {
          amount: formatCurrency(collateralValue, currencySymbol),
        });
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
  };

  /**
   * Render a spread entry (SpreadSummaryRow + optional expanded legs).
   * Used by both the Spreads section and the >2-leg fallback.
   */
  const renderSpread = (spread: { id: string; legs: Position[] }) => {
    const summary = calculateSpreadSummary(spread.legs);
    if (!summary) {
      // >2-leg spread (butterfly / iron condor): no summary available yet.
      // Render individual legs as OptionRows so nothing vanishes.
      // TODO: implement a multi-leg SpreadSummaryRow for N-leg structures.
      return (
        <React.Fragment key={spread.id}>
          {spread.legs.map((leg) => renderOptionRow(leg))}
        </React.Fragment>
      );
    }

    const isExpanded = expandedSpreads.has(spread.id);
    const isProfitable = summary.totalPnL >= 0;

    const daysToExpiration = summary.expiration ? getDaysToExpiration(summary.expiration) : 0;

    const spreadTickerData = tickers.find(
      (tk) => tk.symbol.toUpperCase() === summary.ticker.toUpperCase()
    );
    const currentStockPrice = spreadTickerData?.currentPrice || 0;
    const priceDifference = currentStockPrice - summary.shortStrike;

    const isExpired = daysToExpiration <= 0;
    const profitPercent =
      summary.maxProfit !== 0 ? (summary.totalPnL / summary.maxProfit) * 100 : 0;
    const hasOpportunity = !isExpired && isProfitable && profitPercent >= 80;
    const opportunityMessage = hasOpportunity
      ? t('widgetsB.opportunityMaxProfit', { percent: formatNumber(profitPercent, 0) })
      : '';

    const expiresThisWeek = daysToExpiration > 0 && daysToExpiration <= 7;
    const expiresWithinTwoWeeks = daysToExpiration > 7 && daysToExpiration <= 14;

    const spreadExternalAlerts = spread.legs.flatMap((leg) => positionAlerts.get(leg.id) || []);
    const uniqueSpreadAlerts = spreadExternalAlerts.filter(
      (alert, index, self) => index === self.findIndex((a) => a.id === alert.id)
    );
    const hasExternalSpreadAlert = uniqueSpreadAlerts.length > 0;
    const spreadAlertMessage = hasExternalSpreadAlert
      ? uniqueSpreadAlerts.map((a) => a.message).join('\n')
      : '';

    const hasAlert = isExpired || expiresThisWeek || hasExternalSpreadAlert;
    const alertMessage = hasExternalSpreadAlert
      ? spreadAlertMessage
      : isExpired
        ? t('widgetsB.spreadExpired')
        : expiresThisWeek
          ? t('widgetsB.spreadExpiresInDays', { days: daysToExpiration })
          : '';

    const getSpreadBorderColor = () => {
      if (isExpired || expiresThisWeek) return 'border-l-red-500';
      if (hasExternalSpreadAlert || expiresWithinTwoWeeks) return 'border-l-amber-400';
      return 'border-l-surface-line dark:border-l-trading-dark-600';
    };

    return (
      <React.Fragment key={spread.id}>
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
          onViewSpread={(legs, price) => setSpreadToView({ legs, currentStockPrice: price })}
          onRollSpread={(longLeg, shortLeg) => setSpreadToRoll({ longLeg, shortLeg })}
          onCloseSpread={(firstLeg) => setPositionToClose(firstLeg)}
        />
        {/* Expanded spread legs */}
        {isExpanded &&
          spread.legs.map((legPosition) => {
            const legOption = legPosition as CallOption | PutOption;
            const isLegCall = legOption.type === 'call';
            const isBuy = legOption.action === 'buy';

            const legTickerData = tickers.find(
              (tk) => tk.symbol.toUpperCase() === legOption.ticker.toUpperCase()
            );
            const legStockPrice = legTickerData?.currentPrice || 0;

            let legCollateralType: CollateralType = 'none';
            let legCollateralValue = 0;
            let legCollateralDescription = '';

            if (!isBuy) {
              if (isLegCall) {
                const longCallLeg = spread.legs.find(
                  (leg) => leg.type === 'call' && 'action' in leg && leg.action === 'buy'
                ) as CallOption | undefined;

                if (longCallLeg) {
                  legCollateralType = 'call';
                  legCollateralValue = longCallLeg.strike;
                  const spreadWidth = Math.abs(legOption.strike - longCallLeg.strike);
                  legCollateralDescription = t('widgetsB.protectedByLongCall', {
                    strike: longCallLeg.strike,
                    width: spreadWidth,
                    contracts: legOption.contracts,
                    total: spreadWidth * 100 * legOption.contracts,
                  });
                } else {
                  // Standalone short call in a spread: check allocator coverage
                  const legCoverage = callCoverageByCallId.get(legOption.id);
                  if (legCoverage?.kind === 'stock') {
                    legCollateralType = 'stock';
                    legCollateralValue = legCoverage.costBasis || 0;
                    legCollateralDescription = t('widgetsB.callCoveredByShares', {
                      shares: legCoverage.shares,
                      ticker: legOption.ticker,
                    });
                  } else if (legCoverage?.kind === 'leaps') {
                    legCollateralType = 'leaps';
                    legCollateralValue = legCoverage.leap.costBasis;
                    legCollateralDescription = t('widgetsB.callCoveredByLeaps');
                  }
                }
              } else {
                const longPutLeg = spread.legs.find(
                  (leg) => leg.type === 'put' && 'action' in leg && leg.action === 'buy'
                ) as PutOption | undefined;

                if (longPutLeg) {
                  legCollateralType = 'put';
                  legCollateralValue = longPutLeg.strike;
                  const spreadWidth = Math.abs(legOption.strike - longPutLeg.strike);
                  legCollateralDescription = t('widgetsB.protectedByLongPut', {
                    strike: longPutLeg.strike,
                    width: spreadWidth,
                    contracts: legOption.contracts,
                    total: spreadWidth * 100 * legOption.contracts,
                  });
                } else {
                  legCollateralType = 'cash';
                  legCollateralValue = legOption.strike * legOption.contracts * 100;
                  legCollateralDescription = t('widgetsB.putRequiresCash', {
                    amount: formatCurrency(legCollateralValue, currencySymbol),
                  });
                }
              }
            }

            let legLeapsInfo: { ticker: string; expiration: string } | undefined;
            if (legCollateralType === 'leaps') {
              const legCoverage = callCoverageByCallId.get(legOption.id);
              if (legCoverage?.kind === 'leaps') {
                legLeapsInfo = {
                  ticker: legCoverage.leap.ticker,
                  expiration: legCoverage.leap.expiration,
                };
              } else {
                // Fallback: find a LEAPS for this ticker
                const leapsPos = positions.find(
                  (p) =>
                    p.type === 'call' &&
                    'action' in p &&
                    p.action === 'buy' &&
                    p.ticker.toUpperCase() === legOption.ticker.toUpperCase() &&
                    p.status === 'open' &&
                    isLEAPS(p as CallOption)
                ) as CallOption | undefined;
                if (leapsPos) {
                  legLeapsInfo = { ticker: leapsPos.ticker, expiration: leapsPos.expiration };
                }
              }
            }

            return (
              <OptionRow
                key={legOption.id}
                option={legOption}
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
  };

  // ── Section classification ────────────────────────────────────────────────
  // spreadLegIds: all position IDs that are legs of a detected spread
  const spreadLegIds = useMemo(() => {
    const ids = new Set<string>();
    for (const spread of spreads) {
      for (const leg of spread.legs) {
        ids.add(leg.id);
      }
    }
    return ids;
  }, [spreads]);

  /**
   * Positions not owned by sectionIds (stocks/LEAPS/stock-covered-calls)
   * and not spread legs — these are candidates for CSP / Overige.
   */
  const remainingPositions = useMemo(() => {
    return filteredPositions.filter(
      (p) =>
        !sectionIds.has(p.id) &&
        !spreadLegIds.has(p.id) &&
        p.type !== 'stock' &&
        p.type !== 'etf'
    );
  }, [filteredPositions, sectionIds, spreadLegIds]);

  /** Cash Secured Puts: short puts that are not spread legs. */
  const cspPositions = useMemo(
    () =>
      remainingPositions.filter(
        (p) => p.type === 'put' && (p as PutOption).action === 'sell'
      ),
    [remainingPositions]
  );

  /** Everything else: long options, naked short calls, KaChing protective puts, etc. */
  const overigePositions = useMemo(
    () => remainingPositions.filter((p) => !(p.type === 'put' && (p as PutOption).action === 'sell')),
    [remainingPositions]
  );

  // Open stock/ETF lots — passed to GroupedStockList
  const stockLots = useMemo(
    () =>
      positions.filter(
        (p): p is StockPosition => (p.type === 'stock' || p.type === 'etf') && p.status === 'open'
      ),
    [positions]
  );

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
          </div>
        </div>
      )}

      {/* Position List - Scrollable */}
      <div className="divide-y divide-surface-line dark:divide-trading-dark-600 flex-1 overflow-y-auto">

        {/* ── Section 1: Aandelen & ETF's ─────────────────────────────── */}
        {stockLots.length > 0 && (
          <CollapsibleSection
            id="stocks"
            title={t('widgetsB.sectionStocksEtfs')}
            count={stockLots.length}
            collapsed={collapsedSections.has('stocks')}
            onToggle={toggleSection}
          >
            <div className="p-4">
              <GroupedStockList
                positions={stockLots}
                alerts={priceAlerts}
                allPortfolios={portfolios}
                onEditPosition={setPositionToView}
                onWriteCoveredCall={onWriteCoveredCall}
                onSellPosition={setPositionToClose}
                coveredCallsByTicker={coveredCallsByTicker}
                tickers={tickers}
                currencySymbol={currencySymbol}
                positionHasOpportunity={
                  new Map(
                    stockGroups.flatMap(({ lots, assigned }) =>
                      [...lots, ...assigned].map((p) => [
                        p.id,
                        (positionOpportunities.get(p.id) ?? []).length > 0,
                      ])
                    )
                  )
                }
                positionOpportunityMessage={
                  new Map(
                    stockGroups.flatMap(({ lots, assigned }) =>
                      [...lots, ...assigned].map((p) => [
                        p.id,
                        (positionOpportunities.get(p.id) ?? []).map((o) => o.message).join('\n'),
                      ])
                    )
                  )
                }
                positionHasAlert={
                  new Map(
                    stockGroups.flatMap(({ lots, assigned }) =>
                      [...lots, ...assigned].map((p) => [
                        p.id,
                        (positionAlerts.get(p.id) ?? []).length > 0,
                      ])
                    )
                  )
                }
                positionAlertMessage={
                  new Map(
                    stockGroups.flatMap(({ lots, assigned }) =>
                      [...lots, ...assigned].map((p) => [
                        p.id,
                        (positionAlerts.get(p.id) ?? []).map((a) => a.message).join('\n'),
                      ])
                    )
                  )
                }
                onRoll={(opt) => setPositionToRoll(opt)}
                onClose={(opt) => setPositionToClose(opt)}
                onAssign={(opt) => setPositionToAssign(opt)}
                onView={(opt) => setPositionToView(opt)}
              />
            </div>
          </CollapsibleSection>
        )}

        {/* ── Section 2: LEAPS ─────────────────────────────────────────── */}
        {leapsGroups.length > 0 && (
          <CollapsibleSection
            id="leaps"
            title={t('widgetsB.sectionLeaps')}
            count={leapsGroups.length}
            collapsed={collapsedSections.has('leaps')}
            onToggle={toggleSection}
          >
            <div className="p-4">
              <GroupedLeapsList
                groups={leapsGroups}
                allPortfolios={portfolios}
                currency={currency}
                tickers={tickers}
                positionHasOpportunity={
                  new Map(
                    leapsGroups.flatMap(({ leap, assigned }) =>
                      [leap, ...assigned].map((p) => [
                        p.id,
                        (positionOpportunities.get(p.id) ?? []).length > 0,
                      ])
                    )
                  )
                }
                positionOpportunityMessage={
                  new Map(
                    leapsGroups.flatMap(({ leap, assigned }) =>
                      [leap, ...assigned].map((p) => [
                        p.id,
                        (positionOpportunities.get(p.id) ?? []).map((o) => o.message).join('\n'),
                      ])
                    )
                  )
                }
                positionHasAlert={
                  new Map(
                    leapsGroups.flatMap(({ leap, assigned }) =>
                      [leap, ...assigned].map((p) => [
                        p.id,
                        (positionAlerts.get(p.id) ?? []).length > 0,
                      ])
                    )
                  )
                }
                positionAlertMessage={
                  new Map(
                    leapsGroups.flatMap(({ leap, assigned }) =>
                      [leap, ...assigned].map((p) => [
                        p.id,
                        (positionAlerts.get(p.id) ?? []).map((a) => a.message).join('\n'),
                      ])
                    )
                  )
                }
                onView={(pos) => setPositionToView(pos)}
                onRoll={(pos) => setPositionToRoll(pos as CallOption | PutOption)}
                onClose={(pos) => setPositionToClose(pos)}
                onAssign={(pos) => setPositionToAssign(pos as CallOption | PutOption)}
                onWriteCoveredCall={onWriteCoveredCall}
                currencySymbol={currencySymbol}
              />
            </div>
          </CollapsibleSection>
        )}

        {/* ── Sections 3-5 share a column header row ─────────────────── */}
        {(cspPositions.length > 0 || spreads.length > 0 || overigePositions.length > 0) && (
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
                <div className="text-right">{t('widgetsB.colActions')}</div>
              </div>
            </div>

            {/* ── Section 3: Cash Secured Puts ─────────────────────────── */}
            {cspPositions.length > 0 && (
              <CollapsibleSection
                id="csp"
                title={t('widgetsB.sectionCashSecuredPuts')}
                count={cspPositions.length}
                collapsed={collapsedSections.has('csp')}
                onToggle={toggleSection}
              >
                {cspPositions.map((p) => renderOptionRow(p))}
              </CollapsibleSection>
            )}

            {/* ── Section 4: Spreads ────────────────────────────────────── */}
            {spreads.length > 0 && (
              <CollapsibleSection
                id="spreads"
                title={t('widgetsB.sectionSpreads')}
                count={spreads.length}
                collapsed={collapsedSections.has('spreads')}
                onToggle={toggleSection}
              >
                {spreads.map((spread) => renderSpread(spread))}
              </CollapsibleSection>
            )}

            {/* ── Section 5: Overige ────────────────────────────────────── */}
            {overigePositions.length > 0 && (
              <CollapsibleSection
                id="overige"
                title={t('widgetsB.sectionOther')}
                count={overigePositions.length}
                collapsed={collapsedSections.has('overige')}
                onToggle={toggleSection}
              >
                {overigePositions.map((p) => renderOptionRow(p))}
              </CollapsibleSection>
            )}
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
