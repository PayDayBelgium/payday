import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import type { Middleware } from '@reduxjs/toolkit';
import positionsReducer, {
  loadPositions,
  updateOptionPremium,
  updatePositionValue,
  updateMultiplePositionValues,
} from '../slices/positionsSlice';
import portfoliosReducer, { addPortfolio } from '../slices/portfoliosSlice';
import tickersReducer from '../slices/tickersSlice';
import { positionValueMiddleware } from './positionValueMiddleware';
import type { Portfolio, Position } from '../../types';

const rootReducer = combineReducers({
  positions: positionsReducer,
  portfolios: portfoliosReducer,
  tickers: tickersReducer,
});

const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(
        positionValueMiddleware as Middleware
      ),
  });

const portfolio = (over: Partial<Portfolio> = {}): Portfolio =>
  ({
    id: 'pf1',
    name: 'Test',
    logo: '',
    pricePerContract: 100,
    strategy: '',
    hasOptions: true,
    strategies: [],
    currency: 'EUR',
    initialCapital: 10000,
    currentValue: 10000,
    ...over,
  }) as Portfolio;

// Short put: currentValue is a (negative) liability.
const shortPut = (over: Record<string, unknown> = {}): Position =>
  ({
    id: 'pos1',
    ticker: 'XYZ',
    portfolio: 'Test',
    openDate: '2026-01-01',
    status: 'open',
    type: 'put',
    action: 'sell',
    strike: 100,
    expiration: '2026-12-31',
    contracts: 1,
    costBasis: -200,
    currentValue: -200,
    ...over,
  }) as unknown as Position;

describe('positionValueMiddleware', () => {
  let store: ReturnType<typeof makeStore>;

  const portfolioValue = () =>
    store.getState().portfolios.portfolios.find((p) => p.name === 'Test')!.currentValue;

  beforeEach(() => {
    store = makeStore();
    store.dispatch(addPortfolio(portfolio()));
  });

  it('recomputes portfolio value when a position is added', () => {
    store.dispatch(loadPositions([shortPut()]));
    // cash (initialCapital 10000, no transactions) + currentValue (-200) = 9800
    expect(portfolioValue()).toBe(9800);
  });

  it('recomputes portfolio value when an option premium changes (live price tick)', () => {
    store.dispatch(loadPositions([shortPut()]));
    expect(portfolioValue()).toBe(9800);

    // A live price tick raises the put premium to 3.00 -> liability becomes -300.
    store.dispatch(
      updateOptionPremium({
        symbol: 'XYZ',
        strike: 100,
        expiration: '2026-12-31',
        optionType: 'put',
        premium: 3,
      })
    );

    // Portfolio value must follow: 10000 + (-300) = 9700, not stay stale at 9800.
    expect(portfolioValue()).toBe(9700);
  });

  it('recomputes portfolio value when a single position value is set', () => {
    store.dispatch(loadPositions([shortPut()]));
    store.dispatch(updatePositionValue({ id: 'pos1', currentValue: -350 }));
    expect(portfolioValue()).toBe(9650);
  });

  it('recomputes affected portfolios when multiple position values are batched', () => {
    store.dispatch(loadPositions([shortPut()]));
    store.dispatch(updateMultiplePositionValues([{ id: 'pos1', currentValue: -150 }]));
    expect(portfolioValue()).toBe(9850);
  });
});
