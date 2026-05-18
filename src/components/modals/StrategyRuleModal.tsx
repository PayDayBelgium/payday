import React, { useEffect, useRef } from 'react';
import { X, AlertCircle, Target } from 'lucide-react';
import { useFormData } from '../../hooks/useFormData';
import type { StrategyRule, StrategyType, PortfolioName, StrategyRuleCategory, StrategyRuleTrigger } from '../../types';

interface StrategyRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rule: StrategyRule) => void;
  strategyType: StrategyType;
  portfolio: PortfolioName;
  existingRule?: StrategyRule | null;
  activeCategory?: StrategyRuleCategory;
}

const allTriggerOptions: { value: StrategyRuleTrigger; label: string; category: StrategyRuleCategory; strategies: StrategyType[] }[] = [
  { value: 'price_increase', label: 'Prijs Stijging', category: 'opportunity', strategies: ['stocks-etfs', 'leaps', 'covered-calls', 'csp', 'pmcc', 'spreads', 'kaching'] },
  { value: 'price_decrease', label: 'Prijs Daling', category: 'alert', strategies: ['stocks-etfs', 'leaps', 'covered-calls', 'csp', 'pmcc', 'spreads', 'kaching'] },
  { value: 'profit_target', label: 'Winst Doelstelling', category: 'opportunity', strategies: ['stocks-etfs', 'leaps', 'covered-calls', 'csp', 'pmcc', 'spreads', 'kaching'] },
  { value: 'loss_limit', label: 'Verlies Limiet', category: 'alert', strategies: ['stocks-etfs', 'leaps', 'covered-calls', 'csp', 'pmcc', 'spreads', 'kaching'] },
  { value: 'time_based', label: 'Tijd Gebaseerd', category: 'opportunity', strategies: ['covered-calls', 'csp', 'pmcc', 'spreads'] },
  { value: 'volatility', label: 'Volatiliteit', category: 'opportunity', strategies: ['covered-calls', 'csp', 'pmcc', 'spreads'] },
];

export const StrategyRuleModal: React.FC<StrategyRuleModalProps> = ({
  isOpen,
  onClose,
  onSave,
  strategyType,
  portfolio,
  existingRule,
  activeCategory,
}) => {
  // Filter trigger options based on strategy type only (show all categories)
  const triggerOptions = allTriggerOptions.filter(option => {
    return option.strategies.includes(strategyType);
  });

  const { formData, updateField, updateFields, resetForm, setForm } = useFormData({
    name: '',
    description: '',
    category: 'alert' as StrategyRuleCategory,
    trigger: 'price_increase' as StrategyRuleTrigger,
    percentage: '',
    threshold: '',
    timeframe: '',
    showOnDashboard: true,
    showOnPortfolioOverview: false,
    showInList: true,
    notification: false,
  });

  // Track if we've initialized the form for this modal session
  const lastRuleIdRef = useRef<string | null>(null);

  // Load existing rule data when editing
  useEffect(() => {
    if (!isOpen) {
      // Reset tracking when modal closes
      lastRuleIdRef.current = null;
      return;
    }

    const currentRuleId = existingRule?.id || null;

    // Only update form if the rule changed
    if (currentRuleId !== lastRuleIdRef.current) {
      lastRuleIdRef.current = currentRuleId;

      if (existingRule) {
        setForm({
          name: existingRule.name,
          description: existingRule.description,
          category: existingRule.category,
          trigger: existingRule.trigger,
          percentage: existingRule.parameters.percentage?.toString() || '',
          threshold: existingRule.parameters.threshold?.toString() || '',
          timeframe: existingRule.parameters.timeframe || '',
          showOnDashboard: existingRule.actions.showOnDashboard ?? false,
          showOnPortfolioOverview: existingRule.actions.showOnPortfolioOverview ?? false,
          showInList: existingRule.actions.showInList ?? false,
          notification: existingRule.actions.notification || false,
        });
      } else {
        // Reset to default values for new rule - use first available trigger for this strategy
        const defaultTrigger = triggerOptions[0];
        setForm({
          name: '',
          description: '',
          category: defaultTrigger.category,
          trigger: defaultTrigger.value,
          percentage: '',
          threshold: '',
          timeframe: '',
          showOnDashboard: true,
          showOnPortfolioOverview: false,
          showInList: true,
          notification: false,
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, existingRule, triggerOptions]);

  // Update category when trigger changes
  const handleTriggerChange = (trigger: StrategyRuleTrigger) => {
    const option = triggerOptions.find(opt => opt.value === trigger);
    if (option) {
      updateFields({
        trigger: trigger,
        category: option.category,
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.description) {
      alert('Vul alle verplichte velden in');
      return;
    }

    // Validate percentage for price-based triggers
    if ((formData.trigger === 'price_increase' || formData.trigger === 'price_decrease' ||
         formData.trigger === 'profit_target' || formData.trigger === 'loss_limit') &&
        (!formData.percentage || parseFloat(formData.percentage) <= 0)) {
      alert('Vul een geldig percentage in (groter dan 0)');
      return;
    }

    const rule: StrategyRule = {
      id: existingRule?.id || `rule-${Date.now()}`,
      strategyType,
      portfolio,
      name: formData.name,
      description: formData.description,
      category: formData.category as StrategyRuleCategory,
      trigger: formData.trigger as StrategyRuleTrigger,
      enabled: existingRule?.enabled ?? true,
      parameters: {
        ...(formData.percentage && { percentage: parseFloat(formData.percentage) }),
        ...(formData.threshold && { threshold: parseFloat(formData.threshold) }),
        ...(formData.timeframe && { timeframe: formData.timeframe }),
      },
      actions: {
        showOnDashboard: formData.showOnDashboard as boolean,
        showOnPortfolioOverview: formData.showOnPortfolioOverview as boolean,
        showInList: formData.showInList as boolean,
        notification: formData.notification as boolean,
      },
      createdAt: existingRule?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(rule);
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const isEditing = !!existingRule;
  const selectedTrigger = triggerOptions.find(opt => opt.value === formData.trigger);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEditing ? 'Regel Bewerken' : 'Nieuwe Regel Toevoegen'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Regel Naam <span className="text-negative-600">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Bijv. Aandeel Stijgt 15%"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Beschrijving <span className="text-negative-600">*</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Beschrijf wanneer deze regel moet triggeren"
            />
          </div>

          {/* Trigger Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Trigger Type <span className="text-negative-600">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {triggerOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleTriggerChange(option.value)}
                  className={`flex items-center gap-2 p-3 border-2 rounded-lg transition-all ${
                    formData.trigger === option.value
                      ? option.category === 'alert'
                        ? 'border-caution-500 bg-caution-50 dark:bg-caution-600/15'
                        : 'border-positive-500 bg-positive-50 dark:bg-positive-700/15'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  {option.category === 'alert' ? (
                    <AlertCircle className={`w-5 h-5 ${
                      formData.trigger === option.value
                        ? 'text-caution-600 dark:text-caution-500'
                        : 'text-gray-400'
                    }`} />
                  ) : (
                    <Target className={`w-5 h-5 ${
                      formData.trigger === option.value
                        ? 'text-positive-600 dark:text-positive-500'
                        : 'text-gray-400'
                    }`} />
                  )}
                  <span className={`text-sm font-medium ${
                    formData.trigger === option.value
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Parameters - conditional based on trigger */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Parameters</h3>

            {(formData.trigger === 'price_increase' ||
              formData.trigger === 'price_decrease' ||
              formData.trigger === 'profit_target' ||
              formData.trigger === 'loss_limit') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Percentage <span className="text-negative-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.percentage}
                    onChange={(e) => updateField('percentage', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="10"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-gray-500 dark:text-gray-400 pointer-events-none">%</span>
                </div>
              </div>
            )}

            {formData.trigger === 'volatility' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Drempelwaarde
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.threshold}
                  onChange={(e) => updateField('threshold', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="0,5"
                />
              </div>
            )}

            {formData.trigger === 'time_based' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tijdseenheid
                </label>
                <select
                  value={formData.timeframe}
                  onChange={(e) => updateField('timeframe', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Selecteer tijdseenheid</option>
                  <option value="daily">Dagelijks</option>
                  <option value="weekly">Wekelijks</option>
                  <option value="monthly">Maandelijks</option>
                </select>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Waar tonen?</h3>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showOnDashboard as boolean}
                onChange={(e) => updateField('showOnDashboard', e.target.checked)}
                className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="text-sm text-gray-900 dark:text-white">Dashboard</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showOnPortfolioOverview as boolean}
                onChange={(e) => updateField('showOnPortfolioOverview', e.target.checked)}
                className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="text-sm text-gray-900 dark:text-white">Portfolio Overzicht</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.showInList as boolean}
                onChange={(e) => updateField('showInList', e.target.checked)}
                className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="text-sm text-gray-900 dark:text-white">In Lijst</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notification as boolean}
                onChange={(e) => updateField('notification', e.target.checked)}
                className="w-4 h-4 text-primary-700 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="text-sm text-gray-900 dark:text-white">Notificaties</span>
            </label>
          </div>

          {/* Preview */}
          {formData.name && formData.description && (
            <div className={`border-2 rounded-lg p-4 ${
              selectedTrigger?.category === 'alert'
                ? 'border-caution-500/30 dark:border-caution-600/40 bg-caution-50 dark:bg-caution-600/15'
                : 'border-positive-500/20 dark:border-positive-700/30 bg-positive-50 dark:bg-positive-700/15'
            }`}>
              <div className="flex items-start gap-3">
                {selectedTrigger?.category === 'alert' ? (
                  <AlertCircle className="w-5 h-5 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <Target className="w-5 h-5 text-positive-600 dark:text-positive-500 mt-0.5 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {formData.name}
                  </h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {formData.description}
                  </p>
                  {formData.percentage && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Percentage: {formData.percentage}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.name || !formData.description}
            className="px-4 py-2 bg-primary-700 hover:bg-primary-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isEditing ? 'Regel Bijwerken' : 'Regel Toevoegen'}
          </button>
        </div>
      </div>
    </div>
  );
};
