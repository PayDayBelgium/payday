import { useEffect, useState } from 'react';
import type { StrategyRule, StrategyType } from '../types';
import { getDefaultRulesForStrategy } from '../utils/defaultStrategyRules';

const loadRules = (
  storageKey: string,
  strategyType: StrategyType,
  portfolio: string | undefined,
  migrate?: (rules: StrategyRule[]) => StrategyRule[]
): StrategyRule[] => {
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as StrategyRule[];
      return migrate ? migrate(parsed) : parsed;
    } catch {
      // fall through to defaults on corrupt data
    }
  }
  return getDefaultRulesForStrategy(strategyType, portfolio || '');
};

/**
 * Rules are stored together with the key they were loaded from, so the
 * persist effect can tell "rules belonging to this key changed" apart from
 * "the key changed under existing rules" — regardless of effect ordering.
 */
interface RulesState {
  key: string;
  rules: StrategyRule[];
}

/**
 * Shared strategy-rule management used by every strategy page.
 *
 * Previously each of the ~6 strategy pages duplicated this identical block:
 * lazy localStorage-init, a persist effect, and add/edit/save/delete/toggle
 * handlers (see docs/CODE-REVIEW-2026-06.md P1). This hook is the single source.
 */
export const useStrategyRules = (
  strategyType: StrategyType,
  portfolio: string | undefined,
  // Optional one-time normalisation applied to rules loaded from storage
  // (e.g. StocksETFs corrects rule.category from the trigger type).
  migrate?: (rules: StrategyRule[]) => StrategyRule[]
) => {
  const storageKey = `strategy-rules-${strategyType}-${portfolio}`;

  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<StrategyRule | null>(null);

  const [rulesState, setRulesState] = useState<RulesState>(() => ({
    key: storageKey,
    rules: loadRules(storageKey, strategyType, portfolio, migrate),
  }));

  // React Router does NOT remount the page when only the :portfolio route
  // param changes, so the storage key can change in place. Reload the new
  // portfolio's rules instead of carrying the previous portfolio's state over.
  useEffect(() => {
    if (rulesState.key === storageKey) return;
    setRulesState({
      key: storageKey,
      rules: loadRules(storageKey, strategyType, portfolio, migrate),
    });
  }, [storageKey, rulesState.key, strategyType, portfolio, migrate]);

  // Persist whenever rules change. The key guard prevents rules that belong
  // to a previous portfolio from being written under the new portfolio's key
  // during the render pass where the key has changed but state hasn't yet.
  useEffect(() => {
    if (rulesState.key !== storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(rulesState.rules));
  }, [storageKey, rulesState]);

  const strategyRules = rulesState.rules;
  const setStrategyRules = (updater: (prev: StrategyRule[]) => StrategyRule[]) => {
    setRulesState((prev) => ({ key: prev.key, rules: updater(prev.rules) }));
  };

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
