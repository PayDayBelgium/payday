import React, { useState, useEffect, useRef } from 'react';
import { User, LogOut, ChevronLeft, Menu, Globe, Palette, Info, HelpCircle, ArrowLeft, Download, Upload, Bot, AlertCircle, Mountain, Star, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import logo from '../../assets/app/logo.png';
import { WebSocketConnectionStatus } from '../common/WebSocketConnectionStatus';
import { LoadingOverlay } from '../common/LoadingOverlay';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useToast } from '../../contexts/ToastContext';
import { THEMES, applyTheme, getSavedTheme } from '../../constants/themes';
import type { ThemeColor } from '../../constants/themes';
import { useNavigation } from '../../contexts/NavigationContext';
import { createBackup, downloadBackup, parseBackupFile, saveLastBackupTimestamp } from '../../utils/backup';
import { restoreFromBackup } from '../../store/actions/backupActions';
import { RestoreConfirmModal } from '../modals/RestoreConfirmModal';
import { BackupNameModal } from '../modals/BackupNameModal';
import type { BackupData } from '../../utils/backup';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import { selectPositions } from '../../store/slices/positionsSlice';
import { formatNumber } from '../../utils/numberFormat';
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

export const Header: React.FC<HeaderProps> = ({ pageTitle, pageDescription, isSidebarCollapsed, onToggleSidebar, showInfoIcon, onInfoClick, isInfoActive, showWarningIcon, onWarningClick, isWarningActive, titleIcon }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { t, i18n } = useTranslation();
  const { canGoBack, goBack } = useNavigation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAIChatbot, setShowAIChatbot] = useState(false);
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
  const tickers = useAppSelector(selectAllTickers);
  const positions = useAppSelector(selectPositions);
  const userProgress = useAppSelector(selectUserProgress);
  const currentLevelConfig = useAppSelector(selectCurrentLevelConfig);

  // Select specific slices needed for backup instead of entire state
  const portfoliosState = useAppSelector((state) => state.portfolios);
  const positionsState = useAppSelector((state) => state.positions);
  const todosState = useAppSelector((state) => state.todos);
  const alertsState = useAppSelector((state) => state.alerts);
  const journalState = useAppSelector((state) => state.journal);
  const tradesState = useAppSelector((state) => state.trades);
  const rulesState = useAppSelector((state) => state.rules);
  const tickersState = useAppSelector((state) => state.tickers);
  const strategiesState = useAppSelector((state) => state.strategies);

  // Build state object for backup (only when needed)
  const getBackupState = () => ({
    portfolios: portfoliosState,
    positions: positionsState,
    todos: todosState,
    alerts: alertsState,
    journal: journalState,
    trades: tradesState,
    rules: rulesState,
    tickers: tickersState,
    strategies: strategiesState,
  } as any);

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
      const backup = createBackup(getBackupState());
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

  const handleConfirmRestore = () => {
    if (!pendingBackup) return;

    try {
      dispatch(restoreFromBackup(pendingBackup) as any);
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
    await new Promise(resolve => setTimeout(resolve, 300));

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
    } catch (e) {
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
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 z-50 shadow-sm">
      <div className="h-full flex items-center justify-between">
        {/* Logo Section - Fixed width to match sidebar */}
        <div className={`${isSidebarCollapsed ? 'w-16' : 'w-64'} relative flex items-center ${isSidebarCollapsed ? 'justify-center' : 'pl-4'} transition-all duration-300`}>
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-3">
              <img src={logo} alt="PayDay" className="w-10 h-10 rounded-lg shadow-md" />
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">PayDay</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Trading Tracker</p>
              </div>
            </div>
          )}
          {isSidebarCollapsed && (
            <img src={logo} alt="PayDay" className="w-10 h-10 rounded-lg shadow-md" />
          )}
          {/* Collapse/Expand Button */}
          <button
            onClick={onToggleSidebar}
            className="absolute bottom-0 right-1 p-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? <Menu className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
          </button>
        </div>

        {/* Page Title with Back Button */}
        <div className="flex-1 flex items-center border-l border-gray-300 dark:border-slate-600 px-6 gap-3">
          {canGoBack && (
            <button
              onClick={goBack}
              className="flex-shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors group"
              title={t('navigation.goBack')}
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white" />
            </button>
          )}
          {pageTitle && (
            <div className="flex items-center gap-3">
              {titleIcon && (
                <img
                  src={titleIcon}
                  alt={pageTitle}
                  className="w-10 h-10 rounded object-contain flex-shrink-0"
                />
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{pageTitle}</h2>
                {pageDescription && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">{pageDescription}</p>
                )}
              </div>
              {showInfoIcon && onInfoClick && (
                <button
                  onClick={onInfoClick}
                  className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors flex-shrink-0"
                  title={isInfoActive ? "Verberg uitleg" : "Toon uitleg"}
                >
                  <Info className={`w-5 h-5 ${isInfoActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                </button>
              )}
              {showWarningIcon && onWarningClick && (
                <button
                  onClick={onWarningClick}
                  className="p-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-full transition-colors flex-shrink-0"
                  title={isWarningActive ? "Verberg waarschuwing" : "Toon waarschuwing"}
                >
                  <AlertCircle className={`w-5 h-5 ${isWarningActive ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 px-6">
          {/* WebSocket Connection Status */}
          <WebSocketConnectionStatus compact={true} />

          {/* AI Chatbot Button */}
          <button
            onClick={() => setShowAIChatbot(!showAIChatbot)}
            className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 hover:bg-purple-200 dark:hover:bg-purple-800/50 rounded-full flex items-center justify-center transition-colors shadow-md"
            title="AI Assistant"
          >
            <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          </button>

          {/* Help Button */}
          <button
            onClick={() => navigate('/help')}
            className="w-10 h-10 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors shadow-md"
            title="Help Portal"
          >
            <HelpCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 btn-primary rounded-full flex items-center justify-center text-white font-bold text-lg transition-colors shadow-md"
            >
              {(username || 'U')[0].toUpperCase()}
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
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
                        <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
                          {username || 'Trader'}
                        </h3>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Options Trader</p>
                          {/* Credits Badge */}
                          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 rounded-full">
                            <Star className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400">
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
                      currentLevelConfig.slopeColor === 'green' ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10 hover:border-green-300 dark:hover:border-green-700' :
                      currentLevelConfig.slopeColor === 'blue' ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10 hover:border-blue-300 dark:hover:border-blue-700' :
                      currentLevelConfig.slopeColor === 'red' ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10 hover:border-red-300 dark:hover:border-red-700' :
                      'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/10 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${
                          currentLevelConfig.slopeColor === 'green' ? 'bg-green-100 dark:bg-green-900/30' :
                          currentLevelConfig.slopeColor === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30' :
                          currentLevelConfig.slopeColor === 'red' ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-gray-100 dark:bg-gray-700'
                        }`}>
                          {currentLevelConfig.icon}
                        </div>
                        <div className="text-left">
                          <span className={`text-xs font-bold ${
                            currentLevelConfig.slopeColor === 'green' ? 'text-green-700 dark:text-green-400' :
                            currentLevelConfig.slopeColor === 'blue' ? 'text-blue-700 dark:text-blue-400' :
                            currentLevelConfig.slopeColor === 'red' ? 'text-red-700 dark:text-red-400' :
                            'text-gray-700 dark:text-gray-300'
                          }`}>
                            {currentLevelConfig.slopeName}
                          </span>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">
                            {currentLevelConfig.name} niveau
                          </p>
                        </div>
                      </div>
                      <Mountain className={`w-4 h-4 ${
                        currentLevelConfig.slopeColor === 'green' ? 'text-green-400 dark:text-green-500' :
                        currentLevelConfig.slopeColor === 'blue' ? 'text-blue-400 dark:text-blue-500' :
                        currentLevelConfig.slopeColor === 'red' ? 'text-red-400 dark:text-red-500' :
                        'text-gray-400 dark:text-gray-500'
                      }`} />
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
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-md bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Settings className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Instellingen</span>
                    </button>

                    {/* Help Cards Toggle */}
                    <button
                      onClick={handleToggleExtraInfo}
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-md bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Info className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200">Help</span>
                        <div className={`w-7 h-3.5 rounded-full transition-colors ${showExtraInfo ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'} relative`}>
                          <div className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-transform ${showExtraInfo ? 'translate-x-3.5' : ''}`} />
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-gray-200 dark:via-gray-700 to-transparent" />

                {/* Preferences Section */}
                <div className="p-3 space-y-2">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                    Voorkeuren
                  </p>

                  {/* Language */}
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                    <div className="w-7 h-7 rounded-md bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center">
                      <Globe className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{t('header.language')}</span>
                      <select
                        value={i18n.language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="w-full px-0 py-0 text-xs font-medium bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-0 cursor-pointer"
                      >
                        <option value="en">English</option>
                        <option value="nl">Nederlands</option>
                        <option value="fr">Français</option>
                      </select>
                    </div>
                  </div>

                  {/* Theme */}
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-gray-50 dark:bg-slate-700/50">
                    <div className="w-7 h-7 rounded-md bg-white dark:bg-slate-600 shadow-sm flex items-center justify-center">
                      <Palette className="w-3.5 h-3.5 text-gray-600 dark:text-gray-300" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">{t('header.theme')}</span>
                      <select
                        value={currentTheme}
                        onChange={(e) => handleThemeChange(e.target.value as ThemeColor)}
                        className="w-full px-0 py-0 text-xs font-medium bg-transparent border-none text-gray-900 dark:text-white focus:outline-none focus:ring-0 cursor-pointer"
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
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1">
                    Data
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={handleBackupData}
                      className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
                    >
                      <Download className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white">Backup</span>
                    </button>
                    <button
                      onClick={handleRestoreData}
                      className="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
                    >
                      <Upload className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white">Restore</span>
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
                    className="w-full flex items-center justify-center gap-1.5 p-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors group"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500 dark:text-red-400 group-hover:text-red-600 dark:group-hover:text-red-300" />
                    <span className="text-xs font-semibold text-red-600 dark:text-red-400 group-hover:text-red-700 dark:group-hover:text-red-300">
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

      {/* AI Chatbot Modal */}
      {showAIChatbot && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowAIChatbot(false)}>
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col m-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Bot className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    AI Portfolio Assistent
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Gebaseerd op je huidige portfolio data
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAIChatbot(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {/* Info Message */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                        AI Assistent koppeling
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                        Deze AI assistent wordt gekoppeld aan een n8n agent die je portfolio analyseert en
                        persoonlijk advies geeft op basis van je huidige posities, strategie en marktomstandigheden.
                      </p>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          • Realtime analyse van je portefeuille
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          • Strategische aanbevelingen voor je opties
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          • Risico management suggesties
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          • Belasting optimalisatie tips
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Placeholder for chat interface */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Binnenkort beschikbaar
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    De AI chatbot interface wordt momenteel ontwikkeld en zal binnenkort gekoppeld worden
                    aan een n8n workflow voor intelligente portfolio analyse.
                  </p>
                </div>

                {/* API Endpoint Info (for development) */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-mono text-gray-600 dark:text-gray-400 mb-2">
                    API Endpoint (n8n webhook):
                  </p>
                  <div className="bg-white dark:bg-gray-800 rounded p-2 border border-gray-200 dark:border-gray-700">
                    <code className="text-xs text-purple-600 dark:text-purple-400">
                      POST /api/ai-assistant
                    </code>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Huidige portfolio data wordt automatisch meegestuurd
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowAIChatbot(false)}
                className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
              >
                Sluiten
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
