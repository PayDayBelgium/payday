import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  DollarSign,
  Banknote,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  Plus,
  Briefcase,
  History,
  Info,
  BarChart3,
  Wallet,
  AlertCircle,
  Target,
  ChevronDown,
  ChevronRight,
  Layers,
  Clock,
  AlertTriangle,
  Percent,
  type LucideIcon,
} from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import {
  selectTransactionsByPortfolio,
  selectEquitySeries,
} from '../../store/slices/portfoliosSlice';
import { deposit, withdraw, adjustValue } from '../../store/commands/cashCommands';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import type { Ticker } from '../../types';
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
import { parseCoveredCallOpportunity } from '../../utils/opportunityActions';

type TabType =
  | 'portfolio'
  | 'chart'
  | 'transactions'
  | 'freecash'
  | 'calculation'
  | 'information'
  | 'insights'
  | 'alerts'
  | 'campaigns';

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
  if (
    message.toLowerCase().includes('gevaar') ||
    message.toLowerCase().includes('danger') ||
    message.toLowerCase().includes('verlies')
  ) {
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
  const { portfolioName: portfolioParam } = useParams<{ portfolioName: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { setPageTitle, setTitleIcon } = usePageTitle();
  const { canGoBack, pushNavigation } = useNavigation();
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);
  const positions = useAppSelector((state) => state.positions.positions);
  const tickerList = useAppSelector(selectAllTickers);
  // The portfolio name travels through the URL. Decode it and fall back to a
  // Unicode-normalized (NFC) comparison, so the lookup works whether the link
  // encoded the name or not, and for accented names (e.g. "Björn"). All downstream
  // code uses the canonical stored name so positions/transactions stay consistent.
  const decodedParam = (() => {
    if (!portfolioParam) return '';
    try {
      return decodeURIComponent(portfolioParam);
    } catch {
      return portfolioParam;
    }
  })();
  const portfolio = portfolios.find(
    (b) => b.name === decodedParam || b.name.normalize('NFC') === decodedParam.normalize('NFC')
  );
  const portfolioName = portfolio?.name ?? decodedParam;
  const transactions = useAppSelector((state) =>
    selectTransactionsByPortfolio(state, portfolioName || '')
  );
  const dailyData = useAppSelector(selectEquitySeries);
  const unlockedLevels = useAppSelector(selectUnlockedLevels);

  // Check feature access for options
  const hasOptionsAccess = isFeatureAvailable('covered_calls', unlockedLevels);

  // Use central alerts hook with portfolio filter
  const { alerts, opportunities } = useAlerts(portfolioName);
  const alertsData = { alerts, opportunities };

  // Filter daily data for this portfolio
  const portfolioDailyData = useMemo(() => {
    return dailyData.filter((d) => d.portfolio === portfolioName);
  }, [dailyData, portfolioName]);

  const [activeTab, setActiveTab] = useState<TabType>('portfolio');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isStockWizardOpen, setIsStockWizardOpen] = useState(false);
  const [isCallOptionWizardOpen, setIsCallOptionWizardOpen] = useState(false);
  const [callWizardInitialTicker, setCallWizardInitialTicker] = useState<Ticker | undefined>(
    undefined
  );
  const [callWizardInitialAction, setCallWizardInitialAction] = useState<
    'covered-call' | 'buy' | undefined
  >(undefined);
  // Pre-fill strike and expiration for the LEAPS buy-more flow only.
  // These must be cleared (set to undefined) on every other call-wizard open path
  // so covered-call and generic opens are NOT pre-filled.
  const [callWizardInitialStrike, setCallWizardInitialStrike] = useState<number | undefined>(
    undefined
  );
  const [callWizardInitialExpiration, setCallWizardInitialExpiration] = useState<
    string | undefined
  >(undefined);
  // When the wizard is opened from a specific LEAPS or stock suggestion badge, hold the
  // initiating position's id here so the wizard can link the new short call to that parent
  // (LEAPS → PMCC; stock lot → standard CC on that lot).
  // MUST be cleared to undefined for every non-suggestion open path (handleBuyLeaps,
  // generic "add call" button) so those uses fall back to default parent resolution.
  const [callWizardInitialUnderlyingId, setCallWizardInitialUnderlyingId] = useState<
    string | undefined
  >(undefined);
  const [stockWizardInitialTicker, setStockWizardInitialTicker] = useState<Ticker | undefined>(
    undefined
  );
  const [isPutOptionWizardOpen, setIsPutOptionWizardOpen] = useState(false);
  const [expandedTickers, setExpandedTickers] = useState<Set<string>>(new Set());

  // Open the call wizard pre-filled to write a covered call on a specific ticker.
  // When called from a LEAPS suggestion badge, `underlyingId` is the leap's position id so
  // the wizard links the new short call to that LEAPS (PMCC). When called from a stock badge
  // or without an explicit initiator, `underlyingId` is undefined → default parent resolution.
  // Always clear the LEAPS buy-more strike/expiration pre-fill so this path is not affected.
  const handleWriteCoveredCall = (tickerSymbol: string, underlyingId?: string) => {
    const ticker = tickerList.find((t) => t.symbol.toUpperCase() === tickerSymbol.toUpperCase());
    setCallWizardInitialTicker(ticker);
    setCallWizardInitialAction('covered-call');
    setCallWizardInitialStrike(undefined);
    setCallWizardInitialExpiration(undefined);
    setCallWizardInitialUnderlyingId(underlyingId);
    setIsCallOptionWizardOpen(true);
  };

  // Open the stock wizard pre-filled to buy more shares of a specific ticker.
  const handleBuyStock = (tickerSymbol: string) => {
    const ticker = tickerList.find((t) => t.symbol.toUpperCase() === tickerSymbol.toUpperCase());
    setStockWizardInitialTicker(ticker);
    setIsStockWizardOpen(true);
  };

  // Open the call wizard pre-filled to buy more long calls (LEAPS) for a specific position.
  // Passes strike + expiration so the wizard jumps straight to details with those fields filled.
  // Clears initialUnderlyingId — buying a LEAPS is not a short-call parent-linking scenario.
  const handleBuyLeaps = (info: { ticker: string; strike: number; expiration: string }) => {
    const ticker = tickerList.find((t) => t.symbol.toUpperCase() === info.ticker.toUpperCase());
    setCallWizardInitialTicker(ticker);
    setCallWizardInitialAction('buy');
    setCallWizardInitialStrike(info.strike);
    setCallWizardInitialExpiration(info.expiration);
    setCallWizardInitialUnderlyingId(undefined);
    setIsCallOptionWizardOpen(true);
  };

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

  // When navigated here from the Dashboard widget with an openCoveredCallWizard state,
  // open the wizard immediately and then clear the state so it doesn't re-fire on re-render.
  // Guard on `portfolio` being loaded so the wizard has access to tickers.
  useEffect(() => {
    const wizardState = location.state?.openCoveredCallWizard as
      | { ticker: string; underlyingId?: string }
      | undefined;
    if (!wizardState || !portfolio) return;
    handleWriteCoveredCall(wizardState.ticker, wizardState.underlyingId);
    // Clear the state so a back/forward navigation or re-render does not re-fire the wizard.
    navigate(location.pathname, { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, portfolio]);

  // Calculate portfolio stats from positions
  const portfolioStats = useMemo(() => {
    if (!portfolio)
      return {
        totalValue: 0,
        positionsValue: 0,
        cashValue: 0,
        positionCount: 0,
        longCount: 0,
        shortCount: 0,
        longValue: 0,
        shortValue: 0,
      };

    const portfolioPositions = positions.filter(
      (p) => p.portfolio === portfolioName && p.status === 'open'
    );

    // Calculate long and short values separately
    // Long positions: stocks, ETFs, and bought options
    // Short positions: sold options

    // Stock and ETF value (always long positions)
    const stockEtfValue = portfolioPositions
      .filter((p) => p.type === 'stock' || p.type === 'etf')
      .reduce((sum, pos) => sum + (pos.currentValue ?? 0), 0);

    // Options long value (bought options)
    const optionsLongValue = portfolioPositions
      .filter((p) => (p.type === 'call' || p.type === 'put') && 'action' in p && p.action === 'buy')
      .reduce((sum, pos) => sum + Math.abs(pos.currentValue ?? 0), 0);

    // Total long value = stocks + ETFs + bought options
    const longValue = stockEtfValue + optionsLongValue;

    const shortValue = portfolioPositions
      .filter(
        (p) => (p.type === 'call' || p.type === 'put') && 'action' in p && p.action === 'sell'
      )
      .reduce((sum, pos) => sum + Math.abs(pos.currentValue ?? 0), 0);

    // Count long and short positions
    // Long count includes: stocks, ETFs, and bought options
    const longCount = portfolioPositions.filter(
      (p) =>
        p.type === 'stock' ||
        p.type === 'etf' ||
        ((p.type === 'call' || p.type === 'put') && 'action' in p && p.action === 'buy')
    ).length;

    const shortCount = portfolioPositions.filter(
      (p) => (p.type === 'call' || p.type === 'put') && 'action' in p && p.action === 'sell'
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

    const ts = new Date().toISOString();
    const input = {
      portfolio: portfolio.name,
      amount: Math.abs(transactionData.amount),
      date: transactionData.date,
      description: transactionData.description,
    };

    if (transactionData.type === 'deposit') {
      dispatch(deposit(input, ts));
    } else if (transactionData.type === 'withdrawal') {
      dispatch(withdraw(input, ts));
    } else {
      // adjustment or any other type — positive or negative value change
      dispatch(adjustValue({ ...input, amount: transactionData.amount }, ts));
    }
  };

  // If portfolio not found, show error
  if (!portfolio) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-ink-900 dark:text-white mb-2">
            {t('pagesB.portfolioDetail.notFoundTitle')}
          </h2>
          <p className="text-ink-600 dark:text-ink-400">
            {t('pagesB.portfolioDetail.notFoundDescription', { name: portfolioName })}
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
          title={t('pagesB.portfolioDetail.statPortfolioValue')}
          description={
            <>
              {t('pagesB.portfolioDetail.cashLabel', {
                value: formatCurrency(
                  portfolioStats.cashValue,
                  getCurrencySymbol(portfolio?.currency ?? 'USD')
                ),
              })}
              <br />
              {t('pagesB.portfolioDetail.assetsLabel', {
                value: formatCurrency(
                  portfolioStats.longValue - portfolioStats.shortValue,
                  getCurrencySymbol(portfolio?.currency ?? 'USD')
                ),
              })}
            </>
          }
          value={formatCurrency(
            portfolioStats.totalValue,
            getCurrencySymbol(portfolio?.currency ?? 'USD')
          )}
          icon={<DollarSign className="w-6 h-6" />}
          tooltip={t('pagesB.portfolioDetail.portfolioValueTooltip')}
        />
        <StatCard
          title={t('pagesB.portfolioDetail.statLongPositions')}
          description={t('pagesB.portfolioDetail.activeLongPositions', {
            count: portfolioStats.longCount,
          })}
          value={formatCurrency(
            portfolioStats.longValue,
            getCurrencySymbol(portfolio?.currency ?? 'USD')
          )}
          icon={<TrendingUp className="w-6 h-6" />}
        />
        <StatCard
          title={t('pagesB.portfolioDetail.statShortPositions')}
          description={t('pagesB.portfolioDetail.activeShortPositions', {
            count: portfolioStats.shortCount,
          })}
          value={formatCurrency(
            portfolioStats.shortValue,
            getCurrencySymbol(portfolio?.currency ?? 'USD')
          )}
          icon={<TrendingDown className="w-6 h-6" />}
        />
        <StatCard
          title={t('pagesB.portfolioDetail.statCash')}
          description={
            <>
              {t('pagesB.portfolioDetail.allocatedLabel', {
                value: formatCurrency(
                  portfolioStats.allocatedCash || 0,
                  getCurrencySymbol(portfolio?.currency ?? 'USD')
                ),
              })}
              <br />
              {t('pagesB.portfolioDetail.freeLabel', {
                value: formatCurrency(
                  portfolioStats.freeCash || portfolioStats.cashValue,
                  getCurrencySymbol(portfolio?.currency ?? 'USD')
                ),
              })}
            </>
          }
          value={formatCurrency(
            portfolioStats.cashValue,
            getCurrencySymbol(portfolio?.currency ?? 'USD')
          )}
          icon={<Banknote className="w-6 h-6" />}
        />
        <StatCard
          title={t('pagesB.portfolioDetail.statFreeCash')}
          description={
            <>
              {t('pagesB.portfolioDetail.cashLabel', {
                value: formatCurrency(
                  portfolioStats.cashValue,
                  getCurrencySymbol(portfolio?.currency ?? 'USD')
                ),
              })}
              <br />
              {t('pagesB.portfolioDetail.allocatedLabel', {
                value: formatCurrency(
                  portfolioStats.allocatedCash || 0,
                  getCurrencySymbol(portfolio?.currency ?? 'USD')
                ),
              })}
            </>
          }
          value={formatCurrency(
            portfolioStats.freeCash || portfolioStats.cashValue,
            getCurrencySymbol(portfolio?.currency ?? 'USD')
          )}
          icon={<Wallet className="w-6 h-6" />}
          tooltip={t('pagesB.portfolioDetail.freeCashTooltip')}
          valueClassName={
            (portfolioStats.freeCash || portfolioStats.cashValue) < 0
              ? 'text-negative-600 dark:text-negative-500'
              : undefined
          }
          showAlert={(portfolioStats.freeCash || portfolioStats.cashValue) < 0}
          alertMessage={t('pagesB.portfolioDetail.freeCashAlert')}
        />
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 flex flex-col flex-1 min-h-0">
        {/* Tab Navigation */}
        <div className="border-b border-surface-line dark:border-trading-dark-600 flex-shrink-0">
          <nav className="flex -mb-px justify-between">
            <div className="flex">
              <button
                onClick={() => setActiveTab('portfolio')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'portfolio'
                    ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                    : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300 hover:border-ink-200'
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
                      : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300 hover:border-ink-200'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  {t('pagesB.portfolioDetail.tabCampaigns')}
                </button>
              )}
              {hasOptionsAccess && (
                <button
                  onClick={() => setActiveTab('freecash')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'freecash'
                      ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                      : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300 hover:border-ink-200'
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
                    : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300 hover:border-ink-200'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                {t('pagesB.portfolioDetail.tabEvolution')}
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'transactions'
                    ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                    : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300 hover:border-ink-200'
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
                      : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300 hover:border-ink-200'
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
                      : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300 hover:border-ink-200'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  {t('pagesB.portfolioDetail.tabVirtualPortfolio')}
                </button>
              )}
              {hasOptionsAccess && (
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'alerts'
                      ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                      : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300 hover:border-ink-200'
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
                  onClick={() => {
                    setStockWizardInitialTicker(undefined);
                    setIsStockWizardOpen(true);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-50 dark:hover:bg-primary-900/25 rounded-lg border border-primary-200 dark:border-primary-800 hover:border-primary-400 dark:hover:border-primary-700 transition-all text-left cursor-pointer w-36"
                >
                  <Plus className="w-4 h-4 text-primary-700 dark:text-primary-300 flex-shrink-0" />
                  <span className="text-sm font-medium text-primary-700 dark:text-primary-300 truncate">
                    {t('pagesB.portfolioDetail.actionStockEtf')}
                  </span>
                </button>

                {hasOptionsAccess && (
                  <button
                    onClick={() => {
                      setCallWizardInitialTicker(undefined);
                      setCallWizardInitialAction(undefined);
                      setCallWizardInitialStrike(undefined);
                      setCallWizardInitialExpiration(undefined);
                      setCallWizardInitialUnderlyingId(undefined);
                      setIsCallOptionWizardOpen(true);
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-positive-50 dark:bg-positive-700/15 hover:bg-positive-50 dark:hover:bg-positive-700/25 rounded-lg border border-positive-500/20 dark:border-positive-700/30 hover:border-positive-500/40 dark:hover:border-positive-600 transition-all text-left cursor-pointer w-36"
                  >
                    <Plus className="w-4 h-4 text-positive-600 dark:text-positive-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-positive-700 dark:text-positive-500 truncate">
                      {t('pagesB.portfolioDetail.actionCallOption')}
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
                      {t('pagesB.portfolioDetail.actionPutOption')}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setIsTransactionModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-caution-50 dark:bg-caution-600/15 hover:bg-caution-50 dark:hover:bg-amber-900/30 rounded-lg border border-caution-500/30 dark:border-caution-600/40 hover:border-caution-500 dark:hover:border-caution-600 transition-all text-left cursor-pointer w-36"
                >
                  <Plus className="w-4 h-4 text-caution-600 dark:text-caution-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-caution-600 dark:text-caution-500 truncate">
                    {t('pagesB.portfolioDetail.actionTransaction')}
                  </span>
                </button>
              </div>

              {/* Portfolio Positions */}
              <div className="flex-1 min-h-0">
                <PortfolioView
                  positions={positions.filter((p) => p.portfolio === portfolioName)}
                  currency={portfolio?.currency ?? 'USD'}
                  portfolioName={portfolioName || ''}
                  portfolioCurrentValue={portfolio?.currentValue || 0}
                  onNavigateToCampaigns={() => setActiveTab('campaigns')}
                  onWriteCoveredCall={handleWriteCoveredCall}
                  onBuyStock={handleBuyStock}
                  onBuyLeaps={handleBuyLeaps}
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
            <div className="h-full">
              <TransactionLog
                transactions={transactions}
                currency={portfolio?.currency ?? 'USD'}
                className="h-full border-0 rounded-none"
              />
            </div>
          )}

          {activeTab === 'freecash' && (
            <div className="px-6 py-4 h-full flex flex-col">
              {/* Cash Flow List */}
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-0">
                  {/* Total Available Cash */}
                  <div className="py-4 border-b border-surface-line dark:border-trading-dark-600">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Banknote className="w-5 h-5 text-ink-600 dark:text-ink-400" />
                        <span className="text-sm font-medium text-ink-900 dark:text-white">
                          {t('pagesB.portfolioDetail.totalAvailableCash')}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-ink-900 dark:text-white">
                        {formatCurrency(
                          portfolioStats.cashValue,
                          getCurrencySymbol(portfolio?.currency ?? 'USD')
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-b border-surface-line dark:border-trading-dark-600 my-4"></div>

                  {/* Collateral Requirements List */}
                  {(() => {
                    const portfolioPositions = positions.filter(
                      (p) => p.portfolio === portfolioName && p.status === 'open'
                    );

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

                    portfolioPositions.forEach((pos) => {
                      // Check for legacy spread type
                      if (pos.type === 'spread' && 'collateral' in pos && pos.collateral) {
                        collateralItems.push({
                          id: pos.id,
                          ticker: pos.ticker,
                          label:
                            'spreadType' in pos
                              ? `${(pos as any).spreadType.toUpperCase()} Spread`
                              : 'Spread',
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
                        const spreadLegs = portfolioPositions.filter(
                          (p) => getSpreadId(p) === spreadId
                        );

                        if (spreadLegs.length >= 2) {
                          // Find the short leg (it has cashReserved set to the spread collateral)
                          const shortLeg = spreadLegs.find(
                            (leg) =>
                              'action' in leg &&
                              leg.action === 'sell' &&
                              'cashReserved' in leg &&
                              leg.cashReserved
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
                      if (
                        pos.type === 'put' &&
                        'action' in pos &&
                        pos.action === 'sell' &&
                        'cashReserved' in pos &&
                        pos.cashReserved
                      ) {
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

                    const totalCollateral = collateralItems.reduce(
                      (sum, item) => sum + item.collateral,
                      0
                    );
                    const freeCash = portfolioStats.cashValue - totalCollateral;

                    return (
                      <>
                        {collateralItems.length > 0 ? (
                          collateralItems.map((item) => (
                            <div
                              key={item.id}
                              className="py-3 border-b border-surface-line dark:border-trading-dark-600"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <ShieldAlert className="w-4 h-4 text-caution-600 dark:text-caution-500" />
                                  <span className="text-sm text-ink-700 dark:text-ink-300">
                                    {item.ticker} {item.strike ? `$${item.strike}` : ''}{' '}
                                    {item.label} {item.expiration}
                                  </span>
                                </div>
                                <span className="text-sm font-medium text-caution-600 dark:text-caution-500">
                                  -
                                  {formatCurrency(
                                    item.collateral,
                                    getCurrencySymbol(portfolio?.currency ?? 'USD')
                                  )}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-4 text-center">
                            <p className="text-sm text-ink-500 dark:text-ink-400 italic">
                              {t('pagesB.portfolioDetail.noCollateralPositions')}
                            </p>
                          </div>
                        )}

                        {/* Divider before total */}
                        <div className="border-b border-surface-line dark:border-trading-dark-600 my-4"></div>

                        {/* Free cash - bold and colored */}
                        <div className="py-6">
                          <div className="flex items-center justify-between">
                            <span className="text-base font-bold text-ink-900 dark:text-white">
                              {t('pagesB.portfolioDetail.freeCash')}
                            </span>
                            <span
                              className={`text-xl font-bold ${
                                freeCash >= 0
                                  ? 'text-positive-600 dark:text-positive-500'
                                  : 'text-negative-600 dark:text-negative-500'
                              }`}
                            >
                              {formatCurrency(
                                freeCash,
                                getCurrencySymbol(portfolio?.currency ?? 'USD')
                              )}
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
                <div className="space-y-2 text-sm text-ink-700 dark:text-ink-300">
                  <p>
                    <strong>{t('pagesB.portfolioDetail.labelWhat')}</strong>{' '}
                    {t('pagesB.portfolioDetail.pmccWhat')}
                  </p>
                  <p>
                    <strong>{t('pagesB.portfolioDetail.labelLeapSelection')}</strong>{' '}
                    {t('pagesB.portfolioDetail.pmccLeap')}
                  </p>
                  <p>
                    <strong>{t('pagesB.portfolioDetail.labelShortCall')}</strong>{' '}
                    {t('pagesB.portfolioDetail.pmccShortCall')}
                  </p>
                  <p>
                    <strong>{t('pagesB.portfolioDetail.labelRisk')}</strong>{' '}
                    {t('pagesB.portfolioDetail.pmccRisk')}
                  </p>
                </div>
              </div>

              {/* KaChing Strategy */}
              <div className="bg-gradient-to-br from-surface-subtle to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-5 border border-ink-200 dark:border-trading-dark-600">
                <h4 className="text-lg font-semibold text-purple-900 dark:text-ink-300 mb-3 flex items-center gap-2">
                  <Banknote className="w-5 h-5" />
                  KaChing Strategy
                </h4>
                <div className="space-y-2 text-sm text-ink-700 dark:text-ink-300">
                  <p>
                    <strong>{t('pagesB.portfolioDetail.labelWhat')}</strong>{' '}
                    {t('pagesB.portfolioDetail.kachingWhat')}
                  </p>
                  <p>
                    <strong>{t('pagesB.portfolioDetail.labelProtectivePut')}</strong>{' '}
                    {t('pagesB.portfolioDetail.kachingProtectivePut')}
                  </p>
                  <p>
                    <strong>{t('pagesB.portfolioDetail.labelWeeklyPuts')}</strong>{' '}
                    {t('pagesB.portfolioDetail.kachingWeeklyPuts')}
                  </p>
                  <p>
                    <strong>{t('pagesB.portfolioDetail.labelGoal')}</strong>{' '}
                    {t('pagesB.portfolioDetail.kachingGoal')}
                  </p>
                </div>
              </div>

              {/* Cash Secured Puts */}
              <div className="bg-gradient-to-br from-positive-50 to-positive-50 dark:from-positive-700/15 dark:to-green-800/20 rounded-lg p-5 border border-positive-500/20 dark:border-positive-700/30">
                <h4 className="text-lg font-semibold text-positive-700 dark:text-positive-500 mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5" />
                  Cash Secured Puts (CSP)
                </h4>
                <div className="space-y-2 text-sm text-ink-700 dark:text-ink-300">
                  <p>
                    <strong>{t('pagesB.portfolioDetail.labelWhat')}</strong>{' '}
                    {t('pagesB.portfolioDetail.cspWhat')}
                  </p>
                  <p>
                    <strong>{t('pagesB.portfolioDetail.labelStrikeSelection')}</strong>{' '}
                    {t('pagesB.portfolioDetail.cspStrike')}
                  </p>
                  <p>
                    <strong>{t('pagesB.portfolioDetail.labelTimeHorizon')}</strong>{' '}
                    {t('pagesB.portfolioDetail.cspTimeHorizon')}
                  </p>
                  <p>
                    <strong>{t('pagesB.portfolioDetail.labelCashReserve')}</strong>{' '}
                    {t('pagesB.portfolioDetail.cspCashReserve')}
                  </p>
                </div>
              </div>

              {/* General Guidelines */}
              <div className="bg-surface dark:bg-trading-dark-900 rounded-lg p-5 border border-surface-line dark:border-trading-dark-600">
                <h4 className="text-lg font-semibold text-ink-900 dark:text-white mb-3">
                  {t('pagesB.portfolioDetail.generalGuidelines')}
                </h4>
                <ul className="space-y-2 text-sm text-ink-700 dark:text-ink-300 list-disc list-inside">
                  <li>{t('pagesB.portfolioDetail.guideline1')}</li>
                  <li>{t('pagesB.portfolioDetail.guideline2')}</li>
                  <li>{t('pagesB.portfolioDetail.guideline3')}</li>
                  <li>{t('pagesB.portfolioDetail.guideline4')}</li>
                  <li>{t('pagesB.portfolioDetail.guideline5')}</li>
                  <li>{t('pagesB.portfolioDetail.guideline6')}</li>
                </ul>
              </div>

              {/* Risk Management */}
              <div className="bg-caution-50 dark:bg-caution-600/15 rounded-lg p-5 border border-caution-500/30 dark:border-caution-600/40">
                <h4 className="text-lg font-semibold text-orange-900 dark:text-caution-500 mb-3">
                  ⚠️ {t('pagesB.portfolioDetail.riskManagement')}
                </h4>
                <ul className="space-y-2 text-sm text-ink-700 dark:text-ink-300 list-disc list-inside">
                  <li>{t('pagesB.portfolioDetail.risk1')}</li>
                  <li>{t('pagesB.portfolioDetail.risk2')}</li>
                  <li>{t('pagesB.portfolioDetail.risk3')}</li>
                  <li>{t('pagesB.portfolioDetail.risk4')}</li>
                  <li>{t('pagesB.portfolioDetail.risk5')}</li>
                </ul>
              </div>

              {portfolio?.url && (
                <div className="mt-6 pt-6 border-t border-surface-line dark:border-trading-dark-600">
                  <h4 className="text-base font-medium text-ink-900 dark:text-white mb-3">
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
                const portfolioPositions = positions.filter(
                  (p) => p.portfolio === portfolioName && p.status === 'open'
                );

                // Filter call options (both bought and sold)
                const callOptions = portfolioPositions.filter((p) => p.type === 'call') as any[];

                if (callOptions.length === 0) {
                  return (
                    <div className="bg-surface dark:bg-trading-dark-900 rounded-lg p-8 text-center">
                      <TrendingUp className="w-12 h-12 mx-auto mb-3 text-ink-400 dark:text-ink-500" />
                      <p className="text-ink-600 dark:text-ink-400">
                        {t('pagesB.portfolioDetail.noCallOptions')}
                      </p>
                      <p className="text-sm text-ink-500 dark:text-ink-500 mt-1">
                        {t('pagesB.portfolioDetail.addCallOptionsHint')}
                      </p>
                    </div>
                  );
                }

                // Group by ticker and calculate virtual shares with current price
                const virtualPortfolio: Record<
                  string,
                  {
                    shares: number;
                    currentPrice: number;
                    ticker: string;
                    positions: any[];
                  }
                > = {};

                // Only count bought calls for virtual shares
                const boughtCalls = callOptions.filter((call: any) => call.action === 'buy');

                boughtCalls.forEach((call) => {
                  const contractMultiplier = 100;
                  const shares = call.contracts * contractMultiplier;

                  // Get current price from tickers
                  const tickerData = tickerList.find(
                    (t) => t.symbol.toUpperCase() === call.ticker.toUpperCase()
                  );
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
                  (sum, item) => sum + item.shares * item.currentPrice,
                  0
                );

                const toggleTicker = (ticker: string) => {
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

                return (
                  <div className="space-y-6">
                    {/* Virtual portfolio Items */}
                    <div className="space-y-4">
                      {Object.values(virtualPortfolio).map((item) => {
                        const virtualValue = item.shares * item.currentPrice;
                        const isExpanded = expandedTickers.has(item.ticker);

                        return (
                          <div
                            key={item.ticker}
                            className="bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 overflow-hidden"
                          >
                            {/* Ticker Header - Clickable */}
                            <button
                              onClick={() => toggleTicker(item.ticker)}
                              className="w-full p-4 flex items-center justify-between hover:bg-surface dark:hover:bg-trading-dark-700/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="w-5 h-5 text-ink-400" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-ink-400" />
                                )}
                                <div className="text-left">
                                  <h4 className="text-lg font-bold text-ink-900 dark:text-white">
                                    {item.ticker}
                                  </h4>
                                  <p className="text-sm text-ink-600 dark:text-ink-400">
                                    {t('pagesB.portfolioDetail.sharesAt', {
                                      shares: formatNumber(item.shares),
                                      price: formatCurrency(
                                        item.currentPrice,
                                        getCurrencySymbol(portfolio?.currency ?? 'USD')
                                      ),
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-primary-700 dark:text-primary-300">
                                  {formatCurrency(
                                    virtualValue,
                                    getCurrencySymbol(portfolio?.currency ?? 'USD')
                                  )}
                                </p>
                              </div>
                            </button>

                            {/* Expanded Positions */}
                            {isExpanded && (
                              <div className="border-t border-surface-line dark:border-trading-dark-600 bg-surface dark:bg-trading-dark-900/50">
                                <div className="p-4 space-y-3">
                                  <div className="text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wider mb-2">
                                    {t('pagesB.portfolioDetail.positions', {
                                      count: item.positions.length,
                                    })}
                                  </div>
                                  {item.positions.map((pos: any) => {
                                    const expDate = new Date(pos.expiration);
                                    const now = new Date();
                                    const daysToExp = Math.floor(
                                      (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                                    );
                                    const posShares = pos.contracts * 100;

                                    return (
                                      <div
                                        key={pos.id}
                                        className="flex items-center justify-between p-3 bg-white dark:bg-trading-dark-800 rounded-lg"
                                      >
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-ink-900 dark:text-white">
                                              {pos.contracts} contract{pos.contracts > 1 ? 's' : ''}{' '}
                                              @ ${pos.strike}
                                            </span>
                                            <span
                                              className={`text-xs px-2 py-0.5 rounded-full ${
                                                daysToExp <= 30
                                                  ? 'bg-negative-50 text-negative-700 dark:bg-negative-700/25 dark:text-negative-500'
                                                  : daysToExp <= 90
                                                    ? 'bg-caution-50 text-caution-600 dark:bg-caution-600/25 dark:text-caution-500'
                                                    : 'bg-positive-50 text-positive-700 dark:bg-positive-700/25 dark:text-positive-500'
                                              }`}
                                            >
                                              {daysToExp} DTE
                                            </span>
                                          </div>
                                          <div className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                                            Expiry:{' '}
                                            {expDate.toLocaleDateString('nl-NL', {
                                              day: 'numeric',
                                              month: 'short',
                                              year: 'numeric',
                                            })}
                                            {' • '}
                                            {t('pagesB.portfolioDetail.sharesSuffix', {
                                              count: posShares,
                                            })}
                                          </div>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-medium text-ink-900 dark:text-white">
                                            {formatCurrency(
                                              posShares * item.currentPrice,
                                              getCurrencySymbol(portfolio?.currency ?? 'USD')
                                            )}
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
                          <h4 className="text-base font-bold text-ink-900 dark:text-white">
                            {t('pagesB.portfolioDetail.totalVirtualPortfolio')}
                          </h4>
                          <p className="text-xl font-bold text-primary-700 dark:text-primary-300">
                            {formatCurrency(
                              totalVirtualValue,
                              getCurrencySymbol(portfolio?.currency ?? 'USD')
                            )}
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
                <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-caution-500/30 dark:border-caution-500/30 p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-5 h-5 text-caution-600 dark:text-caution-500" />
                      <h4 className="text-lg font-semibold text-ink-900 dark:text-white">Alerts</h4>
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
                        <p className="text-sm text-ink-600 dark:text-ink-400">
                          {t('pagesB.portfolioDetail.noActiveAlerts')}
                        </p>
                      </div>
                    ) : (
                      alertsData.alerts.map((item) => {
                        const AlertIcon = getAlertIcon(item.message, true);
                        return (
                          <div
                            key={item.id}
                            className="w-full text-left p-3 bg-surface dark:bg-trading-dark-700/50 rounded-lg"
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="p-1 rounded bg-caution-50 dark:bg-caution-600/25">
                                    <AlertIcon className="w-3 h-3 text-caution-600 dark:text-caution-500" />
                                  </div>
                                  <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">
                                    {item.ticker}
                                  </p>
                                </div>
                                <p className="text-xs text-ink-600 dark:text-ink-400 ml-6 whitespace-pre-line">
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
                <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-positive-500/20 dark:border-positive-700/30 p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-positive-600 dark:text-positive-500" />
                      <h4 className="text-lg font-semibold text-ink-900 dark:text-white">
                        Opportunities
                      </h4>
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
                        <p className="text-sm text-ink-600 dark:text-ink-400">
                          {t('pagesB.portfolioDetail.noActiveOpportunities')}
                        </p>
                      </div>
                    ) : (
                      alertsData.opportunities.map((item) => {
                        const OppIcon = getAlertIcon(item.message, false);
                        const ccTarget = parseCoveredCallOpportunity(item);
                        if (ccTarget) {
                          return (
                            <button
                              key={item.id}
                              type="button"
                              className="w-full text-left p-3 bg-surface dark:bg-trading-dark-700/50 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 rounded-lg cursor-pointer transition-colors"
                              onClick={() =>
                                handleWriteCoveredCall(ccTarget.ticker, ccTarget.underlyingId)
                              }
                            >
                              <div className="flex items-start gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className="p-1 rounded bg-positive-50 dark:bg-positive-700/25">
                                      <OppIcon className="w-3 h-3 text-positive-600 dark:text-positive-500" />
                                    </div>
                                    <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">
                                      {item.ticker}
                                    </p>
                                    <span className="ml-auto flex items-center gap-1 text-xs text-positive-600 dark:text-positive-400 shrink-0">
                                      <Plus className="w-3 h-3" />
                                      {t('pagesB.portfolioDetail.placeTradeHint')}
                                    </span>
                                  </div>
                                  <p className="text-xs text-ink-600 dark:text-ink-400 ml-6 whitespace-pre-line">
                                    {item.message}
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        }
                        return (
                          <div
                            key={item.id}
                            className="w-full text-left p-3 bg-surface dark:bg-trading-dark-700/50 rounded-lg"
                          >
                            <div className="flex items-start gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="p-1 rounded bg-positive-50 dark:bg-positive-700/25">
                                    <OppIcon className="w-3 h-3 text-positive-600 dark:text-positive-500" />
                                  </div>
                                  <p className="text-sm font-semibold text-ink-900 dark:text-white truncate">
                                    {item.ticker}
                                  </p>
                                </div>
                                <p className="text-xs text-ink-600 dark:text-ink-400 ml-6 whitespace-pre-line">
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
            onClose={() => {
              setIsStockWizardOpen(false);
              setStockWizardInitialTicker(undefined);
            }}
            initialTicker={stockWizardInitialTicker}
            portfolio={{
              name: portfolio.name,
              currency: portfolio.currency,
              currentValue: portfolio.currentValue,
            }}
          />

          <CallOptionWizard
            isOpen={isCallOptionWizardOpen}
            onClose={() => setIsCallOptionWizardOpen(false)}
            initialTicker={callWizardInitialTicker}
            initialAction={callWizardInitialAction}
            initialStrike={callWizardInitialStrike}
            initialExpiration={callWizardInitialExpiration}
            initialUnderlyingId={callWizardInitialUnderlyingId}
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
