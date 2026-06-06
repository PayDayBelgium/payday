import React, { useMemo, useState } from 'react';
import { TrendingUp, Layers, Zap, X as XIcon, RefreshCw, Trash2 } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { closePosition, updatePosition, addPosition } from '../../store/slices/positionsSlice';
import { addTransaction } from '../../store/slices/portfoliosSlice';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import {
  selectWheelsByPortfolio,
  removeWheel,
  updateWheelPhase,
  incrementWheelCycle,
  updateWheelPremium,
} from '../../store/slices/wheelsSlice';
import { detectCampaigns, buildWheelCampaign } from '../../utils/campaignDetector';
import type { Campaign, CampaignType } from '../../utils/campaignDetector';
import type {
  CurrencyType,
  Ticker,
  PortfolioName,
  CallOption,
  PutOption,
  Position,
  StockPosition,
} from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { calculateOptionRealizedPnL } from '../../utils/pnlCalculations';
import { CallOptionWizard } from '../modals/CallOptionWizard';
import { PutOptionWizard } from '../modals/PutOptionWizard';
import { RollOptionModal } from '../modals/RollOptionModal';
import { ClosePositionModal } from '../modals/ClosePositionModal';
import { AssignmentModal } from '../modals/AssignmentModal';
import { NewWheelModal } from '../modals/NewWheelModal';
import { StockETFWizard } from '../modals/StockETFWizard';
import { PositionDetailModal } from '../modals/PositionDetailModal';
import { CampaignFilterTabs } from './CampaignFilterTabs';
import { CampaignCard } from './CampaignCard';
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
  const wheels = useAppSelector((state: RootState) =>
    selectWheelsByPortfolio(state, portfolioName as PortfolioName)
  );
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
    const p = portfolios.find((p) => p.name === portfolioName);
    return {
      name: portfolioName as PortfolioName,
      currency: currency,
      currentValue: p?.currentValue || 0,
    };
  }, [portfolios, portfolioName, currency]);

  // Get positions for this portfolio
  const portfolioPositions = useMemo(() => {
    return positions.filter((p) => p.portfolio === portfolioName);
  }, [positions, portfolioName]);

  // Separate open and closed positions
  const openPositions = useMemo(() => {
    return portfolioPositions.filter((p) => p.status === 'open');
  }, [portfolioPositions]);

  const closedPositions = useMemo(() => {
    return portfolioPositions.filter((p) => p.status === 'closed');
  }, [portfolioPositions]);

  // Detect campaigns (including Wheels)
  const campaigns = useMemo(() => {
    const detectedCampaigns = detectCampaigns(openPositions, closedPositions);

    // Build Wheel campaigns from explicit Wheel records
    const wheelCampaigns = wheels
      .map((wheel) => buildWheelCampaign(wheel, openPositions, closedPositions))
      .filter((c): c is Campaign => c !== null);

    return [...detectedCampaigns, ...wheelCampaigns];
  }, [openPositions, closedPositions, wheels]);

  // Filter campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => c.type === filter);
  }, [campaigns, filter]);

  // Campaign counts by type
  const campaignCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'covered-call': 0,
      pmcc: 0,
      kaching: 0,
      wheel: 0,
    };
    campaigns.forEach((c) => {
      counts[c.type]++;
    });
    return counts;
  }, [campaigns]);

  // Toggle campaign expansion
  const toggleCampaign = (id: string) => {
    setExpandedCampaigns((prev) => {
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
    setShowHistory((prev) => {
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
    setExpandedBasisPositions((prev) => {
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
    setExpandedActiveOptions((prev) => {
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
      setInitializedSections((prev) => new Set(prev).add(campaignId));
      setExpandedBasisPositions((prev) => new Set(prev).add(campaignId));
      setExpandedActiveOptions((prev) => new Set(prev).add(campaignId));
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

    dispatch(
      closePosition({
        id: positionToClose.id,
        closeDate: closeData.closeDate,
        closePremium: closeData.closePremium,
        closePrice: closeData.closePrice,
        realizedPnL: closeData.realizedPnL,
        notes: closeData.notes,
      })
    );

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
    dispatch(
      closePosition({
        id: option.id,
        closeDate: today,
        closePremium: rollData.closePremium,
        realizedPnL,
        notes: rollData.notes
          ? `Rolled to $${rollData.newStrike} ${rollData.newExpiration}. ${rollData.notes}`
          : `Rolled to $${rollData.newStrike} ${rollData.newExpiration}`,
      })
    );

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
    dispatch(
      closePosition({
        id: option.id,
        closeDate: assignmentData.assignmentDate,
        closePremium: 0,
        realizedPnL,
        notes: assignmentData.notes ? `Assignment: ${assignmentData.notes}` : 'Assigned',
      })
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
        wheelId: option.wheelId,
      };

      dispatch(addPosition(newStockPosition));

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
      dispatch(
        addTransaction({
          id: `txn-${Date.now()}`,
          portfolio: option.portfolio,
          createdAt: new Date().toISOString(),
          date: assignmentData.assignmentDate,
          type: 'position_buy' as const,
          amount: -effectiveCost,
          description: `Assignment: ${shares} ${option.ticker} @ $${option.strike}`,
          notes: `Assigned from Cash Secured Put. Effective cost: ${formatCurrency(effectiveCost, currencySymbol)}`,
        })
      );
    } else {
      // Short CALL assigned: remove stock and realize gain
      const stockPosition = openPositions.find(
        (p) =>
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
          dispatch(
            closePosition({
              id: stockPosition.id,
              closeDate: assignmentData.assignmentDate,
              closePrice: option.strike,
              realizedPnL: stockRealizedPnL,
              notes: `Assigned from covered call at $${option.strike}`,
            })
          );
        } else {
          const remainingShares = stockPosition.shares - shares;
          const remainingCostBasis =
            (stockPosition.costBasis / stockPosition.shares) * remainingShares;

          dispatch(
            updatePosition({
              ...stockPosition,
              shares: remainingShares,
              costBasis: remainingCostBasis,
              currentValue: remainingShares * (stockPosition.currentValue / stockPosition.shares),
            } as any)
          );
        }

        // Update Wheel if linked
        if (option.wheelId) {
          dispatch(incrementWheelCycle(option.wheelId));
          dispatch(
            updateWheelPhase({
              id: option.wheelId,
              phase: 'csp',
            })
          );
          dispatch(
            updateWheelPremium({
              id: option.wheelId,
              premiumCollected: 0,
              realizedPnL: stockRealizedPnL,
            })
          );
        }

        // Log transaction
        dispatch(
          addTransaction({
            id: `txn-${Date.now()}`,
            portfolio: option.portfolio,
            createdAt: new Date().toISOString(),
            date: assignmentData.assignmentDate,
            type: 'position_sell' as const,
            amount: totalProceeds + premiumReceived,
            description: `Assignment: Verkoop ${shares} ${option.ticker} @ $${option.strike}`,
            notes: `Assigned from covered call. Stock P&L: ${formatCurrency(stockRealizedPnL, currencySymbol)}, Premium: ${formatCurrency(premiumReceived, currencySymbol)}`,
          })
        );
      }
    }

    setPositionToAssign(null);
  };

  // Open de juiste wizard vanuit de opportunity-knop van een campagne
  const handleOpportunityAction = (campaign: Campaign) => {
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
    const needsPut =
      campaign.type === 'kaching' ||
      (campaign.type === 'wheel' && campaign.root.type === 'protective-put');
    if (needsPut) {
      setShowPutWizard(true);
    } else {
      setShowCallWizard(true);
    }
  };

  // Helper function to render empty state for each campaign type
  const renderEmptyState = (type: FilterType) => {
    switch (type) {
      case 'covered-call':
        return (
          <div className="p-8">
            <div className="text-center max-w-md mx-auto">
              <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-full w-fit mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-primary-700 dark:text-primary-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Geen Covered Calls
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Schrijf calls op aandelen die je bezit en ontvang premie. Je aandelen dienen als
                onderpand.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 italic">
                Risico: Je loopt potentiële winst mis als het aandeel sterk stijgt boven je strike.
              </p>
              <button
                onClick={() => setShowStockWizard(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-700 hover:bg-primary-800 dark:bg-primary-500 dark:hover:bg-primary-700 rounded-lg transition-colors"
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
              <div className="p-3 bg-surface-muted dark:bg-trading-dark-600 rounded-full w-fit mx-auto mb-4">
                <Layers className="w-8 h-8 text-ink-600 dark:text-ink-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Geen Poor Man's Covered Calls
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Koop een LEAPS call en schrijf korte termijn calls. De LEAPS fungeert als goedkoper
                onderpand i.p.v. aandelen.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 italic">
                Risico: Je LEAPS kan waardeloos aflopen. Beperkt verlies = LEAPS kostprijs -
                ontvangen premies.
              </p>
              <button
                onClick={() => setShowCallWizard(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-ink-700 hover:bg-purple-700 dark:bg-ink-600 dark:hover:bg-ink-700 rounded-lg transition-colors"
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
              <div className="p-3 bg-caution-50 dark:bg-caution-600/25 rounded-full w-fit mx-auto mb-4">
                <Zap className="w-8 h-8 text-caution-600 dark:text-caution-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Geen KaChing Campagnes
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Koop een protective put en schrijf wekelijks puts met hogere strikes. Je long put
                beschermt tegen grote dalingen.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 italic">
                Risico: De spread tussen je protective put en geschreven put × 100. Beperkt maar
                gedefinieerd verlies.
              </p>
              <button
                onClick={() => setShowPutWizard(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-caution-600 hover:bg-caution-600 dark:bg-caution-500 dark:hover:bg-caution-600 rounded-lg transition-colors"
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
                Verkoop Cash Secured Puts tot assignment, schrijf dan covered calls tot verkoop, en
                herhaal. Continu premie ontvangen.
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4 italic">
                Risico: Je koopt aandelen bij assignment. Bij grote daling zit je vast met
                verliesgevende positie.
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
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col ${className}`}
    >
      {/* Filter Tabs */}
      <CampaignFilterTabs
        filter={filter}
        onFilterChange={setFilter}
        campaignCounts={campaignCounts}
        onNewWheel={() => setShowNewWheelModal(true)}
      />

      {/* Campaign List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 flex-1 overflow-y-auto">
        {filteredCampaigns.length === 0 ? (
          <div className="h-full flex items-center justify-center min-h-[400px]">
            {renderEmptyState(filter)}
          </div>
        ) : (
          filteredCampaigns.map((campaign) => {
            const isExpanded = expandedCampaigns.has(campaign.id);
            const showingHistory = showHistory.has(campaign.id);

            return (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                currencySymbol={currencySymbol}
                tickers={tickers}
                isExpanded={isExpanded}
                isBasisExpanded={expandedBasisPositions.has(campaign.id)}
                isActiveExpanded={expandedActiveOptions.has(campaign.id)}
                showingHistory={showingHistory}
                onToggleCampaign={toggleCampaign}
                onToggleBasisPosition={toggleBasisPosition}
                onToggleActiveOptions={toggleActiveOptions}
                onToggleHistory={toggleHistory}
                onDeleteWheel={setWheelToDelete}
                onRoll={setPositionToRoll}
                onClose={setPositionToClose}
                onAssign={setPositionToAssign}
                onView={setPositionToView}
                onOpportunityAction={handleOpportunityAction}
              />
            );
          })
        )}
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
                  <div className="p-2 bg-negative-50 dark:bg-negative-700/25 rounded-lg">
                    <Trash2 className="w-5 h-5 text-negative-600 dark:text-negative-500" />
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
                <div className="p-3 bg-caution-50 dark:bg-caution-600/15 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
                  <p className="text-sm text-caution-600 dark:text-caution-500">
                    <strong>Let op:</strong> Alleen de Wheel campagne wordt verwijderd. Je
                    onderliggende posities (Cash Secured Puts, aandelen, covered calls) blijven
                    behouden.
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
                  className="px-4 py-2 text-sm font-medium text-white bg-negative-600 hover:bg-negative-700 rounded-lg transition-colors"
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
