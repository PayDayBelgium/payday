import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor } from '../events/eventsSlice';
import positionsReducer from '../slices/positionsSlice';
import strategiesReducer from '../slices/strategiesSlice';
import {
  createStrategy,
  updateStrategy,
  deleteStrategy,
  linkPositionToStrategy,
  unlinkPositionFromStrategy,
  setStrategyPositions,
  clearPortfolioStrategies,
  createStrategyRule,
  updateStrategyRule,
  deleteStrategyRule,
  toggleStrategyRule,
} from './strategyCommands';
import type { TradingStrategy, StrategyRule } from '../../types';
import type { AppDispatch } from '../index';

// The commit thunk captures positionsBefore from the positions slice, so the
// mini store must include positionsReducer even though these tests don't touch positions.
function makeStore() {
  return configureStore({
    reducer: {
      events: eventsReducer,
      positions: positionsReducer,
      strategies: strategiesReducer,
    },
  });
}

function makeStrategy(id: string, overrides: Partial<TradingStrategy> = {}): TradingStrategy {
  return {
    id,
    name: `Strategy ${id}`,
    type: 'covered-call',
    portfolio: 'TestPortfolio',
    positionIds: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeRule(id: string, overrides: Partial<StrategyRule> = {}): StrategyRule {
  return {
    id,
    strategyType: 'stocks-etfs',
    portfolio: 'TestPortfolio',
    name: `Rule ${id}`,
    description: 'Test rule',
    category: 'alert',
    trigger: 'price_increase',
    enabled: true,
    parameters: { threshold: 5 },
    actions: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function getStrategies(state: any): TradingStrategy[] {
  return state.strategies.strategies;
}
function getRules(state: any): StrategyRule[] {
  return state.strategies.strategyRules;
}
function getLog(state: any): any[] {
  return state.events.log;
}

const TS = '2026-06-07T10:00:00.000Z';
const TS2 = '2026-06-07T11:00:00.000Z';
const TS3 = '2026-06-07T12:00:00.000Z';

// --- Strategy command tests ---

describe('strategy commands', () => {
  it('createStrategy emits TradingStrategyCreated and appends strategy', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('alice'));

    const s1 = makeStrategy('s1');
    const s2 = makeStrategy('s2');
    dispatch(createStrategy(s1, TS));
    dispatch(createStrategy(s2, TS2));

    const strategies = getStrategies(store.getState());
    expect(strategies.map((s) => s.id)).toEqual(['s1', 's2']);

    const log = getLog(store.getState());
    const evt = log.find(
      (e: any) => e.type === 'TradingStrategyCreated' && e.payload.strategy.id === 's1'
    );
    expect(evt).toBeDefined();
    expect(evt.actor).toBe('alice');
  });

  it('updateStrategy emits TradingStrategyUpdated and replaces strategy', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createStrategy(makeStrategy('s1'), TS));
    const updated = makeStrategy('s1', { name: 'Renamed', updatedAt: TS2 });
    dispatch(updateStrategy(updated, TS2));

    const strategies = getStrategies(store.getState());
    expect(strategies[0].name).toBe('Renamed');
    expect(strategies[0].updatedAt).toBe(TS2);

    const log = getLog(store.getState());
    expect(log.find((e: any) => e.type === 'TradingStrategyUpdated')).toBeDefined();
  });

  it('deleteStrategy emits TradingStrategyDeleted and removes strategy', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createStrategy(makeStrategy('s1'), TS));
    dispatch(createStrategy(makeStrategy('s2'), TS2));
    dispatch(deleteStrategy('s1', TS3));

    const strategies = getStrategies(store.getState());
    expect(strategies.map((s) => s.id)).toEqual(['s2']);

    const log = getLog(store.getState());
    expect(log.find((e: any) => e.type === 'TradingStrategyDeleted')).toBeDefined();
  });

  it('full create → update → delete strategy flow emits correct event sequence', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createStrategy(makeStrategy('s1'), TS));
    dispatch(updateStrategy(makeStrategy('s1', { name: 'Updated' }), TS2));
    dispatch(deleteStrategy('s1', TS3));

    expect(getStrategies(store.getState())).toHaveLength(0);

    const types = getLog(store.getState()).map((e: any) => e.type);
    expect(types).toContain('TradingStrategyCreated');
    expect(types).toContain('TradingStrategyUpdated');
    expect(types).toContain('TradingStrategyDeleted');
  });
});

// --- Position link command tests ---

describe('position link commands', () => {
  it('linkPositionToStrategy emits PositionLinkedToStrategy and adds positionId', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createStrategy(makeStrategy('s1'), TS));
    dispatch(linkPositionToStrategy('s1', 'p1', TS2));

    const strategies = getStrategies(store.getState());
    expect(strategies[0].positionIds).toContain('p1');
    expect(strategies[0].updatedAt).toBe(TS2);

    const log = getLog(store.getState());
    const evt = log.find((e: any) => e.type === 'PositionLinkedToStrategy');
    expect(evt).toBeDefined();
    expect(evt.payload.strategyId).toBe('s1');
    expect(evt.payload.positionId).toBe('p1');
  });

  it('linkPositionToStrategy is idempotent — no duplicate positionId', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createStrategy(makeStrategy('s1'), TS));
    dispatch(linkPositionToStrategy('s1', 'p1', TS2));
    dispatch(linkPositionToStrategy('s1', 'p1', TS3));

    const strategies = getStrategies(store.getState());
    expect(strategies[0].positionIds).toHaveLength(1);
  });

  it('unlinkPositionFromStrategy emits PositionUnlinkedFromStrategy and removes positionId', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createStrategy(makeStrategy('s1'), TS));
    dispatch(linkPositionToStrategy('s1', 'p1', TS2));
    dispatch(linkPositionToStrategy('s1', 'p2', TS2));
    dispatch(unlinkPositionFromStrategy('s1', 'p1', TS3));

    const strategies = getStrategies(store.getState());
    expect(strategies[0].positionIds).toEqual(['p2']);

    const log = getLog(store.getState());
    expect(log.find((e: any) => e.type === 'PositionUnlinkedFromStrategy')).toBeDefined();
  });

  it('setStrategyPositions emits StrategyPositionsSet and replaces positionIds', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createStrategy(makeStrategy('s1'), TS));
    dispatch(linkPositionToStrategy('s1', 'p1', TS2));
    dispatch(setStrategyPositions('s1', ['p2', 'p3'], TS3));

    const strategies = getStrategies(store.getState());
    expect(strategies[0].positionIds).toEqual(['p2', 'p3']);
    expect(strategies[0].updatedAt).toBe(TS3);

    const log = getLog(store.getState());
    expect(log.find((e: any) => e.type === 'StrategyPositionsSet')).toBeDefined();
  });

  it('clearPortfolioStrategies emits PortfolioStrategiesCleared and removes all strategies for portfolio', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createStrategy(makeStrategy('s1', { portfolio: 'A' }), TS));
    dispatch(createStrategy(makeStrategy('s2', { portfolio: 'B' }), TS2));
    dispatch(createStrategy(makeStrategy('s3', { portfolio: 'A' }), TS2));
    dispatch(clearPortfolioStrategies('A', TS3));

    const strategies = getStrategies(store.getState());
    expect(strategies.map((s) => s.id)).toEqual(['s2']);

    const log = getLog(store.getState());
    const evt = log.find((e: any) => e.type === 'PortfolioStrategiesCleared');
    expect(evt).toBeDefined();
    expect(evt.payload.portfolio).toBe('A');
  });
});

// --- Strategy rule command tests ---

describe('strategy rule commands', () => {
  it('createStrategyRule emits StrategyRuleCreated and appends rule', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('bob'));

    const r1 = makeRule('r1');
    const r2 = makeRule('r2');
    dispatch(createStrategyRule(r1, TS));
    dispatch(createStrategyRule(r2, TS2));

    const rules = getRules(store.getState());
    expect(rules.map((r) => r.id)).toEqual(['r1', 'r2']);

    const log = getLog(store.getState());
    const evt = log.find(
      (e: any) => e.type === 'StrategyRuleCreated' && e.payload.rule.id === 'r1'
    );
    expect(evt).toBeDefined();
    expect(evt.actor).toBe('bob');
  });

  it('updateStrategyRule emits StrategyRuleUpdated and replaces rule', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createStrategyRule(makeRule('r1'), TS));
    const updated = makeRule('r1', { name: 'Updated rule', enabled: false });
    dispatch(updateStrategyRule(updated, TS2));

    const rules = getRules(store.getState());
    expect(rules[0].name).toBe('Updated rule');
    expect(rules[0].enabled).toBe(false);

    const log = getLog(store.getState());
    expect(log.find((e: any) => e.type === 'StrategyRuleUpdated')).toBeDefined();
  });

  it('deleteStrategyRule emits StrategyRuleDeleted and removes rule', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createStrategyRule(makeRule('r1'), TS));
    dispatch(createStrategyRule(makeRule('r2'), TS2));
    dispatch(deleteStrategyRule('r1', TS3));

    const rules = getRules(store.getState());
    expect(rules.map((r) => r.id)).toEqual(['r2']);

    const log = getLog(store.getState());
    expect(log.find((e: any) => e.type === 'StrategyRuleDeleted')).toBeDefined();
  });

  it('toggleStrategyRule emits StrategyRuleToggled and flips enabled flag', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createStrategyRule(makeRule('r1', { enabled: true }), TS));
    dispatch(toggleStrategyRule('r1', TS2));

    const rules = getRules(store.getState());
    expect(rules[0].enabled).toBe(false);

    const log = getLog(store.getState());
    const evt = log.find((e: any) => e.type === 'StrategyRuleToggled');
    expect(evt).toBeDefined();
    expect(evt.payload.id).toBe('r1');
  });

  it('full create → update → toggle → delete rule flow emits correct event sequence', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createStrategyRule(makeRule('r1'), TS));
    dispatch(updateStrategyRule(makeRule('r1', { name: 'Edited' }), TS2));
    dispatch(toggleStrategyRule('r1', TS2));
    dispatch(deleteStrategyRule('r1', TS3));

    expect(getRules(store.getState())).toHaveLength(0);

    const types = getLog(store.getState()).map((e: any) => e.type);
    expect(types).toContain('StrategyRuleCreated');
    expect(types).toContain('StrategyRuleUpdated');
    expect(types).toContain('StrategyRuleToggled');
    expect(types).toContain('StrategyRuleDeleted');
  });
});
