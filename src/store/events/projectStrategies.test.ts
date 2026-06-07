import { describe, it, expect } from 'vitest';
import { applyStrategiesEvent } from './projectStrategies';
import type { StrategiesState } from './projectStrategies';
import type { TradingStrategy, StrategyRule } from '../../types';
import type { DomainEvent } from './types';

// --- Helpers ---

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

function event<T extends DomainEvent['type']>(
  type: T,
  payload: unknown,
  timestamp = 't'
): DomainEvent {
  return {
    id: 'e',
    seq: 0,
    type,
    payload,
    timestamp,
    actor: 'a',
    schemaVersion: 1,
  } as DomainEvent;
}

function empty(): StrategiesState {
  return { strategies: [], strategyRules: [] };
}

// --- Strategy fold tests ---

describe('applyStrategiesEvent — strategies', () => {
  it('TradingStrategyCreated appends strategy to the list', () => {
    const s1 = makeStrategy('s1');
    const s2 = makeStrategy('s2');
    let state = applyStrategiesEvent(empty(), event('TradingStrategyCreated', { strategy: s1 }));
    state = applyStrategiesEvent(state, event('TradingStrategyCreated', { strategy: s2 }));
    expect(state.strategies.map((s) => s.id)).toEqual(['s1', 's2']);
  });

  it('TradingStrategyUpdated replaces the matching strategy', () => {
    const s1 = makeStrategy('s1');
    const initial: StrategiesState = { strategies: [s1, makeStrategy('s2')], strategyRules: [] };
    const updated = makeStrategy('s1', { name: 'Updated name' });
    const next = applyStrategiesEvent(
      initial,
      event('TradingStrategyUpdated', { strategy: updated })
    );
    expect(next.strategies[0].name).toBe('Updated name');
    expect(next.strategies[1].id).toBe('s2'); // unchanged
  });

  it('TradingStrategyUpdated is a no-op for unknown id', () => {
    const initial: StrategiesState = {
      strategies: [makeStrategy('s1')],
      strategyRules: [],
    };
    const next = applyStrategiesEvent(
      initial,
      event('TradingStrategyUpdated', { strategy: makeStrategy('x') })
    );
    expect(next.strategies).toHaveLength(1);
    expect(next.strategies[0].id).toBe('s1');
  });

  it('TradingStrategyDeleted removes the matching strategy', () => {
    const initial: StrategiesState = {
      strategies: [makeStrategy('s1'), makeStrategy('s2')],
      strategyRules: [],
    };
    const next = applyStrategiesEvent(initial, event('TradingStrategyDeleted', { id: 's1' }));
    expect(next.strategies.map((s) => s.id)).toEqual(['s2']);
  });

  it('TradingStrategyDeleted is a no-op for unknown id', () => {
    const initial: StrategiesState = {
      strategies: [makeStrategy('s1')],
      strategyRules: [],
    };
    const next = applyStrategiesEvent(initial, event('TradingStrategyDeleted', { id: 'x' }));
    expect(next.strategies).toHaveLength(1);
  });
});

// --- Position link/unlink fold tests ---

describe('applyStrategiesEvent — position linking', () => {
  it('PositionLinkedToStrategy adds positionId and sets updatedAt', () => {
    const s1 = makeStrategy('s1', { positionIds: [] });
    const initial: StrategiesState = { strategies: [s1], strategyRules: [] };
    const ts = '2026-06-07T10:00:00.000Z';
    const next = applyStrategiesEvent(
      initial,
      event('PositionLinkedToStrategy', { strategyId: 's1', positionId: 'p1' }, ts)
    );
    expect(next.strategies[0].positionIds).toEqual(['p1']);
    expect(next.strategies[0].updatedAt).toBe(ts);
  });

  it('PositionLinkedToStrategy is idempotent (no duplicate)', () => {
    const s1 = makeStrategy('s1', { positionIds: ['p1'] });
    const initial: StrategiesState = { strategies: [s1], strategyRules: [] };
    const next = applyStrategiesEvent(
      initial,
      event('PositionLinkedToStrategy', { strategyId: 's1', positionId: 'p1' })
    );
    expect(next.strategies[0].positionIds).toHaveLength(1);
  });

  it('PositionLinkedToStrategy is a no-op for unknown strategyId', () => {
    const s1 = makeStrategy('s1');
    const initial: StrategiesState = { strategies: [s1], strategyRules: [] };
    const next = applyStrategiesEvent(
      initial,
      event('PositionLinkedToStrategy', { strategyId: 'x', positionId: 'p1' })
    );
    expect(next.strategies[0].positionIds).toHaveLength(0);
  });

  it('PositionUnlinkedFromStrategy removes positionId and sets updatedAt', () => {
    const s1 = makeStrategy('s1', { positionIds: ['p1', 'p2'] });
    const initial: StrategiesState = { strategies: [s1], strategyRules: [] };
    const ts = '2026-06-07T11:00:00.000Z';
    const next = applyStrategiesEvent(
      initial,
      event('PositionUnlinkedFromStrategy', { strategyId: 's1', positionId: 'p1' }, ts)
    );
    expect(next.strategies[0].positionIds).toEqual(['p2']);
    expect(next.strategies[0].updatedAt).toBe(ts);
  });

  it('StrategyPositionsSet replaces positionIds and sets updatedAt', () => {
    const s1 = makeStrategy('s1', { positionIds: ['p1', 'p2'] });
    const initial: StrategiesState = { strategies: [s1], strategyRules: [] };
    const ts = '2026-06-07T12:00:00.000Z';
    const next = applyStrategiesEvent(
      initial,
      event('StrategyPositionsSet', { strategyId: 's1', positionIds: ['p3', 'p4'] }, ts)
    );
    expect(next.strategies[0].positionIds).toEqual(['p3', 'p4']);
    expect(next.strategies[0].updatedAt).toBe(ts);
  });

  it('StrategyPositionsSet can clear positionIds', () => {
    const s1 = makeStrategy('s1', { positionIds: ['p1', 'p2'] });
    const initial: StrategiesState = { strategies: [s1], strategyRules: [] };
    const next = applyStrategiesEvent(
      initial,
      event('StrategyPositionsSet', { strategyId: 's1', positionIds: [] })
    );
    expect(next.strategies[0].positionIds).toEqual([]);
  });

  it('PortfolioStrategiesCleared removes all strategies for the portfolio', () => {
    const initial: StrategiesState = {
      strategies: [
        makeStrategy('s1', { portfolio: 'A' }),
        makeStrategy('s2', { portfolio: 'B' }),
        makeStrategy('s3', { portfolio: 'A' }),
      ],
      strategyRules: [],
    };
    const next = applyStrategiesEvent(
      initial,
      event('PortfolioStrategiesCleared', { portfolio: 'A' })
    );
    expect(next.strategies.map((s) => s.id)).toEqual(['s2']);
  });
});

// --- Strategy rule fold tests ---

describe('applyStrategiesEvent — strategyRules', () => {
  it('StrategyRuleCreated appends rule to the list', () => {
    const r1 = makeRule('r1');
    const r2 = makeRule('r2');
    let state = applyStrategiesEvent(empty(), event('StrategyRuleCreated', { rule: r1 }));
    state = applyStrategiesEvent(state, event('StrategyRuleCreated', { rule: r2 }));
    expect(state.strategyRules.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it('StrategyRuleUpdated replaces the matching rule', () => {
    const r1 = makeRule('r1');
    const initial: StrategiesState = {
      strategies: [],
      strategyRules: [r1, makeRule('r2')],
    };
    const updated = makeRule('r1', { name: 'Updated rule', enabled: false });
    const next = applyStrategiesEvent(initial, event('StrategyRuleUpdated', { rule: updated }));
    expect(next.strategyRules[0].name).toBe('Updated rule');
    expect(next.strategyRules[0].enabled).toBe(false);
    expect(next.strategyRules[1].id).toBe('r2');
  });

  it('StrategyRuleUpdated is a no-op for unknown id', () => {
    const initial: StrategiesState = {
      strategies: [],
      strategyRules: [makeRule('r1')],
    };
    const next = applyStrategiesEvent(
      initial,
      event('StrategyRuleUpdated', { rule: makeRule('x') })
    );
    expect(next.strategyRules).toHaveLength(1);
    expect(next.strategyRules[0].id).toBe('r1');
  });

  it('StrategyRuleDeleted removes the matching rule', () => {
    const initial: StrategiesState = {
      strategies: [],
      strategyRules: [makeRule('r1'), makeRule('r2')],
    };
    const next = applyStrategiesEvent(initial, event('StrategyRuleDeleted', { id: 'r1' }));
    expect(next.strategyRules.map((r) => r.id)).toEqual(['r2']);
  });

  it('StrategyRuleToggled flips enabled flag', () => {
    const r1 = makeRule('r1', { enabled: true });
    const initial: StrategiesState = { strategies: [], strategyRules: [r1] };
    const next = applyStrategiesEvent(initial, event('StrategyRuleToggled', { id: 'r1' }));
    expect(next.strategyRules[0].enabled).toBe(false);
    // Toggle again
    const again = applyStrategiesEvent(next, event('StrategyRuleToggled', { id: 'r1' }));
    expect(again.strategyRules[0].enabled).toBe(true);
  });

  it('StrategyRuleToggled is a no-op for unknown id', () => {
    const r1 = makeRule('r1', { enabled: true });
    const initial: StrategiesState = { strategies: [], strategyRules: [r1] };
    const next = applyStrategiesEvent(initial, event('StrategyRuleToggled', { id: 'x' }));
    expect(next.strategyRules[0].enabled).toBe(true);
  });
});

// --- Cross-slice and default tests ---

describe('applyStrategiesEvent — cross-slice', () => {
  it('ignores unrelated event types and returns same reference', () => {
    const initial: StrategiesState = {
      strategies: [makeStrategy('s1')],
      strategyRules: [makeRule('r1')],
    };
    const next = applyStrategiesEvent(initial, event('PositionOpened', { position: {} }));
    expect(next).toBe(initial);
  });

  it('strategy events do not touch strategyRules', () => {
    const initial: StrategiesState = {
      strategies: [],
      strategyRules: [makeRule('r1')],
    };
    const next = applyStrategiesEvent(
      initial,
      event('TradingStrategyCreated', { strategy: makeStrategy('s1') })
    );
    expect(next.strategyRules).toBe(initial.strategyRules);
  });

  it('rule events do not touch strategies', () => {
    const initial: StrategiesState = {
      strategies: [makeStrategy('s1')],
      strategyRules: [],
    };
    const next = applyStrategiesEvent(initial, event('StrategyRuleCreated', { rule: makeRule('r1') }));
    expect(next.strategies).toBe(initial.strategies);
  });
});
