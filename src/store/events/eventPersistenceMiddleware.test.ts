import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor } from './eventsSlice';
import positionsReducer from '../slices/positionsSlice';
import tradesReducer from '../slices/tradesSlice';
import { createEventPersistenceMiddleware } from './eventPersistenceMiddleware';
import { createEventStore } from './eventStore';
import { openPosition } from '../commands/positionCommands';
import type { Position } from '../../types';
import type { AppDispatch } from '../index';

const stock = (id: string): Position =>
  ({ id, type: 'stock', ticker: 'AAPL', portfolio: 'Main', status: 'open', openDate: '2026-01-01', shares: 10, purchasePrice: 100 }) as unknown as Position;

describe('eventPersistenceMiddleware', () => {
  beforeEach(async () => {
    await createEventStore('mw-test').clear();
  });

  it('writes committed events to the IndexedDB store', async () => {
    const eventStore = createEventStore('mw-test');
    const store = configureStore({
      reducer: { events: eventsReducer, positions: positionsReducer, trades: tradesReducer },
      middleware: (gdm) => gdm().concat(createEventPersistenceMiddleware(eventStore)),
    });
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('alice'));
    dispatch(openPosition(stock('p1'), '2026-06-07T10:00:00.000Z'));

    // allow the async write to settle
    await new Promise((r) => setTimeout(r, 0));

    const persisted = await eventStore.loadAll();
    expect(persisted.map((e) => e.type)).toEqual(['PositionOpened']);
  });
});
