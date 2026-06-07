import type { TradingRule } from '../../types';
import type {
  DomainEvent,
  TradingRuleCreatedPayload,
  TradingRuleUpdatedPayload,
  TradingRuleDeletedPayload,
  TradingRuleToggledPayload,
} from './types';

/**
 * Pure fold of a single domain event into the trading rules array.
 * Returns the same reference for events this projection does not own,
 * so callers can cheaply detect no-ops.
 */
export function applyRuleEvent(rules: TradingRule[], event: DomainEvent): TradingRule[] {
  switch (event.type) {
    case 'TradingRuleCreated': {
      const { rule } = event.payload as TradingRuleCreatedPayload;
      return [...rules, rule];
    }

    case 'TradingRuleUpdated': {
      const { rule } = event.payload as TradingRuleUpdatedPayload;
      return rules.map((r) => (r.id === rule.id ? rule : r));
    }

    case 'TradingRuleDeleted': {
      const { id } = event.payload as TradingRuleDeletedPayload;
      return rules.filter((r) => r.id !== id);
    }

    case 'TradingRuleToggled': {
      const { id } = event.payload as TradingRuleToggledPayload;
      return rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    }

    default:
      return rules;
  }
}
