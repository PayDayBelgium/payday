import React, { useState } from 'react';
import { Plus, AlertCircle, Target, Trash2 } from 'lucide-react';
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
  strategyType,
  portfolio,
  rules,
  onAddRule,
  onEditRule,
  onDeleteRule,
  onToggleRule,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; rule: StrategyRule | null }>({
    isOpen: false,
    rule: null,
  });

  const getCategoryIcon = (category: string) => {
    return category === 'alert' ? <AlertCircle className="w-5 h-5" /> : <Target className="w-5 h-5" />;
  };

  const getCategoryColor = (category: string) => {
    return category === 'alert'
      ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30'
      : 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
  };

  return (
    <div className="space-y-4">
      {/* Rules List */}
      <div className="space-y-3">
        {rules.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="inline-flex p-3 rounded-full mb-3 bg-blue-100 dark:bg-blue-900/30">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Geen regels
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Voeg regels toe om automatisch waarschuwingen en kansen te ontvangen
            </p>
            <button
              onClick={() => onAddRule()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Eerste regel toevoegen
            </button>
          </div>
        ) : (
          rules.map(rule => (
            <div
              key={rule.id}
              className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-300 dark:hover:border-blue-600 transition-all ${
                !rule.enabled ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-start gap-4 p-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg flex-shrink-0 ${getCategoryColor(rule.category)}`}>
                  {getCategoryIcon(rule.category)}
                </div>

                {/* Content - Clickable area */}
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => onEditRule(rule)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                        {rule.name}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                        {rule.description}
                      </p>
                    </div>
                  </div>

                  {/* Parameters */}
                  {rule.parameters && Object.keys(rule.parameters).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {rule.parameters.percentage && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                          {rule.parameters.percentage}%
                        </span>
                      )}
                      {rule.parameters.threshold && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                          Drempel: {rule.parameters.threshold}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 text-xs text-gray-600 dark:text-gray-400">
                    {rule.actions.showOnDashboard && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded">
                        Dashboard
                      </span>
                    )}
                    {rule.actions.showOnPortfolioOverview && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded">
                        Portfolio Overzicht
                      </span>
                    )}
                    {rule.actions.showInList && (
                      <span className="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded">
                        In Lijst
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
                        ? 'bg-blue-600 dark:bg-blue-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                    title={rule.enabled ? "Deactiveren" : "Activeren"}
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
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                    title="Verwijderen"
                  >
                    <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
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
          title="Regel Verwijderen"
          message={`Weet je zeker dat je de regel "${deleteConfirm.rule?.name}" wilt verwijderen?`}
          confirmText="Verwijderen"
          cancelText="Annuleren"
          variant="danger"
        />
      )}
    </div>
  );
};
