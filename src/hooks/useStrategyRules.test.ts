import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { useStrategyRules } from './useStrategyRules';
import type { StrategyRule } from '../types';

const storageKey = (portfolio: string) => `strategy-rules-covered-calls-${portfolio}`;

const rule = (id: string, portfolio: string): StrategyRule =>
  ({
    id,
    strategyType: 'covered-calls',
    portfolio,
    name: `Rule ${id}`,
    description: '',
    category: 'risk',
    trigger: 'manual',
    enabled: true,
    parameters: {},
  }) as unknown as StrategyRule;

const storedIds = (key: string): string[] =>
  (JSON.parse(localStorage.getItem(key) ?? '[]') as StrategyRule[]).map((r) => r.id);

afterEach(() => {
  localStorage.clear();
});

describe('useStrategyRules', () => {
  it('loads rules for the portfolio from localStorage', () => {
    localStorage.setItem(storageKey('Main'), JSON.stringify([rule('r1', 'Main')]));

    const { result } = renderHook(() => useStrategyRules('covered-calls', 'Main'));

    expect(result.current.strategyRules.map((r) => r.id)).toEqual(['r1']);
  });

  it('persists rule changes under the active portfolio key', () => {
    const { result } = renderHook(() => useStrategyRules('covered-calls', 'Main'));

    act(() => {
      result.current.saveRule(rule('r1', 'Main'));
    });

    expect(storedIds(storageKey('Main'))).toEqual(['r1']);
  });

  it('reloads rules when the portfolio param changes without a remount', () => {
    // React Router does not remount the page component when only the
    // :portfolio param changes — the hook must swap to the new key itself.
    localStorage.setItem(storageKey('A'), JSON.stringify([rule('a1', 'A')]));
    localStorage.setItem(storageKey('B'), JSON.stringify([rule('b1', 'B')]));

    const { result, rerender } = renderHook(
      ({ portfolio }: { portfolio: string }) => useStrategyRules('covered-calls', portfolio),
      { initialProps: { portfolio: 'A' } }
    );
    expect(result.current.strategyRules.map((r) => r.id)).toEqual(['a1']);

    rerender({ portfolio: 'B' });

    // B's own stored rules are shown...
    expect(result.current.strategyRules.map((r) => r.id)).toEqual(['b1']);
    // ...and neither portfolio's storage was overwritten by the other's state.
    expect(storedIds(storageKey('B'))).toEqual(['b1']);
    expect(storedIds(storageKey('A'))).toEqual(['a1']);
  });

  it('persists edits made after a portfolio switch under the new key only', () => {
    localStorage.setItem(storageKey('A'), JSON.stringify([rule('a1', 'A')]));
    localStorage.setItem(storageKey('B'), JSON.stringify([rule('b1', 'B')]));

    const { result, rerender } = renderHook(
      ({ portfolio }: { portfolio: string }) => useStrategyRules('covered-calls', portfolio),
      { initialProps: { portfolio: 'A' } }
    );
    rerender({ portfolio: 'B' });

    act(() => {
      result.current.saveRule(rule('b2', 'B'));
    });

    expect(storedIds(storageKey('B'))).toEqual(['b1', 'b2']);
    expect(storedIds(storageKey('A'))).toEqual(['a1']);
  });
});
