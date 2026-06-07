import { describe, it, expect } from 'vitest';
import { applyPortfolioEvent } from './projectPortfolios';
import type { Portfolio } from '../../types';
import type { DomainEvent } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function portfolio(id: string, name = `Portfolio ${id}`): Portfolio {
  return {
    id,
    name: name as Portfolio['name'],
    logo: '',
    pricePerContract: 1,
    strategy: 'wheel',
    hasOptions: true,
    strategies: [],
    currency: 'EUR',
    initialCapital: 10_000,
    currentValue: 10_000,
  };
}

function event<T extends DomainEvent['type']>(type: T, payload: unknown): DomainEvent {
  return { id: 'e', seq: 0, type, payload, timestamp: 't', actor: 'a', schemaVersion: 1 } as DomainEvent;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('applyPortfolioEvent', () => {
  // --- PortfolioCreated ---
  it('PortfolioCreated appends the portfolio', () => {
    const p1 = portfolio('p1');
    const next = applyPortfolioEvent([], event('PortfolioCreated', { portfolio: p1 }));
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('p1');
  });

  it('PortfolioCreated keeps existing portfolios', () => {
    const p1 = portfolio('p1');
    const p2 = portfolio('p2');
    const initial = [p1];
    const next = applyPortfolioEvent(initial, event('PortfolioCreated', { portfolio: p2 }));
    expect(next.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  // --- PortfolioEdited ---
  it('PortfolioEdited replaces the matching portfolio by id', () => {
    const p1 = portfolio('p1');
    const p2 = portfolio('p2');
    const initial = [p1, p2];
    const edited = { ...p1, strategy: 'covered-calls' };
    const next = applyPortfolioEvent(initial, event('PortfolioEdited', { portfolio: edited }));
    expect(next[0].strategy).toBe('covered-calls');
    expect(next[1]).toBe(p2); // unrelated → same ref
  });

  it('PortfolioEdited is a no-op for unknown id', () => {
    const p1 = portfolio('p1');
    const initial = [p1];
    const next = applyPortfolioEvent(initial, event('PortfolioEdited', { portfolio: portfolio('unknown') }));
    expect(next[0]).toBe(p1);
  });

  // --- PortfolioRenamed ---
  it('PortfolioRenamed updates name for the portfolio with the matching name', () => {
    const p1 = portfolio('p1', 'Old Name');
    const p2 = portfolio('p2', 'Other');
    const initial = [p1, p2];
    const next = applyPortfolioEvent(
      initial,
      event('PortfolioRenamed', { oldName: 'Old Name', newName: 'New Name' })
    );
    expect(next[0].name).toBe('New Name');
    expect(next[0].id).toBe('p1');
    expect(next[1]).toBe(p2); // unrelated → same ref
  });

  it('PortfolioRenamed is a no-op when no portfolio matches oldName', () => {
    const p1 = portfolio('p1', 'Existing');
    const initial = [p1];
    const next = applyPortfolioEvent(
      initial,
      event('PortfolioRenamed', { oldName: 'Does Not Exist', newName: 'Whatever' })
    );
    expect(next[0]).toBe(p1);
  });

  // --- PortfolioDeleted ---
  it('PortfolioDeleted removes the portfolio by id', () => {
    const p1 = portfolio('p1');
    const p2 = portfolio('p2');
    const initial = [p1, p2];
    const next = applyPortfolioEvent(initial, event('PortfolioDeleted', { id: 'p1' }));
    expect(next.map((p) => p.id)).toEqual(['p2']);
  });

  it('PortfolioDeleted is a no-op for unknown id', () => {
    const p1 = portfolio('p1');
    const initial = [p1];
    const next = applyPortfolioEvent(initial, event('PortfolioDeleted', { id: 'unknown' }));
    expect(next).toHaveLength(1);
    expect(next[0]).toBe(p1);
  });

  // --- PortfoliosReordered ---
  it('PortfoliosReordered reorders portfolios to match the order array', () => {
    const p1 = portfolio('p1');
    const p2 = portfolio('p2');
    const p3 = portfolio('p3');
    const initial = [p1, p2, p3];
    const next = applyPortfolioEvent(
      initial,
      event('PortfoliosReordered', { order: ['p3', 'p1', 'p2'] })
    );
    expect(next.map((p) => p.id)).toEqual(['p3', 'p1', 'p2']);
  });

  it('PortfoliosReordered appends portfolios not in the order array at the end', () => {
    const p1 = portfolio('p1');
    const p2 = portfolio('p2');
    const p3 = portfolio('p3');
    const initial = [p1, p2, p3];
    // p3 not included in the order — should appear at the end, preserving relative order
    const next = applyPortfolioEvent(
      initial,
      event('PortfoliosReordered', { order: ['p2', 'p1'] })
    );
    expect(next.map((p) => p.id)).toEqual(['p2', 'p1', 'p3']);
  });

  it('PortfoliosReordered is defensive about ids not in the current portfolios list', () => {
    const p1 = portfolio('p1');
    const initial = [p1];
    // order references a non-existent id — should not crash or produce holes
    const next = applyPortfolioEvent(
      initial,
      event('PortfoliosReordered', { order: ['ghost', 'p1'] })
    );
    expect(next.map((p) => p.id)).toEqual(['p1']);
  });

  // --- default / no-op ---
  it('ignores unrelated event types and returns the same reference', () => {
    const p1 = portfolio('p1');
    const initial = [p1];
    const next = applyPortfolioEvent(initial, event('PositionOpened', { position: {} }));
    expect(next).toBe(initial);
  });
});
