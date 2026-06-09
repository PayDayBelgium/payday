import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Calculator,
  Banknote,
  Receipt,
  LineChart,
  Mountain,
  Target,
  Activity,
  MessageSquare,
  Sigma,
  GraduationCap,
  ScanSearch,
} from 'lucide-react';
import type { FeatureId } from '../../types';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  selectUnlockedLevels,
  isFeatureAvailable,
  selectActivatedModules,
} from '../../store/slices/userProgressSlice';

// Map routes to required features - only routes that need gating
const ROUTE_FEATURE_MAP: Record<string, FeatureId> = {
  '/tools/pmcc-calculator': 'pmcc',
  '/tools/kaching-calculator': 'kaching',
  '/tools/pnl-simulator': 'advanced_analytics',
  '/tools/income-calculator': 'covered_calls',
  '/tools/covered-call-simulator': 'covered_calls',
  '/tools/option-check': 'options_basics',
  '/quant': 'quant_trading',
};

interface SidebarProps {
  className?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const navClass = (isActive: boolean, isCollapsed: boolean) =>
  `group relative flex items-center ${isCollapsed ? 'justify-center px-2' : 'gap-3 px-3'} py-2 rounded-md mb-0.5 text-sm transition-colors duration-150 ${
    isActive
      ? 'bg-primary-50 text-primary-700 font-semibold dark:text-white'
      : 'text-ink-700 hover:bg-surface-subtle hover:text-ink-900 dark:text-ink-300 dark:hover:bg-trading-dark-700 dark:hover:text-white'
  }`;

const ActiveBar: React.FC<{ active: boolean }> = ({ active }) =>
  active ? (
    <span
      className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary-700"
      aria-hidden
    />
  ) : null;

export const Sidebar: React.FC<SidebarProps> = ({ className = '', isCollapsed }) => {
  const { t } = useTranslation();
  const { setMenuNavigation } = useNavigation();
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);
  const unlockedLevels = useAppSelector(selectUnlockedLevels);
  const activatedModules = useAppSelector(selectActivatedModules);

  const handleMenuClick = (path: string, title: string) => {
    setMenuNavigation(path, title);
  };

  const hasAccess = (path: string): boolean => {
    const requiredFeature = ROUTE_FEATURE_MAP[path];
    if (!requiredFeature) return true;
    return isFeatureAvailable(requiredFeature, unlockedLevels);
  };

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] ${isCollapsed ? 'w-16' : 'w-64'} bg-white dark:bg-trading-dark-800 border-r border-[var(--line)] dark:border-trading-dark-700 flex flex-col transition-all duration-300 ${className}`}
    >
      <nav
        className={`flex-1 overflow-y-auto scrollbar-thin ${isCollapsed ? 'p-2 pt-3' : 'px-3 pt-4 pb-3'}`}
      >
        {/* Primary */}
        {!isCollapsed && <p className="eyebrow px-3 mb-2">{t('sidebarExtra.overview')}</p>}

        <NavLink
          to="/"
          end
          onClick={() => handleMenuClick('/', t('sidebar.dashboard'))}
          className={({ isActive }) => navClass(isActive, isCollapsed)}
          title={isCollapsed ? t('sidebar.dashboard') : ''}
        >
          {({ isActive }) => (
            <>
              <ActiveBar active={isActive} />
              <LayoutDashboard className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
              {!isCollapsed && <span>{t('sidebar.dashboard')}</span>}
            </>
          )}
        </NavLink>

        <NavLink
          to="/mission"
          onClick={() => handleMenuClick('/mission', t('sidebarExtra.yourJourney'))}
          className={({ isActive }) => navClass(isActive, isCollapsed)}
          title={isCollapsed ? t('sidebarExtra.yourJourney') : ''}
        >
          {({ isActive }) => (
            <>
              <ActiveBar active={isActive} />
              <Mountain className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
              {!isCollapsed && <span>{t('sidebarExtra.yourJourney')}</span>}
            </>
          )}
        </NavLink>

        <NavLink
          to="/analytics"
          onClick={() => handleMenuClick('/analytics', t('sidebarExtra.analyses'))}
          className={({ isActive }) => navClass(isActive, isCollapsed)}
          title={isCollapsed ? t('sidebarExtra.performance') : ''}
        >
          {({ isActive }) => (
            <>
              <ActiveBar active={isActive} />
              <Activity className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
              {!isCollapsed && <span>{t('sidebarExtra.performance')}</span>}
            </>
          )}
        </NavLink>

        {activatedModules.includes('community') && (
          <NavLink
            to="/community"
            onClick={() => handleMenuClick('/community', t('sidebar.community'))}
            className={({ isActive }) => navClass(isActive, isCollapsed)}
            title={isCollapsed ? t('sidebar.community') : ''}
          >
            {({ isActive }) => (
              <>
                <ActiveBar active={isActive} />
                <MessageSquare className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                {!isCollapsed && <span>{t('sidebar.community')}</span>}
              </>
            )}
          </NavLink>
        )}

        {hasAccess('/quant') && (
          <NavLink
            to="/quant"
            onClick={() => handleMenuClick('/quant', t('sidebar.quantTrading'))}
            className={({ isActive }) => navClass(isActive, isCollapsed)}
            title={isCollapsed ? t('sidebar.quantTrading') : ''}
          >
            {({ isActive }) => (
              <>
                <ActiveBar active={isActive} />
                <Sigma className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                {!isCollapsed && <span>{t('sidebar.quantTrading')}</span>}
              </>
            )}
          </NavLink>
        )}

        {activatedModules.includes('mentorship') && (
          <NavLink
            to="/mentorship"
            onClick={() => handleMenuClick('/mentorship', t('sidebar.mentorship'))}
            className={({ isActive }) => navClass(isActive, isCollapsed)}
            title={isCollapsed ? t('sidebar.mentorship') : ''}
          >
            {({ isActive }) => (
              <>
                <ActiveBar active={isActive} />
                <GraduationCap className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                {!isCollapsed && <span>{t('sidebar.mentorship')}</span>}
              </>
            )}
          </NavLink>
        )}

        {/* Portfolios */}
        {portfolios.length > 0 && (
          <div className="mt-6">
            {!isCollapsed && <p className="eyebrow px-3 mb-2">{t('sidebarExtra.portfolios')}</p>}
            {!isCollapsed &&
              portfolios.map((portfolio) => (
                <NavLink
                  key={portfolio.id}
                  to={`/portfolio/${encodeURIComponent(portfolio.name)}`}
                  onClick={() =>
                    handleMenuClick(
                      `/portfolio/${encodeURIComponent(portfolio.name)}`,
                      portfolio.name
                    )
                  }
                  className={({ isActive }) => navClass(isActive, isCollapsed)}
                >
                  {({ isActive }) => (
                    <>
                      <ActiveBar active={isActive} />
                      <img
                        src={portfolio.logo}
                        alt={portfolio.name}
                        className="w-5 h-5 rounded-sm object-contain ring-1 ring-[var(--line)] bg-white"
                      />
                      <span className="truncate">{portfolio.name}</span>
                    </>
                  )}
                </NavLink>
              ))}

            {isCollapsed &&
              portfolios.map((portfolio) => (
                <NavLink
                  key={portfolio.id}
                  to={`/portfolio/${encodeURIComponent(portfolio.name)}`}
                  className={({ isActive }) => navClass(isActive, isCollapsed)}
                  title={portfolio.name}
                >
                  {({ isActive }) => (
                    <>
                      <ActiveBar active={isActive} />
                      <img
                        src={portfolio.logo}
                        alt={portfolio.name}
                        className="w-5 h-5 rounded-sm object-contain ring-1 ring-[var(--line)] bg-white"
                      />
                    </>
                  )}
                </NavLink>
              ))}
          </div>
        )}

        {/* Tools */}
        <div className="mt-6">
          {!isCollapsed && <p className="eyebrow px-3 mb-2">{t('sidebarExtra.tools')}</p>}

          <NavLink
            to="/tickers"
            className={({ isActive }) => navClass(isActive, isCollapsed)}
            title={isCollapsed ? t('sidebar.tickerOverview') : ''}
          >
            {({ isActive }) => (
              <>
                <ActiveBar active={isActive} />
                <TrendingUp className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                {!isCollapsed && <span>{t('sidebar.tickerOverview')}</span>}
              </>
            )}
          </NavLink>

          {hasAccess('/tools/pmcc-calculator') && (
            <NavLink
              to="/tools/pmcc-calculator"
              onClick={() => handleMenuClick('/tools/pmcc-calculator', t('sidebar.pmccCalculator'))}
              className={({ isActive }) => navClass(isActive, isCollapsed)}
              title={isCollapsed ? t('sidebar.pmccCalculator') : ''}
            >
              {({ isActive }) => (
                <>
                  <ActiveBar active={isActive} />
                  <Calculator className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                  {!isCollapsed && <span>{t('sidebar.pmccCalculator')}</span>}
                </>
              )}
            </NavLink>
          )}

          {hasAccess('/tools/kaching-calculator') && (
            <NavLink
              to="/tools/kaching-calculator"
              className={({ isActive }) => navClass(isActive, isCollapsed)}
              title={isCollapsed ? t('sidebar.kachingCalculator') : ''}
            >
              {({ isActive }) => (
                <>
                  <ActiveBar active={isActive} />
                  <Banknote className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                  {!isCollapsed && <span>{t('sidebar.kachingCalculator')}</span>}
                </>
              )}
            </NavLink>
          )}

          {hasAccess('/tools/income-calculator') && (
            <NavLink
              to="/tools/income-calculator"
              className={({ isActive }) => navClass(isActive, isCollapsed)}
              title={isCollapsed ? t('sidebar.incomeCalculator') : ''}
            >
              {({ isActive }) => (
                <>
                  <ActiveBar active={isActive} />
                  <BarChart3 className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                  {!isCollapsed && <span>{t('sidebar.incomeCalculator')}</span>}
                </>
              )}
            </NavLink>
          )}

          {hasAccess('/tools/covered-call-simulator') && (
            <NavLink
              to="/tools/covered-call-simulator"
              onClick={() =>
                handleMenuClick('/tools/covered-call-simulator', t('sidebar.coveredCallSimulator'))
              }
              className={({ isActive }) => navClass(isActive, isCollapsed)}
              title={isCollapsed ? t('sidebar.coveredCallSimulator') : ''}
            >
              {({ isActive }) => (
                <>
                  <ActiveBar active={isActive} />
                  <Target className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                  {!isCollapsed && <span>{t('sidebar.coveredCallSimulator')}</span>}
                </>
              )}
            </NavLink>
          )}

          <NavLink
            to="/tools/capital-gains-tax"
            className={({ isActive }) => navClass(isActive, isCollapsed)}
            title={isCollapsed ? t('sidebarExtra.capitalGainsTax') : ''}
          >
            {({ isActive }) => (
              <>
                <ActiveBar active={isActive} />
                <Receipt className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                {!isCollapsed && <span>{t('sidebarExtra.capitalGainsTax')}</span>}
              </>
            )}
          </NavLink>

          {hasAccess('/tools/pnl-simulator') && (
            <NavLink
              to="/tools/pnl-simulator"
              className={({ isActive }) => navClass(isActive, isCollapsed)}
              title={isCollapsed ? t('sidebar.pnlSimulator') : ''}
            >
              {({ isActive }) => (
                <>
                  <ActiveBar active={isActive} />
                  <LineChart className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                  {!isCollapsed && <span>{t('sidebar.pnlSimulator')}</span>}
                </>
              )}
            </NavLink>
          )}

          {hasAccess('/tools/option-check') && (
            <NavLink
              to="/tools/option-check"
              onClick={() => handleMenuClick('/tools/option-check', t('sidebar.optionCheck'))}
              className={({ isActive }) => navClass(isActive, isCollapsed)}
              title={isCollapsed ? t('sidebar.optionCheck') : ''}
            >
              {({ isActive }) => (
                <>
                  <ActiveBar active={isActive} />
                  <ScanSearch className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                  {!isCollapsed && <span>{t('sidebar.optionCheck')}</span>}
                </>
              )}
            </NavLink>
          )}
        </div>
      </nav>

      {/* Footer mark */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-[var(--line)] dark:border-trading-dark-700">
          <p className="text-[10px] tracking-[0.16em] uppercase text-ink-400">PayDay&nbsp;v2.0</p>
        </div>
      )}
    </aside>
  );
};
