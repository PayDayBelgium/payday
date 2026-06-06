import React from 'react';
import { TrendingUp, Layers, Zap, RefreshCw, Plus } from 'lucide-react';
import type { CampaignType } from '../../utils/campaignDetector';

type FilterType = CampaignType;

interface CampaignFilterTabsProps {
  /** Actief geselecteerde filter */
  filter: FilterType;
  /** Wijzig de actieve filter */
  onFilterChange: (filter: FilterType) => void;
  /** Aantal campagnes per type */
  campaignCounts: Record<string, number>;
  /** Start nieuw wheel (knop alleen zichtbaar in Wheel-tab) */
  onNewWheel: () => void;
}

export const CampaignFilterTabs: React.FC<CampaignFilterTabsProps> = ({
  filter,
  onFilterChange,
  campaignCounts,
  onNewWheel,
}) => {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
      <nav className="flex -mb-px overflow-x-auto">
        <button
          onClick={() => onFilterChange('covered-call')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            filter === 'covered-call'
              ? 'border-primary-500 text-primary-700 dark:text-primary-300'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Covered Call
          {campaignCounts['covered-call'] > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded text-xs ${
                filter === 'covered-call'
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {campaignCounts['covered-call']}
            </span>
          )}
        </button>
        <button
          onClick={() => onFilterChange('pmcc')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            filter === 'pmcc'
              ? 'border-primary-500 text-primary-700 dark:text-primary-300'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
          }`}
        >
          <Layers className="w-4 h-4" />
          Poor Man's Covered Call
          {campaignCounts['pmcc'] > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded text-xs ${
                filter === 'pmcc'
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {campaignCounts['pmcc']}
            </span>
          )}
        </button>
        <button
          onClick={() => onFilterChange('kaching')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            filter === 'kaching'
              ? 'border-primary-500 text-primary-700 dark:text-primary-300'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
          }`}
        >
          <Zap className="w-4 h-4" />
          KaChing
          {campaignCounts['kaching'] > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded text-xs ${
                filter === 'kaching'
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {campaignCounts['kaching']}
            </span>
          )}
        </button>
        <button
          onClick={() => onFilterChange('wheel')}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
            filter === 'wheel'
              ? 'border-primary-500 text-primary-700 dark:text-primary-300'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
          }`}
        >
          <RefreshCw className="w-4 h-4" />
          Wheel
          {campaignCounts['wheel'] > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded text-xs ${
                filter === 'wheel'
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              {campaignCounts['wheel']}
            </span>
          )}
        </button>
        {/* Start New Wheel Button - only show in Wheel tab */}
        {filter === 'wheel' && (
          <div className="flex-1 flex justify-end items-center pr-4">
            <button
              onClick={onNewWheel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nieuw wheel
            </button>
          </div>
        )}
      </nav>
    </div>
  );
};
