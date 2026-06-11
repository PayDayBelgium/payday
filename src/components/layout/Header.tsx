import React, { useState, useEffect, useRef } from 'react';
import {
  LogOut,
  ChevronLeft,
  Menu,
  Globe,
  Palette,
  Info,
  HelpCircle,
  ArrowLeft,
  Download,
  Upload,
  AlertCircle,
  Mountain,
  Star,
  Settings,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/app/logo.png';
import { WebSocketConnectionStatus } from '../common/WebSocketConnectionStatus';
import { LoadingOverlay } from '../common/LoadingOverlay';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useStore } from 'react-redux';
import { useToast } from '../../contexts/ToastContext';
import { THEMES, applyTheme, getSavedTheme } from '../../constants/themes';
import type { ThemeColor } from '../../constants/themes';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  createBackup,
  downloadBackup,
  parseBackupFile,
  saveLastBackupTimestamp,
} from '../../utils/backup';
import type { RootState } from '../../store';
import { restoreFromBackup } from '../../store/actions/backupActions';
import { RestoreConfirmModal } from '../modals/RestoreConfirmModal';
import { BackupNameModal } from '../modals/BackupNameModal';
import type { BackupData } from '../../utils/backup';
import { selectUserProgress, selectCurrentLevelConfig } from '../../store/slices/userProgressSlice';

interface HeaderProps {
  pageTitle?: string;
  pageDescription?: string;
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  showInfoIcon?: boolean;
  onInfoClick?: () => void;
  isInfoActive?: boolean;
  showWarningIcon?: boolean;
  onWarningClick?: () => void;
  isWarningActive?: boolean;
  titleIcon?: string;
}

export const Header: React.FC<HeaderProps> = ({
  pageTitle,
  pageDescription,
  isSidebarCollapsed,
  onToggleSidebar,
  showInfoIcon,
  onInfoClick,
  isInfoActive,
  showWarningIcon,
  onWarningClick,
  isWarningActive,
  titleIcon,
}) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const { canGoBack, goBack } = useNavigation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ThemeColor>(getSavedTheme());
  const [showExtraInfo, setShowExtraInfo] = useState(() => {
    const saved = localStorage.getItem('show-extra-info');
    return saved !== 'false'; // Default to true
  });
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showBackupNameModal, setShowBackupNameModal] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<BackupData | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const username = useAppSelector((state) => state.auth.user);
  const userProgress = useAppSelector(selectUserProgress);
  const currentLevelConfig = useAppSelector(selectCurrentLevelConfig);

  // Read the backup snapshot lazily via the store. Subscribing to all slices
  // with useAppSelector would re-render the always-mounted Header on every data
  // mutation (incl. every price tick); we only need this data on a backup click.
  const store = useStore();

  const handleThemeChange = (theme: ThemeColor) => {
    setCurrentTheme(theme);
    applyTheme(theme);
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('payday-language', lang);
  };

  const handleToggleExtraInfo = () => {
    const newValue = !showExtraInfo;
    setShowExtraInfo(newValue);
    localStorage.setItem('show-extra-info', String(newValue));
    // Also update individual strategy info preferences
    localStorage.setItem('kaching-show-info', String(newValue));
    localStorage.setItem('pmcc-show-info', String(newValue));
    // Reload to apply changes
    window.location.reload();
  };

  const handleBackupData = () => {
    setShowUserMenu(false);
    setShowBackupNameModal(true);
  };

  const handleBackupConfirm = (filename: string) => {
    try {
      const backup = createBackup(store.getState() as RootState);
      downloadBackup(backup, filename);
      saveLastBackupTimestamp();
      setShowBackupNameModal(false);

      // Dispatch custom event to notify BackupWarning component
      window.dispatchEvent(new Event('backup-created'));

      // Show success toast
      toast.success('Backup created successfully!');
    } catch (error) {
      toast.error('Failed to create backup: ' + (error as Error).message);
      setShowBackupNameModal(false);
    }
  };

  const handleRestoreData = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const backup = await parseBackupFile(file);

      // Store backup and show modal
      setPendingBackup(backup);
      setShowRestoreModal(true);
      setShowUserMenu(false);
    } catch (error) {
      toast.error('Failed to read backup file: ' + (error as Error).message);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleConfirmRestore = async () => {
    if (!pendingBackup) return;

    try {
      await dispatch(restoreFromBackup(pendingBackup) as any);
      setShowRestoreModal(false);
      setPendingBackup(null);

      // Show success toast
      toast.success('Backup hersteld! Naar dashboard...');

      // Navigate to dashboard to apply changes
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      toast.error('Failed to restore backup: ' + (error as Error).message);
      setShowRestoreModal(false);
      setPendingBackup(null);
    }
  };

  const handleCancelRestore = () => {
    setShowRestoreModal(false);
    setPendingBackup(null);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowUserMenu(false);

    // Wait a moment to show the loading message
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Clear the current user key
    localStorage.removeItem('payday-current-user');

    // Also clear the auth state from payday-root store
    try {
      const rootStore = localStorage.getItem('persist:payday-root');
      if (rootStore) {
        const parsed = JSON.parse(rootStore);
        // Clear auth state
        parsed.auth = JSON.stringify({ isAuthenticated: false, user: null });
        localStorage.setItem('persist:payday-root', JSON.stringify(parsed));
      }
    } catch {
      // If there's an error, just remove the whole store
      localStorage.removeItem('persist:payday-root');
    }

    // Navigate to root and reload to show login page
    window.location.href = '/';
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
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-trading-dark-800 border-b border-[var(--line)] dark:border-trading-dark-700 z-50">
      <div className="h-full flex items-center justify-between">
        {/* Logo Section - Fixed width to match sidebar */}
        <div
          className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} relative flex items-center ${isSidebarCollapsed ? 'justify-center' : 'pl-5'} transition-all duration-300`}
        >
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3">
              <img
                src={logo}
                alt="PayDay"
                className="w-9 h-9 rounded-md ring-1 ring-[var(--line)]"
              />
              <div className="leading-tight">
                <h1 className="text-xl font-semibold text-ink-900 dark:text-white tracking-tight">
                  PayDay
                </h1>
                <p className="text-[10px] uppercase tracking-[0.16em] text-ink-400 -mt-0.5">
                  Stock management
                </p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <img src={logo} alt="PayDay" className="w-9 h-9 rounded-md ring-1 ring-[var(--line)]" />
          )}
          {/* Collapse/Expand Button */}
          <button
            onClick={onToggleSidebar}
            className="absolute bottom-1 right-1 p-0.5 rounded-full bg-white border border-[var(--line)] text-ink-500 hover:text-ink-900 hover:border-primary-300 transition-colors"
            title={isSidebarCollapsed ? t('header.expandSidebar') : t('header.collapseSidebar')}
          >
            {isSidebarCollapsed ? (
              <Menu className="w-3 h-3" />
            ) : (
              <ChevronLeft className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Page Title with Back Button */}
        <div className="flex-1 flex items-center border-l border-[var(--line)] dark:border-trading-dark-600 px-6 gap-3">
          {canGoBack && (
            <button
              onClick={goBack}
              className="flex-shrink-0 p-2 hover:bg-surface-subtle rounded-md transition-colors group"
              title={t('navigation.goBack')}
            >
              <ArrowLeft
                className="w-4 h-4 text-ink-500 group-hover:text-ink-900"
                strokeWidth={1.75}
              />
            </button>
          )}
          {pageTitle && (
            <div className="flex items-center gap-3">
              {titleIcon && (
                <img
                  src={titleIcon}
                  alt={pageTitle}
                  className="w-9 h-9 rounded-md object-contain flex-shrink-0 ring-1 ring-[var(--line)] bg-white"
                />
              )}
              <div className="leading-tight">
                <h2 className="text-base font-semibold text-ink-900 dark:text-white tracking-tight">
                  {pageTitle}
                </h2>
                {pageDescription && (
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{pageDescription}</p>
                )}
              </div>
              {showInfoIcon && onInfoClick && (
                <button
                  onClick={onInfoClick}
                  className="p-1.5 hover:bg-primary-50 rounded-md transition-colors flex-shrink-0"
                  title={isInfoActive ? t('header.hideExplanation') : t('header.showExplanation')}
                >
                  <Info
                    className={`w-4 h-4 ${isInfoActive ? 'text-primary-700' : 'text-ink-400'}`}
                    strokeWidth={1.75}
                  />
                </button>
              )}
              {showWarningIcon && onWarningClick && (
                <button
                  onClick={onWarningClick}
                  className="p-1.5 hover:bg-caution-50 rounded-md transition-colors flex-shrink-0"
                  title={isWarningActive ? t('header.hideWarning') : t('header.showWarning')}
                >
                  <AlertCircle
                    className={`w-4 h-4 ${isWarningActive ? 'text-caution-600' : 'text-ink-400'}`}
                    strokeWidth={1.75}
                  />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 px-5">
          {/* WebSocket Connection Status */}
          <WebSocketConnectionStatus compact={true} />

          {/* Help Button */}
          <button
            onClick={() => navigate('/help')}
            className="w-9 h-9 hover:bg-surface-subtle rounded-md flex items-center justify-center transition-colors text-ink-500 hover:text-ink-900"
            title={t('header.helpPortal')}
          >
            <HelpCircle className="w-[18px] h-[18px]" strokeWidth={1.75} />
          </button>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm transition-colors"
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-light) 100%)',
              }}
            >
              {(username || 'U')[0].toUpperCase()}
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-surface-line dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User Profile Header */}
                <div className="relative overflow-hidden">
                  {/* Gradient Background - uses theme color */}
                  <div className="absolute inset-0 bg-primary-50" />

                  <div className="relative p-4">
                    <div className="flex items-center gap-3">
                      {/* Avatar - simple, uses theme color */}
                      <div className="w-11 h-11 rounded-full btn-primary flex items-center justify-center">
                        <span className="text-xl font-bold text-white">
                          {(username || 'U')[0].toUpperCase()}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-ink-900 dark:text-white truncate">
                          {username || 'Trader'}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-ink-500 dark:text-ink-400">
                            {t('header.optionsTrader')}
                          </p>
                          {/* Credits Badge */}
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-caution-50 dark:bg-caution-600/25 rounded-full">
                            <Star className="w-2.5 h-2.5 text-caution-600 dark:text-caution-500" />
                            <span className="text-[10px] font-semibold text-caution-600 dark:text-caution-500">
                              {userProgress.credits}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Level Progress Card */}
                <div className="px-4 pb-3 pt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      navigate('/mission');
                    }}
                    className={`w-full p-2.5 rounded-xl border transition-all hover:shadow-sm ${
                      currentLevelConfig.slopeColor === 'green'
                        ? 'border-positive-500/20 dark:border-positive-700/30 bg-positive-50/50 dark:bg-positive-700/10 hover:border-positive-500/30 dark:hover:border-positive-700'
                        : currentLevelConfig.slopeColor === 'blue'
                          ? 'border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-900/15 hover:border-primary-300 dark:hover:border-primary-700'
                          : currentLevelConfig.slopeColor === 'red'
                            ? 'border-negative-500/20 dark:border-negative-700/30 bg-negative-50/50 dark:bg-negative-700/10 hover:border-negative-500/30 dark:hover:border-negative-700'
                            : 'border-surface-line dark:border-trading-dark-600 bg-surface/50 dark:bg-trading-dark-900/10 hover:border-ink-200 dark:hover:border-trading-dark-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${
                            currentLevelConfig.slopeColor === 'green'
                              ? 'bg-positive-50 dark:bg-positive-700/25'
                              : currentLevelConfig.slopeColor === 'blue'
                                ? 'bg-primary-50 dark:bg-primary-900/30'
                                : currentLevelConfig.slopeColor === 'red'
                                  ? 'bg-negative-50 dark:bg-negative-700/25'
                                  : 'bg-surface-subtle dark:bg-trading-dark-700'
                          }`}
                        >
                          {currentLevelConfig.icon}
                        </div>
                        <div className="text-left">
                          <span
                            className={`text-xs font-bold ${
                              currentLevelConfig.slopeColor === 'green'
                                ? 'text-positive-700 dark:text-positive-500'
                                : currentLevelConfig.slopeColor === 'blue'
                                  ? 'text-primary-700 dark:text-primary-300'
                                  : currentLevelConfig.slopeColor === 'red'
                                    ? 'text-negative-700 dark:text-negative-500'
                                    : 'text-ink-700 dark:text-ink-300'
                            }`}
                          >
                            {currentLevelConfig.slopeName}
                          </span>
                          <p className="text-[10px] text-ink-500 dark:text-ink-400">
                            {currentLevelConfig.name} niveau
                          </p>
                        </div>
                      </div>
                      <Mountain
                        className={`w-4 h-4 ${
                          currentLevelConfig.slopeColor === 'green'
                            ? 'text-positive-500 dark:text-positive-500'
                            : currentLevelConfig.slopeColor === 'blue'
                              ? 'text-primary-500 dark:text-primary-300'
                              : currentLevelConfig.slopeColor === 'red'
                                ? 'text-negative-500 dark:text-negative-500'
                                : 'text-ink-400 dark:text-ink-500'
                        }`}
                      />
                    </div>
                  </button>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />

                {/* Quick Actions Grid */}
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Settings */}
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        navigate('/settings');
                      }}
                      className="flex items-center gap-2 p-2 rounded-lg bg-surface dark:bg-slate-700/50 hover:bg-surface-subtle dark:hover:bg-slate-700 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-md bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Settings className="w-3.5 h-3.5 text-ink-600 dark:text-ink-300" />
                      </div>
                      <span className="text-xs font-medium text-ink-700 dark:text-ink-200">
                        {t('header.settings')}
                      </span>
                    </button>

                    {/* Help Cards Toggle */}
                    <button
                      onClick={handleToggleExtraInfo}
                      className="flex items-center gap-2 p-2 rounded-lg bg-surface dark:bg-slate-700/50 hover:bg-surface-subtle dark:hover:bg-slate-700 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-md bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Info className="w-3.5 h-3.5 text-ink-600 dark:text-ink-300" />
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-ink-700 dark:text-ink-200">
                          {t('header.help')}
                        </span>
                        <div
                          className={`w-7 h-3.5 rounded-full transition-colors ${showExtraInfo ? 'bg-primary-500' : 'bg-ink-200 dark:bg-trading-dark-600'} relative`}
                        >
                          <div
                            className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform ${showExtraInfo ? 'translate-x-3.5' : ''}`}
                          />
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />

                {/* Preferences Section */}
                <div className="p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-ink-400 dark:text-ink-500 uppercase tracking-wider px-1">
                    {t('header.preferences')}
                  </p>

                  {/* Language */}
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface dark:bg-slate-700/50">
                    <div className="w-7 h-7 rounded-md bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center">
                      <Globe className="w-3.5 h-3.5 text-ink-600 dark:text-ink-300" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-ink-500 dark:text-ink-400">
                        {t('header.language')}
                      </span>
                      <select
                        value={i18n.language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="w-full px-0 py-0 text-xs font-medium bg-transparent border-none text-ink-900 dark:text-white focus:outline-none focus:ring-0 cursor-pointer"
                      >
                        <option value="en">English</option>
                        <option value="nl">Nederlands</option>
                        <option value="fr">Français</option>
                      </select>
                    </div>
                  </div>

                  {/* Theme */}
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface dark:bg-slate-700/50">
                    <div className="w-7 h-7 rounded-md bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center">
                      <Palette className="w-3.5 h-3.5 text-ink-600 dark:text-ink-300" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-ink-500 dark:text-ink-400">
                        {t('header.theme')}
                      </span>
                      <select
                        value={currentTheme}
                        onChange={(e) => handleThemeChange(e.target.value as ThemeColor)}
                        className="w-full px-0 py-0 text-xs font-medium bg-transparent border-none text-ink-900 dark:text-white focus:outline-none focus:ring-0 cursor-pointer"
                      >
                        {Object.values(THEMES).map((theme) => (
                          <option key={theme.id} value={theme.id}>
                            {t(`themes.${theme.id}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />

                {/* Data Section */}
                <div className="p-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-ink-400 dark:text-ink-500 uppercase tracking-wider px-1">
                    {t('header.data')}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={handleBackupData}
                      className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg bg-surface dark:bg-slate-700/50 hover:bg-surface-subtle dark:hover:bg-slate-700 transition-colors group"
                    >
                      <Download className="w-3.5 h-3.5 text-ink-500 dark:text-ink-400 group-hover:text-ink-700 dark:group-hover:text-ink-200" />
                      <span className="text-xs font-medium text-ink-600 dark:text-ink-300 group-hover:text-ink-800 dark:group-hover:text-white">
                        {t('header.backup')}
                      </span>
                    </button>
                    <button
                      onClick={handleRestoreData}
                      className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg bg-surface dark:bg-slate-700/50 hover:bg-surface-subtle dark:hover:bg-slate-700 transition-colors group"
                    >
                      <Upload className="w-3.5 h-3.5 text-ink-500 dark:text-ink-400 group-hover:text-ink-700 dark:group-hover:text-ink-200" />
                      <span className="text-xs font-medium text-ink-600 dark:text-ink-300 group-hover:text-ink-800 dark:group-hover:text-white">
                        {t('header.restore')}
                      </span>
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".payday,.json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* Logout */}
                <div className="p-3 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-1.5 p-2 bg-negative-50 dark:bg-negative-700/15 hover:bg-negative-50 dark:hover:bg-negative-700/25 rounded-lg transition-colors group"
                  >
                    <LogOut className="w-3.5 h-3.5 text-negative-600 dark:text-negative-500 group-hover:text-negative-600 dark:group-hover:text-negative-500" />
                    <span className="text-xs font-semibold text-negative-600 dark:text-negative-500 group-hover:text-negative-700 dark:group-hover:text-negative-500">
                      {t('header.logout')}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logout Loading Overlay */}
      {isLoggingOut && <LoadingOverlay message={t('header.loggingOut')} />}

      {/* Backup Name Modal */}
      <BackupNameModal
        isOpen={showBackupNameModal}
        onClose={() => setShowBackupNameModal(false)}
        onConfirm={handleBackupConfirm}
        defaultFilename={`payday-backup-${new Date().toISOString().split('T')[0]}`}
      />

      {/* Restore Confirmation Modal */}
      <RestoreConfirmModal
        isOpen={showRestoreModal}
        onClose={handleCancelRestore}
        onConfirm={handleConfirmRestore}
        timestamp={pendingBackup?.timestamp || ''}
      />
    </header>
  );
};
