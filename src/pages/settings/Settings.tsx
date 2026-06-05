import React, { useState, useEffect } from 'react';
import { User, Wifi, AlertCircle, Sparkles } from 'lucide-react';
import { ConnectivitySettings } from './ConnectivitySettings';
import { AccountSettings } from './AccountSettings';
import { RulesManagement } from './RulesManagement';
import { AISettings } from './AISettings';
import { usePageTitle } from '../../contexts/PageTitleContext';

type TabType = 'account' | 'connectivity' | 'rules' | 'ai';

const TAB_TITLES: Record<TabType, { title: string; description: string }> = {
  account: { title: 'Instellingen - Account', description: 'Beheer je accountgegevens' },
  connectivity: { title: 'Instellingen - Connectivity', description: 'WebSocket verbinding configureren' },
  rules: { title: 'Instellingen - Trading Rules', description: 'Beheer regels voor alerts en opportunities' },
  ai: { title: 'Instellingen - AI-assistent', description: 'AI-assistent configureren' },
};

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const { setPageTitle } = usePageTitle();

  // Update page title when tab changes
  useEffect(() => {
    const { title, description } = TAB_TITLES[activeTab];
    setPageTitle(title, description);
  }, [activeTab, setPageTitle]);

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('account')}
            className={`
              whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
              ${activeTab === 'account'
                ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
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
              ${activeTab === 'connectivity'
                ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
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
              ${activeTab === 'rules'
                ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
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
              ${activeTab === 'ai'
                ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
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
