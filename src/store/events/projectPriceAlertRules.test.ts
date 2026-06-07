import { describe, it, expect } from 'vitest';
import { applyPriceAlertRuleEvent } from './projectPriceAlertRules';
import type { PriceAlertRule } from '../../types';
import type { DomainEvent } from './types';

const rule = (id: string): PriceAlertRule => ({ id, isActive: true } as unknown as PriceAlertRule);
const ev = (type: DomainEvent['type'], payload: any): DomainEvent =>
  ({ id: 'e', seq: 0, type, payload, timestamp: 't', actor: 'a', schemaVersion: 1 }) as DomainEvent;

describe('applyPriceAlertRuleEvent', () => {
  it('Created appends', () => {
    expect(applyPriceAlertRuleEvent([], ev('PriceAlertRuleCreated', { rule: rule('r1') })).map((r) => r.id)).toEqual(['r1']);
  });
  it('Updated replaces', () => {
    const s = applyPriceAlertRuleEvent([], ev('PriceAlertRuleCreated', { rule: rule('r1') }));
    const next = applyPriceAlertRuleEvent(s, ev('PriceAlertRuleUpdated', { rule: { ...s[0], isActive: false } }));
    expect(next[0].isActive).toBe(false);
  });
  it('Deleted removes', () => {
    const s = applyPriceAlertRuleEvent([], ev('PriceAlertRuleCreated', { rule: rule('r1') }));
    expect(applyPriceAlertRuleEvent(s, ev('PriceAlertRuleDeleted', { id: 'r1' }))).toEqual([]);
  });
  it('Toggled flips isActive', () => {
    const s = applyPriceAlertRuleEvent([], ev('PriceAlertRuleCreated', { rule: rule('r1') }));
    expect(applyPriceAlertRuleEvent(s, ev('PriceAlertRuleToggled', { id: 'r1' }))[0].isActive).toBe(false);
  });
});
