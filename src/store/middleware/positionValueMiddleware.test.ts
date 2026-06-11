import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import type { Middleware } from '@reduxjs/toolkit';
import positionsReducer, {
  updateOptionPremium,
  updatePositionValue,
  updateMultiplePositionValues,
} from '../slices/positionsSlice';
import portfoliosReducer from '../slices/portfoliosSlice';
import tickersReducer from '../slices/tickersSlice';
import eventsReducer, { appendEvents } from '../events/eventsSlice';
import {
  positionValueMiddleware,
  calculatePortfolioValue,
  calculatePortfolioValueUncached,
} from './positionValueMiddleware';
import type { Portfolio, Position } from '../../types';
import type { DomainEvent } from '../events/types';
import type { RootState } from '../index';

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

// Helpers to build minimal stamped domain events for test setup.
const makeEvent = (
  id: string,
  seq: number,
  type: DomainEvent['type'],
  payload: DomainEvent['payload']
): DomainEvent =>
  ({
    id,
    seq,
    type,
    payload,
    timestamp: '2026-01-01T00:00:00.000Z',
    actor: 'test',
    schemaVersion: 1,
  }) as DomainEvent;

// Seed a portfolio via a PortfolioCreated event (replaces the removed addPortfolio reducer).
const createPortfolioEvent = (pf: Portfolio): DomainEvent =>
  makeEvent('e-pf', 0, 'PortfolioCreated', { portfolio: pf });

// Open a position the way the app does now: a committed PositionOpened domain event
// folded through the projection (positionValueMiddleware reacts to events/appendEvents).
const openedEvent = (position: Position): DomainEvent =>
  makeEvent('e0', 1, 'PositionOpened', { position });

const openPosition = (position: Position) =>
  appendEvents({ events: [openedEvent(position)], positionsBefore: [] });

describe('positionValueMiddleware', () => {
  let store: ReturnType<typeof makeStore>;

  const portfolioValue = () =>
    store.getState().portfolios.portfolios.find((p) => p.name === 'Test')!.currentValue;

  beforeEach(() => {
    store = makeStore();
    // Seed portfolio via PortfolioCreated event (no raw addPortfolio reducer any more).
    store.dispatch(
      appendEvents({ events: [createPortfolioEvent(portfolio())], positionsBefore: [] })
    );
  });

  it('recomputes portfolio value when a position is opened (PositionOpened event)', () => {
    store.dispatch(openPosition(shortPut()));
    // Under event-sourcing, PositionOpened for a sold put produces a premium_collected
    // transaction (+200 cash) AND a short-option liability (currentValue -200).
    // cashBalance = initialCapital(10000) + premium(200) = 10200
    // totalCurrentValue = -200 (liability)
    // portfolioValue = 10200 + (-200) = 10000
    expect(portfolioValue()).toBe(10000);
  });

  it('recomputes portfolio value when an option premium changes (live price tick)', () => {
    store.dispatch(openPosition(shortPut()));
    expect(portfolioValue()).toBe(10000);

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

    // cashBalance = 10200 (unchanged); totalCurrentValue = -300
    // Portfolio value must follow: 10200 + (-300) = 9900, not stay stale at 10000.
    expect(portfolioValue()).toBe(9900);
  });

  it('recomputes portfolio value when a single position value is set', () => {
    store.dispatch(openPosition(shortPut()));
    store.dispatch(updatePositionValue({ id: 'pos1', currentValue: -350 }));
    // cashBalance = 10200; totalCurrentValue = -350
    expect(portfolioValue()).toBe(9850);
  });

  it('recomputes affected portfolios when multiple position values are batched', () => {
    store.dispatch(openPosition(shortPut()));
    store.dispatch(updateMultiplePositionValues([{ id: 'pos1', currentValue: -150 }]));
    // cashBalance = 10200; totalCurrentValue = -150
    expect(portfolioValue()).toBe(10050);
  });

  // Regression: a long option marked to exactly $0 must contribute 0 to the
  // portfolio value — not silently fall back to its cost basis (the old
  // `currentValue || costBasis` treated 0 as "missing" and inflated the value).
  it('values a worthless long option at 0, not at cost basis', () => {
    const longCall = {
      id: 'long1',
      ticker: 'XYZ',
      portfolio: 'Test',
      openDate: '2026-01-01',
      status: 'open',
      type: 'call',
      action: 'buy',
      strike: 100,
      expiration: '2026-12-31',
      contracts: 1,
      costBasis: 500,
      currentValue: 500,
    } as unknown as Position;

    store.dispatch(openPosition(longCall));
    const baseline = portfolioValue();

    // The option expires worthless: marked to exactly 0.
    store.dispatch(updatePositionValue({ id: 'long1', currentValue: 0 }));

    // The full 500 of option value must be gone (cash is unchanged by a tick).
    expect(portfolioValue()).toBe(baseline - 500);
  });

  // Cash-balance tests: transaction events now flow through events/appendEvents
  // (CashDeposited, DividendReceived, FeeCharged, OptionRolled via OptionRolled event).
  // The ledger projection folds them into state.portfolios.transactions, which the
  // middleware reads when recomputing portfolio value after appendEvents fires.

  it('includes option_roll amount in portfolio cash balance', () => {
    // No open positions → value = initialCapital (10000) + roll credit (500)
    const rollEvent = makeEvent('e-roll', 1, 'OptionRolled', {
      closedPositionId: 'dummy',
      newPosition: {
        id: 'new-opt',
        ticker: 'XYZ',
        portfolio: 'Test',
        type: 'call',
        action: 'sell',
        strike: 110,
        expiration: '2026-06-20',
        contracts: 1,
        costBasis: -500,
        currentValue: -500,
        openDate: '2026-01-02',
        status: 'open',
      } as unknown as Position,
      closeDate: '2026-01-02',
      netCashFlow: 500,
    } as unknown as DomainEvent['payload']);
    store.dispatch(appendEvents({ events: [rollEvent], positionsBefore: [] }));
    // cash = initialCapital (10000) + roll net (500) + position currentValue (-500) = 10000
    // Actually: cashBalance = 10000 + option_roll(500) = 10500; totalCurrentValue = -500
    // portfolioValue = 10500 + (-500) = 10000
    // The txn ledger adds option_roll +500 to cashBalance; the new position adds -500 to currentValue.
    expect(portfolioValue()).toBe(10000);
  });

  it('includes dividend amount in portfolio cash balance', () => {
    const dividendEvent = makeEvent('e-div', 1, 'DividendReceived', {
      id: 'div1',
      portfolio: 'Test',
      date: '2026-01-02',
      amount: 250,
      description: 'Dividend',
    } as unknown as DomainEvent['payload']);
    store.dispatch(appendEvents({ events: [dividendEvent], positionsBefore: [] }));
    expect(portfolioValue()).toBe(10250);
  });

  // Regression guard for the cash-balance cache: across a realistic action
  // sequence, the cached path used by the middleware must be BIT-IDENTICAL to a
  // fresh, uncached full recomputation of cash + positions.
  it('cached portfolio value stays bit-identical to an uncached recomputation across a realistic sequence', () => {
    const stockPos = {
      id: 'stock1',
      ticker: 'ABC',
      portfolio: 'Test',
      openDate: '2026-01-02',
      status: 'open',
      type: 'stock',
      shares: 30,
      purchasePrice: 50,
      costBasis: 1500,
      currentPrice: 50,
      currentValue: 1500,
      optionsSupported: true,
    } as unknown as Position;

    const assertCacheParity = () => {
      // The test store carries only the slices the middleware reads.
      const state = store.getState() as unknown as RootState;
      const cached = calculatePortfolioValue(state, 'Test');
      const uncached = calculatePortfolioValueUncached(state, 'Test');
      // Bit-identical, not just approximately equal.
      expect(cached).toBe(uncached);
      // And the value the middleware actually stored matches the fresh recomputation.
      expect(portfolioValue()).toBe(Math.round(uncached * 100) / 100);
    };

    // 1. Open a short put and a stock position (premium_collected + position_buy txns).
    store.dispatch(openPosition(shortPut()));
    assertCacheParity();
    store.dispatch(
      appendEvents({
        events: [makeEvent('e-stock', 2, 'PositionOpened', { position: stockPos })],
        positionsBefore: [],
      })
    );
    assertCacheParity();

    // 2. Price ticks (cash unchanged -> served from cache; positions part recomputed).
    store.dispatch(
      updateMultiplePositionValues([
        { id: 'stock1', currentValue: 30 * 52.37, currentPrice: 52.37 },
        { id: 'pos1', currentValue: -215.55 },
      ])
    );
    assertCacheParity();
    store.dispatch(
      updateOptionPremium({
        symbol: 'XYZ',
        strike: 100,
        expiration: '2026-12-31',
        optionType: 'put',
        premium: 2.45,
      })
    );
    assertCacheParity();

    // 3. Append cash events (ledger changes -> cache must be invalidated).
    store.dispatch(
      appendEvents({
        events: [
          makeEvent('e-div2', 3, 'DividendReceived', {
            id: 'div2',
            portfolio: 'Test',
            date: '2026-01-03',
            amount: 123.45,
            description: 'Dividend',
          } as unknown as DomainEvent['payload']),
          makeEvent('e-fee2', 4, 'FeeCharged', {
            id: 'fee2',
            portfolio: 'Test',
            date: '2026-01-03',
            amount: -7.5,
            description: 'Fee',
          } as unknown as DomainEvent['payload']),
        ],
        positionsBefore: store.getState().positions.positions,
      })
    );
    assertCacheParity();

    // 4. More ticks after the ledger change.
    store.dispatch(
      updateMultiplePositionValues([
        { id: 'stock1', currentValue: 30 * 49.99, currentPrice: 49.99 },
      ])
    );
    assertCacheParity();
    store.dispatch(updatePositionValue({ id: 'pos1', currentValue: -180.25 }));
    assertCacheParity();
  });

  it('includes fee amount (negative) in portfolio cash balance', () => {
    // Fees are stored as negative amounts by the ledger projection
    const feeEvent = makeEvent('e-fee', 1, 'FeeCharged', {
      id: 'fee1',
      portfolio: 'Test',
      date: '2026-01-02',
      amount: -30,
      description: 'Fee',
    } as unknown as DomainEvent['payload']);
    store.dispatch(appendEvents({ events: [feeEvent], positionsBefore: [] }));
    expect(portfolioValue()).toBe(9970);
  });
});
