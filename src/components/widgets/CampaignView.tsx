import React, { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Target, Lightbulb, ChevronDown, ChevronRight, History, DollarSign, Layers, Zap, Shield, Plus, Redo2, X as XIcon, RefreshCw, Trash2, ArrowDownLeft, ArrowUpCircle } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { closePosition, updatePosition, addPosition } from '../../store/slices/positionsSlice';
import { addTransaction } from '../../store/slices/portfoliosSlice';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import { selectWheelsByPortfolio, removeWheel, updateWheelPhase, incrementWheelCycle, updateWheelPremium } from '../../store/slices/wheelsSlice';
import { detectCampaigns, getCampaignTypeName, getCampaignTypeDescription, buildWheelCampaign } from '../../utils/campaignDetector';
import type { Campaign, CampaignType } from '../../utils/campaignDetector';
import type { CurrencyType, Ticker, PortfolioName, CallOption, PutOption, Position, StockPosition } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { getDaysToExpiration } from '../../utils/dateHelpers';
import { calculateOptionRealizedPnL, calculateOptionUnrealizedPnL } from '../../utils/pnlCalculations';
import { CallOptionWizard } from '../modals/CallOptionWizard';
import { PutOptionWizard } from '../modals/PutOptionWizard';
import { RollOptionModal } from '../modals/RollOptionModal';
import { ClosePositionModal } from '../modals/ClosePositionModal';
import { AssignmentModal } from '../modals/AssignmentModal';
import { NewWheelModal } from '../modals/NewWheelModal';
import { StockETFWizard } from '../modals/StockETFWizard';
import { PositionDetailModal } from '../modals/PositionDetailModal';
import { OptionRow } from './OptionRow';
import type { CollateralType } from './OptionRow';
import type { RootState } from '../../store';

interface CampaignViewProps {
  portfolioName: string;
  currency: CurrencyType;
  className?: string;
}

type FilterType = CampaignType;

export const CampaignView: React.FC<CampaignViewProps> = ({
  portfolioName,
  currency,
  className = '',
}) => {
  const dispatch = useAppDispatch();
  const currencySymbol = getCurrencySymbol(currency);
  const positions = useAppSelector((state) => state.positions.positions);
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);
  const tickers = useAppSelector(selectAllTickers);
  const wheels = useAppSelector((state: RootState) => selectWheelsByPortfolio(state, portfolioName as PortfolioName));
  const [filter, setFilter] = useState<FilterType>('covered-call');
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [showHistory, setShowHistory] = useState<Set<string>>(new Set());
  // Track expanded sections within campaigns (default to expanded)
  const [expandedBasisPositions, setExpandedBasisPositions] = useState<Set<string>>(new Set());
  const [expandedActiveOptions, setExpandedActiveOptions] = useState<Set<string>>(new Set());
  // Initialize all campaigns as expanded by default
  const [initializedSections, setInitializedSections] = useState<Set<string>>(new Set());

  // Wizard state for quick option creation
  const [showCallWizard, setShowCallWizard] = useState(false);
  const [showPutWizard, setShowPutWizard] = useState(false);
  const [showStockWizard, setShowStockWizard] = useState(false);
  const [showNewWheelModal, setShowNewWheelModal] = useState(false);
  const [wizardTicker, setWizardTicker] = useState<Ticker | null>(null);
  const [wizardWheelId, setWizardWheelId] = useState<string | null>(null);

  // Modal state for roll, close, assignment, and edit
  const [positionToRoll, setPositionToRoll] = useState<CallOption | PutOption | null>(null);
  const [positionToClose, setPositionToClose] = useState<Position | null>(null);
  const [positionToAssign, setPositionToAssign] = useState<CallOption | PutOption | null>(null);
  const [positionToView, setPositionToView] = useState<Position | null>(null);

  // State for wheel deletion confirmation
  const [wheelToDelete, setWheelToDelete] = useState<string | null>(null);

  // Get portfolio info for the wizard
  const portfolio = useMemo(() => {
    const p = portfolios.find(p => p.name === portfolioName);
    return {
      name: portfolioName as PortfolioName,
      currency: currency,
      currentValue: p?.currentValue || 0,
    };
  }, [portfolios, portfolioName, currency]);

  // Get positions for this portfolio
  const portfolioPositions = useMemo(() => {
    return positions.filter(p => p.portfolio === portfolioName);
  }, [positions, portfolioName]);

  // Separate open and closed positions
  const openPositions = useMemo(() => {
    return portfolioPositions.filter(p => p.status === 'open');
  }, [portfolioPositions]);

  const closedPositions = useMemo(() => {
    return portfolioPositions.filter(p => p.status === 'closed');
  }, [portfolioPositions]);

  // Detect campaigns (including Wheels)
  const campaigns = useMemo(() => {
    const detectedCampaigns = detectCampaigns(openPositions, closedPositions);

    // Build Wheel campaigns from explicit Wheel records
    const wheelCampaigns = wheels
      .map(wheel => buildWheelCampaign(wheel, openPositions, closedPositions))
      .filter((c): c is Campaign => c !== null);

    return [...detectedCampaigns, ...wheelCampaigns];
  }, [openPositions, closedPositions, wheels]);

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => c.type === filter);
  }, [campaigns, filter]);

  // Campaign counts by type
  const campaignCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'covered-call': 0,
      'pmcc': 0,
      'kaching': 0,
      'wheel': 0,
    };
    campaigns.forEach(c => {
      counts[c.type]++;
    });
    return counts;
  }, [campaigns]);

  // Toggle campaign expansion
  const toggleCampaign = (id: string) => {
    setExpandedCampaigns(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        // Initialize sections as expanded when campaign is first opened
        ensureSectionsInitialized(id);
      }
      return next;
    });
  };

  // Toggle history view
  const toggleHistory = (id: string) => {
    setShowHistory(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle basis position section
  const toggleBasisPosition = (campaignId: string) => {
    setExpandedBasisPositions(prev => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  // Toggle active options section
  const toggleActiveOptions = (campaignId: string) => {
    setExpandedActiveOptions(prev => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  // Initialize sections as expanded when campaign is first expanded
  const ensureSectionsInitialized = (campaignId: string) => {
    if (!initializedSections.has(campaignId)) {
      setInitializedSections(prev => new Set(prev).add(campaignId));
      setExpandedBasisPositions(prev => new Set(prev).add(campaignId));
      setExpandedActiveOptions(prev => new Set(prev).add(campaignId));
    }
  };

  // Handle delete wheel
  const handleDeleteWheel = (wheelId: string) => {
    dispatch(removeWheel(wheelId));
    setWheelToDelete(null);
  };

  // Handle close position
  const handleClosePosition = (closeData: {
    closeDate: string;
    closePremium?: number;
    closePrice?: number;
    realizedPnL: number;
    notes?: string;
    quantity?: number;
  }) => {
    if (!positionToClose) return;

    dispatch(closePosition({
      id: positionToClose.id,
      closeDate: closeData.closeDate,
      closePremium: closeData.closePremium,
      closePrice: closeData.closePrice,
      realizedPnL: closeData.realizedPnL,
      notes: closeData.notes,
    }));

    setPositionToClose(null);
  };

  // Handle roll option
  const handleRollOption = (rollData: {
    closePremium: number;
    newStrike: number;
    newExpiration: string;
    newPremium: number;
    notes?: string;
  }) => {
    if (!positionToRoll) return;

    const today = new Date().toISOString().split('T')[0];
    const option = positionToRoll;

    // Calculate realized P&L for closing the old position using utility function
    const realizedPnL = calculateOptionRealizedPnL({
      action: option.action,
      costBasis: option.costBasis,
      closePremium: rollData.closePremium,
      contracts: option.contracts,
    });

    const isSell = option.action === 'sell';

    // Close the old position
    dispatch(closePosition({
      id: option.id,
      closeDate: today,
      closePremium: rollData.closePremium,
      realizedPnL,
      notes: rollData.notes ? `Rolled to $${rollData.newStrike} ${rollData.newExpiration}. ${rollData.notes}` : `Rolled to $${rollData.newStrike} ${rollData.newExpiration}`,
    }));

    // Create the new rolled position
    const newCostBasis = isSell
      ? -(rollData.newPremium * option.contracts * 100)
      : rollData.newPremium * option.contracts * 100;

    // Calculate cashReserved for the new position (for CSPs)
    // For short puts, cash reserved is strike * contracts * 100
    let newCashReserved: number | undefined;
    if (option.type === 'put' && option.action === 'sell') {
      newCashReserved = rollData.newStrike * option.contracts * 100;
    }

    const newPosition: CallOption | PutOption = {
      id: `${option.type}-${Date.now()}`,
      type: option.type,
      ticker: option.ticker,
      name: option.name,
      portfolio: option.portfolio,
      action: option.action,
      strike: rollData.newStrike,
      expiration: rollData.newExpiration,
      premium: rollData.newPremium,
      contracts: option.contracts,
      costBasis: newCostBasis,
      currentValue: newCostBasis,
      openDate: today,
      status: 'open',
      notes: `Rolled from $${option.strike} ${option.expiration}`,
      // Preserve wheel and underlying links when rolling
      wheelId: option.wheelId,
      underlyingId: option.underlyingId,
      // Preserve cashReserved for CSPs
      ...(newCashReserved !== undefined && { cashReserved: newCashReserved }),
    };

    dispatch(addPosition(newPosition));

    // Calculate net credit/debit for the roll
    const contractMultiplier = 100;
    let netCredit = 0;
    if (isSell) {
      // Close: buy back (debit), Open: sell new (credit)
      const closeValue = -rollData.closePremium * option.contracts * contractMultiplier;
      const openValue = rollData.newPremium * option.contracts * contractMultiplier;
      netCredit = openValue + closeValue;
    } else {
      // Close: sell (credit), Open: buy new (debit)
      const closeValue = rollData.closePremium * option.contracts * contractMultiplier;
      const openValue = -rollData.newPremium * option.contracts * contractMultiplier;
      netCredit = closeValue + openValue;
    }

    // Add transaction for the roll
    // Get current portfolio value for tracking
    const portfolioCurrentValue = portfolio.currentValue;

    const transaction = {
      id: `txn-roll-${Date.now()}`,
      portfolio: option.portfolio,
      date: today,
      type: 'option_roll' as const,
      amount: netCredit,
      description: `Roll ${option.type.toUpperCase()} ${option.ticker} $${option.strike} → $${rollData.newStrike}`,
      relatedPositionId: newPosition.id,
      previousValue: portfolioCurrentValue,
      newValue: portfolioCurrentValue + realizedPnL,
      createdAt: new Date().toISOString(),
      notes: rollData.notes || undefined,
    };
    dispatch(addTransaction(transaction));

    setPositionToRoll(null);
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

    // Calculate realized P&L for the option (assigned = closes at 0)
    const realizedPnL = calculateOptionRealizedPnL({
      action: option.action,
      costBasis: option.costBasis,
      closePremium: 0, // Option expires worthless for the short seller when assigned
      contracts: option.contracts,
    });

    // Close the option position
    dispatch(closePosition({
      id: option.id,
      closeDate: assignmentData.assignmentDate,
      closePremium: 0,
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
      dispatch(addTransaction({
        id: `txn-${Date.now()}`,
        date: assignmentData.assignmentDate,
        type: 'position_buy' as const,
        amount: -effectiveCost,
        description: `Assignment: ${shares} ${option.ticker} @ $${option.strike}`,
        notes: `Assigned from Cash Secured Put. Effective cost: ${formatCurrency(effectiveCost, currencySymbol)}`,
      }));
    } else {
      // Short CALL assigned: remove stock and realize gain
      const stockPosition = openPositions.find(p =>
        (p.type === 'stock' || p.type === 'etf') &&
        p.ticker.toUpperCase() === option.ticker.toUpperCase()
      );

      if (stockPosition && 'shares' in stockPosition) {
        const totalProceeds = option.strike * shares;
        const premiumReceived = Math.abs(option.costBasis);
        const stockCostBasis = (stockPosition.costBasis / stockPosition.shares) * shares;
        const stockRealizedPnL = totalProceeds - stockCostBasis;

        // Close or reduce stock position
        if (stockPosition.shares <= shares) {
          dispatch(closePosition({
            id: stockPosition.id,
            closeDate: assignmentData.assignmentDate,
            closePrice: option.strike,
            realizedPnL: stockRealizedPnL,
            notes: `Assigned from covered call at $${option.strike}`,
          }));
        } else {
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
          dispatch(incrementWheelCycle(option.wheelId));
          dispatch(updateWheelPhase({
            id: option.wheelId,
            phase: 'csp',
          }));
          dispatch(updateWheelPremium({
            id: option.wheelId,
            premiumCollected: 0,
            realizedPnL: stockRealizedPnL,
          }));
        }

        // Log transaction
        dispatch(addTransaction({
          id: `txn-${Date.now()}`,
          date: assignmentData.assignmentDate,
          type: 'position_sell' as const,
          amount: totalProceeds + premiumReceived,
          description: `Assignment: Verkoop ${shares} ${option.ticker} @ $${option.strike}`,
          notes: `Assigned from covered call. Stock P&L: ${formatCurrency(stockRealizedPnL, currencySymbol)}, Premium: ${formatCurrency(premiumReceived, currencySymbol)}`,
        }));
      }
    }

    setPositionToAssign(null);
  };

  // Get icon for campaign type
  const getCampaignIcon = (type: CampaignType) => {
    switch (type) {
      case 'covered-call':
        return <TrendingUp className="w-5 h-5" />;
      case 'pmcc':
        return <Layers className="w-5 h-5" />;
      case 'kaching':
        return <Zap className="w-5 h-5" />;
      case 'wheel':
        return <RefreshCw className="w-5 h-5" />;
      default:
        return <Target className="w-5 h-5" />;
    }
  };

  // Get color for campaign type
  const getCampaignColor = (type: CampaignType) => {
    switch (type) {
      case 'covered-call':
        return 'blue';
      case 'pmcc':
        return 'purple';
      case 'kaching':
        return 'amber';
      case 'wheel':
        return 'teal';
      default:
        return 'gray';
    }
  };

  // Helper function to render empty state for each campaign type
  const renderEmptyState = (type: FilterType) => {
    switch (type) {
      case 'covered-call':
        return (
          <div className="p-8">
            <div className="text-center max-w-md mx-auto">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full w-fit mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Geen Covered Calls
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Schrijf calls op aandelen die je bezit en ontvang premie. Je aandelen dienen als onderpand.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 italic">
                Risico: Je loopt potentiële winst mis als het aandeel sterk stijgt boven je strike.
              </p>
              <button
                onClick={() => setShowStockWizard(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg transition-colors"
              >
                Koop Aandelen
              </button>
            </div>
          </div>
        );
      case 'pmcc':
        return (
          <div className="p-8">
            <div className="text-center max-w-md mx-auto">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full w-fit mx-auto mb-4">
                <Layers className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Geen Poor Man's Covered Calls
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Koop een LEAPS call en schrijf korte termijn calls. De LEAPS fungeert als goedkoper onderpand i.p.v. aandelen.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 italic">
                Risico: Je LEAPS kan waardeloos aflopen. Beperkt verlies = LEAPS kostprijs - ontvangen premies.
              </p>
              <button
                onClick={() => setShowCallWizard(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 rounded-lg transition-colors"
              >
                Koop LEAPS
              </button>
            </div>
          </div>
        );
      case 'kaching':
        return (
          <div className="p-8">
            <div className="text-center max-w-md mx-auto">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full w-fit mx-auto mb-4">
                <Zap className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Geen KaChing Campagnes
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Koop een protective put en schrijf wekelijks puts met hogere strikes. Je long put beschermt tegen grote dalingen.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 italic">
                Risico: De spread tussen je protective put en geschreven put × 100. Beperkt maar gedefinieerd verlies.
              </p>
              <button
                onClick={() => setShowPutWizard(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 rounded-lg transition-colors"
              >
                Koop Protective Put
              </button>
            </div>
          </div>
        );
      case 'wheel':
        return (
          <div className="p-8">
            <div className="text-center max-w-md mx-auto">
              <div className="p-3 bg-teal-100 dark:bg-teal-900/30 rounded-full w-fit mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Geen wheel campagnes
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Verkoop Cash Secured Puts tot assignment, schrijf dan covered calls tot verkoop, en herhaal. Continu premie ontvangen.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 italic">
                Risico: Je koopt aandelen bij assignment. Bij grote daling zit je vast met verliesgevende positie.
              </p>
              <button
                onClick={() => setShowNewWheelModal(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 rounded-lg transition-colors"
              >
                Start wheel
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col ${className}`}>
      {/* Filter Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <nav className="flex -mb-px overflow-x-auto">
          <button
            onClick={() => setFilter('covered-call')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              filter === 'covered-call'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Covered Call
            {campaignCounts['covered-call'] > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                filter === 'covered-call'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {campaignCounts['covered-call']}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('pmcc')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              filter === 'pmcc'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <Layers className="w-4 h-4" />
            Poor Man's Covered Call
            {campaignCounts['pmcc'] > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                filter === 'pmcc'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {campaignCounts['pmcc']}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('kaching')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              filter === 'kaching'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <Zap className="w-4 h-4" />
            KaChing
            {campaignCounts['kaching'] > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                filter === 'kaching'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {campaignCounts['kaching']}
              </span>
            )}
          </button>
          <button
            onClick={() => setFilter('wheel')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              filter === 'wheel'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Wheel
            {campaignCounts['wheel'] > 0 && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                filter === 'wheel'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {campaignCounts['wheel']}
              </span>
            )}
          </button>
          {/* Start New Wheel Button - only show in Wheel tab */}
          {filter === 'wheel' && (
            <div className="flex-1 flex justify-end items-center pr-4">
              <button
                onClick={() => setShowNewWheelModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nieuw wheel
              </button>
            </div>
          )}
        </nav>
      </div>

      {/* Campaign List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 flex-1 overflow-y-auto">
        {filteredCampaigns.length === 0 ? (
          <div className="h-full flex items-center justify-center min-h-[400px]">
            {renderEmptyState(filter)}
          </div>
        ) : filteredCampaigns.map(campaign => {
          const isExpanded = expandedCampaigns.has(campaign.id);
          const showingHistory = showHistory.has(campaign.id);
          const color = getCampaignColor(campaign.type);

          return (
            <div key={campaign.id} className="p-4">
              {/* Campaign Header */}
              <div
                onClick={() => toggleCampaign(campaign.id)}
                className="flex items-center justify-between cursor-pointer p-3 -m-3 rounded-lg bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700/70 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}>
                    {getCampaignIcon(campaign.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {campaign.ticker}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-400`}>
                        {getCampaignTypeName(campaign.type)}
                      </span>
                      {campaign.hasOpportunity && (
                        <Lightbulb className="w-4 h-4 text-green-500" title={campaign.opportunityMessage} />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {campaign.type === 'wheel' ? campaign.coverage : `Coverage: ${campaign.coverage}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* For Wheel: Show Collateral and Total Premium */}
                  {campaign.type === 'wheel' ? (
                    <>
                      {/* Current Collateral */}
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Onderpand</p>
                        {campaign.activeOptions.length > 0 ? (
                          <>
                            {campaign.activeOptions[0].position.type === 'put' ? (
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency((campaign.activeOptions[0].position as PutOption).strike * (campaign.activeOptions[0].position as PutOption).contracts * 100, currencySymbol)}
                                <span className="text-xs text-gray-500 ml-1">cash</span>
                              </p>
                            ) : (
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {(campaign.root.position as any).shares || 100}
                                <span className="text-xs text-gray-500 ml-1">aandelen</span>
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="font-semibold text-gray-500 dark:text-gray-400">-</p>
                        )}
                      </div>

                      {/* Total P&L (realized + unrealized) */}
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Totale Winst</p>
                        {(() => {
                          // Calculate total P&L: realized from closed positions + unrealized from active option
                          let totalPnL = campaign.totalRealizedPnL;

                          // Add unrealized P&L from active option using utility function
                          if (campaign.activeOptions.length > 0) {
                            const activeOption = campaign.activeOptions[0].position;
                            const unrealizedPnL = calculateOptionUnrealizedPnL({
                              action: activeOption.action,
                              costBasis: activeOption.costBasis,
                              currentValue: activeOption.currentValue,
                            });
                            totalPnL += unrealizedPnL;
                          }

                          return (
                            <p className={`font-bold ${
                              totalPnL > 0
                                ? 'text-green-600 dark:text-green-400'
                                : totalPnL < 0
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {totalPnL > 0 ? '+' : ''}{formatCurrency(totalPnL, currencySymbol)}
                            </p>
                          );
                        })()}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Aankoopkost - for non-Wheel campaigns */}
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Aankoopkost</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(campaign.root.originalCostBasis, currencySymbol)}
                        </p>
                      </div>

                      {/* Ontvangen premies - for non-Wheel campaigns */}
                      <div className="text-right">
                        <p className="text-xs text-gray-500 dark:text-gray-400">Ontvangen premies</p>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          +{formatCurrency(campaign.root.originalCostBasis - campaign.root.adjustedCostBasis, currencySymbol)}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Delete Wheel Button - only for wheel campaigns */}
                  {campaign.type === 'wheel' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Extract the actual wheel ID from campaign.id (format: wheel-${wheel.id})
                        const wheelId = campaign.id.replace('wheel-', '');
                        setWheelToDelete(wheelId);
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Verwijder Wheel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Expand Icon */}
                  <div className="text-gray-400">
                    {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="mt-4 space-y-4">
                  {/* Description */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    {getCampaignTypeDescription(campaign.type)}
                  </p>

                  {/* Root Position - hide for Wheel campaigns */}
                  {campaign.type !== 'wheel' && (() => {
                    const tickerData = tickers.find(t => t.symbol.toUpperCase() === campaign.ticker.toUpperCase());
                    const stock = campaign.root.position as any;
                    const currentPrice = tickerData?.currentPrice || 0;
                    const purchasePricePerShare = campaign.root.quantity > 0 ? campaign.root.originalCostBasis / campaign.root.quantity : 0;

                    // Calculate current value based on ticker price for stocks
                    const liveCurrentValue = campaign.root.type !== 'leaps-call' && currentPrice > 0
                      ? campaign.root.quantity * currentPrice
                      : (stock.currentValue || campaign.root.originalCostBasis);
                    const profitLoss = liveCurrentValue - campaign.root.originalCostBasis;
                    const profitLossPercentage = campaign.root.originalCostBasis > 0 ? (profitLoss / campaign.root.originalCostBasis) * 100 : 0;

                    const isBasisExpanded = expandedBasisPositions.has(campaign.id);

                    return (
                      <div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleBasisPosition(campaign.id);
                          }}
                          className="w-full text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          {isBasisExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <Shield className="w-4 h-4" />
                          Basis positie
                        </button>
                        {isBasisExpanded && (
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800/50">
                          {/* Column Headers */}
                          <div className="px-6 py-2 bg-gray-100 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-[32px_minmax(140px,1fr)_80px_70px_70px_70px_85px_85px_90px_70px] gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 items-center">
                              <div></div> {/* Icon */}
                              <div>Ticker</div>
                              <div>Expiratie</div>
                              <div>Strike</div>
                              <div>Stock prijs</div>
                              <div>Verschil</div>
                              <div>Open</div>
                              <div>Huidige</div>
                              <div>Winst/Verlies</div>
                              <div>Aangepast</div>
                            </div>
                          </div>
                          {/* Root Position - Same grid structure as PortfolioView */}
                          <div className="px-6 py-3 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors border-l-4 border-l-gray-300 dark:border-l-gray-600">
                            <div className="grid grid-cols-[32px_minmax(140px,1fr)_80px_70px_70px_70px_85px_85px_90px_70px] gap-2 items-start">
                              {/* Icon */}
                              <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                                campaign.root.type === 'leaps-call'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              }`}>
                                {campaign.root.type === 'leaps-call' ? (
                                  <ArrowUpCircle className="w-4 h-4" />
                                ) : (
                                  <TrendingUp className="w-4 h-4" />
                                )}
                              </div>

                              {/* Ticker with badges */}
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                    {campaign.root.type === 'leaps-call'
                                      ? `${campaign.root.quantity}x ${campaign.ticker}`
                                      : `${campaign.root.quantity}x ${campaign.ticker}`}
                                  </h4>
                                  <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                                    campaign.root.type === 'leaps-call'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                  }`}>
                                    {campaign.root.type === 'leaps-call' ? 'LEAPS' : 'STOCK'}
                                  </span>
                                </div>
                                {tickerData?.name && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{tickerData.name}</p>
                                )}
                              </div>

                              {/* Expiratie - only for LEAPS */}
                              <div>
                                {campaign.root.type === 'leaps-call' ? (
                                  <>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {(campaign.root.position as CallOption).expiration
                                        ? new Date((campaign.root.position as CallOption).expiration).toLocaleDateString('nl-NL')
                                        : '-'}
                                    </p>
                                    {(campaign.root.position as CallOption).expiration && (
                                      <p className={`text-xs ${
                                        getDaysToExpiration((campaign.root.position as CallOption).expiration) <= 30
                                          ? 'text-red-600 dark:text-red-400'
                                          : getDaysToExpiration((campaign.root.position as CallOption).expiration) <= 90
                                          ? 'text-yellow-600 dark:text-yellow-400'
                                          : 'text-gray-500 dark:text-gray-400'
                                      }`}>
                                        {getDaysToExpiration((campaign.root.position as CallOption).expiration)}d
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-sm text-gray-400 dark:text-gray-600">-</p>
                                )}
                              </div>

                              {/* Strike - only for LEAPS */}
                              <div>
                                {campaign.root.type === 'leaps-call' ? (
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatCurrency((campaign.root.position as CallOption).strike, currencySymbol)}
                                  </p>
                                ) : (
                                  <p className="text-sm text-gray-400 dark:text-gray-600">-</p>
                                )}
                              </div>

                              {/* Stock prijs */}
                              <div>
                                {currentPrice ? (
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatCurrency(currentPrice, currencySymbol)}
                                  </p>
                                ) : (
                                  <p className="text-sm text-gray-400 dark:text-gray-600">-</p>
                                )}
                              </div>

                              {/* Verschil */}
                              <div>
                                {currentPrice && campaign.root.type !== 'leaps-call' ? (
                                  <p className={`text-sm font-medium ${
                                    currentPrice < purchasePricePerShare
                                      ? 'text-red-600 dark:text-red-400'
                                      : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {currentPrice > purchasePricePerShare ? '+' : ''}{formatCurrency(currentPrice - purchasePricePerShare, currencySymbol)}
                                  </p>
                                ) : (
                                  <p className="text-sm text-gray-400 dark:text-gray-600">-</p>
                                )}
                              </div>

                              {/* Open (Kostprijs) */}
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {formatCurrency(purchasePricePerShare, currencySymbol)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatCurrency(campaign.root.originalCostBasis, currencySymbol)}
                                </p>
                              </div>

                              {/* Huidige */}
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {currentPrice ? formatCurrency(currentPrice, currencySymbol) : formatCurrency(purchasePricePerShare, currencySymbol)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatCurrency(liveCurrentValue, currencySymbol)}
                                </p>
                              </div>

                              {/* Winst/Verlies */}
                              <div>
                                <p className={`text-sm font-medium ${
                                  profitLoss > 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : profitLoss < 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                  {profitLoss > 0 ? '+' : ''}{formatCurrency(profitLoss, currencySymbol)}
                                </p>
                                <p className={`text-xs ${
                                  profitLossPercentage > 0
                                    ? 'text-green-600 dark:text-green-400'
                                    : profitLossPercentage < 0
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                }`}>
                                  {profitLossPercentage > 0 ? '+' : ''}{formatNumber(profitLossPercentage)}%
                                </p>
                              </div>

                              {/* Aangepast */}
                              <div>
                                <p className={`text-sm font-medium ${
                                  campaign.root.adjustedCostBasis < campaign.root.originalCostBasis
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                  {formatCurrency(campaign.root.adjustedCostBasis, currencySymbol)}
                                </p>
                                {campaign.root.adjustedCostBasis < campaign.root.originalCostBasis && (
                                  <p className="text-xs text-green-600 dark:text-green-400">
                                    (-{formatCurrency(campaign.root.originalCostBasis - campaign.root.adjustedCostBasis, currencySymbol)})
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Active Options */}
                  {campaign.activeOptions.length > 0 && (() => {
                    const isActiveExpanded = expandedActiveOptions.has(campaign.id);

                    return (
                    <div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleActiveOptions(campaign.id);
                        }}
                        className="w-full text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        {isActiveExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <DollarSign className="w-4 h-4" />
                        Actieve {campaign.type === 'kaching' ? 'Puts' : campaign.type === 'wheel' ? 'Optie' : 'Calls'}{campaign.type !== 'wheel' && ` (${campaign.activeOptions.length})`}
                      </button>
                      {isActiveExpanded && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800/50">
                        {/* Column Headers */}
                        <div className="px-6 py-2 bg-gray-100 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                          <div className="grid grid-cols-[32px_minmax(140px,1fr)_80px_70px_70px_70px_85px_85px_90px_70px_16px_130px] gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 items-center">
                            <div></div> {/* Icon */}
                            <div>Ticker</div>
                            <div>Expiratie</div>
                            <div>Strike</div>
                            <div>Stock prijs</div>
                            <div>Verschil</div>
                            <div>Open</div>
                            <div>Huidige</div>
                            <div>Winst/Verlies</div>
                            <div>Onderpand</div>
                            <div></div> {/* Spacer */}
                            <div className="text-right">Actions</div> {/* Actions */}
                          </div>
                        </div>
                        {campaign.activeOptions.map(opt => {
                          // Determine collateral type based on campaign type
                          let collateralType: CollateralType = 'none';
                          let collateralValue = 0;
                          let collateralDescription = '';

                          // LEAPS info for PMCC campaigns
                          let leapsInfo: { ticker: string; expiration: string } | undefined;

                          if (campaign.type === 'covered-call') {
                            collateralType = 'stock';
                            collateralValue = campaign.root.originalCostBasis;
                            collateralDescription = `Deze call is gedekt door ${campaign.root.position.type === 'stock' ? 'aandelen' : 'ETF'} (${(campaign.root.position as any).shares || 100} stuks). Bij assignment lever je de aandelen, geen cash nodig.`;
                          } else if (campaign.type === 'pmcc') {
                            collateralType = 'leaps';
                            collateralValue = campaign.root.originalCostBasis;
                            collateralDescription = `Deze call is gedekt door je LEAPS call optie. De LEAPS fungeert als onderpand in plaats van aandelen.`;
                            // Get LEAPS ticker and expiration
                            const leapsOption = campaign.root.position as CallOption;
                            leapsInfo = {
                              ticker: leapsOption.ticker,
                              expiration: leapsOption.expiration,
                            };
                          } else if (campaign.type === 'kaching') {
                            collateralType = 'cash';
                            const putOption = opt.position as PutOption;
                            collateralValue = putOption.strike * putOption.contracts * 100;
                            collateralDescription = `Deze put vereist ${formatCurrency(collateralValue, currencySymbol)} cash als onderpand voor mogelijke assignment.`;
                          } else if (campaign.type === 'wheel') {
                            // Wheel can have both Cash Secured Puts (cash) or Covered Calls (stock)
                            if (opt.position.type === 'put') {
                              collateralType = 'cash';
                              const putOption = opt.position as PutOption;
                              collateralValue = putOption.strike * putOption.contracts * 100;
                              collateralDescription = `Deze Cash Secured Put vereist ${formatCurrency(collateralValue, currencySymbol)} cash als onderpand voor mogelijke assignment.`;
                            } else if (opt.position.type === 'call') {
                              collateralType = 'stock';
                              collateralValue = campaign.root.originalCostBasis;
                              collateralDescription = `Deze covered call is gedekt door je aandelen. Bij assignment lever je de aandelen.`;
                            }
                          }

                          // Get ticker data for this option
                          const tickerData = tickers.find(t => t.symbol.toUpperCase() === opt.position.ticker.toUpperCase());
                          const stockPrice = tickerData?.currentPrice;

                          return (
                            <OptionRow
                              key={opt.position.id}
                              option={opt.position}
                              currencySymbol={currencySymbol}
                              tickerData={tickerData}
                              stockPrice={stockPrice}
                              onRoll={(option) => setPositionToRoll(option)}
                              onClose={(option) => setPositionToClose(option)}
                              onAssign={(option) => setPositionToAssign(option)}
                              onClick={(option) => setPositionToView(option)}
                              collateralType={collateralType}
                              collateralValue={collateralValue}
                              collateralDescription={collateralDescription}
                              leapsInfo={leapsInfo}
                            />
                          );
                        })}
                      </div>
                      )}
                    </div>
                    );
                  })()}

                  {/* Opportunity indicator with action button */}
                  {campaign.hasOpportunity && (
                    <div className="flex items-center justify-between gap-2 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <p className="text-sm text-green-700 dark:text-green-300">
                          {campaign.opportunityMessage}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Set ticker for wizard
                          setWizardTicker({
                            symbol: campaign.ticker,
                            name: campaign.ticker,
                            type: 'stock',
                            optionsAvailable: true,
                            miniContractsAvailable: false,
                          });
                          // Set wheel ID if this is a wheel campaign
                          if (campaign.type === 'wheel') {
                            const wheelId = campaign.id.replace('wheel-', '');
                            setWizardWheelId(wheelId);
                          } else {
                            setWizardWheelId(null);
                          }
                          // Open appropriate wizard based on campaign type
                          // KaChing always needs puts
                          // Wheel in Cash Secured Put phase needs puts, in stock phase needs calls
                          const needsPut = campaign.type === 'kaching' ||
                            (campaign.type === 'wheel' && campaign.root.type === 'protective-put');
                          if (needsPut) {
                            setShowPutWizard(true);
                          } else {
                            setShowCallWizard(true);
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        {campaign.type === 'kaching' || (campaign.type === 'wheel' && campaign.root.type === 'protective-put') ? 'Put' : 'Call'}
                      </button>
                    </div>
                  )}

                  {/* History Toggle - always show for Wheel, toggle for others */}
                  {campaign.historicalOptions.length > 0 && (
                    <div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleHistory(campaign.id);
                        }}
                        className="w-full flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                      >
                        {showingHistory ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <History className="w-4 h-4" />
                        Geschiedenis ({campaign.historicalOptions.length})
                      </button>

                      {showingHistory && (
                        <div className="mt-3 space-y-2">
                          {campaign.historicalOptions.map((opt, index) => {
                            const option = opt.position;
                            const openPremium = option.premium;
                            const closePremium = (option as any).closePremium || 0;
                            const openValue = openPremium * option.contracts * 100;
                            const closeValue = closePremium * option.contracts * 100;
                            // Determine option type for display
                            const optionType = option.type === 'put' ? 'Put' : 'Call';
                            return (
                              <div
                                key={`${option.id}-${index}`}
                                className="flex items-center p-3 bg-gray-100 dark:bg-gray-700/50 rounded-lg"
                              >
                                <div className="min-w-[140px] mr-4">
                                  <p className="font-medium text-gray-900 dark:text-white">
                                    {option.contracts}x ${option.strike} {optionType}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {option.openDate ? new Date(option.openDate).toLocaleDateString('nl-NL') : 'N/A'} → {opt.closeDate ? new Date(opt.closeDate).toLocaleDateString('nl-NL') : 'N/A'}
                                  </p>
                                </div>
                                <div className="min-w-[80px]">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Verkocht</p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatCurrency(openPremium, currencySymbol)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatCurrency(openValue, currencySymbol)}
                                  </p>
                                </div>
                                <div className="min-w-[80px]">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Teruggekocht</p>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {formatCurrency(closePremium, currencySymbol)}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatCurrency(closeValue, currencySymbol)}
                                  </p>
                                </div>
                                <div className="flex-1"></div>
                                <div className="min-w-[80px] text-right">
                                  <p className="text-xs text-gray-500 dark:text-gray-400">Winst</p>
                                  <p className={`text-sm font-semibold ${
                                    (opt.realizedPnL || 0) >= 0
                                      ? 'text-green-600 dark:text-green-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}>
                                    {(opt.realizedPnL || 0) >= 0 ? '+' : ''}{formatCurrency(opt.realizedPnL || 0, currencySymbol)}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Call Option Wizard */}
      <CallOptionWizard
        isOpen={showCallWizard}
        onClose={() => {
          setShowCallWizard(false);
          setWizardTicker(null);
          setWizardWheelId(null);
        }}
        portfolio={portfolio}
        initialAction="sell"
        initialTicker={wizardTicker || undefined}
        initialStep={2}
        initialWheelId={wizardWheelId || undefined}
      />

      {/* Put Option Wizard */}
      <PutOptionWizard
        isOpen={showPutWizard}
        onClose={() => {
          setShowPutWizard(false);
          setWizardTicker(null);
          setWizardWheelId(null);
        }}
        portfolio={portfolio}
        initialAction="sell"
        initialTicker={wizardTicker || undefined}
        initialStep={2}
        initialWheelId={wizardWheelId || undefined}
      />

      {/* Stock/ETF Wizard */}
      <StockETFWizard
        isOpen={showStockWizard}
        onClose={() => setShowStockWizard(false)}
        portfolio={portfolio}
      />

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

      {/* Close Position Modal */}
      {positionToClose && (
        <ClosePositionModal
          isOpen={!!positionToClose}
          onClose={() => setPositionToClose(null)}
          onConfirm={handleClosePosition}
          position={positionToClose}
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

      {/* Position Detail Modal for editing */}
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

      {/* New Wheel Modal */}
      <NewWheelModal
        isOpen={showNewWheelModal}
        onClose={() => setShowNewWheelModal(false)}
        portfolioName={portfolioName as PortfolioName}
      />

      {/* Delete Wheel Confirmation Modal */}
      {wheelToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setWheelToDelete(null)}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md transform transition-all">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Wheel Verwijderen
                  </h2>
                </div>
                <button
                  onClick={() => setWheelToDelete(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Weet je zeker dat je deze Wheel wilt verwijderen?
                </p>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    <strong>Let op:</strong> Alleen de Wheel campagne wordt verwijderd. Je onderliggende posities (Cash Secured Puts, aandelen, covered calls) blijven behouden.
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setWheelToDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Annuleren
                </button>
                <button
                  onClick={() => handleDeleteWheel(wheelToDelete)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
