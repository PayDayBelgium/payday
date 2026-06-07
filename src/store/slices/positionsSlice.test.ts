import { describe, it, expect } from 'vitest';
import reducer from './positionsSlice';
import { appendEvents } from '../events/eventsSlice';
import type { DomainEvent } from '../events/types';
import type { Position } from '../../types';

const stock = (id: string): Position =>
  ({ id, type: 'stock', ticker: 'AAPL', portfolio: 'Main', status: 'open', openDate: '2026-01-01', shares: 10, purchasePrice: 100 }) as unknown as Position;

const ev = (seq: number, type: DomainEvent['type'], payload: any): DomainEvent =>
  ({ id: `e${seq}`, seq, type, payload, timestamp: 't', actor: 'a', schemaVersion: 1 }) as DomainEvent;

describe('positionsSlice projection', () => {
  it('folds PositionOpened from appendEvents', () => {
    let s = reducer(undefined, { type: '@@init' });
    s = reducer(
      s,
      appendEvents({ events: [ev(0, 'PositionOpened', { position: stock('p1') })], positionsBefore: [] })
    );
    expect(s.positions.map((p) => p.id)).toEqual(['p1']);
  });
});
