import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { DollarSign, Banknote, ShieldAlert, TrendingUp, TrendingDown, ExternalLink, Plus, Briefcase, History, Info, BarChart3, Wallet, AlertCircle, Target, ChevronDown, ChevronRight, Layers, Clock, AlertTriangle, Percent, type LucideIcon } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { selectTransactionsByPortfolio, addTransaction, selectDailyData } from '../../store/slices/portfoliosSlice';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import { selectUnlockedLevels, isFeatureAvailable } from '../../store/slices/userProgressSlice';
import { useAlerts } from '../../hooks/useAlerts';
import { StatCard } from '../../components/widgets/StatCard';
import { TransactionLog } from '../../components/widgets/TransactionLog';
import { PortfolioView } from '../../components/widgets/PortfolioView';
import { PortfolioValueChart } from '../../components/widgets/PortfolioValueChart';
import { CampaignView } from '../../components/widgets/CampaignView';
import { TransactionModal } from '../../components/modals/TransactionModal';
import { StockETFWizard } from '../../components/modals/StockETFWizard';
import { CallOptionWizard } from '../../components/modals/CallOptionWizard';
import { PutOptionWizard } from '../../components/modals/PutOptionWizard';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { getSpreadId } from '../../utils/spreadHelpers';
import { ConfirmModal } from '../../components/modals/ConfirmModal';

type TabType = 'portfolio' | 'chart' | 'transactions' | 'freecash' | 'calculation' | 'information' | 'insights' | 'alerts' | 'campaigns';

// Helper function to get the appropriate icon based on message content
const getAlertIcon = (message: string, isAlert: boolean): LucideIcon => {
  if (!isAlert) {
    if (message.toLowerCase().includes('premium') || message.toLowerCase().includes('roi')) {
      return DollarSign;
    }
    if (message.toLowerCase().includes('delta')) {
      return Percent;
    }
    return Target;
  }

  if (message.toLowerCase().includes('verloopt') || message.toLowerCase().includes('expir')) {
    return Clock;
  }
  if (message.toLowerCase().includes('gevaar') || message.toLowerCase().includes('danger') || message.toLowerCase().includes('verlies')) {
    return ShieldAlert;
  }
  if (message.toLowerCase().includes('itm') || message.toLowerCase().includes('strike')) {
    return AlertTriangle;
  }
  if (message.toLowerCase().includes('delta')) {
    return TrendingUp;
  }

  return AlertCircle;
};

export const PortfolioDetail: React.FC = () => {
  const { t } = useTranslation();
  const { portfolioName } = useParams<{ portfolioName: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { setPageTitle, setTitleIcon } = usePageTitle();
  const { canGoBack, pushNavigation } = useNavigation();
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);
  const positions = useAppSelector((state) => state.positions.positions);
  const tickerList = useAppSelector(selectAllTickers);
  const portfolio = portfolios.find((b) => b.name === portfolioName);
  const transactions = useAppSelector((state) => selectTransactionsByPortfolio(state, portfolioName || ''));
  const dailyData = useAppSelector(selectDailyData);
  const unlockedLevels = useAppSelector(selectUnlockedLevels);

  // Check feature access for options
  const hasOptionsAccess = isFeatureAvailable('covered_calls', unlockedLevels);

  // Use central alerts hook with portfolio filter
  const { alerts, opportunities } = useAlerts(portfolioName);
  const alertsData = { alerts, opportunities };

  // Filter daily data for this portfolio
  const portfolioDailyData = useMemo(() => {
    return dailyData.filter(d => d.portfolio === portfolioName);
  }, [dailyData, portfolioName]);

  const [activeTab, setActiveTab] = useState<TabType>('portfolio');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isStockWizardOpen, setIsStockWizardOpen] = useState(false);
  const [isCallOptionWizardOpen, setIsCallOptionWizardOpen] = useState(false);
  const [isPutOptionWizardOpen, setIsPutOptionWizardOpen] = useState(false);
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());

  useEffect(() => {
    setPageTitle(portfolioName || 'Portfolio Details', t('portfolioDetail.pageSubtitle'));

    // Set portfolio logo in title bar
    if (portfolio?.logo) {
      setTitleIcon(portfolio.logo);
    }

    // If there's no navigation history (came from menu), mark this as menu navigation
    if (!canGoBack) {
      pushNavigation(`/portfolio/${portfolioName}`, portfolioName || 'Portfolio Details', true);
    }

    // Cleanup: remove title icon when component unmounts
    return () => {
      setTitleIcon(null);
    };
  }, [setPageTitle, setTitleIcon, portfolioName, portfolio?.logo, t, canGoBack, pushNavigation]);

  // Calculate portfolio stats from positions
  const portfolioStats = useMemo(() => {
    if (!portfolio) return { totalValue: 0, positionsValue: 0, cashValue: 0, positionCount: 0, longCount: 0, shortCount: 0, longValue: 0, shortValue: 0 };

    const portfolioPositions = positions.filter(p => p.portfolio === portfolioName && p.status === 'open');

    // Calculate long and short values separately
    // Long positions: stocks, ETFs, and bought options
    // Short positions: sold options

    // Stock and ETF value (always long positions)
    const stockEtfValue = portfolioPositions
      .filter(p => p.type === 'stock' || p.type === 'etf')
      .reduce((sum, pos) => sum + (pos.currentValue ?? 0), 0);

    // Options long value (bought options)
    const optionsLongValue = portfolioPositions
      .filter(p => (p.type === 'call' || p.type === 'put') && 'action' in p && p.action === 'buy')
      .reduce((sum, pos) => sum + Math.abs(pos.currentValue ?? 0), 0);

    // Total long value = stocks + ETFs + bought options
    const longValue = stockEtfValue + optionsLongValue;

    const shortValue = portfolioPositions
      .filter(p => (p.type === 'call' || p.type === 'put') && 'action' in p && p.action === 'sell')
      .reduce((sum, pos) => sum + Math.abs(pos.currentValue ?? 0), 0);

    // Count long and short positions
    // Long count includes: stocks, ETFs, and bought options
    const longCount = portfolioPositions.filter(p =>
      p.type === 'stock' || p.type === 'etf' ||
      ((p.type === 'call' || p.type === 'put') && 'action' in p && p.action === 'buy')
    ).length;

    const shortCount = portfolioPositions.filter(p =>
      (p.type === 'call' || p.type === 'put') && 'action' in p && p.action === 'sell'
    ).length;

    // Net positions value = long value - short value
    const positionsValue = longValue - shortValue;

    // Cash = portfolio.currentValue - positions value
    const cashValue = portfolio.currentValue - positionsValue;

    // Total value = long value - short value + cash
    const totalValue = positionsValue + cashValue;

    // Calculate allocated cash (collateral for CSPs and spreads)
    const allocatedCash = portfolioPositions.reduce((sum, pos) => {
      if (pos.type === 'put' && 'cashReserved' in pos && pos.cashReserved) {
        return sum + pos.cashReserved;
      }
      if (pos.type === 'spread' && 'collateral' in pos && pos.collateral) {
        return sum + pos.collateral;
      }
      return sum;
    }, 0);

    const freeCash = cashValue - allocatedCash;

    return {
      totalValue,
      positionsValue,
      cashValue,
      positionCount: portfolioPositions.length,
      longCount,
      shortCount,
      longValue,
      shortValue,
      allocatedCash,
      freeCash,
    };
  }, [portfolio, positions, portfolioName]);

  const handleTransactionSubmit = (transactionData: {
    type: 'deposit' | 'withdrawal' | 'adjustment' | string;
    amount: number;
    description: string;
    date: string;
    notes?: string;
  }) => {
    if (!portfolio) return;

    const newValue = portfolio.currentValue + transactionData.amount;

    const transaction = {
      id: `txn-${Date.now()}`,
      portfolio: portfolio.name,
      ...transactionData,
      previousValue: portfolio.currentValue,
      newValue,
      createdAt: new Date().toISOString(),
    };

    dispatch(addTransaction(transaction as any));
  };

  // If portfolio not found, show error
  if (!portfolio) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Portfolio niet gevonden
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            De portfolio "{portfolioName}" kon niet worden gevonden.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full overflow-x-hidden">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 flex-shrink-0">
        <StatCard
          title="Portfolio waarde"
          description={
            <>
              Cash: {formatCurrency(portfolioStats.cashValue, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
              <br />
              Assets (long-short): {formatCurrency(portfolioStats.longValue - portfolioStats.shortValue, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
            </>
          }
          value={formatCurrency(portfolioStats.totalValue, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
          icon={<DollarSign className="w-6 h-6" />}
          tooltip="De totale waarde van je portfolio bestaande uit: Cash + Aandelen + ETF's + Opties (long) - Opties (short)"
        />
        <StatCard
          title="Long posities"
          description={`${portfolioStats.longCount} actieve long posities`}
          value={formatCurrency(portfolioStats.longValue, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <StatCard
          title="Short posities"
          description={`${portfolioStats.shortCount} actieve short posities`}
          value={formatCurrency(portfolioStats.shortValue, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
          icon={<TrendingDown className="w-6 h-6" />}
        />
        <StatCard
          title="Cash"
          description={
            <>
              Gealloceerd: {formatCurrency(portfolioStats.allocatedCash || 0, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
              <br />
              Vrij: {formatCurrency(portfolioStats.freeCash || portfolioStats.cashValue, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
            </>
          }
          value={formatCurrency(portfolioStats.cashValue, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
          icon={<Banknote className="w-6 h-6" />}
        />
        <StatCard
          title="Vrije cash"
          description={
            <>
              Cash: {formatCurrency(portfolioStats.cashValue, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
              <br />
              Gealloceerd: {formatCurrency(portfolioStats.allocatedCash || 0, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
            </>
          }
          value={formatCurrency(portfolioStats.freeCash || portfolioStats.cashValue, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
          icon={<Wallet className="w-6 h-6" />}
          tooltip="Cash die niet gereserveerd is als collateral voor short posities"
          valueClassName={(portfolioStats.freeCash || portfolioStats.cashValue) < 0 ? 'text-negative-600 dark:text-negative-500' : undefined}
          showAlert={(portfolioStats.freeCash || portfolioStats.cashValue) < 0}
          alertMessage="Je vrije cash is negatief. Dit betekent dat je meer collateral nodig hebt dan je beschikbare cash. Overweeg posities te sluiten of extra kapitaal toe te voegen."
        />
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col flex-1 min-h-0">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <nav className="flex -mb-px justify-between">
            <div className="flex">
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'portfolio'
                  ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              Portfolio ({portfolioStats.positionCount})
            </button>
            {hasOptionsAccess && (
              <button
                onClick={() => setActiveTab('campaigns')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'campaigns'
                    ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Layers className="w-4 h-4" />
                Campagnes
              </button>
            )}
            {hasOptionsAccess && (
              <button
                onClick={() => setActiveTab('freecash')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'freecash'
                    ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Banknote className="w-4 h-4" />
                Free cash
              </button>
            )}
            <button
              onClick={() => setActiveTab('chart')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'chart'
                  ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Evolutie
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'transactions'
                  ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <History className="w-4 h-4" />
              Transaction log
            </button>
            {hasOptionsAccess && (
              <button
                onClick={() => setActiveTab('information')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'information'
                    ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Info className="w-4 h-4" />
                Information
              </button>
            )}
            {hasOptionsAccess && (
              <button
                onClick={() => setActiveTab('insights')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'insights'
                    ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Virtueel portfolio
              </button>
            )}
            {hasOptionsAccess && (
              <button
                onClick={() => setActiveTab('alerts')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'alerts'
                    ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                Alerts & Opportunities
                {(alertsData.alerts.length > 0 || alertsData.opportunities.length > 0) && (
                  <span className="px-1.5 py-0.5 bg-caution-50 dark:bg-caution-600/25 rounded-full text-xs font-semibold text-caution-600 dark:text-caution-500">
                    {alertsData.alerts.length + alertsData.opportunities.length}
                  </span>
                )}
              </button>
            )}
            </div>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
          {activeTab === 'portfolio' && (
            <div className="px-4 pt-4 pb-2 flex flex-col h-full">
              {/* Quick Actions */}
              <div className="flex gap-2 flex-shrink-0 mb-4">
                  <button
                    onClick={() => setIsStockWizardOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-50 dark:hover:bg-primary-900/25 rounded-lg border border-primary-200 dark:border-primary-800 hover:border-primary-400 dark:hover:border-primary-700 transition-all text-left cursor-pointer w-36"
                  >
                    <Plus className="w-4 h-4 text-primary-700 dark:text-primary-300 flex-shrink-0" />
                    <span className="text-sm font-medium text-primary-700 dark:text-primary-300 truncate">
                      Aandeel/ETF
                    </span>
                  </button>

                  {hasOptionsAccess && (
                    <button
                      onClick={() => setIsCallOptionWizardOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-positive-50 dark:bg-positive-700/15 hover:bg-positive-50 dark:hover:bg-positive-700/25 rounded-lg border border-positive-500/20 dark:border-positive-700/30 hover:border-positive-500/40 dark:hover:border-positive-600 transition-all text-left cursor-pointer w-36"
                    >
                      <Plus className="w-4 h-4 text-positive-600 dark:text-positive-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-positive-700 dark:text-positive-500 truncate">
                        Call Optie
                      </span>
                    </button>
                  )}

                  {hasOptionsAccess && (
                    <button
                      onClick={() => setIsPutOptionWizardOpen(true)}
                      className="flex items-center gap-2 px-3 py-2 bg-surface-subtle dark:bg-trading-dark-700 hover:bg-surface-muted dark:hover:bg-purple-900/30 rounded-lg border border-ink-200 dark:border-trading-dark-600 hover:border-purple-400 dark:hover:border-ink-700 transition-all text-left cursor-pointer w-36"
                    >
                      <Plus className="w-4 h-4 text-ink-600 dark:text-ink-300 flex-shrink-0" />
                      <span className="text-sm font-medium text-ink-700 dark:text-ink-300 truncate">
                        Put Optie
                      </span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsTransactionModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-caution-50 dark:bg-caution-600/15 hover:bg-caution-50 dark:hover:bg-amber-900/30 rounded-lg border border-caution-500/30 dark:border-caution-600/40 hover:border-caution-500 dark:hover:border-caution-600 transition-all text-left cursor-pointer w-36"
                  >
                    <Plus className="w-4 h-4 text-caution-600 dark:text-caution-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-caution-600 dark:text-caution-500 truncate">
                      Transactie
                    </span>
                  </button>
                </div>

              {/* Portfolio Positions */}
              <div className="flex-1 min-h-0">
                <PortfolioView
                  positions={positions.filter(p => p.portfolio === portfolioName)}
                  currency={portfolio?.currency ?? 'USD'}
                  portfolioName={portfolioName || ''}
                  portfolioCurrentValue={portfolio?.currentValue || 0}
                  onNavigateToCampaigns={() => setActiveTab('campaigns')}
                />
              </div>
            </div>
          )}

          {activeTab === 'chart' && (
            <div className="h-full">
              <PortfolioValueChart
                data={portfolioDailyData}
                currency={portfolio?.currency ?? 'USD'}
                portfolioName={portfolioName}
                className="h-full border-0 rounded-none"
              />
            </div>
          )}

          {activeTab === 'transactions' && (
            <TransactionLog
              transactions={transactions}
              currency={portfolio?.currency ?? 'USD'}
            />
          )}

          {activeTab === 'freecash' && (
            <div className="px-6 py-4 h-full flex flex-col">
              {/* Cash Flow List */}
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-0">
                  {/* Totale Beschikbare Cash */}
                  <div className="py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Banknote className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Totale Beschikbare Cash
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(portfolioStats.cashValue, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-b border-gray-200 dark:border-gray-700 my-4"></div>

                  {/* Collateral Requirements List */}
                  {(() => {
                    const portfolioPositions = positions.filter(p => p.portfolio === portfolioName && p.status === 'open');

                    // Group positions by spread ID and process collateral
                    const processedSpreads = new Set<string>();
                    const collateralItems: Array<{
                      id: string;
                      ticker: string;
                      label: string;
                      collateral: number;
                      expiration: string;
                      strike?: number;
                      isSpread: boolean;
                    }> = [];

                    portfolioPositions.forEach(pos => {
                      // Check for legacy spread type
                      if (pos.type === 'spread' && 'collateral' in pos && pos.collateral) {
                        collateralItems.push({
                          id: pos.id,
                          ticker: pos.ticker,
                          label: 'spreadType' in pos ? `${(pos as any).spreadType.toUpperCase()} Spread` : 'Spread',
                          collateral: pos.collateral,
                          expiration: 'expiration' in pos ? (pos as any).expiration : '',
                          isSpread: true,
                        });
                        return;
                      }

                      // Check if this position is part of a spread (via notes)
                      const spreadId = getSpreadId(pos);

                      if (spreadId) {
                        // Skip if we've already processed this spread
                        if (processedSpreads.has(spreadId)) {
                          return;
                        }

                        // Find all legs of this spread
                        const spreadLegs = portfolioPositions.filter(p => getSpreadId(p) === spreadId);

                        if (spreadLegs.length >= 2) {
                          // Find the short leg (it has cashReserved set to the spread collateral)
                          const shortLeg = spreadLegs.find(leg =>
                            'action' in leg && leg.action === 'sell' && 'cashReserved' in leg && leg.cashReserved
                          );

                          if (shortLeg && 'cashReserved' in shortLeg && shortLeg.cashReserved) {
                            // Determine spread type based on option type
                            const spreadType = shortLeg.type === 'put' ? 'PUT' : 'CALL';

                            collateralItems.push({
                              id: spreadId,
                              ticker: shortLeg.ticker,
                              label: `${spreadType} Spread`,
                              collateral: shortLeg.cashReserved,
                              expiration: 'expiration' in shortLeg ? shortLeg.expiration : '',
                              isSpread: true,
                            });

                            processedSpreads.add(spreadId);
                          }
                        }
                        return;
                      }

                      // Standalone Cash Secured Puts (sold puts with cashReserved, not part of spread)
                      if (pos.type === 'put' && 'action' in pos && pos.action === 'sell' && 'cashReserved' in pos && pos.cashReserved) {
                        collateralItems.push({
                          id: pos.id,
                          ticker: pos.ticker,
                          label: 'CSP',
                          collateral: pos.cashReserved,
                          expiration: 'expiration' in pos ? pos.expiration : '',
                          strike: 'strike' in pos ? pos.strike : undefined,
                          isSpread: false,
                        });
                      }
                    });

                    const totalCollateral = collateralItems.reduce((sum, item) => sum + item.collateral, 0);
                    const freeCash = portfolioStats.cashValue - totalCollateral;

                    return (
                      <>
                        {collateralItems.length > 0 ? (
                          collateralItems.map((item) => (
                            <div key={item.id} className="py-3 border-b border-gray-200 dark:border-gray-700">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ShieldAlert className="w-4 h-4 text-caution-600 dark:text-caution-500" />
                                  <span className="text-sm text-gray-700 dark:text-gray-300">
                                    {item.ticker} {item.strike ? `$${item.strike}` : ''} {item.label} {item.expiration}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-caution-600 dark:text-caution-500">
                                  -{formatCurrency(item.collateral, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-4 text-center">
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                              Geen posities met collateral vereisten
                            </p>
                          </div>
                        )}

                        {/* Divider before total */}
                        <div className="border-b border-gray-200 dark:border-gray-700 my-4"></div>

                        {/* Vrije cash - Bold en gekleurd */}
                        <div className="py-6">
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-gray-900 dark:text-white">
                              Vrije cash
                            </span>
                            <span className={`text-xl font-bold ${
                              freeCash >= 0
                                ? 'text-positive-600 dark:text-positive-500'
                                : 'text-negative-600 dark:text-negative-500'
                            }`}>
                              {formatCurrency(freeCash, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
                            </span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'information' && (
            <div className="p-6 space-y-6 h-full overflow-y-auto">
              {/* PMCC Strategy */}
              <div className="bg-gradient-to-br from-primary-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-5 border border-primary-200 dark:border-primary-800">
                <h4 className="text-lg font-semibold text-primary-900 dark:text-primary-300 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Poor Man's Covered Call (PMCC)
                </h4>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <p><strong>Wat:</strong> Koop een deep ITM call (LEAP) en verkoop korte termijn OTM calls ertegen.</p>
                  <p><strong>LEAP selectie:</strong> Minimaal 70 delta, 1+ jaar tot expiratie, ITM</p>
                  <p><strong>Short call:</strong> 30-45 DTE, 0.30 delta, minimaal 1% ROI per week</p>
                  <p><strong>Risico:</strong> Extrinsieke waarde LEAP moet groter zijn dan krediet short calls</p>
                </div>
              </div>

              {/* KaChing Strategy */}
              <div className="bg-gradient-to-br from-surface-subtle to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-5 border border-ink-200 dark:border-trading-dark-600">
                <h4 className="text-lg font-semibold text-purple-900 dark:text-ink-300 mb-3 flex items-center gap-2">
                  <Banknote className="w-5 h-5" />
                  KaChing Strategy
                </h4>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <p><strong>Wat:</strong> Koop protective put (bescherming) en verkoop weekly puts voor inkomen.</p>
                  <p><strong>Protective put:</strong> ATM of licht OTM, 60-90 dagen looptijd</p>
                  <p><strong>Weekly puts:</strong> Verkoop 5-7 DTE, OTM, herhaal wekelijks</p>
                  <p><strong>Doel:</strong> Verdien genoeg premium om protective put te betalen</p>
                </div>
              </div>

              {/* Cash Secured Puts */}
              <div className="bg-gradient-to-br from-positive-50 to-positive-50 dark:from-positive-700/15 dark:to-green-800/20 rounded-lg p-5 border border-positive-500/20 dark:border-positive-700/30">
                <h4 className="text-lg font-semibold text-positive-700 dark:text-positive-500 mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  Cash Secured Puts (CSP)
                </h4>
                <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  <p><strong>Wat:</strong> Verkoop put op aandeel dat je wilt bezitten, met cash backup.</p>
                  <p><strong>Strike selectie:</strong> Op of onder gewenste aankoopprijs</p>
                  <p><strong>Tijdshorizon:</strong> 30-45 DTE voor beste theta decay</p>
                  <p><strong>Cash reserve:</strong> 100% van strike prijs × 100 × aantal contracten</p>
                </div>
              </div>

              {/* General Guidelines */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-5 border border-gray-200 dark:border-gray-700">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Algemene Richtlijnen
                </h4>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                  <li>Sluit posities bij 50% winst (kort lopend) of 21 DTE</li>
                  <li>Roll posities wanneer ze ITM gaan met 21+ DTE</li>
                  <li>Diversificeer over meerdere underlyings</li>
                  <li>Track je trades nauwkeurig voor analyse</li>
                  <li>Gebruik onderpand calculatie voor margin requirements</li>
                  <li>Maximaal 30-40% van portfolio in options</li>
                </ul>
              </div>

              {/* Risk Management */}
              <div className="bg-caution-50 dark:bg-caution-600/15 rounded-lg p-5 border border-caution-500/30 dark:border-caution-600/40">
                <h4 className="text-lg font-semibold text-orange-900 dark:text-caution-500 mb-3">
                  ⚠️ Risicobeheer
                </h4>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
                  <li>Gebruik altijd stop losses of protective puts</li>
                  <li>Nooit meer dan 5% van portfolio in één trade</li>
                  <li>Begrijp de Greeks: Delta, Gamma, Theta, Vega</li>
                  <li>Let op earnings en ex-dividend dates</li>
                  <li>Vermijd illiquide opties (lage volume/open interest)</li>
                </ul>
              </div>

              {portfolio?.url && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="text-base font-medium text-gray-900 dark:text-white mb-3">
                    Portfolio Portal
                  </h4>
                  <a
                    href={portfolio.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open {portfolio.name}
                  </a>
                </div>
              )}
            </div>
          )}

          {activeTab === 'insights' && (
            <div className="p-6 space-y-6 h-full overflow-y-auto">
              {(() => {
                const portfolioPositions = positions.filter(p => p.portfolio === portfolioName && p.status === 'open');

                // Filter call options (both bought and sold)
                const callOptions = portfolioPositions.filter(p => p.type === 'call') as any[];

                if (callOptions.length === 0) {
                  return (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-8 text-center">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Geen call opties in portfolio
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                        Voeg call opties toe om virtueel aandelen te beheren
                      </p>
                    </div>
                  );
                }

                // Group by ticker and calculate virtual shares with current price
                const virtualPortfolio: Record<string, {
                  shares: number;
                  currentPrice: number;
                  ticker: string;
                  positions: any[];
                }> = {};

                // Only count bought calls for virtual shares
                const boughtCalls = callOptions.filter((call: any) => call.action === 'buy');

                boughtCalls.forEach((call) => {
                  const contractMultiplier = 100;
                  const shares = call.contracts * contractMultiplier;

                  // Get current price from tickers
                  const tickerData = tickerList.find((t) => t.symbol.toUpperCase() === call.ticker.toUpperCase());
                  const currentPrice = tickerData?.currentPrice || 0;

                  if (!virtualPortfolio[call.ticker]) {
                    virtualPortfolio[call.ticker] = {
                      shares: 0,
                      currentPrice: currentPrice,
                      ticker: call.ticker,
                      positions: [],
                    };
                  }

                  virtualPortfolio[call.ticker].shares += shares;
                  virtualPortfolio[call.ticker].positions.push(call);
                  // Update price if we have a newer one
                  if (currentPrice > 0) {
                    virtualPortfolio[call.ticker].currentPrice = currentPrice;
                  }
                });

                const totalVirtualValue = Object.values(virtualPortfolio).reduce(
                  (sum, item) => sum + (item.shares * item.currentPrice),
                  0
                );

                const toggleTicker = (ticker: string) => {
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

                return (
                  <div className="space-y-6">
                    {/* Virtual portfolio Items */}
                    <div className="space-y-4">
                      {Object.values(virtualPortfolio).map((item) => {
                        const virtualValue = item.shares * item.currentPrice;
                        const isExpanded = expandedTickers.has(item.ticker);

                        return (
                          <div key={item.ticker} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {/* Ticker Header - Clickable */}
                            <button
                              onClick={() => toggleTicker(item.ticker)}
                              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="w-5 h-5 text-gray-400" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-gray-400" />
                                )}
                                <div className="text-left">
                                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                                    {item.ticker}
                                  </h4>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {formatNumber(item.shares)} aandelen @ {formatCurrency(item.currentPrice, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-primary-700 dark:text-primary-300">
                                  {formatCurrency(virtualValue, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
                                </p>
                              </div>
                            </button>

                            {/* Expanded Positions */}
                            {isExpanded && (
                              <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                                <div className="p-4 space-y-3">
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                    Posities ({item.positions.length})
                                  </div>
                                  {item.positions.map((pos: any) => {
                                    const expDate = new Date(pos.expiration);
                                    const now = new Date();
                                    const daysToExp = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                    const posShares = pos.contracts * 100;

                                    return (
                                      <div key={pos.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                              {pos.contracts} contract{pos.contracts > 1 ? 's' : ''} @ ${pos.strike}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                                              daysToExp <= 30
                                                ? 'bg-negative-50 text-negative-700 dark:bg-negative-700/25 dark:text-negative-500'
                                                : daysToExp <= 90
                                                ? 'bg-caution-50 text-caution-600 dark:bg-caution-600/25 dark:text-caution-500'
                                                : 'bg-positive-50 text-positive-700 dark:bg-positive-700/25 dark:text-positive-500'
                                            }`}>
                                              {daysToExp} DTE
                                            </span>
                                          </div>
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Expiry: {expDate.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })}
                                            {' • '}{posShares} aandelen
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                                            {formatCurrency(posShares * item.currentPrice, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Total */}
                      <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 border-2 border-primary-200 dark:border-primary-800">
                        <div className="flex items-center justify-between">
                          <h4 className="text-base font-bold text-gray-900 dark:text-white">
                            Totaal Virtueel portfolio
                          </h4>
                          <p className="text-xl font-bold text-primary-700 dark:text-primary-300">
                            {formatCurrency(totalVirtualValue, getCurrencySymbol(portfolio?.currency ?? 'USD'))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="p-6 h-full overflow-y-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Alerts Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-caution-500/30 dark:border-caution-500/30 p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-caution-600 dark:text-caution-500" />
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Alerts</h4>
                    </div>
                    {alertsData.alerts.length > 0 && (
                      <span className="px-2 py-1 bg-caution-50 dark:bg-caution-600/25 rounded-full text-sm font-semibold text-caution-600 dark:text-caution-500">
                        {alertsData.alerts.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {alertsData.alerts.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="inline-flex p-3 rounded-full mb-3 bg-caution-50 dark:bg-caution-600/25">
                          <AlertCircle className="w-6 h-6 text-caution-600 dark:text-caution-500" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Geen actieve alerts
                        </p>
                      </div>
                    ) : (
                      alertsData.alerts.map((item) => {
                        const AlertIcon = getAlertIcon(item.message, true);
                        return (
                          <div key={item.id} className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="p-1 rounded bg-caution-50 dark:bg-caution-600/25">
                                    <AlertIcon className="w-3 h-3 text-caution-600 dark:text-caution-500" />
                                  </div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {item.ticker}
                                  </p>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 ml-6 whitespace-pre-line">
                                  {item.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Opportunities Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-positive-500/20 dark:border-positive-700/30 p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-positive-600 dark:text-positive-500" />
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Opportunities</h4>
                    </div>
                    {alertsData.opportunities.length > 0 && (
                      <span className="px-2 py-1 bg-positive-50 dark:bg-positive-700/25 rounded-full text-sm font-semibold text-positive-600 dark:text-positive-500">
                        {alertsData.opportunities.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 flex-1 overflow-y-auto">
                    {alertsData.opportunities.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="inline-flex p-3 rounded-full mb-3 bg-positive-50 dark:bg-positive-700/25">
                          <Target className="w-6 h-6 text-positive-600 dark:text-positive-500" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Geen actieve opportunities
                        </p>
                      </div>
                    ) : (
                      alertsData.opportunities.map((item) => {
                        const OppIcon = getAlertIcon(item.message, false);
                        return (
                          <div key={item.id} className="w-full text-left p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="p-1 rounded bg-positive-50 dark:bg-positive-700/25">
                                    <OppIcon className="w-3 h-3 text-positive-600 dark:text-positive-500" />
                                  </div>
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                    {item.ticker}
                                  </p>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 ml-6 whitespace-pre-line">
                                  {item.message}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'campaigns' && (
            <CampaignView
              portfolioName={portfolioName || ''}
              currency={portfolio?.currency ?? 'USD'}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {portfolio && (
        <>
          <TransactionModal
            isOpen={isTransactionModalOpen}
            onClose={() => setIsTransactionModalOpen(false)}
            onSubmit={handleTransactionSubmit}
            portfolio={{
              name: portfolio.name,
              currency: portfolio.currency,
              currentValue: portfolio.currentValue,
            }}
          />

          <StockETFWizard
            isOpen={isStockWizardOpen}
            onClose={() => setIsStockWizardOpen(false)}
            portfolio={{
              name: portfolio.name,
              currency: portfolio.currency,
              currentValue: portfolio.currentValue,
            }}
          />

          <CallOptionWizard
            isOpen={isCallOptionWizardOpen}
            onClose={() => setIsCallOptionWizardOpen(false)}
            portfolio={{
              name: portfolio.name,
              currency: portfolio.currency,
              currentValue: portfolio.currentValue,
            }}
          />

          <PutOptionWizard
            isOpen={isPutOptionWizardOpen}
            onClose={() => setIsPutOptionWizardOpen(false)}
            portfolio={{
              name: portfolio.name,
              currency: portfolio.currency,
              currentValue: portfolio.currentValue,
            }}
          />
        </>
      )}

    </div>
  );
};
