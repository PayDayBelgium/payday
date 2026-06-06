import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Users, LayoutDashboard, LogOut, Menu, ChevronLeft, User, ArrowLeft } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { logoutAdmin } from '../../store/slices/adminAuthSlice';
import { LoadingOverlay } from '../common/LoadingOverlay';
import { AdminNavigationProvider, useAdminNavigation } from '../../contexts/AdminNavigationContext';
import logo from '../../assets/app/logo.png';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Users', path: '/admin/users', icon: Users },
];

const AdminLayoutContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { canGoBack, goBack, pageTitle, pageDescription } = useAdminNavigation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('admin-sidebarCollapsed');
    return saved === 'true';
  });
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const adminUsername = useAppSelector((state) => state.adminAuth.username);

  useEffect(() => {
    localStorage.setItem('admin-sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowUserMenu(false);

    await new Promise((resolve) => setTimeout(resolve, 300));

    dispatch(logoutAdmin());

    // Clear admin auth from store
    try {
      const rootStore = localStorage.getItem('persist:payday-root');
      if (rootStore) {
        const parsed = JSON.parse(rootStore);
        parsed.adminAuth = JSON.stringify({ isAuthenticated: false, username: null });
        localStorage.setItem('persist:payday-root', JSON.stringify(parsed));
      }
    } catch (e) {
      console.error('Failed to clear admin auth:', e);
    }

    window.location.href = '/';
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <div className="flex min-h-screen bg-surface dark:bg-slate-900">
      {/* Header - Fixed at top */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-b border-surface-line dark:border-slate-700 z-50 shadow-sm">
        <div className="h-full flex items-center justify-between">
          {/* Logo Section - Fixed width to match sidebar */}
          <div
            className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} relative flex items-center ${isSidebarCollapsed ? 'justify-center' : 'pl-4'} transition-all duration-300`}
          >
            {!isSidebarCollapsed && (
              <div className="flex items-center gap-3">
                <img src={logo} alt="PayDay" className="w-10 h-10 rounded-lg shadow-md" />
                <div>
                  <h1 className="text-xl font-bold text-ink-900 dark:text-white">Admin</h1>
                  <p className="text-xs text-ink-500 dark:text-ink-400">Portal</p>
                </div>
              </div>
            )}
            {isSidebarCollapsed && (
              <img src={logo} alt="PayDay" className="w-10 h-10 rounded-lg shadow-md" />
            )}
            {/* Collapse/Expand Button */}
            <button
              onClick={toggleSidebar}
              className="absolute bottom-0 right-1 p-0.5 rounded-full bg-surface-subtle dark:bg-trading-dark-700 text-ink-700 dark:text-ink-300 hover:bg-surface-muted dark:hover:bg-trading-dark-600 transition-colors shadow-sm"
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isSidebarCollapsed ? (
                <Menu className="w-3 h-3" />
              ) : (
                <ChevronLeft className="w-3 h-3" />
              )}
            </button>
          </div>

          {/* Page Title Area with Back Button */}
          <div className="flex-1 flex items-center border-l border-ink-200 dark:border-slate-600 px-6 gap-3">
            {canGoBack && (
              <button
                onClick={goBack}
                className="flex-shrink-0 p-2 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 rounded-lg transition-colors group"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5 text-ink-600 dark:text-ink-400 group-hover:text-ink-900 dark:group-hover:text-white" />
              </button>
            )}
            {pageTitle && (
              <div>
                <h2 className="text-lg font-semibold text-ink-900 dark:text-white">{pageTitle}</h2>
                {pageDescription && (
                  <p className="text-xs text-ink-500 dark:text-ink-400">{pageDescription}</p>
                )}
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3 px-6">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-10 h-10 btn-primary rounded-full flex items-center justify-center text-white font-semibold transition-colors shadow-md"
              >
                <User className="w-5 h-5" />
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-surface-line dark:border-slate-700 overflow-hidden">
                  {/* User Info */}
                  <div className="p-4 border-b border-surface-line dark:border-slate-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 btn-primary rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-ink-900 dark:text-white truncate">
                          {adminUsername || 'Admin'}
                        </p>
                        <p className="text-sm text-ink-500 dark:text-ink-400">Administrator</p>
                      </div>
                    </div>
                  </div>

                  {/* Logout */}
                  <div className="p-3">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 text-negative-600 dark:text-negative-500 hover:bg-negative-50 dark:hover:bg-negative-700/20 rounded-lg transition-colors py-2"
                    >
                      <LogOut className="w-4 h-4 text-negative-600 dark:text-negative-500" />
                      <span className="text-sm font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 bottom-0 z-40 ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        } bg-white dark:bg-slate-800 border-r border-surface-line dark:border-slate-700 transition-all duration-300 overflow-y-auto`}
      >
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center ${isSidebarCollapsed ? 'justify-center px-0 py-2' : 'gap-3 px-4 py-3'} rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-ink-700 dark:text-ink-300 hover:bg-surface-subtle dark:hover:bg-slate-700'
                }`}
                title={isSidebarCollapsed ? item.name : undefined}
              >
                <Icon className={`${isSidebarCollapsed ? 'w-5 h-5' : 'w-5 h-5'} flex-shrink-0`} />
                {!isSidebarCollapsed && <span className="font-medium">{item.name}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'} mt-16 p-6 bg-surface dark:bg-slate-900 transition-all duration-300`}
      >
        <Outlet />
      </main>

      {/* Logout Loading Overlay */}
      {isLoggingOut && <LoadingOverlay message="Logging out..." />}
    </div>
  );
};

export const AdminLayout: React.FC = () => {
  return (
    <AdminNavigationProvider>
      <AdminLayoutContent />
    </AdminNavigationProvider>
  );
};
