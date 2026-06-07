import { describe, it, expect } from 'vitest';
import { applyTradeEvent } from './projectTrades';
import type { Position } from '../../types';
import type { DomainEvent } from './types';

const sellCall = (id: string): Position =>
  ({
    id,
    type: 'call',
    action: 'sell',
    ticker: 'AAPL',
    portfolio: 'Main',
    status: 'open',
    openDate: '2026-01-01',
    strike: 200,
    expiration: '2026-03-20',
    contracts: 1,
    premium: 3,
  }) as unknown as Position;

function closed(id: string, payload: any): DomainEvent {
  return {
    id: 'e',
    seq: 0,
    type: 'PositionClosed',
    payload: { id, ...payload },
    timestamp: 't',
    actor: 'a',
    schemaVersion: 1,
  } as DomainEvent;
}

describe('applyTradeEvent', () => {
  it('creates a trade from a closed sold call with computed realizedPnL', () => {
    const next = applyTradeEvent([], closed('p1', { closeDate: '2026-02-01', closePremium: 1 }), [
      sellCall('p1'),
    ]);
    expect(next).toHaveLength(1);
    expect(next[0].ticker).toBe('AAPL');
    expect(next[0].strategy).toBe('Covered Calls');
    // (3 - 1) * 1 * 100 = 200
    expect(next[0].realizedPnL).toBe(200);
  });

  it('prefers an explicit realizedPnL from the payload', () => {
    const next = applyTradeEvent([], closed('p1', { closeDate: '2026-02-01', realizedPnL: 42 }), [
      sellCall('p1'),
    ]);
    expect(next[0].realizedPnL).toBe(42);
  });

  it('ignores non-close events and unknown positions', () => {
    expect(applyTradeEvent([], closed('missing', { closeDate: 'x' }), [])).toEqual([]);
  });
});
