import React, { useMemo, useEffect } from 'react';
import { Plus, AlertCircle, DollarSign, ShieldAlert, Banknote, TrendingUp, TrendingDown, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { StatCard } from '../../components/widgets/StatCard';
import { UpcomingEvents } from '../../components/widgets/UpcomingEvents';
import { GoalsOverview } from '../../components/widgets/GoalsOverview';
import { AlertsOpportunitiesWidget } from '../../components/widgets/AlertsOpportunitiesWidget';
// import TodoListWidget from '../../components/widgets/TodoListWidget';
import { BackupWarning } from '../../components/widgets/BackupWarning';
import { PortfolioValueChart } from '../../components/widgets/PortfolioValueChart';
import { MultiPortfolioChart } from '../../components/widgets/MultiPortfolioChart';
import { PortfolioOverview } from '../../components/widgets/PortfolioOverview';
import { selectPortfolioSummaries } from '../../store/slices/portfoliosSlice';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import logo from '../../assets/app/logo.png';

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const { setPageTitle } = usePageTitle();
  const { pushNavigation, setMenuNavigation } = useNavigation();
  const navigate = useNavigate();
  const summaries = useAppSelector(selectPortfolioSummaries);
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);
  const positions = useAppSelector((state) => state.positions.positions);
  const alerts = useAppSelector((state) => state.alerts.alerts);
  const dailyData = useAppSelector((state) => state.portfolios.dailyData);

  useEffect(() => {
    setPageTitle(t('dashboard.pageTitle'), t('dashboard.pageSubtitle'));
    // Mark dashboard as menu navigation to prevent back button
    setMenuNavigation('/', t('dashboard.pageTitle'));
  }, [setPageTitle, setMenuNavigation, t]);

  const handleNavigate = (path: string, title: string) => {
    pushNavigation(path, title);
    navigate(path);
  };

  // Aggregate daily data across all portfolios
  const aggregatedDailyData = useMemo(() => {
    // Group daily data by date
    const dataByDate = dailyData.reduce((acc, entry) => {
      if (!acc[entry.date]) {
        acc[entry.date] = {
          date: entry.date,
          totalValue: 0,
          cash: 0,
          dailyPnL: 0,
          weeklyPnL: 0,
        };
      }
      acc[entry.date].totalValue += entry.totalValue;
      acc[entry.date].cash += entry.cash;
      acc[entry.date].dailyPnL += entry.dailyPnL;
      acc[entry.date].weeklyPnL += entry.weeklyPnL || 0;
      return acc;
    }, {} as Record<string, { date: string; totalValue: number; cash: number; dailyPnL: number; weeklyPnL: number }>);

    return Object.values(dataByDate);
  }, [dailyData]);

  // Calculate total portfolio stats
  const totalStats = useMemo(() => {
    const totalValue = summaries.reduce((sum, b) => sum + b.totalValue, 0);
    const totalUncovered = summaries.reduce((sum, b) => sum + b.uncoveredValue, 0);

    // Calculate Long and Short values from all open positions
    const openPositions = positions.filter(p => p.status === 'open');

    // Stock and ETF value (always long positions)
    const stockEtfValue = openPositions
      .filter(p => p.type === 'stock' || p.type === 'etf')
      .reduce((sum, pos) => sum + (pos.currentValue ?? 0), 0);

    // Options long value (bought options)
    const optionsLongValue = openPositions
      .filter(p => (p.type === 'call' || p.type === 'put') && 'action' in p && (p as any).action === 'buy')
      .reduce((sum, pos) => sum + Math.abs(pos.currentValue ?? 0), 0);

    // Total long value = stocks + ETFs + bought options
    const longValue = stockEtfValue + optionsLongValue;

    // Short value (sold options)
    const shortValue = openPositions
      .filter(p => (p.type === 'call' || p.type === 'put') && 'action' in p && (p as any).action === 'sell')
      .reduce((sum, pos) => sum + Math.abs(pos.currentValue ?? 0), 0);

    // Count long and short positions
    const longCount = openPositions.filter(p =>
      p.type === 'stock' || p.type === 'etf' ||
      ((p.type === 'call' || p.type === 'put') && 'action' in p && (p as any).action === 'buy')
    ).length;

    const shortCount = openPositions.filter(p =>
      (p.type === 'call' || p.type === 'put') && 'action' in p && (p as any).action === 'sell'
    ).length;

    // Cash = Total Value - Long + Short
    const totalCash = Math.max(0, totalValue - longValue + shortValue);

    // Calculate allocated cash (collateral for CSPs and spreads)
    const allocatedCash = openPositions.reduce((sum, pos) => {
      if (pos.type === 'put' && 'cashReserved' in pos && (pos as any).cashReserved) {
        return sum + (pos as any).cashReserved;
      }
      if (pos.type === 'spread' && 'collateral' in pos && (pos as any).collateral) {
        return sum + (pos as any).collateral;
      }
      return sum;
    }, 0);

    const freeCash = totalCash - allocatedCash;

    // Calculate starting total value (sum of all portfolios' earliest entries)
    const startingTotalValue = portfolios.reduce((sum, portfolio) => {
      const portfolioData = dailyData.filter((d) => d.portfolio === portfolio.name);
      if (portfolioData.length === 0) return sum;

      // Find the earliest date entry for this portfolio
      const earliestEntry = portfolioData.reduce((earliest, current) =>
        new Date(current.date) < new Date(earliest.date) ? current : earliest
      );

      return sum + earliestEntry.totalValue;
    }, 0);

    // Calculate percentage difference from start
    const percentageFromStart = startingTotalValue === 0
      ? 0
      : ((totalValue - startingTotalValue) / startingTotalValue) * 100;

    // Check if there's a mix of currencies
    const currencies = new Set(portfolios.map(b => b.currency));
    const hasMixedCurrency = currencies.size > 1;
    const currencySymbol = hasMixedCurrency ? '' : (currencies.has('EUR') ? '€' : '$');

    return {
      totalValue,
      totalUncovered,
      percentageFromStart,
      totalCash,
      freeCash,
      currencySymbol,
      longValue,
      shortValue,
      longCount,
      shortCount,
      allocatedCash
    };
  }, [summaries, portfolios, positions, dailyData]);

  // Critical alerts
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical');

  // Check if we have any portfolios
  const hasPortfolios = summaries.length > 0 || portfolios.length > 0;

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Empty State */}
      {!hasPortfolios && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-16 text-center">
            <div className="max-w-md mx-auto">
              <img src={logo} alt="PayDay" className="w-20 h-20 mx-auto rounded-xl mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('dashboard.noPortfolios')}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {t('dashboard.noPortfoliosDescription')}
              </p>
              <button
                onClick={() => handleNavigate('/settings/portfolios', t('sidebar.managePortfolios'))}
                className="inline-flex items-center gap-2 px-5 py-2.5 btn-primary text-white rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
              >
                <Plus className="w-5 h-5" />
                {t('dashboard.addPortfolio')}
              </button>
            </div>
          </div>

          {/* Strategy Overview for New Users */}
          <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 dark:from-blue-900/10 dark:via-purple-900/10 dark:to-green-900/10 rounded-lg border border-blue-200 dark:border-blue-500/30 p-8">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
              Welkom bij PayDay - Jouw Options Trading Platform
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-center mb-8 max-w-2xl mx-auto">
              PayDay helpt je om systematisch inkomen te genereren met options trading.
              We beginnen met de fundamenten en bouwen stap voor stap op.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-blue-200 dark:border-blue-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold">
                    1
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Aandelen & ETFs</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  De basis: koop betrouwbare aandelen of ETFs voor de lange termijn.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-purple-200 dark:border-purple-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-semibold">
                    2
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">LEAPS</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Synthetische aandelen met leverage - krijg exposure voor minder kapitaal.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-green-200 dark:border-green-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400 font-semibold">
                    3
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Covered Calls</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Verdien extra premies door calls te schrijven op je aandelen of LEAPS.
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-indigo-200 dark:border-indigo-500/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold">
                    4
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Cash Secured Puts</h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Krijg betaald om aandelen te kopen aan jouw gewenste prijs.
                </p>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Begin door een portfolio toe te voegen, daarna kun je stap voor stap je strategieën opbouwen.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {hasPortfolios && (
        <>
          {/* Backup Warning */}
          <BackupWarning />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              title="Portfolio waarde"
              description={
                <>
                  Cash: {formatCurrency(totalStats.totalCash, totalStats.currencySymbol)}
                  <br />
                  Assets (long-short): {formatCurrency(totalStats.longValue - totalStats.shortValue, totalStats.currencySymbol)}
                </>
              }
              value={formatCurrency(totalStats.totalValue, totalStats.currencySymbol)}
              icon={<DollarSign className="w-6 h-6" />}
              tooltip="De totale waarde van alle portfolios bestaande uit: Cash + Aandelen + ETF's + Opties (long) - Opties (short)"
            />
            <StatCard
              title="Long posities"
              description={`${totalStats.longCount} actieve long posities`}
              value={formatCurrency(totalStats.longValue, totalStats.currencySymbol)}
              icon={<TrendingUp className="w-6 h-6" />}
            />
            <StatCard
              title="Short posities"
              description={`${totalStats.shortCount} actieve short posities`}
              value={formatCurrency(totalStats.shortValue, totalStats.currencySymbol)}
              icon={<TrendingDown className="w-6 h-6" />}
            />
            <StatCard
              title="Cash"
              description={
                <>
                  Gealloceerd: {formatCurrency(totalStats.allocatedCash, totalStats.currencySymbol)}
                  <br />
                  Vrij: {formatCurrency(totalStats.freeCash, totalStats.currencySymbol)}
                </>
              }
              value={formatCurrency(totalStats.totalCash, totalStats.currencySymbol)}
              icon={<Banknote className="w-6 h-6" />}
            />
            <StatCard
              title="Vrije cash"
              description={
                <>
                  Cash: {formatCurrency(totalStats.totalCash, totalStats.currencySymbol)}
                  <br />
                  Gealloceerd: {formatCurrency(totalStats.allocatedCash, totalStats.currencySymbol)}
                </>
              }
              value={formatCurrency(totalStats.freeCash, totalStats.currencySymbol)}
              icon={<Wallet className="w-6 h-6" />}
              tooltip="Cash die niet gereserveerd is als collateral voor short posities"
              valueClassName={totalStats.freeCash < 0 ? 'text-red-600 dark:text-red-400' : undefined}
            />
          </div>

          {/* Portfolio Overview Cards */}
          <PortfolioOverview />

          {/* Charts - Side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Portfolio Value Chart - Combined view of all portfolios */}
            <PortfolioValueChart
              data={aggregatedDailyData}
              currency={totalStats.currencySymbol === '€' ? 'EUR' : 'USD'}
              portfolioName="Alle Portefeuilles"
              title="Totale portfolio waarde"
              subtitle={`${aggregatedDailyData.length} ${aggregatedDailyData.length === 1 ? 'datapunt' : 'datapunten'}`}
              footer="Gecombineerde waarde van alle portfolios over tijd"
            />

            {/* Multi-Portfolio Chart - Individual lines for each portfolio */}
            <MultiPortfolioChart
              data={dailyData}
              portfolios={portfolios.map(b => ({ name: b.name, currency: b.currency }))}
            />
          </div>

          {/* Goals */}
          <GoalsOverview />

          {/* Alerts, Opportunities & Events - Side by side */}
          <div className="grid grid-cols-3 gap-4">
            <AlertsOpportunitiesWidget type="alerts" />
            <AlertsOpportunitiesWidget type="opportunities" />
            <UpcomingEvents />
          </div>
        </>
      )}

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/50 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{t('dashboard.criticalAlerts')}</h2>
          </div>
          <div className="space-y-2">
            {criticalAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between p-3 bg-white dark:bg-trading-dark-800 rounded-lg border border-gray-200 dark:border-trading-dark-700"
              >
                <div>
                  <p className="text-gray-900 dark:text-white font-medium">{alert.ticker}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{alert.message}</p>
                </div>
                {alert.suggestedAction && (
                  <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
                    {alert.suggestedAction}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
