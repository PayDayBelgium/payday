import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { mockPortfolios, mockPortfolioSummaries, mockDailyData } from '../../utils/mockData';
import { LoadingOverlay } from '../../components/common/LoadingOverlay';
import { updateUserLastLogin } from '../../utils/userManagement';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { loginAdmin } from '../../store/slices/adminAuthSlice';
import logo from '../../assets/app/logo.png';

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'payday';

const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState(i18n.language);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [loadingSubtitle, setLoadingSubtitle] = useState('');
  const [error, setError] = useState('');

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('payday-language', lang);
  };

  const handleLogin = async () => {
    setError('');

    // Check if admin login
    if (username === ADMIN_USERNAME) {
      if (password === ADMIN_PASSWORD) {
        dispatch(loginAdmin(username));
        // Redirect will happen automatically via App.tsx
        window.location.reload();
      } else {
        setError('Invalid password for admin account');
      }
      return;
    }

    // Regular user login
    setIsLoading(true);

    // Check if user already exists
    const existingUserStore = localStorage.getItem(`persist:payday-${username}`);
    const isDemo = username === 'demo'; // Any password works for demo
    const isExistingUser = !!existingUserStore;

    // Set appropriate loading message
    if (isDemo) {
      setLoadingMessage(t('login.loadingDemo'));
      setLoadingSubtitle(t('login.loadingDemoSubtitle'));
    } else if (isExistingUser) {
      setLoadingMessage(t('login.welcomeBack', { username }));
      setLoadingSubtitle(t('login.loadingData'));
    } else {
      setLoadingMessage(t('login.newUser'));
      setLoadingSubtitle(t('login.settingUp'));
    }

    // Save current username to localStorage for store initialization
    localStorage.setItem('payday-current-user', username);

    // Update last login time for user tracking
    updateUserLastLogin(username);

    // Only demo user gets pre-populated with mock data
    if (isDemo) {
      try {
        // Create demo store with mock data directly in localStorage
        const demoStore = {
          auth: JSON.stringify({ isAuthenticated: true, user: 'demo' }),
          portfolios: JSON.stringify({ portfolios: mockPortfolios, summaries: mockPortfolioSummaries, dailyData: mockDailyData }),
          positions: JSON.stringify({ positions: [] }),
          trades: JSON.stringify({ trades: [] }),
          rules: JSON.stringify({ rules: [] }),
        };
        localStorage.setItem('persist:payday-demo', JSON.stringify(demoStore));
      } catch (e) {
        console.error('Failed to create demo store', e);
      }
    } else if (!isExistingUser) {
      // For ALL other new users (including 'stijn'), create empty authenticated store
      try {
        const newUserStore = {
          auth: JSON.stringify({ isAuthenticated: true, user: username }),
          portfolios: JSON.stringify({ portfolios: [], summaries: [], dailyData: [] }),
          positions: JSON.stringify({ positions: [] }),
          trades: JSON.stringify({ trades: [] }),
          rules: JSON.stringify({ rules: [] }),
        };
        localStorage.setItem(`persist:payday-${username}`, JSON.stringify(newUserStore));
      } catch (e) {
        console.error('Failed to create user store', e);
      }
    }

    // Wait at least 3 seconds to show the loading message
    await new Promise(resolve => setTimeout(resolve, 3000));
    window.location.reload();
  };

  return (
    <>
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
          <div className="text-center">
            <img src={logo} alt="PayDay" className="w-20 h-20 mx-auto rounded-lg shadow-md mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('login.title')}</h1>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('login.subtitle')}</p>
          </div>
          <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <div>
              <label htmlFor="username" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('login.username')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('login.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full px-3 py-2 mt-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500 rounded-md p-3">
                <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
              </div>
            )}

            {/* Language Selector - Between password and login button */}
            <div>
              <label htmlFor="language" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('login.language')}
              </label>
              <select
                id="language"
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="w-full px-3 py-2 mt-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="en">English</option>
                <option value="nl">Nederlands</option>
                <option value="fr">Français</option>
              </select>
            </div>

            <div>
              <button
                type="submit"
                className="w-full px-6 py-3 text-base font-semibold text-white btn-primary rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('login.signIn')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && <LoadingOverlay message={loadingMessage} subtitle={loadingSubtitle} />}
    </>
  );
};

export default LoginPage;
