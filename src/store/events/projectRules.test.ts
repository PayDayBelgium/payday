import { describe, it, expect } from 'vitest';
import { applyRuleEvent } from './projectRules';
import type { TradingRule } from '../../types';
import type { DomainEvent } from './types';

function rule(id: string, overrides: Partial<TradingRule> = {}): TradingRule {
  return {
    id,
    name: 'Warn 2 weeks before expiration',
    type: 'dte-warning',
    enabled: true,
    parameters: { days: 14, severity: 'warning' },
    ...overrides,
  };
}

function event<T extends DomainEvent['type']>(type: T, payload: unknown): DomainEvent {
  return {
    id: 'e',
    seq: 0,
    type,
    payload,
    timestamp: 't',
    actor: 'a',
    schemaVersion: 1,
  } as DomainEvent;
}

describe('applyRuleEvent', () => {
  it('TradingRuleCreated appends the rule', () => {
    const r1 = rule('r1');
    const next = applyRuleEvent([], event('TradingRuleCreated', { rule: r1 }));
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('r1');
  });

  it('TradingRuleUpdated replaces the matching rule by id', () => {
    const initial = [rule('r1'), rule('r2')];
    const updated = rule('r1', { name: 'Updated name', parameters: { days: 7, severity: 'critical' } });
    const next = applyRuleEvent(initial, event('TradingRuleUpdated', { rule: updated }));
    expect(next).toHaveLength(2);
    expect(next[0].name).toBe('Updated name');
    expect(next[1].id).toBe('r2');
  });

  it('TradingRuleDeleted removes the matching rule', () => {
    const initial = [rule('r1'), rule('r2')];
    const next = applyRuleEvent(initial, event('TradingRuleDeleted', { id: 'r1' }));
    expect(next.map((r) => r.id)).toEqual(['r2']);
  });

  it('TradingRuleToggled flips enabled on the matching rule', () => {
    const initial = [rule('r1', { enabled: true }), rule('r2', { enabled: false })];
    const next = applyRuleEvent(initial, event('TradingRuleToggled', { id: 'r1' }));
    expect(next[0].enabled).toBe(false);
    expect(next[1].enabled).toBe(false); // unchanged
  });

  it('TradingRuleToggled flips false→true', () => {
    const initial = [rule('r1', { enabled: false })];
    const next = applyRuleEvent(initial, event('TradingRuleToggled', { id: 'r1' }));
    expect(next[0].enabled).toBe(true);
  });

  it('ignores unrelated event types and returns same reference', () => {
    const initial = [rule('r1')];
    const next = applyRuleEvent(initial, event('PositionOpened', { position: {} }));
    expect(next).toBe(initial);
  });
});
