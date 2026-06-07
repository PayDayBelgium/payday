import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor } from '../events/eventsSlice';
import positionsReducer, { selectPositions } from '../slices/positionsSlice';
import tradesReducer from '../slices/tradesSlice';
import { openPosition, closePosition } from './positionCommands';
import type { Position } from '../../types';
import type { AppDispatch } from '../index';

function makeStore() {
  return configureStore({
    reducer: { events: eventsReducer, positions: positionsReducer, trades: tradesReducer },
  });
}

const stock = (id: string): Position =>
  ({ id, type: 'stock', ticker: 'AAPL', portfolio: 'Main', status: 'open', openDate: '2026-01-01', shares: 10, purchasePrice: 100 }) as unknown as Position;

describe('position commands', () => {
  it('openPosition emits PositionOpened and updates the projection', () => {
    const store = makeStore();
    // The mini test store's inferred dispatch lacks the global thunk overload;
    // commands are typed against the app's AppDispatch (real call sites use that).
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('alice'));
    dispatch(openPosition(stock('p1'), '2026-06-07T10:00:00.000Z'));

    expect(selectPositions(store.getState() as any).map((p) => p.id)).toEqual(['p1']);
    const log = (store.getState() as any).events.log;
    expect(log[0].type).toBe('PositionOpened');
    expect(log[0].actor).toBe('alice');
    expect(log[0].seq).toBe(0);
  });

  it('closePosition emits PositionClosed and projects a trade', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(openPosition(stock('p1'), '2026-06-07T10:00:00.000Z'));
    dispatch(closePosition({ id: 'p1', closeDate: '2026-06-08', realizedPnL: 50 }, '2026-06-08T10:00:00.000Z'));

    const state = store.getState() as any;
    expect(selectPositions(state)[0].status).toBe('closed');
    expect(state.trades.trades).toHaveLength(1);
    expect(state.trades.trades[0].realizedPnL).toBe(50);
  });
});
