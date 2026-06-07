import { describe, it, expect } from 'vitest';
import { applyPositionEvent } from './projectPositions';
import type { Position } from '../../types';
import type { DomainEvent } from './types';

const stock = (id: string, portfolio = 'Main'): Position =>
  ({
    id,
    type: 'stock',
    ticker: 'AAPL',
    portfolio,
    status: 'open',
    openDate: '2026-01-01',
    shares: 10,
    purchasePrice: 100,
  }) as unknown as Position;

function event<T extends DomainEvent['type']>(type: T, payload: any): DomainEvent {
  return { id: 'e', seq: 0, type, payload, timestamp: 't', actor: 'a', schemaVersion: 1 } as DomainEvent;
}

describe('applyPositionEvent', () => {
  it('PositionOpened appends the position', () => {
    const next = applyPositionEvent([], event('PositionOpened', { position: stock('p1') }));
    expect(next.map((p) => p.id)).toEqual(['p1']);
  });

  it('PositionClosed marks the position closed and records close fields', () => {
    const opened = applyPositionEvent([], event('PositionOpened', { position: stock('p1') }));
    const next = applyPositionEvent(
      opened,
      event('PositionClosed', { id: 'p1', closeDate: '2026-02-01', realizedPnL: 50 })
    );
    expect(next[0].status).toBe('closed');
    expect(next[0].closeDate).toBe('2026-02-01');
    expect(next[0].realizedPnL).toBe(50);
  });

  it('PositionEdited replaces the position', () => {
    const opened = applyPositionEvent([], event('PositionOpened', { position: stock('p1') }));
    const edited = { ...(opened[0] as any), shares: 99 };
    const next = applyPositionEvent(opened, event('PositionEdited', { position: edited }));
    expect((next[0] as any).shares).toBe(99);
  });

  it('PositionsPortfolioRenamed rewrites the portfolio key', () => {
    const opened = applyPositionEvent([], event('PositionOpened', { position: stock('p1', 'Old') }));
    const next = applyPositionEvent(
      opened,
      event('PositionsPortfolioRenamed', { oldName: 'Old', newName: 'New' })
    );
    expect(next[0].portfolio).toBe('New');
  });

  it('ignores unrelated event types', () => {
    const opened = applyPositionEvent([], event('PositionOpened', { position: stock('p1') }));
    const next = applyPositionEvent(opened, event('PriceAlertRuleDeleted', { id: 'x' }));
    expect(next).toBe(opened);
  });
});
