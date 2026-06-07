import type { PriceAlertRule } from '../../types';
import type {
  DomainEvent,
  PriceAlertRuleCreatedPayload,
  PriceAlertRuleUpdatedPayload,
  PriceAlertRuleDeletedPayload,
  PriceAlertRuleToggledPayload,
} from './types';

/**
 * Pure fold of a single domain event into the price-alert-rules array.
 * Returns the same reference for events this projection does not own,
 * so callers can cheaply detect no-ops.
 */
export function applyPriceAlertRuleEvent(
  rules: PriceAlertRule[],
  event: DomainEvent
): PriceAlertRule[] {
  switch (event.type) {
    case 'PriceAlertRuleCreated': {
      const { rule } = event.payload as PriceAlertRuleCreatedPayload;
      return [...rules, rule];
    }

    case 'PriceAlertRuleUpdated': {
      const { rule } = event.payload as PriceAlertRuleUpdatedPayload;
      return rules.map((r) => (r.id === rule.id ? rule : r));
    }

    case 'PriceAlertRuleDeleted': {
      const { id } = event.payload as PriceAlertRuleDeletedPayload;
      return rules.filter((r) => r.id !== id);
    }

    case 'PriceAlertRuleToggled': {
      const { id } = event.payload as PriceAlertRuleToggledPayload;
      return rules.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r));
    }

    default:
      return rules;
  }
}
