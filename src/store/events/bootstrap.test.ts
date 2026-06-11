import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer from './eventsSlice';
import positionsReducer, { selectPositions } from '../slices/positionsSlice';
import tradesReducer from '../slices/tradesSlice';
import { bootstrapFromEventStore } from './bootstrap';
import { createEventStore } from './eventStore';
import type { DomainEvent } from './types';

const opened = (seq: number, id: string): DomainEvent =>
  ({
    id: `e${seq}`,
    seq,
    type: 'PositionOpened',
    payload: {
      position: {
        id,
        type: 'stock',
        ticker: 'AAPL',
        portfolio: 'Main',
        status: 'open',
        openDate: '2026-01-01',
        shares: 1,
        purchasePrice: 1,
      },
    },
    timestamp: 't',
    actor: 'a',
    schemaVersion: 1,
  }) as DomainEvent;

describe('bootstrapFromEventStore', () => {
  beforeEach(async () => {
    await createEventStore('boot-test').clear();
  });

  it('loads persisted events and rebuilds the projections', async () => {
    const eventStore = createEventStore('boot-test');
    await eventStore.appendMany([opened(0, 'p1'), opened(1, 'p2')]);

    const store = configureStore({
      reducer: { events: eventsReducer, positions: positionsReducer, trades: tradesReducer },
    });
    await bootstrapFromEventStore(store, eventStore);

    expect(selectPositions(store.getState() as any).map((p) => p.id)).toEqual(['p1', 'p2']);
    expect((store.getState() as any).events.nextSeq).toBe(2);
  });
});
