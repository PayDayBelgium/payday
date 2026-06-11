import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Layers, Zap, X as XIcon, RefreshCw, Trash2 } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { closePosition, editPosition } from '../../store/commands/positionCommands';
import { rollOption, recordAssignment } from '../../store/commands/rollCommands';
import { deleteWheel } from '../../store/commands/wheelCommands';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import { selectWheelsByPortfolio } from '../../store/slices/wheelsSlice';
import { detectCampaigns, buildWheelCampaign } from '../../utils/campaignDetector';
import type { Campaign, CampaignType } from '../../utils/campaignDetector';
import type {
  CurrencyType,
  Ticker,
  PortfolioName,
  CallOption,
  PutOption,
  Position,
} from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
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
  /** Campaign type to show first (defaults to covered-call). */
  initialFilter?: CampaignType;
  /** Lock the view to initialFilter and hide the filter tabs (for strategy pages). */
  lockFilter?: boolean;
}

type FilterType = CampaignType;

export const CampaignView: React.FC<CampaignViewProps> = ({
  portfolioName,
  currency,
  className = '',
  initialFilter = 'covered-call',
  lockFilter = false,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const currencySymbol = getCurrencySymbol(currency);
  const positions = useAppSelector((state) => state.positions.positions);
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);
  const tickers = useAppSelector(selectAllTickers);
  const wheels = useAppSelector((state: RootState) =>
    selectWheelsByPortfolio(state, portfolioName as PortfolioName)
  );
  const [filter, setFilter] = useState<FilterType>(initialFilter);
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

  // Price lookup per ticker for the 15%-OTM weighting in coverage allocation.
  const getPrice = useMemo(() => {
    const map = new Map(tickers.map((t) => [t.symbol.toUpperCase(), t.currentPrice]));
    return (ticker: string) => map.get(ticker.toUpperCase());
  }, [tickers]);

  // Detect campaigns (including Wheels)
  const campaigns = useMemo(() => {
    const detectedCampaigns = detectCampaigns(openPositions, closedPositions, getPrice);

    // Build Wheel campaigns from explicit Wheel records
    const wheelCampaigns = wheels
      .map((wheel) => buildWheelCampaign(wheel, openPositions, closedPositions))
      .filter((c): c is Campaign => c !== null);

    return [...detectedCampaigns, ...wheelCampaigns];
  }, [openPositions, closedPositions, wheels, getPrice]);

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
    dispatch(deleteWheel(wheelId, new Date().toISOString()));
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
      closePosition(
        {
          id: positionToClose.id,
          closeDate: closeData.closeDate,
          closePremium: closeData.closePremium,
          closePrice: closeData.closePrice,
          realizedPnL: closeData.realizedPnL,
          notes: closeData.notes,
        },
        new Date().toISOString()
      )
    );

    setPositionToClose(null);
  };

  // Handle roll option
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

  // Handle assignment of short option
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

  // Open the appropriate wizard from a campaign's opportunity button
  const handleOpportunityAction = (campaign: Campaign) => {
    // Set ticker for wizard
    setWizardTicker({
      symbol: campaign.ticker,
      name: campaign.ticker,
      type: 'stock',
      optionsAvailable: true,
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
              <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
                {t('widgetsA.noCoveredCalls')}
              </h3>
              <p className="text-sm text-ink-500 dark:text-ink-400 mb-4">
                {t('widgetsA.noCoveredCallsDesc')}
              </p>
              <p className="text-xs text-ink-400 dark:text-ink-500 mb-4 italic">
                {t('widgetsA.noCoveredCallsRisk')}
              </p>
              <button
                onClick={() => setShowStockWizard(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-700 hover:bg-primary-800 dark:bg-primary-500 dark:hover:bg-primary-700 rounded-lg transition-colors"
              >
                {t('widgetsA.buyShares')}
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
              <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
                {t('widgetsA.noPmcc')}
              </h3>
              <p className="text-sm text-ink-500 dark:text-ink-400 mb-4">
                {t('widgetsA.noPmccDesc')}
              </p>
              <p className="text-xs text-ink-400 dark:text-ink-500 mb-4 italic">
                {t('widgetsA.noPmccRisk')}
              </p>
              <button
                onClick={() => setShowCallWizard(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-ink-700 hover:bg-purple-700 dark:bg-ink-600 dark:hover:bg-ink-700 rounded-lg transition-colors"
              >
                {t('widgetsA.buyLeaps')}
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
              <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
                {t('widgetsA.noKaching')}
              </h3>
              <p className="text-sm text-ink-500 dark:text-ink-400 mb-4">
                {t('widgetsA.noKachingDesc')}
              </p>
              <p className="text-xs text-ink-400 dark:text-ink-500 mb-4 italic">
                {t('widgetsA.noKachingRisk')}
              </p>
              <button
                onClick={() => setShowPutWizard(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-caution-600 hover:bg-caution-600 dark:bg-caution-500 dark:hover:bg-caution-600 rounded-lg transition-colors"
              >
                {t('widgetsA.buyProtectivePut')}
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
              <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
                {t('widgetsA.noWheel')}
              </h3>
              <p className="text-sm text-ink-500 dark:text-ink-400 mb-4">
                {t('widgetsA.noWheelDesc')}
              </p>
              <p className="text-xs text-ink-400 dark:text-ink-500 mb-4 italic">
                {t('widgetsA.noWheelRisk')}
              </p>
              <button
                onClick={() => setShowNewWheelModal(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 rounded-lg transition-colors"
              >
                {t('widgetsA.startWheel')}
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
      className={`bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 h-full flex flex-col ${className}`}
    >
      {/* Filter Tabs — hidden when the view is locked to a single campaign type */}
      {!lockFilter && (
        <CampaignFilterTabs
          filter={filter}
          onFilterChange={setFilter}
          campaignCounts={campaignCounts}
          onNewWheel={() => setShowNewWheelModal(true)}
        />
      )}

      {/* Campaign List */}
      <div className="divide-y divide-surface-line dark:divide-trading-dark-600 flex-1 overflow-y-auto">
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
            dispatch(editPosition(updatedPosition, new Date().toISOString()));
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
            <div className="relative bg-white dark:bg-trading-dark-800 rounded-xl shadow-xl w-full max-w-md transform transition-all">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-surface-line dark:border-trading-dark-600">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-negative-50 dark:bg-negative-700/25 rounded-lg">
                    <Trash2 className="w-5 h-5 text-negative-600 dark:text-negative-500" />
                  </div>
                  <h2 className="text-lg font-semibold text-ink-900 dark:text-white">
                    {t('widgetsA.deleteWheelTitle')}
                  </h2>
                </div>
                <button
                  onClick={() => setWheelToDelete(null)}
                  className="p-1 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 transition-colors"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {t('widgetsA.deleteWheelConfirm')}
                </p>
                <div className="p-3 bg-caution-50 dark:bg-caution-600/15 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
                  <p className="text-sm text-caution-600 dark:text-caution-500">
                    <strong>{t('widgetsA.deleteWheelWarningLabel')}</strong>{' '}
                    {t('widgetsA.deleteWheelWarning')}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 p-4 border-t border-surface-line dark:border-trading-dark-600">
                <button
                  onClick={() => setWheelToDelete(null)}
                  className="px-4 py-2 text-sm font-medium text-ink-700 dark:text-ink-300 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 rounded-lg transition-colors"
                >
                  {t('widgetsA.cancel')}
                </button>
                <button
                  onClick={() => handleDeleteWheel(wheelToDelete)}
                  className="px-4 py-2 text-sm font-medium text-white bg-negative-600 hover:bg-negative-700 rounded-lg transition-colors"
                >
                  {t('widgetsA.delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
