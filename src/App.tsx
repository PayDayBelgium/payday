import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import {
  LoginPage,
  Dashboard,
  PortfolioDetail,
  PortfolioManagement,
  StocksETFsStrategy,
  LEAPSStrategy,
  CoveredCallsStrategy,
  CSPStrategy,
  PMCCStrategy,
  SpreadsStrategy,
  KaChingStrategy,
  PMCCCalculator,
  KaChingCalculator,
  MonthlyIncomeCalculator,
  CapitalGainsTaxCalculator,
  PnLSimulator,
  CoveredCallSimulator,
  Settings,
  Journal,
  Todos,
  TickersOverview,
  Analytics,
  HelpPortal,
  MissionStatement,
} from './pages';
import { AdminLayout } from './components/layout/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { UsersList } from './pages/admin/UsersList';
import { UserDetail } from './pages/admin/UserDetail';
import { AddUser } from './pages/admin/AddUser';
import { Layout } from './components';
import { FeatureGate } from './components/features/FeatureGate';
import { useIBConnection } from './hooks/useIBConnection';
import { useAppSelector } from './hooks/useAppSelector';
import { useAppDispatch } from './hooks/useAppDispatch';
import { selectIsAuthenticated } from './store/slices/authSlice';
import { migrateTickersToStore } from './utils/tickerMigration';
import { store } from './store';

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

  // Initialize IB WebSocket connection (disabled for now)
  useIBConnection(false);

  // Migrate tickers from portfoliosSlice to tickersSlice on first load
  useEffect(() => {
    migrateTickersToStore(dispatch, store.getState);
  }, [dispatch]);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomeRedirect />} />
        <Route path="portfolio/:portfolioName" element={<PortfolioDetail />} />
        <Route path="portfolio/:portfolio/stocks-etfs" element={<StocksETFsStrategy />} />
        <Route path="portfolio/:portfolio/leaps" element={<FeatureGate feature="leaps"><LEAPSStrategy /></FeatureGate>} />
        <Route path="portfolio/:portfolio/covered-calls" element={<FeatureGate feature="covered_calls"><CoveredCallsStrategy /></FeatureGate>} />
        <Route path="portfolio/:portfolio/csp" element={<FeatureGate feature="cash_secured_puts"><CSPStrategy /></FeatureGate>} />
        <Route path="portfolio/:portfolio/pmcc" element={<FeatureGate feature="pmcc"><PMCCStrategy /></FeatureGate>} />
        <Route path="portfolio/:portfolio/spreads" element={<FeatureGate feature="spreads"><SpreadsStrategy /></FeatureGate>} />
        <Route path="portfolio/:portfolio/kaching" element={<FeatureGate feature="kaching"><KaChingStrategy /></FeatureGate>} />
        <Route path="tickers" element={<TickersOverview />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="journal" element={<Journal />} />
        <Route path="todos" element={<Todos />} />
        <Route path="tools/pmcc-calculator" element={<FeatureGate feature="pmcc"><PMCCCalculator /></FeatureGate>} />
        <Route path="tools/kaching-calculator" element={<FeatureGate feature="kaching"><KaChingCalculator /></FeatureGate>} />
        <Route path="tools/income-calculator" element={<FeatureGate feature="covered_calls"><MonthlyIncomeCalculator /></FeatureGate>} />
        <Route path="tools/capital-gains-tax" element={<CapitalGainsTaxCalculator />} />
        <Route path="tools/pnl-simulator" element={<FeatureGate feature="advanced_analytics"><PnLSimulator /></FeatureGate>} />
        <Route path="tools/covered-call-simulator" element={<FeatureGate feature="covered_calls"><CoveredCallSimulator /></FeatureGate>} />
        <Route path="settings" element={<Settings />} />
        <Route path="settings/portfolios" element={<PortfolioManagement />} />
        <Route path="help" element={<HelpPortal />} />
        <Route path="mission" element={<MissionStatement />} />
        {/* TODO: Add more routes */}
        <Route path="*" element={<ComingSoon />} />
      </Route>
    </Routes>
  );
}

function App() {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const isAdminAuthenticated = useAppSelector((state) => state.adminAuth.isAuthenticated);

  return (
    <Router>
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
        <Route path="/*" element={
          isAdminAuthenticated ? <Navigate to="/admin/dashboard" replace /> :
          isAuthenticated ? <AppContent /> :
          <LoginPage />
        } />
      </Routes>
    </Router>
  );
}

const ComingSoon = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-white mb-4">Coming Soon</h1>
      <p className="text-gray-400">This feature is under development</p>
    </div>
  </div>
);

export default App;
