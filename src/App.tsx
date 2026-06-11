import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
// Route-level code splitting: each page is a separate chunk loaded on navigation,
// so the heavy ones (recharts tools, the 105KB education curriculum) stay out of the
// initial bundle. Shells (Layout/AdminLayout) and the login page are eager — but
// they must be imported by direct path: going through the pages/components barrels
// would make every page statically reachable from the entry and defeat the split.
import LoginPage from './pages/auth/LoginPage';
const Dashboard = lazy(() =>
  import('./pages/dashboard/Dashboard').then((m) => ({ default: m.Dashboard }))
);
const PortfolioDetail = lazy(() =>
  import('./pages/portfolios/PortfolioDetail').then((m) => ({ default: m.PortfolioDetail }))
);
const PortfolioManagement = lazy(() =>
  import('./pages/portfolios/PortfolioManagement').then((m) => ({ default: m.PortfolioManagement }))
);
const StocksETFsStrategy = lazy(() =>
  import('./pages/strategies/StocksETFsStrategy').then((m) => ({ default: m.StocksETFsStrategy }))
);
const LEAPSStrategy = lazy(() =>
  import('./pages/strategies/LEAPSStrategy').then((m) => ({ default: m.LEAPSStrategy }))
);
const CoveredCallsStrategy = lazy(() =>
  import('./pages/strategies/CoveredCallsStrategy').then((m) => ({
    default: m.CoveredCallsStrategy,
  }))
);
const CSPStrategy = lazy(() =>
  import('./pages/strategies/CSPStrategy').then((m) => ({ default: m.CSPStrategy }))
);
const PMCCStrategy = lazy(() =>
  import('./pages/strategies/PMCCStrategy').then((m) => ({ default: m.PMCCStrategy }))
);
const SpreadsStrategy = lazy(() =>
  import('./pages/strategies/SpreadsStrategy').then((m) => ({ default: m.SpreadsStrategy }))
);
const KaChingStrategy = lazy(() =>
  import('./pages/strategies/KaChingStrategy').then((m) => ({ default: m.KaChingStrategy }))
);
const PMCCCalculator = lazy(() =>
  import('./pages/tools/PMCCCalculator').then((m) => ({ default: m.PMCCCalculator }))
);
const KaChingCalculator = lazy(() =>
  import('./pages/tools/KaChingCalculator').then((m) => ({ default: m.KaChingCalculator }))
);
const MonthlyIncomeCalculator = lazy(() =>
  import('./pages/tools/MonthlyIncomeCalculator').then((m) => ({
    default: m.MonthlyIncomeCalculator,
  }))
);
const CapitalGainsTaxCalculator = lazy(() =>
  import('./pages/tools/CapitalGainsTaxCalculator').then((m) => ({
    default: m.CapitalGainsTaxCalculator,
  }))
);
const PnLSimulator = lazy(() =>
  import('./pages/tools/PnLSimulator').then((m) => ({ default: m.PnLSimulator }))
);
const CoveredCallSimulator = lazy(() =>
  import('./pages/tools/CoveredCallSimulator').then((m) => ({ default: m.CoveredCallSimulator }))
);
const OptionCheck = lazy(() =>
  import('./pages/tools/OptionCheck').then((m) => ({ default: m.OptionCheck }))
);
const Settings = lazy(() =>
  import('./pages/settings/Settings').then((m) => ({ default: m.Settings }))
);
const Journal = lazy(() => import('./pages/journal/Journal').then((m) => ({ default: m.Journal })));
const Todos = lazy(() => import('./pages/journal/Todos'));
const TickersOverview = lazy(() =>
  import('./pages/tickers/TickersOverview').then((m) => ({ default: m.TickersOverview }))
);
const Analytics = lazy(() =>
  import('./pages/analytics/Analytics').then((m) => ({ default: m.Analytics }))
);
const HelpPortal = lazy(() =>
  import('./pages/help/HelpPortal').then((m) => ({ default: m.HelpPortal }))
);
const MissionStatement = lazy(() =>
  import('./pages/mission/MissionStatement').then((m) => ({ default: m.MissionStatement }))
);
const Community = lazy(() =>
  import('./pages/community/Community').then((m) => ({ default: m.Community }))
);
const QuantTrading = lazy(() =>
  import('./pages/quant/QuantTrading').then((m) => ({ default: m.QuantTrading }))
);
const Mentorship = lazy(() =>
  import('./pages/mentorship/Mentorship').then((m) => ({ default: m.Mentorship }))
);
import { AdminLayout } from './components/layout/AdminLayout';
const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);
const UsersList = lazy(() =>
  import('./pages/admin/UsersList').then((m) => ({ default: m.UsersList }))
);
const UserDetail = lazy(() =>
  import('./pages/admin/UserDetail').then((m) => ({ default: m.UserDetail }))
);
const AddUser = lazy(() => import('./pages/admin/AddUser').then((m) => ({ default: m.AddUser })));
import { Layout } from './components/layout/Layout';
import { LoadingOverlay } from './components/common/LoadingOverlay';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useTranslation } from 'react-i18next';
import { FeatureGate } from './components/features/FeatureGate';
import { useIBConnection } from './hooks/useIBConnection';
import { useAppSelector } from './hooks/useAppSelector';
import { useAppDispatch } from './hooks/useAppDispatch';
import { selectIsAuthenticated } from './store/slices/authSlice';
import { migrateTickersToStore } from './utils/tickerMigration';
import { seedDefaultTickersIfMissing } from './utils/tickerSeeding';
import { useStore } from 'react-redux';
import type { AppStore } from './store';

function HomeRedirect() {
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);

  // New users (no portfolios) → Portfolio setup
  if (portfolios.length === 0) {
    return <Navigate to="/settings/portfolios" replace />;
  }

  // Existing users → Dashboard
  return <Dashboard />;
}

function AppContent() {
  const dispatch = useAppDispatch();
  // The runtime, per-user store (NOT a module-level singleton) so the migration
  // reads the rehydrated user data instead of an empty default store.
  const store = useStore() as AppStore;

  // Initialize IB WebSocket connection (disabled for now)
  useIBConnection(false);

  // Migrate legacy tickers, then seed the default tickers for a brand-new account.
  // Migration runs first so a freshly-migrated (non-empty) account is not seeded.
  useEffect(() => {
    migrateTickersToStore(dispatch, store.getState);
    const username = localStorage.getItem('payday-current-user') ?? undefined;
    seedDefaultTickersIfMissing(dispatch, store.getState, username);
  }, [dispatch, store]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomeRedirect />} />
        <Route path="portfolio/:portfolioName" element={<PortfolioDetail />} />
        <Route path="portfolio/:portfolio/stocks-etfs" element={<StocksETFsStrategy />} />
        <Route
          path="portfolio/:portfolio/leaps"
          element={
            <FeatureGate feature="leaps">
              <LEAPSStrategy />
            </FeatureGate>
          }
        />
        <Route
          path="portfolio/:portfolio/covered-calls"
          element={
            <FeatureGate feature="covered_calls">
              <CoveredCallsStrategy />
            </FeatureGate>
          }
        />
        <Route
          path="portfolio/:portfolio/csp"
          element={
            <FeatureGate feature="cash_secured_puts">
              <CSPStrategy />
            </FeatureGate>
          }
        />
        <Route
          path="portfolio/:portfolio/pmcc"
          element={
            <FeatureGate feature="pmcc">
              <PMCCStrategy />
            </FeatureGate>
          }
        />
        <Route
          path="portfolio/:portfolio/spreads"
          element={
            <FeatureGate feature="spreads">
              <SpreadsStrategy />
            </FeatureGate>
          }
        />
        <Route
          path="portfolio/:portfolio/kaching"
          element={
            <FeatureGate feature="kaching">
              <KaChingStrategy />
            </FeatureGate>
          }
        />
        <Route path="tickers" element={<TickersOverview />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="journal" element={<Journal />} />
        <Route path="todos" element={<Todos />} />
        <Route
          path="tools/pmcc-calculator"
          element={
            <FeatureGate feature="pmcc">
              <PMCCCalculator />
            </FeatureGate>
          }
        />
        <Route
          path="tools/kaching-calculator"
          element={
            <FeatureGate feature="kaching">
              <KaChingCalculator />
            </FeatureGate>
          }
        />
        <Route
          path="tools/income-calculator"
          element={
            <FeatureGate feature="covered_calls">
              <MonthlyIncomeCalculator />
            </FeatureGate>
          }
        />
        <Route path="tools/capital-gains-tax" element={<CapitalGainsTaxCalculator />} />
        <Route
          path="tools/pnl-simulator"
          element={
            <FeatureGate feature="advanced_analytics">
              <PnLSimulator />
            </FeatureGate>
          }
        />
        <Route
          path="tools/covered-call-simulator"
          element={
            <FeatureGate feature="covered_calls">
              <CoveredCallSimulator />
            </FeatureGate>
          }
        />
        <Route
          path="tools/option-check"
          element={
            <FeatureGate feature="options_basics">
              <OptionCheck />
            </FeatureGate>
          }
        />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/portfolios" element={<PortfolioManagement />} />
        <Route path="help" element={<HelpPortal />} />
        <Route path="mission" element={<MissionStatement />} />
        <Route path="community" element={<Community />} />
        <Route
          path="quant"
          element={
            <FeatureGate feature="quant_trading">
              <QuantTrading />
            </FeatureGate>
          }
        />
        <Route path="mentorship" element={<Mentorship />} />
        {/* TODO: Add more routes */}
        <Route path="*" element={<ComingSoon />} />
      </Route>
    </Routes>
  );
}

function App() {
  const { t } = useTranslation();
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAdminAuthenticated = useAppSelector((state) => state.adminAuth.isAuthenticated);

  return (
    <Router>
      {/* One render error or failed lazy-chunk fetch (stale deploy) used to
          mean a white screen; the boundary shows a reload-recovery UI. */}
      <ErrorBoundary>
        <Suspense fallback={<LoadingOverlay message={t('common.loading')} />}>
          <Routes>
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<UsersList />} />
              <Route path="users/add" element={<AddUser />} />
              <Route path="users/:username" element={<UserDetail />} />
            </Route>

            {/* Regular App Routes */}
            <Route
              path="/*"
              element={
                isAdminAuthenticated ? (
                  <Navigate to="/admin/dashboard" replace />
                ) : isAuthenticated ? (
                  <AppContent />
                ) : (
                  <LoginPage />
                )
              }
            />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

const ComingSoon = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-white mb-4">Coming Soon</h1>
      <p className="text-ink-400">This feature is under development</p>
    </div>
  </div>
);

export default App;
