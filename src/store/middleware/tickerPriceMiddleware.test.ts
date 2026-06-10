import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import type { Middleware, UnknownAction } from '@reduxjs/toolkit';
import positionsReducer from '../slices/positionsSlice';
import portfoliosReducer from '../slices/portfoliosSlice';
import tickersReducer, { updateTickerPrice, loadTickers } from '../slices/tickersSlice';
import alertsReducer from '../slices/alertsSlice';
import eventsReducer, { appendEvents } from '../events/eventsSlice';
import { tickerPriceMiddleware } from './tickerPriceMiddleware';
import { positionValueMiddleware } from './positionValueMiddleware';
import type { Portfolio, Position, Ticker } from '../../types';
import type { DomainEvent } from '../events/types';

const rootReducer = combineReducers({
  positions: positionsReducer,
  portfolios: portfoliosReducer,
  tickers: tickersReducer,
  alerts: alertsReducer,
  events: eventsReducer,
});

// Records every action that flows through the store so tests can assert HOW MANY
// dispatches a single price tick produces (the batching contract).
const recordedActions: UnknownAction[] = [];
const recorderMiddleware: Middleware = () => (next) => (action) => {
  recordedActions.push(action as UnknownAction);
  return next(action);
};

const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(
        recorderMiddleware,
        tickerPriceMiddleware as Middleware,
        positionValueMiddleware as Middleware
      ),
  });

const portfolio = (name: string): Portfolio =>
  ({
    id: `pf-${name}`,
    name,
    logo: '',
    pricePerContract: 100,
    strategy: '',
    hasOptions: true,
    strategies: [],
    currency: 'EUR',
    initialCapital: 100000,
    currentValue: 100000,
  }) as Portfolio;

const ticker = (symbol: string, currentPrice: number): Ticker => ({
  symbol,
  name: symbol,
  type: 'stock',
  optionsAvailable: true,
  miniContractsAvailable: false,
  currentPrice,
});

const stockPosition = (id: string, portfolioName: string, shares: number): Position =>
  ({
    id,
    ticker: 'XYZ',
    portfolio: portfolioName,
    openDate: '2026-01-01',
    status: 'open',
    type: 'stock',
    shares,
    purchasePrice: 100,
    costBasis: shares * 100,
    currentPrice: 100,
    currentValue: shares * 100,
    optionsSupported: true,
    miniContractsSupported: false,
  }) as unknown as Position;

const shortCall = (id: string, portfolioName: string, strike: number): Position =>
  ({
    id,
    ticker: 'XYZ',
    portfolio: portfolioName,
    openDate: '2026-01-01',
    status: 'open',
    type: 'call',
    action: 'sell',
    strike,
    expiration: '2026-12-18',
    contracts: 1,
    costBasis: -200,
    currentValue: -200,
  }) as unknown as Position;

const makeEvent = (id: string, seq: number, type: DomainEvent['type'], payload: unknown): DomainEvent =>
  ({
    id,
    seq,
    type,
    payload,
    timestamp: '2026-01-01T00:00:00.000Z',
    actor: 'test',
    schemaVersion: 1,
  }) as DomainEvent;

const seedEvents = (portfolios: Portfolio[], positions: Position[]): DomainEvent[] => {
  let seq = 0;
  return [
    ...portfolios.map((pf) => makeEvent(`e-pf-${pf.name}`, seq++, 'PortfolioCreated', { portfolio: pf })),
    ...positions.map((pos) => makeEvent(`e-pos-${pos.id}`, seq++, 'PositionOpened', { position: pos })),
  ];
};

const batchDispatches = () =>
  recordedActions.filter((a) => a.type === 'positions/updateMultiplePositionValues');

const singleLivePriceDispatches = () =>
  recordedActions.filter((a) => a.type === 'positions/updatePositionLivePrice');

describe('tickerPriceMiddleware', () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
    recordedActions.length = 0;
  });

  it('dispatches ONE batched position-value update per tick, spanning multiple portfolios', () => {
    store.dispatch(
      appendEvents({
        events: seedEvents(
          [portfolio('A'), portfolio('B')],
          [stockPosition('s1', 'A', 100), stockPosition('s2', 'A', 50), stockPosition('s3', 'B', 10)]
        ),
        positionsBefore: [],
      })
    );
    store.dispatch(loadTickers([ticker('XYZ', 100)]));
    recordedActions.length = 0;

    store.dispatch(updateTickerPrice({ symbol: 'XYZ', price: 110 }));

    // Exactly one batch, no per-position live-price dispatches.
    const batches = batchDispatches();
    expect(batches).toHaveLength(1);
    expect(singleLivePriceDispatches()).toHaveLength(0);

    const payload = batches[0].payload as Array<{
      id: string;
      currentValue: number;
      currentPrice?: number;
    }>;
    expect(payload).toHaveLength(3);

    // The batch carries everything updatePositionLivePrice used to set.
    const state = store.getState();
    const byId = (id: string) =>
      state.positions.positions.find((p) => p.id === id) as unknown as {
        currentPrice: number;
        currentValue: number;
      };
    expect(byId('s1').currentPrice).toBe(110);
    expect(byId('s1').currentValue).toBe(100 * 110);
    expect(byId('s2').currentValue).toBe(50 * 110);
    expect(byId('s3').currentPrice).toBe(110);
    expect(byId('s3').currentValue).toBe(10 * 110);

    // positionValueMiddleware recomputed BOTH affected portfolios from the one batch.
    const pf = (name: string) => state.portfolios.portfolios.find((p) => p.name === name)!;
    // A: cash = 100000 - 15000 (buys) = 85000; positions = 150 * 110 = 16500
    expect(pf('A').currentValue).toBe(101500);
    // B: cash = 100000 - 1000 = 99000; positions = 10 * 110 = 1100
    expect(pf('B').currentValue).toBe(100100);
  });

  it('dispatches nothing when the price is unchanged', () => {
    store.dispatch(
      appendEvents({
        events: seedEvents([portfolio('A')], [stockPosition('s1', 'A', 100)]),
        positionsBefore: [],
      })
    );
    store.dispatch(loadTickers([ticker('XYZ', 100)]));

    // First tick syncs the position (its projected currentPrice/value may differ).
    store.dispatch(updateTickerPrice({ symbol: 'XYZ', price: 105 }));
    recordedActions.length = 0;

    // Same price again: no position update dispatch at all.
    store.dispatch(updateTickerPrice({ symbol: 'XYZ', price: 105 }));
    expect(batchDispatches()).toHaveLength(0);
    expect(singleLivePriceDispatches()).toHaveLength(0);
  });

  it('still fires a strike-cross alert when the price crosses a short call strike', () => {
    store.dispatch(
      appendEvents({
        events: seedEvents([portfolio('A')], [shortCall('c1', 'A', 105)]),
        positionsBefore: [],
      })
    );
    store.dispatch(loadTickers([ticker('XYZ', 100)]));
    recordedActions.length = 0;

    // 100 -> 110 crosses the $105 strike: short call goes ITM -> warning alert.
    store.dispatch(updateTickerPrice({ symbol: 'XYZ', price: 110 }));

    const alerts = store.getState().alerts.alerts;
    expect(alerts).toHaveLength(1);
    expect(alerts[0].type).toBe('itm');
    expect(alerts[0].severity).toBe('warning');
    expect(alerts[0].positionId).toBe('c1');

    // Option-only tick: no stock positions, so no batched value dispatch either.
    expect(batchDispatches()).toHaveLength(0);
  });

  it('does not fire a strike-cross alert when the price stays on the same side of the strike', () => {
    store.dispatch(
      appendEvents({
        events: seedEvents([portfolio('A')], [shortCall('c1', 'A', 105)]),
        positionsBefore: [],
      })
    );
    store.dispatch(loadTickers([ticker('XYZ', 100)]));
    recordedActions.length = 0;

    store.dispatch(updateTickerPrice({ symbol: 'XYZ', price: 103 }));
    expect(store.getState().alerts.alerts).toHaveLength(0);
  });
});
