import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Target, Trash2 } from 'lucide-react';
import type { StrategyRule, StrategyType, PortfolioName } from '../../types';
import { ConfirmModal } from '../modals/ConfirmModal';

interface StrategyRulesProps {
  strategyType: StrategyType;
  portfolio: PortfolioName;
  rules: StrategyRule[];
  onAddRule: () => void;
  onEditRule: (rule: StrategyRule) => void;
  onDeleteRule: (ruleId: string) => void;
  onToggleRule: (ruleId: string, enabled: boolean) => void;
}

export const StrategyRules: React.FC<StrategyRulesProps> = ({
  rules,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onToggleRule,
}) => {
  const { t } = useTranslation();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean;
    rule: StrategyRule | null;
  }>({
    isOpen: false,
    rule: null,
  });

  const getCategoryIcon = (category: string) => {
    return category === 'alert' ? (
      <AlertCircle className="w-5 h-5" />
    ) : (
      <Target className="w-5 h-5" />
    );
  };

  const getCategoryColor = (category: string) => {
    return category === 'alert'
      ? 'text-caution-600 dark:text-caution-500 bg-caution-50 dark:bg-caution-600/25'
      : 'text-positive-600 dark:text-positive-500 bg-positive-50 dark:bg-positive-700/25';
  };

  return (
    <div className="space-y-4">
      {/* Rules List */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-12 bg-surface dark:bg-trading-dark-800/50 rounded-lg border border-surface-line dark:border-trading-dark-600">
            <div className="inline-flex p-3 rounded-full mb-3 bg-primary-50 dark:bg-primary-900/30">
              <AlertCircle className="w-5 h-5 text-primary-700 dark:text-primary-300" />
            </div>
            <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
              {t('learnFeat.rulesEmptyTitle')}
            </h3>
            <p className="text-ink-600 dark:text-ink-400 mb-4">{t('learnFeat.rulesEmptyDesc')}</p>
            <button
              onClick={() => onAddRule()}
              className="px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors"
            >
              {t('learnFeat.rulesAddFirst')}
            </button>
          </div>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className={`bg-white dark:bg-trading-dark-800 border border-surface-line dark:border-trading-dark-600 rounded-lg overflow-hidden hover:border-primary-300 dark:hover:border-primary-700 transition-all ${
                !rule.enabled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start gap-4 p-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg flex-shrink-0 ${getCategoryColor(rule.category)}`}>
                  {getCategoryIcon(rule.category)}
                </div>

                {/* Content - Clickable area */}
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEditRule(rule)}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-base font-semibold text-ink-900 dark:text-white">
                        {rule.name}
                      </h4>
                      <p className="text-sm text-ink-600 dark:text-ink-400 mt-0.5">
                        {rule.description}
                      </p>
                    </div>
                  </div>

                  {/* Parameters */}
                  {rule.parameters && Object.keys(rule.parameters).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {rule.parameters.percentage && (
                        <span className="px-2 py-1 bg-surface-subtle dark:bg-trading-dark-700 text-ink-700 dark:text-ink-300 rounded text-xs">
                          {rule.parameters.percentage}%
                        </span>
                      )}
                      {rule.parameters.threshold && (
                        <span className="px-2 py-1 bg-surface-subtle dark:bg-trading-dark-700 text-ink-700 dark:text-ink-300 rounded text-xs">
                          {t('learnFeat.rulesThreshold', { threshold: rule.parameters.threshold })}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 text-xs text-ink-600 dark:text-ink-400">
                    {rule.actions.showOnDashboard && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded">
                        {t('learnFeat.rulesDashboard')}
                      </span>
                    )}
                    {rule.actions.showOnPortfolioOverview && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-surface-subtle dark:bg-trading-dark-700 text-ink-700 dark:text-ink-300 rounded">
                        {t('learnFeat.rulesPortfolioOverview')}
                      </span>
                    )}
                    {rule.actions.showInList && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-positive-50 dark:bg-positive-700/15 text-positive-700 dark:text-positive-500 rounded">
                        {t('learnFeat.rulesInList')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Toggle Switch */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleRule(rule.id, !rule.enabled);
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      rule.enabled
                        ? 'bg-primary-700 dark:bg-primary-500'
                        : 'bg-surface-muted dark:bg-trading-dark-700'
                    }`}
                    title={rule.enabled ? t('learnFeat.rulesDeactivate') : t('learnFeat.rulesActivate')}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        rule.enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm({ isOpen: true, rule });
                    }}
                    className="p-2 hover:bg-negative-50 dark:hover:bg-negative-700/25 rounded transition-colors"
                    title={t('learnFeat.rulesDelete')}
                  >
                    <Trash2 className="w-4 h-4 text-negative-600 dark:text-negative-500" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirm Delete Modal */}
      {deleteConfirm.isOpen && (
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, rule: null })}
          onConfirm={() => {
            if (deleteConfirm.rule) {
              onDeleteRule(deleteConfirm.rule.id);
            }
          }}
          title={t('learnFeat.rulesDeleteTitle')}
          message={t('learnFeat.rulesDeleteMessage', { name: deleteConfirm.rule?.name })}
          confirmText={t('learnFeat.rulesDeleteConfirm')}
          cancelText={t('learnFeat.rulesDeleteCancel')}
          variant="danger"
        />
      )}
    </div>
  );
};
