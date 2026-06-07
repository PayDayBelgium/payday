import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor } from '../events/eventsSlice';
import positionsReducer from '../slices/positionsSlice';
import rulesReducer from '../slices/rulesSlice';
import { createRule, updateRule, deleteRule, toggleRule } from './ruleCommands';
import type { TradingRule } from '../../types';
import type { AppDispatch } from '../index';

// The commit thunk captures positionsBefore from the positions slice, so the
// mini store must include positionsReducer even though these tests don't touch positions.
function makeStore() {
  return configureStore({
    reducer: { events: eventsReducer, positions: positionsReducer, rules: rulesReducer },
  });
}

function makeRule(id: string, overrides: Partial<TradingRule> = {}): TradingRule {
  return {
    id,
    name: 'Warn 2 weeks before expiration',
    type: 'dte-warning',
    enabled: true,
    parameters: { days: 14, severity: 'warning' },
    ...overrides,
  };
}

const TS = '2026-06-07T10:00:00.000Z';
const TS2 = '2026-06-07T11:00:00.000Z';

// Helper: read rules projection from mini store state
function getRules(state: any): TradingRule[] {
  return state.rules.rules;
}

describe('rule commands', () => {
  it('createRule emits TradingRuleCreated and updates the projection', () => {
    const store = makeStore();
    // Mini test store's dispatch lacks the global thunk overload; cast to AppDispatch.
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('alice'));

    const r1 = makeRule('r1', { name: 'My rule' });
    dispatch(createRule(r1, TS));

    const rules = getRules(store.getState());
    // Initial state has 4 default rules; our new one is appended.
    const found = rules.find((r: TradingRule) => r.id === 'r1');
    expect(found).toBeDefined();
    expect(found!.name).toBe('My rule');

    const log = (store.getState() as any).events.log;
    const evt = log.find((e: any) => e.type === 'TradingRuleCreated');
    expect(evt).toBeDefined();
    expect(evt.actor).toBe('alice');
    expect(evt.payload.rule.id).toBe('r1');
  });

  it('toggleRule emits TradingRuleToggled and flips enabled', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    const r1 = makeRule('r1', { enabled: true });
    dispatch(createRule(r1, TS));
    dispatch(toggleRule('r1', TS2));

    const rules = getRules(store.getState());
    const found = rules.find((r: TradingRule) => r.id === 'r1');
    expect(found!.enabled).toBe(false);

    const log = (store.getState() as any).events.log;
    expect(log.find((e: any) => e.type === 'TradingRuleToggled')).toBeDefined();
  });

  it('updateRule emits TradingRuleUpdated and replaces the rule', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    const r1 = makeRule('r1');
    dispatch(createRule(r1, TS));

    const updated = makeRule('r1', { name: 'Renamed', parameters: { days: 7 } });
    dispatch(updateRule(updated, TS2));

    const rules = getRules(store.getState());
    const found = rules.find((r: TradingRule) => r.id === 'r1');
    expect(found!.name).toBe('Renamed');
    expect(found!.parameters.days).toBe(7);

    const log = (store.getState() as any).events.log;
    expect(log.find((e: any) => e.type === 'TradingRuleUpdated')).toBeDefined();
  });

  it('deleteRule emits TradingRuleDeleted and removes the rule', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    const r1 = makeRule('r1');
    dispatch(createRule(r1, TS));
    dispatch(deleteRule('r1', TS2));

    const rules = getRules(store.getState());
    expect(rules.find((r: TradingRule) => r.id === 'r1')).toBeUndefined();

    const log = (store.getState() as any).events.log;
    expect(log.find((e: any) => e.type === 'TradingRuleDeleted')).toBeDefined();
  });

  it('full create → toggle → update → delete flow emits correct event sequence', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    const r1 = makeRule('r1', { name: 'Temp rule' });
    dispatch(createRule(r1, TS));
    dispatch(toggleRule('r1', TS2));
    dispatch(updateRule(makeRule('r1', { name: 'Updated' }), TS2));
    dispatch(deleteRule('r1', TS2));

    const rules = getRules(store.getState());
    expect(rules.find((r: TradingRule) => r.id === 'r1')).toBeUndefined();

    const log = (store.getState() as any).events.log;
    const types = log.map((e: any) => e.type);
    expect(types).toContain('TradingRuleCreated');
    expect(types).toContain('TradingRuleToggled');
    expect(types).toContain('TradingRuleUpdated');
    expect(types).toContain('TradingRuleDeleted');
  });
});
