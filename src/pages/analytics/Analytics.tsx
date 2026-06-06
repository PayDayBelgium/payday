import React, { useEffect, useState } from 'react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { BarChart3, TrendingUp, DollarSign, PieChart } from 'lucide-react';
import { CashOnderpandAnalysis } from '../../components/analytics/CashOnderpandAnalysis';
import { PerformanceAnalysis } from '../../components/analytics/PerformanceAnalysis';

type AnalyticsTab = 'cash-onderpand' | 'performance' | 'allocation' | 'risk';

export const Analytics: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('performance');

  useEffect(() => {
    setPageTitle('Analyses', 'Geavanceerde portfolio analyses en inzichten');
  }, [setPageTitle]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-surface-line dark:border-trading-dark-600">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('cash-onderpand')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'cash-onderpand'
                ? 'text-primary-700 dark:text-primary-300 border-b-2 border-primary-700 dark:border-primary-400'
                : 'text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Cash & Onderpand
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'performance'
                ? 'text-primary-700 dark:text-primary-300 border-b-2 border-primary-700 dark:border-primary-400'
                : 'text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Performance
          </button>
          <button
            onClick={() => setActiveTab('allocation')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'allocation'
                ? 'text-primary-700 dark:text-primary-300 border-b-2 border-primary-700 dark:border-primary-400'
                : 'text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white'
            }`}
          >
            <PieChart className="w-4 h-4" />
            Allocatie
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'risk'
                ? 'text-primary-700 dark:text-primary-300 border-b-2 border-primary-700 dark:border-primary-400'
                : 'text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Risico Analyse
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'cash-onderpand' && <CashOnderpandAnalysis />}

      {activeTab === 'performance' && <PerformanceAnalysis />}

      {activeTab === 'allocation' && (
        <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-12 text-center">
          <PieChart className="w-16 h-16 text-ink-300 dark:text-ink-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
            Allocatie Analyse
          </h3>
          <p className="text-ink-600 dark:text-ink-400">
            Binnenkort beschikbaar: portfolio allocatie per strategie, ticker, en sector
          </p>
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-12 text-center">
          <BarChart3 className="w-16 h-16 text-ink-300 dark:text-ink-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
            Risico Analyse
          </h3>
          <p className="text-ink-600 dark:text-ink-400">
            Binnenkort beschikbaar: risico metrics, concentratie analysis, en stress testing
          </p>
        </div>
      )}
    </div>
  );
};
