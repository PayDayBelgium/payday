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
      <div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-sky-fade dark:bg-trading-dark-900">
        {/* Background composition: faint mountain silhouette + grid */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 opacity-[0.35]"
               style={{
                 backgroundImage:
                   'linear-gradient(rgba(11,74,143,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(11,74,143,0.05) 1px, transparent 1px)',
                 backgroundSize: '40px 40px',
               }} />
          <svg className="absolute bottom-0 left-0 right-0 w-full h-1/2" preserveAspectRatio="none" viewBox="0 0 1200 400">
            <polygon points="0,400 350,140 600,260 900,80 1200,200 1200,400" fill="#DCE7F5" opacity="0.7" />
            <polygon points="0,400 200,260 480,180 760,300 1080,180 1200,260 1200,400" fill="#0B4A8F" opacity="0.06" />
          </svg>
        </div>

        <div className="relative w-full max-w-md mx-4">
          {/* Brand mark — single, calm wordmark above the form */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <img src={logo} alt="PayDay" className="w-11 h-11 rounded-md ring-1 ring-[var(--line)] bg-white" />
            <div className="text-left leading-tight">
              <p className="text-lg font-semibold tracking-tight text-ink-900 dark:text-white">PayDay</p>
              <p className="text-[10px] uppercase tracking-[0.18em] text-ink-400 mt-0.5">Trading&nbsp;Workspace</p>
            </div>
          </div>

          <div className="surface-card p-8">
            <div className="mb-6">
              <p className="eyebrow mb-1.5">Sign in</p>
              <h1 className="text-[1.35rem] font-semibold text-ink-900 dark:text-white tracking-tight leading-tight">
                {t('login.title')}
              </h1>
              <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">{t('login.subtitle')}</p>
            </div>
            <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
              <div>
                <label htmlFor="username" className="eyebrow block mb-1.5">
                  {t('login.username')}
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-[var(--line)] rounded-md bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>

              <div>
                <label htmlFor="password" className="eyebrow block mb-1.5">
                  {t('login.password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full px-3.5 py-2.5 text-sm border border-[var(--line)] rounded-md bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && (
                <div className="bg-negative-50 border border-negative-500/40 rounded-md p-3">
                  <p className="text-negative-700 text-xs">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="language" className="eyebrow block mb-1.5">
                  {t('login.language')}
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-[var(--line)] rounded-md bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition"
                >
                  <option value="en">English</option>
                  <option value="nl">Nederlands</option>
                  <option value="fr">Français</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 text-sm font-semibold tracking-tight text-white btn-primary rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                {t('login.signIn')}
              </button>
            </form>
          </div>

          <p className="text-center mt-6 text-[11px] text-ink-400 tracking-[0.12em] uppercase">
            Member-only · Confidential
          </p>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && <LoadingOverlay message={loadingMessage} subtitle={loadingSubtitle} />}
    </>
  );
};

export default LoginPage;
