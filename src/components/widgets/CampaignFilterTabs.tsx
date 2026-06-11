import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, Layers, Zap, RefreshCw, Plus } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectUnlockedLevels, isFeatureAvailable } from '../../store/slices/userProgressSlice';
import { getCampaignTypeRequiredFeature } from '../../utils/opportunityGating';
import type { CampaignType } from '../../utils/campaignDetector';

type FilterType = CampaignType;

interface CampaignFilterTabsProps {
  /** Currently selected filter */
  filter: FilterType;
  /** Change the active filter */
  onFilterChange: (filter: FilterType) => void;
  /** Number of campaigns per type */
  campaignCounts: Record<string, number>;
  /** Start a new wheel (button only visible in the Wheel tab) */
  onNewWheel: () => void;
}

export const CampaignFilterTabs: React.FC<CampaignFilterTabsProps> = ({
  filter,
  onFilterChange,
  campaignCounts,
  onNewWheel,
}) => {
  const { t } = useTranslation();
  const unlockedLevels = useAppSelector(selectUnlockedLevels);

  // Level gating: a tab for a not-yet-unlocked strategy is hidden — unless
  // campaigns of that type exist. Existing positions are always displayed
  // (the user owns them; hiding their risk would violate the alert rule),
  // but the advice/creation surfaces inside stay gated.
  const canUse = (type: CampaignType): boolean =>
    isFeatureAvailable(getCampaignTypeRequiredFeature(type), unlockedLevels);
  const showTab = (type: CampaignType): boolean => canUse(type) || (campaignCounts[type] ?? 0) > 0;

  return (
    <div className="border-b border-surface-line dark:border-trading-dark-600 flex-shrink-0">
      <nav className="flex -mb-px overflow-x-auto">
        {showTab('covered-call') && (
          <button
            onClick={() => onFilterChange('covered-call')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              filter === 'covered-call'
                ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300 hover:border-ink-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Covered Call
            {campaignCounts['covered-call'] > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${
                  filter === 'covered-call'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-surface-subtle dark:bg-trading-dark-700 text-ink-600 dark:text-ink-400'
                }`}
              >
                {campaignCounts['covered-call']}
              </span>
            )}
          </button>
        )}
        {showTab('pmcc') && (
          <button
            onClick={() => onFilterChange('pmcc')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              filter === 'pmcc'
                ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300 hover:border-ink-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Poor Man's Covered Call
            {campaignCounts['pmcc'] > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${
                  filter === 'pmcc'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-surface-subtle dark:bg-trading-dark-700 text-ink-600 dark:text-ink-400'
                }`}
              >
                {campaignCounts['pmcc']}
              </span>
            )}
          </button>
        )}
        {showTab('kaching') && (
          <button
            onClick={() => onFilterChange('kaching')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              filter === 'kaching'
                ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300 hover:border-ink-200'
            }`}
          >
            <Zap className="w-4 h-4" />
            KaChing
            {campaignCounts['kaching'] > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${
                  filter === 'kaching'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-surface-subtle dark:bg-trading-dark-700 text-ink-600 dark:text-ink-400'
                }`}
              >
                {campaignCounts['kaching']}
              </span>
            )}
          </button>
        )}
        {showTab('wheel') && (
          <button
            onClick={() => onFilterChange('wheel')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              filter === 'wheel'
                ? 'border-primary-500 text-primary-700 dark:text-primary-300'
                : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300 hover:border-ink-200'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Wheel
            {campaignCounts['wheel'] > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${
                  filter === 'wheel'
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-surface-subtle dark:bg-trading-dark-700 text-ink-600 dark:text-ink-400'
                }`}
              >
                {campaignCounts['wheel']}
              </span>
            )}
          </button>
        )}
        {/* Start New Wheel Button - only in the Wheel tab, and only once the
            wheel strategy is unlocked (creation is level-gated) */}
        {filter === 'wheel' && canUse('wheel') && (
          <div className="flex-1 flex justify-end items-center pr-4">
            <button
              onClick={onNewWheel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('widgetsA.newWheel')}
            </button>
          </div>
        )}
      </nav>
    </div>
  );
};
