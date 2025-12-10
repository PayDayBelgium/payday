import React, { useEffect, useState } from 'react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { BarChart3, TrendingUp, DollarSign, PieChart } from 'lucide-react';
import { CashOnderpandAnalysis } from '../../components/analytics/CashOnderpandAnalysis';

type AnalyticsTab = 'cash-onderpand' | 'performance' | 'allocation' | 'risk';

export const Analytics: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('cash-onderpand');

  useEffect(() => {
    setPageTitle('Analyses', 'Geavanceerde portfolio analyses en inzichten');
  }, [setPageTitle]);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('cash-onderpand')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'cash-onderpand'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Cash & Onderpand
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'performance'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Performance
          </button>
          <button
            onClick={() => setActiveTab('allocation')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'allocation'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <PieChart className="w-4 h-4" />
            Allocatie
          </button>
          <button
            onClick={() => setActiveTab('risk')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'risk'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Risico Analyse
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'cash-onderpand' && <CashOnderpandAnalysis />}

      {activeTab === 'performance' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Performance Analyse
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Binnenkort beschikbaar: gedetailleerde performance metrics en grafieken
          </p>
        </div>
      )}

      {activeTab === 'allocation' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <PieChart className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Allocatie Analyse
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Binnenkort beschikbaar: portfolio allocatie per strategie, ticker, en sector
          </p>
        </div>
      )}

      {activeTab === 'risk' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <BarChart3 className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Risico Analyse
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Binnenkort beschikbaar: risico metrics, concentratie analysis, en stress testing
          </p>
        </div>
      )}
    </div>
  );
};
