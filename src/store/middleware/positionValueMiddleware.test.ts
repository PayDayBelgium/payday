import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import type { Middleware } from '@reduxjs/toolkit';
import positionsReducer, {
  updateOptionPremium,
  updatePositionValue,
  updateMultiplePositionValues,
} from '../slices/positionsSlice';
import portfoliosReducer, { addPortfolio, addTransaction } from '../slices/portfoliosSlice';
import tickersReducer from '../slices/tickersSlice';
import eventsReducer, { appendEvents } from '../events/eventsSlice';
import { positionValueMiddleware } from './positionValueMiddleware';
import type { Portfolio, Position, PortfolioTransaction } from '../../types';
import type { DomainEvent } from '../events/types';

const rootReducer = combineReducers({
  positions: positionsReducer,
  portfolios: portfoliosReducer,
  tickers: tickersReducer,
  events: eventsReducer,
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

// Open a position the way the app does now: a committed PositionOpened domain event
// folded through the projection (positionValueMiddleware reacts to events/appendEvents).
const openedEvent = (position: Position): DomainEvent =>
  ({
    id: 'e0',
    seq: 0,
    type: 'PositionOpened',
    payload: { position },
    timestamp: '2026-01-01T00:00:00.000Z',
    actor: 'test',
    schemaVersion: 1,
  }) as DomainEvent;

const openPosition = (position: Position) =>
  appendEvents({ events: [openedEvent(position)], positionsBefore: [] });

describe('positionValueMiddleware', () => {
  let store: ReturnType<typeof makeStore>;

  const portfolioValue = () =>
    store.getState().portfolios.portfolios.find((p) => p.name === 'Test')!.currentValue;

  beforeEach(() => {
    store = makeStore();
    store.dispatch(addPortfolio(portfolio()));
  });

  it('recomputes portfolio value when a position is opened (PositionOpened event)', () => {
    store.dispatch(openPosition(shortPut()));
    // cash (initialCapital 10000, no transactions) + currentValue (-200) = 9800
    expect(portfolioValue()).toBe(9800);
  });

  it('recomputes portfolio value when an option premium changes (live price tick)', () => {
    store.dispatch(openPosition(shortPut()));
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
    store.dispatch(openPosition(shortPut()));
    store.dispatch(updatePositionValue({ id: 'pos1', currentValue: -350 }));
    expect(portfolioValue()).toBe(9650);
  });

  it('recomputes affected portfolios when multiple position values are batched', () => {
    store.dispatch(openPosition(shortPut()));
    store.dispatch(updateMultiplePositionValues([{ id: 'pos1', currentValue: -150 }]));
    expect(portfolioValue()).toBe(9850);
  });

  // Cash-balance bug fix: option_roll / dividend / fee were previously ignored
  const txBase = (): Omit<PortfolioTransaction, 'type' | 'amount'> => ({
    id: 'tx1',
    portfolio: 'Test',
    date: '2026-01-02',
    description: 'test transaction',
    createdAt: '2026-01-02T00:00:00.000Z',
  });

  it('includes option_roll amount in portfolio cash balance', () => {
    // No open positions → value = initialCapital (10000) + roll credit (500)
    store.dispatch(addTransaction({ ...txBase(), type: 'option_roll', amount: 500 }));
    expect(portfolioValue()).toBe(10500);
  });

  it('includes dividend amount in portfolio cash balance', () => {
    store.dispatch(addTransaction({ ...txBase(), type: 'dividend', amount: 250 }));
    expect(portfolioValue()).toBe(10250);
  });

  it('includes fee amount (negative) in portfolio cash balance', () => {
    // Fees are stored as negative amounts by the ledger projection
    store.dispatch(addTransaction({ ...txBase(), type: 'fee', amount: -30 }));
    expect(portfolioValue()).toBe(9970);
  });
});
