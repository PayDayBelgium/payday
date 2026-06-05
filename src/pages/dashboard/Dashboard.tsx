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
import { TradingIdeasWidget } from '../../components/widgets/TradingIdeasWidget';
import { CommunityWidget } from '../../components/widgets/CommunityWidget';
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
          <div className="surface-card overflow-hidden">
            <div className="relative bg-sky-fade px-10 py-14 text-center">
              {/* subtle grid texture */}
              <div className="absolute inset-0 opacity-[0.35] pointer-events-none"
                   style={{
                     backgroundImage:
                       'linear-gradient(rgba(11,74,143,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(11,74,143,0.06) 1px, transparent 1px)',
                     backgroundSize: '32px 32px',
                   }} />
              <div className="relative max-w-md mx-auto">
                <img src={logo} alt="PayDay" className="w-16 h-16 mx-auto rounded-md ring-1 ring-[var(--line)] mb-5" />
                <p className="eyebrow mb-2">Markets Workspace</p>
                <h3 className="text-xl font-semibold text-ink-900 dark:text-white tracking-tight mb-3">
                  {t('dashboard.noPortfolios')}
                </h3>
                <p className="text-sm text-ink-500 dark:text-ink-400 mb-7 leading-relaxed">
                  {t('dashboard.noPortfoliosDescription')}
                </p>
                <button
                  onClick={() => handleNavigate('/settings/portfolios', t('sidebar.managePortfolios'))}
                  className="inline-flex items-center gap-2 px-5 py-2.5 btn-primary rounded-md text-sm"
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                  {t('dashboard.addPortfolio')}
                </button>
              </div>
            </div>
          </div>

          {/* Strategy Overview for New Users */}
          <div className="surface-card p-8">
            <div className="text-center mb-8">
              <p className="eyebrow mb-2">Welkom bij PayDay</p>
              <h3 className="text-lg font-semibold text-ink-900 dark:text-white tracking-tight mb-3">
                Een systematisch traject voor opties-inkomen
              </h3>
              <p className="text-sm text-ink-500 dark:text-ink-400 max-w-2xl mx-auto leading-relaxed">
                We bouwen je portefeuille stap voor stap op — van fundament tot geavanceerde strategieën.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-[var(--line)] rounded-md overflow-hidden">
              {[
                { n: '01', t: 'Aandelen & ETFs', d: 'De basis: betrouwbare aandelen of ETFs voor de lange termijn.' },
                { n: '02', t: 'LEAPS',           d: 'Synthetische aandelen met leverage — exposure voor minder kapitaal.' },
                { n: '03', t: 'Covered Calls',   d: 'Verdien extra premies door calls te schrijven op je aandelen of LEAPS.' },
                { n: '04', t: 'Cash Secured Puts', d: 'Krijg betaald om aandelen te kopen aan jouw gewenste prijs.' },
              ].map((step) => (
                <div key={step.n} className="bg-white dark:bg-trading-dark-800 p-6">
                  <p className="text-2xl text-primary-700 font-semibold tabular-nums leading-none mb-3">{step.n}</p>
                  <h4 className="font-semibold text-ink-900 dark:text-white text-[15px] tracking-tight mb-1.5">{step.t}</h4>
                  <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">{step.d}</p>
                </div>
              ))}
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
              valueClassName={totalStats.freeCash < 0 ? 'text-negative-600 dark:text-negative-500' : undefined}
            />
          </div>

          {/* Portfolio Overview Cards */}
          <PortfolioOverview />

          {/* Charts - Side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Portfolio Value Chart - Combined view of all portfolios */}
            <PortfolioValueChart
              data={aggregatedDailyData as any}
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

          {/* Community & Trading ideas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TradingIdeasWidget />
            <CommunityWidget />
          </div>
        </>
      )}

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <div className="relative surface-card overflow-hidden">
          <span className="absolute inset-x-0 top-0 h-[2px] bg-negative-500" aria-hidden />
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-md bg-negative-50 text-negative-600 flex items-center justify-center">
                <AlertCircle className="w-[18px] h-[18px]" strokeWidth={1.75} />
              </div>
              <div>
                <p className="eyebrow text-negative-600">Kritiek</p>
                <h2 className="text-base font-semibold text-ink-900 dark:text-white tracking-tight">{t('dashboard.criticalAlerts')}</h2>
              </div>
            </div>
            <div className="divide-y divide-[var(--line-soft)] border-t border-[var(--line-soft)]">
              {criticalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-semibold text-sm text-ink-900 dark:text-white tabular-nums tracking-tight">{alert.ticker}</p>
                    <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{alert.message}</p>
                  </div>
                  {alert.suggestedAction && (
                    <button className="px-3 py-1.5 bg-negative-500 hover:bg-negative-600 text-white rounded-md text-xs font-semibold transition-colors">
                      {alert.suggestedAction}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
