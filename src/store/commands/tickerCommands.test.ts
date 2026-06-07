import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor } from '../events/eventsSlice';
import positionsReducer from '../slices/positionsSlice';
import tickersReducer from '../slices/tickersSlice';
import {
  addTicker,
  ensureTicker,
  updateTicker,
  renameTicker,
  removeTicker,
  addToWatchlist,
  removeFromWatchlist,
} from './tickerCommands';
import type { Ticker } from '../../types';
import type { AppDispatch } from '../index';

// The commit thunk captures positionsBefore from the positions slice.
function makeStore() {
  return configureStore({
    reducer: {
      events: eventsReducer,
      positions: positionsReducer,
      tickers: tickersReducer,
    },
  });
}

function makeTicker(symbol: string, overrides: Partial<Ticker> = {}): Ticker {
  return {
    symbol,
    name: `${symbol} Corp`,
    type: 'stock',
    optionsAvailable: true,
    miniContractsAvailable: false,
    hasDividend: false,
    isWatchlist: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function getTickers(state: any): Ticker[] {
  return state.tickers.tickers;
}

function getLog(state: any): any[] {
  return state.events.log;
}

const TS = '2026-06-07T10:00:00.000Z';
const TS2 = '2026-06-07T11:00:00.000Z';
const TS3 = '2026-06-07T12:00:00.000Z';

// --- addTicker command ---

describe('addTicker command', () => {
  it('emits TickerAdded and appends ticker', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('alice'));

    dispatch(addTicker(makeTicker('AAPL'), TS));

    const tickers = getTickers(store.getState());
    expect(tickers).toHaveLength(1);
    expect(tickers[0].symbol).toBe('AAPL');
    expect(tickers[0].name).toBe('AAPL Corp');

    const log = getLog(store.getState());
    const evt = log.find((e: any) => e.type === 'TickerAdded');
    expect(evt).toBeDefined();
    expect(evt.actor).toBe('alice');
    expect(evt.payload.ticker.symbol).toBe('AAPL');
  });

  it('uppercases symbol', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(addTicker(makeTicker('aapl'), TS));
    expect(getTickers(store.getState())[0].symbol).toBe('AAPL');
  });

  it('adding the same symbol twice leaves one ticker (fold idempotency)', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(addTicker(makeTicker('AAPL'), TS));
    dispatch(addTicker(makeTicker('AAPL', { name: 'Duplicate' }), TS2));
    expect(getTickers(store.getState())).toHaveLength(1);
  });

  it('adds multiple tickers', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(addTicker(makeTicker('AAPL'), TS));
    dispatch(addTicker(makeTicker('MSFT'), TS2));
    expect(getTickers(store.getState()).map((t) => t.symbol)).toEqual(['AAPL', 'MSFT']);
  });
});

// --- ensureTicker command ---

describe('ensureTicker command', () => {
  it('emits TickerAdded when ticker is absent', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(ensureTicker(makeTicker('AAPL'), TS));
    expect(getTickers(store.getState())).toHaveLength(1);
    expect(getLog(store.getState()).find((e: any) => e.type === 'TickerAdded')).toBeDefined();
  });

  it('does not emit when ticker already exists (state-level idempotency)', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(addTicker(makeTicker('AAPL'), TS));

    const logBefore = getLog(store.getState()).length;
    dispatch(ensureTicker(makeTicker('AAPL', { name: 'Should not replace' }), TS2));

    expect(getLog(store.getState())).toHaveLength(logBefore); // no new event
    expect(getTickers(store.getState())).toHaveLength(1);
    expect(getTickers(store.getState())[0].name).toBe('AAPL Corp'); // original kept
  });

  it('is case-insensitive for idempotency check', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(addTicker(makeTicker('AAPL'), TS));

    const logBefore = getLog(store.getState()).length;
    dispatch(ensureTicker(makeTicker('aapl'), TS2));
    expect(getLog(store.getState())).toHaveLength(logBefore);
  });
});

// --- updateTicker command ---

describe('updateTicker command', () => {
  it('emits TickerUpdated and updates ticker', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(addTicker(makeTicker('AAPL'), TS));
    dispatch(updateTicker({ symbol: 'AAPL', name: 'Apple Updated', optionsAvailable: false }, TS2));

    const tickers = getTickers(store.getState());
    expect(tickers[0].name).toBe('Apple Updated');
    expect(tickers[0].optionsAvailable).toBe(false);

    const log = getLog(store.getState());
    expect(log.find((e: any) => e.type === 'TickerUpdated')).toBeDefined();
  });
});

// --- renameTicker command ---

describe('renameTicker command', () => {
  it('emits TickerRenamed and renames ticker', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(addTicker(makeTicker('AAPL'), TS));
    dispatch(renameTicker('AAPL', 'Apple Inc.', TS2));

    const tickers = getTickers(store.getState());
    expect(tickers[0].name).toBe('Apple Inc.');

    const log = getLog(store.getState());
    const evt = log.find((e: any) => e.type === 'TickerRenamed');
    expect(evt).toBeDefined();
    expect(evt.payload.symbol).toBe('AAPL');
    expect(evt.payload.name).toBe('Apple Inc.');
  });
});

// --- removeTicker command ---

describe('removeTicker command', () => {
  it('emits TickerRemoved and removes ticker', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(addTicker(makeTicker('AAPL'), TS));
    dispatch(addTicker(makeTicker('MSFT'), TS2));
    dispatch(removeTicker('AAPL', TS3));

    const tickers = getTickers(store.getState());
    expect(tickers.map((t) => t.symbol)).toEqual(['MSFT']);

    const log = getLog(store.getState());
    const evt = log.find((e: any) => e.type === 'TickerRemoved');
    expect(evt).toBeDefined();
    expect(evt.payload.symbol).toBe('AAPL');
  });
});

// --- addToWatchlist command ---

describe('addToWatchlist command', () => {
  it('emits AddedToWatchlist and marks ticker as watchlist', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(addTicker(makeTicker('AAPL', { isWatchlist: false }), TS));
    dispatch(addToWatchlist(makeTicker('AAPL'), TS2));

    const tickers = getTickers(store.getState());
    expect(tickers[0].isWatchlist).toBe(true);

    const log = getLog(store.getState());
    expect(log.find((e: any) => e.type === 'AddedToWatchlist')).toBeDefined();
  });

  it('appends a new ticker if symbol did not exist', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(addToWatchlist(makeTicker('NVDA'), TS));

    const tickers = getTickers(store.getState());
    expect(tickers).toHaveLength(1);
    expect(tickers[0].symbol).toBe('NVDA');
    expect(tickers[0].isWatchlist).toBe(true);
  });
});

// --- removeFromWatchlist command ---

describe('removeFromWatchlist command', () => {
  it('emits RemovedFromWatchlist and clears isWatchlist flag', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(addToWatchlist(makeTicker('AAPL'), TS));
    dispatch(removeFromWatchlist('AAPL', TS2));

    const tickers = getTickers(store.getState());
    expect(tickers[0].isWatchlist).toBe(false);

    const log = getLog(store.getState());
    const evt = log.find((e: any) => e.type === 'RemovedFromWatchlist');
    expect(evt).toBeDefined();
    expect(evt.payload.symbol).toBe('AAPL');
  });
});

// --- Full flow ---

describe('full ticker lifecycle', () => {
  it('add → update → rename → watchlist → remove emits correct event sequence', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(addTicker(makeTicker('AAPL'), TS));
    dispatch(updateTicker({ symbol: 'AAPL', optionsAvailable: false }, TS2));
    dispatch(renameTicker('AAPL', 'Apple Inc.', TS2));
    dispatch(addToWatchlist(makeTicker('AAPL'), TS2));
    dispatch(removeFromWatchlist('AAPL', TS3));
    dispatch(removeTicker('AAPL', TS3));

    expect(getTickers(store.getState())).toHaveLength(0);

    const types = getLog(store.getState()).map((e: any) => e.type);
    expect(types).toContain('TickerAdded');
    expect(types).toContain('TickerUpdated');
    expect(types).toContain('TickerRenamed');
    expect(types).toContain('AddedToWatchlist');
    expect(types).toContain('RemovedFromWatchlist');
    expect(types).toContain('TickerRemoved');
  });
});
