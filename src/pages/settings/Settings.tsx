import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Wifi, AlertCircle, Sparkles } from 'lucide-react';
import { ConnectivitySettings } from './ConnectivitySettings';
import { AccountSettings } from './AccountSettings';
import { RulesManagement } from './RulesManagement';
import { AISettings } from './AISettings';
import { usePageTitle } from '../../contexts/PageTitleContext';

type TabType = 'account' | 'connectivity' | 'rules' | 'ai';

const TAB_TITLE_KEYS: Record<TabType, { title: string; description: string }> = {
  account: { title: 'pagesA.settings.tabAccountTitle', description: 'pagesA.settings.tabAccountDesc' },
  connectivity: {
    title: 'pagesA.settings.tabConnectivityTitle',
    description: 'pagesA.settings.tabConnectivityDesc',
  },
  rules: {
    title: 'pagesA.settings.tabRulesTitle',
    description: 'pagesA.settings.tabRulesDesc',
  },
  ai: { title: 'pagesA.settings.tabAiTitle', description: 'pagesA.settings.tabAiDesc' },
};

export const Settings: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const { setPageTitle } = usePageTitle();

  // Update page title when tab changes
  useEffect(() => {
    const { title, description } = TAB_TITLE_KEYS[activeTab];
    setPageTitle(t(title), t(description));
  }, [activeTab, setPageTitle, t]);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="border-b border-surface-line dark:border-trading-dark-600">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('account')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${
                activeTab === 'account'
                  ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                  : 'border-transparent text-ink-500 hover:text-ink-700 hover:border-ink-200 dark:text-ink-400 dark:hover:text-ink-300'
              }
            `}
          >
            <User className="w-4 h-4" />
            Account
          </button>
          <button
            onClick={() => setActiveTab('connectivity')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${
                activeTab === 'connectivity'
                  ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                  : 'border-transparent text-ink-500 hover:text-ink-700 hover:border-ink-200 dark:text-ink-400 dark:hover:text-ink-300'
              }
            `}
          >
            <Wifi className="w-4 h-4" />
            Connectivity
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${
                activeTab === 'rules'
                  ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                  : 'border-transparent text-ink-500 hover:text-ink-700 hover:border-ink-200 dark:text-ink-400 dark:hover:text-ink-300'
              }
            `}
          >
            <AlertCircle className="w-4 h-4" />
            Trading Rules
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${
                activeTab === 'ai'
                  ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                  : 'border-transparent text-ink-500 hover:text-ink-700 hover:border-ink-200 dark:text-ink-400 dark:hover:text-ink-300'
              }
            `}
          >
            <Sparkles className="w-4 h-4" />
            AI
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-4">
        {activeTab === 'account' && <AccountSettings />}
        {activeTab === 'connectivity' && <ConnectivitySettings />}
        {activeTab === 'rules' && <RulesManagement />}
        {activeTab === 'ai' && <AISettings />}
      </div>
    </div>
  );
};
