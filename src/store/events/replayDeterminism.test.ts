import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor, replayEvents } from './eventsSlice';
import positionsReducer from '../slices/positionsSlice';
import tradesReducer from '../slices/tradesSlice';
import { openPosition, closePosition, editPosition } from '../commands/positionCommands';
import type { Position } from '../../types';
import type { AppDispatch } from '../index';

const stock = (id: string): Position =>
  ({ id, type: 'stock', ticker: 'AAPL', portfolio: 'Main', status: 'open', openDate: '2026-01-01', shares: 10, purchasePrice: 100 }) as unknown as Position;

function makeStore() {
  return configureStore({
    reducer: { events: eventsReducer, positions: positionsReducer, trades: tradesReducer },
  });
}

describe('replay determinism', () => {
  it('replay(log) equals incrementally-folded state', () => {
    // Build state incrementally via commands.
    const live = makeStore();
    const dispatch = live.dispatch as AppDispatch;
    dispatch(setActor('alice'));
    dispatch(openPosition(stock('p1'), '2026-06-07T10:00:00.000Z'));
    dispatch(editPosition({ ...stock('p1'), shares: 20 } as Position, '2026-06-07T11:00:00.000Z'));
    dispatch(openPosition(stock('p2'), '2026-06-07T12:00:00.000Z'));
    dispatch(closePosition({ id: 'p1', closeDate: '2026-06-08', realizedPnL: 50 }, '2026-06-08T10:00:00.000Z'));

    const liveState = live.getState();

    // Rebuild a fresh store purely by replaying the captured log.
    const rebuilt = makeStore();
    rebuilt.dispatch(replayEvents(liveState.events.log));
    const rebuiltState = rebuilt.getState();

    expect(rebuiltState.positions.positions).toEqual(liveState.positions.positions);
    expect(rebuiltState.trades.trades).toEqual(liveState.trades.trades);
  });
});
