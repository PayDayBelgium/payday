import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  TrendingUp,
  History,
  BarChart3,
  Calculator,
  Settings,
  FileText,
  Edit3,
  Briefcase,
  ChevronLeft,
  Menu,
  User,
  BookOpen,
  CheckSquare,
  Banknote,
  Receipt,
  LineChart,
} from 'lucide-react';
import type { PortfolioName } from '../../types';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useNavigation } from '../../contexts/NavigationContext';

interface SidebarProps {
  className?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ className = '', isCollapsed, onToggleCollapse }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { setMenuNavigation } = useNavigation();
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);

  // Handle menu navigation click
  const handleMenuClick = (path: string, title: string) => {
    setMenuNavigation(path, title);
  };

  return (
    <aside
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] ${isCollapsed ? 'w-16' : 'w-64'} bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col transition-all duration-300 ${className}`}
    >
      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto scrollbar-thin ${isCollapsed ? 'p-2' : 'p-4'}`}>
        {/* Dashboard */}
        <NavLink
          to="/"
          end
          onClick={() => handleMenuClick('/', t('sidebar.dashboard'))}
          className={({ isActive }) =>
            `flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3'} py-2.5 rounded-lg mb-1 transition-colors ${
              isActive
                ? 'bg-primary-50 text-gray-900 dark:text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`
          }
          title={isCollapsed ? t('sidebar.dashboard') : ''}
        >
          <LayoutDashboard className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium">{t('sidebar.dashboard')}</span>}
        </NavLink>

        {/* Trading Journal - Hidden for now */}
        {/* <NavLink
          to="/journal"
          onClick={() => handleMenuClick('/journal', 'Trading Journal')}
          className={({ isActive }) =>
            `flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3'} py-2.5 rounded-lg mb-1 transition-colors ${
              isActive
                ? 'bg-primary-50 text-gray-900 dark:text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`
          }
          title={isCollapsed ? 'Trading Journal' : ''}
        >
          <BookOpen className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium">Trading Journal</span>}
        </NavLink> */}

        {/* Todos - Hidden for now */}
        {/* <NavLink
          to="/todos"
          onClick={() => handleMenuClick('/todos', t('sidebar.todos'))}
          className={({ isActive }) =>
            `flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3'} py-2.5 rounded-lg mb-1 transition-colors ${
              isActive
                ? 'bg-primary-50 text-gray-900 dark:text-white'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
            }`
          }
          title={isCollapsed ? t('sidebar.todos') : ''}
        >
          <CheckSquare className="w-5 h-5" />
          {!isCollapsed && <span className="font-medium">{t('sidebar.todos')}</span>}
        </NavLink> */}

        {/* Portfolios Section */}
        <div className="mt-6">
          {!isCollapsed && (
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('sidebar.portfolios')}
            </h3>
          )}

          {/* Portfolio Management */}
          <NavLink
            to="/settings/portfolios"
            onClick={() => handleMenuClick('/settings/portfolios', t('sidebar.managePortfolios'))}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3'} py-2.5 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-primary-50 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`
            }
            title={isCollapsed ? t('sidebar.managePortfolios') : ''}
          >
            <Briefcase className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">{t('sidebar.managePortfolios')}</span>}
          </NavLink>

          {!isCollapsed && portfolios.map((portfolio) => (
            <NavLink
              key={portfolio.id}
              to={`/portfolio/${portfolio.name}`}
              onClick={() => handleMenuClick(`/portfolio/${portfolio.name}`, portfolio.name)}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-gray-900 dark:text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`
              }
            >
              <img
                src={portfolio.logo}
                alt={portfolio.name}
                className="w-6 h-6 rounded object-contain"
              />
              <span className="font-medium">{portfolio.name}</span>
            </NavLink>
          ))}

          {isCollapsed && portfolios.map((portfolio) => (
            <NavLink
              key={portfolio.id}
              to={`/portfolio/${portfolio.name}`}
              className={({ isActive }) =>
                `flex items-center justify-center p-2 py-2.5 rounded-lg mb-2 transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-gray-900 dark:text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`
              }
              title={portfolio.name}
            >
              <img
                src={portfolio.logo}
                alt={portfolio.name}
                className="w-5 h-5 rounded object-contain"
              />
            </NavLink>
          ))}
        </div>

        {/* Analysis Section */}
        <div className="mt-6">
          {!isCollapsed && (
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('sidebar.analysis')}
            </h3>
          )}
          <NavLink
            to="/tickers"
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3'} py-2.5 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-primary-50 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`
            }
            title={isCollapsed ? t('sidebar.tickerOverview') : ''}
          >
            <TrendingUp className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">{t('sidebar.tickerOverview')}</span>}
          </NavLink>

          <NavLink
            to="/tools/pmcc-calculator"
            onClick={() => handleMenuClick('/tools/pmcc-calculator', t('sidebar.pmccCalculator'))}
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3'} py-2.5 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-primary-50 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`
            }
            title={isCollapsed ? t('sidebar.pmccCalculator') : ''}
          >
            <Calculator className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">{t('sidebar.pmccCalculator')}</span>}
          </NavLink>

          <NavLink
            to="/tools/kaching-calculator"
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3'} py-2.5 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-primary-50 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`
            }
            title={isCollapsed ? t('sidebar.kachingCalculator') : ''}
          >
            <Banknote className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">{t('sidebar.kachingCalculator')}</span>}
          </NavLink>

          <NavLink
            to="/tools/income-calculator"
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3'} py-2.5 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-primary-50 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`
            }
            title={isCollapsed ? t('sidebar.incomeCalculator') : ''}
          >
            <BarChart3 className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">{t('sidebar.incomeCalculator')}</span>}
          </NavLink>

          <NavLink
            to="/tools/capital-gains-tax"
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3'} py-2.5 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-primary-50 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`
            }
            title={isCollapsed ? 'Meerwaardebelasting' : ''}
          >
            <Receipt className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">Meerwaardebelasting</span>}
          </NavLink>

          <NavLink
            to="/tools/pnl-simulator"
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3'} py-2.5 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-primary-50 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`
            }
            title={isCollapsed ? 'P&L simulator' : ''}
          >
            <LineChart className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">P&L simulator</span>}
          </NavLink>
        </div>

        {/* Configuration Section */}
        <div className="mt-6">
          {!isCollapsed && (
            <h3 className="px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              Configuratie
            </h3>
          )}
          <NavLink
            to="/settings"
            end
            className={({ isActive }) =>
              `flex items-center ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-3'} py-2.5 rounded-lg mb-1 transition-colors ${
                isActive
                  ? 'bg-primary-50 text-gray-900 dark:text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
              }`
            }
            title={isCollapsed ? 'Instellingen' : ''}
          >
            <Settings className="w-5 h-5" />
            {!isCollapsed && <span className="font-medium">Instellingen</span>}
          </NavLink>
        </div>
      </nav>
    </aside>
  );
};
