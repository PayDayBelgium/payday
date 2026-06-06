import { useEffect, useState } from 'react';
import type { StrategyRule, StrategyType } from '../types';
import { getDefaultRulesForStrategy } from '../utils/defaultStrategyRules';

/**
 * Shared strategy-rule management used by every strategy page.
 *
 * Previously each of the ~6 strategy pages duplicated this identical block:
 * lazy localStorage-init, a persist effect, and add/edit/save/delete/toggle
 * handlers (see docs/CODE-REVIEW-2026-06.md P1). This hook is the single source.
 */
export const useStrategyRules = (strategyType: StrategyType, portfolio: string | undefined) => {
  const storageKey = `strategy-rules-${strategyType}-${portfolio}`;

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<StrategyRule | null>(null);

  const [strategyRules, setStrategyRules] = useState<StrategyRule[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved) as StrategyRule[];
      } catch {
        // fall through to defaults on corrupt data
      }
    }
    return getDefaultRulesForStrategy(strategyType, portfolio || '');
  });

  // Persist whenever rules change.
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(strategyRules));
  }, [storageKey, strategyRules]);

  const openAddRule = () => {
    setSelectedRule(null);
    setIsRuleModalOpen(true);
  };

  const openEditRule = (rule: StrategyRule) => {
    setSelectedRule(rule);
    setIsRuleModalOpen(true);
  };

  const closeRuleModal = () => {
    setIsRuleModalOpen(false);
    setSelectedRule(null);
  };

  const saveRule = (rule: StrategyRule) => {
    setStrategyRules((prev) =>
      selectedRule ? prev.map((r) => (r.id === rule.id ? rule : r)) : [...prev, rule]
    );
    closeRuleModal();
  };

  const deleteRule = (ruleId: string) => {
    setStrategyRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const toggleRule = (ruleId: string, enabled: boolean) => {
    setStrategyRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, enabled } : r)));
  };

  return {
    strategyRules,
    isRuleModalOpen,
    selectedRule,
    openAddRule,
    openEditRule,
    closeRuleModal,
    saveRule,
    deleteRule,
    toggleRule,
  };
};
