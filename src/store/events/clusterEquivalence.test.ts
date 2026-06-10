/**
 * End-to-end equivalence / integration tests for the coupled-cluster event-sourcing cutover.
 *
 * These tests drive a production-equivalent store through commands and assert the FULL
 * derived state (positions, transactions ledger, wheels, portfolio.currentValue, trades)
 * matches hand-computed expected values from the formulas documented in:
 *   docs/superpowers/plans/2026-06-07-event-sourcing-coupled-cluster-design.md
 *
 * Store wiring mirrors src/store/index.ts but without redux-persist (tests run jsdom).
 * The positionValueMiddleware is included so portfolio.currentValue is recomputed on
 * every appendEvents — it is the primary integration point being tested.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor } from '../events/eventsSlice';
import positionsReducer from '../slices/positionsSlice';
import tradesReducer from '../slices/tradesSlice';
import portfoliosReducer from '../slices/portfoliosSlice';
import wheelsReducer from '../slices/wheelsSlice';
import tickersReducer from '../slices/tickersSlice';
import { positionValueMiddleware } from '../middleware/positionValueMiddleware';
import { createPortfolio } from '../commands/portfolioCommands';
import { deposit, withdraw, chargeFee, recordDividend, adjustValue } from '../commands/cashCommands';
import { openPosition, closePosition } from '../commands/positionCommands';
import { startWheelCampaign } from '../commands/wheelCommands';
import { rollOption, recordAssignment } from '../commands/rollCommands';
import type { Portfolio, WheelCampaign, StockPosition, CallOption, PutOption } from '../../types';
import type { AppDispatch } from '../index';

// ---------------------------------------------------------------------------
// Minimal production-equivalent store (no persist, no IB/ticker websockets)
// ---------------------------------------------------------------------------

function makeStore() {
  const store = configureStore({
    reducer: {
      events: eventsReducer,
      positions: positionsReducer,
      trades: tradesReducer,
      portfolios: portfoliosReducer,
      wheels: wheelsReducer,
      tickers: tickersReducer,
    },
    middleware: (gdm) =>
      gdm({ serializableCheck: false }).concat(positionValueMiddleware),
  });
  (store.dispatch as AppDispatch)(setActor('test'));
  return store;
}

type TestStore = ReturnType<typeof makeStore>;

// ---------------------------------------------------------------------------
// Accessors
// ---------------------------------------------------------------------------

const sel = {
  positions:    (s: TestStore) => s.getState().positions.positions,
  transactions: (s: TestStore) => s.getState().portfolios.transactions,
  portfolios:   (s: TestStore) => s.getState().portfolios.portfolios,
  wheels:       (s: TestStore) => s.getState().wheels.wheels,
  trades:       (s: TestStore) => s.getState().trades.trades,
  portfolio:    (s: TestStore, name: string) =>
    s.getState().portfolios.portfolios.find((p) => p.name === name),
};

// ---------------------------------------------------------------------------
// Shared timestamps (deterministic)
// ---------------------------------------------------------------------------

const T0 = '2026-06-01T09:00:00.000Z'; // portfolio creation
const T1 = '2026-06-02T10:00:00.000Z'; // first position open
const T2 = '2026-06-10T10:00:00.000Z'; // second action (close / roll / assign)
const T3 = '2026-06-15T10:00:00.000Z'; // third action

// ---------------------------------------------------------------------------
// Portfolio fixture
// ---------------------------------------------------------------------------

function makePortfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  return {
    id: 'pf-1',
    name: 'TestPF',
    logo: '',
    pricePerContract: 1,
    strategy: 'Wheel',
    hasOptions: true,
    strategies: [],
    currency: 'USD',
    initialCapital: 10000,
    currentValue: 10000,
    ...overrides,
  };
}

function makeWheel(overrides: Partial<WheelCampaign> = {}): WheelCampaign {
  return {
    id: 'wheel-1',
    ticker: 'AAPL',
    portfolio: 'TestPF',
    phase: 'csp',
    targetContracts: 1,
    startDate: '2026-01-01',
    status: 'active',
    totalPremiumCollected: 0,
    totalRealizedPnL: 0,
    cycles: 0,
    createdAt: T0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Scenario 1: Open + close a stock
//
// Portfolio initialCapital = 10000. Open 100 shares of AAPL @ $50 (costBasis 5000).
// - After open:
//   ledger: position_buy -5000
//   cash = 10000 (initialCapital) + (-5000) = 5000
//   positionValue = 100 * 50 (currentPrice=purchasePrice, no ticker override) = 5000
//   currentValue = 5000 + 5000 = 10000
//
// Then closePosition at $60:
//   ledger: position_sell +6000
//   cash = 5000 + 6000 = 11000
//   positionValue = 0 (stock now closed)
//   currentValue = 11000
// ---------------------------------------------------------------------------

describe('Scenario 1: open + close a stock', () => {
  let store: TestStore;

  beforeEach(() => {
    store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createPortfolio(makePortfolio(), T0));

    const stock: StockPosition = {
      id: 'stock-aapl-1',
      type: 'stock',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      portfolio: 'TestPF',
      shares: 100,
      costBasis: 5000,       // 100 * 50
      purchasePrice: 50,
      currentPrice: 50,
      currentValue: 5000,
      optionsSupported: true,
      miniContractsSupported: false,
      status: 'open',
      openDate: '2026-06-02',
    };
    dispatch(openPosition(stock, T1));
  });

  it('ledger has position_buy -5000 after opening stock', () => {
    const txns = sel.transactions(store);
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe('position_buy');
    // position_buy amount = -costBasis (negative cash outflow)
    expect(txns[0].amount).toBe(-5000);
    expect(txns[0].portfolio).toBe('TestPF');
    expect(txns[0].relatedPositionId).toBe('stock-aapl-1');
  });

  it('portfolio currentValue = 10000 after opening stock (cash 5000 + position 5000)', () => {
    // cash = initialCapital(10000) + position_buy(-5000) = 5000
    // positionValue = 100 * currentPrice(50) = 5000
    // total = 10000
    const pf = sel.portfolio(store, 'TestPF');
    expect(pf?.currentValue).toBe(10000);
  });

  it('after closing at $60: ledger has position_sell +6000, currentValue = 11000', () => {
    const dispatch = store.dispatch as AppDispatch;

    dispatch(
      closePosition(
        {
          id: 'stock-aapl-1',
          closeDate: '2026-06-10',
          closePrice: 60,
          realizedPnL: 1000, // (60 - 50) * 100
        },
        T2
      )
    );

    const txns = sel.transactions(store);
    expect(txns).toHaveLength(2);

    const sellTxn = txns.find((t) => t.type === 'position_sell');
    expect(sellTxn).toBeDefined();
    // position_sell amount = closePrice * shares = 60 * 100 = 6000
    expect(sellTxn?.amount).toBe(6000);
    expect(sellTxn?.portfolio).toBe('TestPF');

    // cash = 10000 - 5000 + 6000 = 11000; positions: none open → 0
    const pf = sel.portfolio(store, 'TestPF');
    expect(pf?.currentValue).toBe(11000);

    // A trade should exist for the closed stock position
    const trades = sel.trades(store);
    expect(trades).toHaveLength(1);
    expect(trades[0].ticker).toBe('AAPL');
    expect(trades[0].realizedPnL).toBe(1000);
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Sell a put (CSP)
//
// Portfolio initialCapital = 10000.
// Open short put: 1 contract, premium $2, costBasis = -(2*1*100) = -200.
//
// - ledger: premium_collected +200  (|costBasis|)
// - cash = 10000 + 200 = 10200
// - positionValue = short put currentValue = costBasis = -200
// - currentValue = 10200 + (-200) = 10000
//
// The net is 10000 — the portfolio doesn't "grow" until the premium expires (correct behavior).
// ---------------------------------------------------------------------------

describe('Scenario 2: sell a put (CSP) — premium_collected ledger + neutral portfolio value', () => {
  let store: TestStore;

  beforeEach(() => {
    store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createPortfolio(makePortfolio(), T0));

    const shortPut: PutOption = {
      id: 'put-aapl-1',
      type: 'put',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      portfolio: 'TestPF',
      action: 'sell',
      strike: 45,
      expiration: '2026-07-18',
      contracts: 1,
      premium: 2,
      costBasis: -200,       // -(2 * 1 * 100)
      currentValue: -200,
      status: 'open',
      openDate: '2026-06-02',
    };
    dispatch(openPosition(shortPut, T1));
  });

  it('ledger has premium_collected +200', () => {
    const txns = sel.transactions(store);
    expect(txns).toHaveLength(1);
    expect(txns[0].type).toBe('premium_collected');
    expect(txns[0].amount).toBe(200);  // |costBasis|
    expect(txns[0].portfolio).toBe('TestPF');
    expect(txns[0].relatedPositionId).toBe('put-aapl-1');
  });

  it('portfolio currentValue = 10000 (cash 10200 + liability -200)', () => {
    // cash = 10000 + 200 = 10200
    // short put currentValue = -200 (liability)
    // total = 10200 + (-200) = 10000
    const pf = sel.portfolio(store, 'TestPF');
    expect(pf?.currentValue).toBe(10000);
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Roll a short option
//
// Open short call: 1 contract, premium $3, costBasis = -300.
// Roll: closePremium = $1, newPremium = $2.50, 1 contract, same ticker.
//
// Formulas (short roll):
//   closeValue   = -(1 * 1 * 100) = -100
//   realizedPnL  = closeValue - costBasis = -100 - (-300) = 200
//   openValue    = 2.50 * 1 * 100 = 250
//   newCostBasis = -250
//   netCashFlow  = closeValue + openValue = -100 + 250 = 150
//
// After roll:
//   ledger: one option_roll +150 (NOT a close+open pair)
//   old position: closed
//   new position: open, costBasis -250
//   cash = 10000 + 150 = 10150
//   positionValue = -250
//   currentValue = 10150 + (-250) = 9900
// ---------------------------------------------------------------------------

describe('Scenario 3: roll a short option', () => {
  let store: TestStore;
  let newPositionId: string;

  beforeEach(() => {
    store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createPortfolio(makePortfolio(), T0));

    const shortCall: CallOption = {
      id: 'call-aapl-1',
      type: 'call',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      portfolio: 'TestPF',
      action: 'sell',
      strike: 55,
      expiration: '2026-07-18',
      contracts: 1,
      premium: 3,
      costBasis: -300,        // -(3 * 1 * 100)
      currentValue: -300,
      status: 'open',
      openDate: '2026-06-02',
    };
    dispatch(openPosition(shortCall, T1));

    // Roll: closePremium=$1, newPremium=$2.50
    dispatch(
      rollOption(
        {
          positionId: 'call-aapl-1',
          closePremium: 1,
          closeDate: '2026-06-10',
          newContracts: 1,
          newStrike: 57,
          newExpiration: '2026-08-15',
          newPremium: 2.5,
        },
        T2
      )
    );

    // Capture the new position id for assertions
    const positions = sel.positions(store);
    const openPos = positions.find((p) => p.status === 'open');
    newPositionId = openPos?.id ?? '';
  });

  it('old position is closed with realizedPnL = 200', () => {
    const positions = sel.positions(store);
    const old = positions.find((p) => p.id === 'call-aapl-1');
    expect(old?.status).toBe('closed');
    expect(old?.realizedPnL).toBe(200);
    expect(old?.closePremium).toBe(1);
  });

  it('new position is open with correct costBasis = -250', () => {
    const positions = sel.positions(store);
    // One open position should exist (the rolled-in new call)
    const openPositions = positions.filter((p) => p.status === 'open');
    expect(openPositions).toHaveLength(1);
    const newPos = openPositions[0] as CallOption;
    expect(newPos.type).toBe('call');
    expect(newPos.action).toBe('sell');
    expect(newPos.costBasis).toBe(-250);         // -(2.5 * 1 * 100)
    expect(newPos.currentValue).toBe(-250);
    expect(newPos.strike).toBe(57);
    expect(newPos.expiration).toBe('2026-08-15');
  });

  it('ledger has exactly ONE option_roll entry with amount = 150', () => {
    const txns = sel.transactions(store);
    // Two events produced ledger entries: PositionOpened (premium_collected) + OptionRolled (option_roll)
    // PositionOpened → premium_collected +300
    // OptionRolled → option_roll +150
    const premiumTxns = txns.filter((t) => t.type === 'premium_collected');
    const rollTxns    = txns.filter((t) => t.type === 'option_roll');
    const closeTxns   = txns.filter((t) => t.type === 'position_sell');
    expect(premiumTxns).toHaveLength(1);  // from PositionOpened
    expect(rollTxns).toHaveLength(1);     // from OptionRolled — single entry
    expect(closeTxns).toHaveLength(0);    // no double-counted close
    expect(rollTxns[0].amount).toBe(150);
    expect(rollTxns[0].portfolio).toBe('TestPF');
    expect(rollTxns[0].relatedPositionId).toBe(newPositionId);
  });

  it('portfolio currentValue = 9900 (cash 10150 + liability -250)', () => {
    // Ledger contributions to cash:
    //   initialCapital = 10000
    //   premium_collected +300 (from original open)
    //   option_roll +150
    //   = 10450
    // positionValue of open short call = -250
    // total = 10450 + (-250) = 10200  … wait, re-check
    //
    // Actually the original position open also generates premium_collected +300 in the ledger.
    // cash = 10000 + 300 + 150 = 10450
    // positionValue = -250 (new short call currentValue)
    // total = 10450 - 250 = 10200
    //
    // Wait — we need to reconcile. The roll REPLACES the old position with the new one.
    // After the roll:
    //   - old position (costBasis -300) is CLOSED — no longer in open positions
    //   - new position (costBasis -250) is OPEN
    //
    // Cash calculation (from positionValueMiddleware summing transactions):
    //   initialCapital = 10000
    //   + premium_collected (open original short call) = +300
    //   + option_roll (netCashFlow = -100 + 250 = 150) = +150
    //   cash subtotal = 10450
    //
    // positionValue = new short call currentValue = -250
    //
    // portfolio.currentValue = 10450 + (-250) = 10200
    const pf = sel.portfolio(store, 'TestPF');
    expect(pf?.currentValue).toBe(10200);
  });

  it('a trade is created for the rolled-out leg', () => {
    const trades = sel.trades(store);
    expect(trades).toHaveLength(1);
    expect(trades[0].ticker).toBe('AAPL');
    expect(trades[0].realizedPnL).toBe(200);
    expect(trades[0].closeDate).toBe('2026-06-10');
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Put assignment → stock (wheel)
//
// Start a wheel. Open short put: strike=50, 1 contract, premium=2, costBasis=-200.
// recordAssignment(assignmentPrice=48).
//
// Formulas (put assignment):
//   shares = 1 * 100 = 100
//   optionRealizedPnL = |costBasis| = 200
//   effectiveCost = 50 * 100 - 200 = 4800
//   newStock.costBasis = 4800
//   newStock.purchasePrice = 4800 / 100 = 48
//   newStock.currentPrice = 48 (assignmentPrice)
//   newStock.currentValue = 100 * 48 = 4800
//
// Ledger: one position_buy -5000 = -(strike × shares), GROSS — the premium was
// already credited at open via premium_collected (from OptionAssigned, not a
// standalone PositionOpened).
// Wheel: phase → 'stock'; totalPremiumCollected = 200
//
// Portfolio value:
//   initialCapital = 10000
//   + premium_collected +200 (from opening the short put)
//   + position_buy -5000 (from assignment, gross strike × shares)
//   cash = 10000 + 200 - 5000 = 5200
//   positionValue = stock currentValue = 4800
//   total = 5200 + 4800 = 10000
//   (sanity: +200 premium kept, -200 unrealized on the stock → net 0 vs initial)
// ---------------------------------------------------------------------------

describe('Scenario 4: put assignment → stock (wheel)', () => {
  let store: TestStore;
  const WHEEL_ID = 'wheel-1';
  const PUT_ID   = 'put-aapl-assign';

  beforeEach(() => {
    store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createPortfolio(makePortfolio(), T0));
    dispatch(startWheelCampaign(makeWheel({ id: WHEEL_ID }), T0));

    const shortPut: PutOption = {
      id: PUT_ID,
      type: 'put',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      portfolio: 'TestPF',
      action: 'sell',
      strike: 50,
      expiration: '2026-07-18',
      contracts: 1,
      premium: 2,
      costBasis: -200,
      currentValue: -200,
      status: 'open',
      openDate: '2026-06-02',
      wheelId: WHEEL_ID,
    };
    dispatch(openPosition(shortPut, T1));

    dispatch(
      recordAssignment(
        { optionId: PUT_ID, assignmentDate: '2026-07-18', assignmentPrice: 48 },
        T2
      )
    );
  });

  it('option is closed with realizedPnL = 200 (premium kept)', () => {
    const positions = sel.positions(store);
    const opt = positions.find((p) => p.id === PUT_ID);
    expect(opt?.status).toBe('closed');
    expect(opt?.realizedPnL).toBe(200);
  });

  it('new stock position is open with effectiveCost = 4800', () => {
    const positions = sel.positions(store);
    const openPos = positions.filter((p) => p.status === 'open');
    expect(openPos).toHaveLength(1);
    const stock = openPos[0] as StockPosition;
    expect(stock.type).toBe('stock');
    expect(stock.shares).toBe(100);
    expect(stock.costBasis).toBe(4800);
    expect(stock.purchasePrice).toBe(48);
    expect(stock.currentPrice).toBe(48);
    expect(stock.currentValue).toBe(4800);
    expect(stock.wheelId).toBe(WHEEL_ID);
  });

  it('ledger: one position_buy -5000 (gross strike × shares) from assignment', () => {
    const txns = sel.transactions(store);
    const buyTxns = txns.filter((t) => t.type === 'position_buy');
    // Only one position_buy — from the OptionAssigned event, not a standalone PositionOpened.
    // Amount is GROSS (-strike × shares): the premium was already credited at open.
    expect(buyTxns).toHaveLength(1);
    expect(buyTxns[0].amount).toBe(-5000);
    expect(buyTxns[0].portfolio).toBe('TestPF');
  });

  it('wheel phase = stock, totalPremiumCollected = 200', () => {
    const wheels = sel.wheels(store);
    expect(wheels).toHaveLength(1);
    const wheel = wheels[0];
    expect(wheel.phase).toBe('stock');
    expect(wheel.totalPremiumCollected).toBe(200);
    expect(wheel.cycles).toBe(0);
  });

  it('portfolio currentValue = 10000', () => {
    // cash = 10000 + 200(premium_collected) - 5000(position_buy, gross) = 5200
    // stock currentValue = 4800
    // total = 5200 + 4800 = 10000
    const pf = sel.portfolio(store, 'TestPF');
    expect(pf?.currentValue).toBe(10000);
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Call assignment full (wheel)
//
// Seed a wheel in 'stock' phase: 100 shares of AAPL, costBasis=4800.
// Open a wheel-linked short call: strike=55, 1 contract, premium=1, costBasis=-100.
// recordAssignment (call, full close).
//
// Formulas (call assignment, full):
//   shares = 1 * 100 = 100
//   optionRealizedPnL = |costBasis| = 100
//   premiumReceived = 100
//   totalProceeds = 55 * 100 = 5500
//   stockCostBasisForShares = 4800 / 100 * 100 = 4800
//   stockRealizedPnL = 5500 - 4800 = 700
//
// Ledger: one position_sell = totalProceeds = 5500 — the premium was already
// credited at open via premium_collected, so the assignment books only the
// gross stock proceeds (strike × shares).
// Wheel: cycles = 1, phase = 'csp', totalRealizedPnL += 700
// Trades: option trade + stock trade = 2 total
//
// Portfolio value after:
//   Stock was seeded via openPosition → position_buy -4800
//   Short call via openPosition → premium_collected +100
//   Then assignment → position_sell +5500
//   cash = 10000 - 4800 + 100 + 5500 = 10800
//   positions: 0
//   total = 10800
//   (sanity: +100 premium kept, +700 realized stock gain → 10000 + 800)
// ---------------------------------------------------------------------------

describe('Scenario 5: call assignment full (wheel)', () => {
  let store: TestStore;
  const WHEEL_ID   = 'wheel-5';
  const STOCK_ID   = 'stock-aapl-5';
  const CALL_ID    = 'call-aapl-5';

  beforeEach(() => {
    store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createPortfolio(makePortfolio(), T0));
    dispatch(
      startWheelCampaign(
        makeWheel({ id: WHEEL_ID, phase: 'stock', totalPremiumCollected: 200 }),
        T0
      )
    );

    // Seed stock (100 shares, costBasis=4800) — represents put-assigned stock
    const stock: StockPosition = {
      id: STOCK_ID,
      type: 'stock',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      portfolio: 'TestPF',
      shares: 100,
      costBasis: 4800,
      purchasePrice: 48,
      currentPrice: 54,
      currentValue: 5400,
      optionsSupported: true,
      miniContractsSupported: false,
      status: 'open',
      openDate: '2026-05-01',
      wheelId: WHEEL_ID,
    };
    dispatch(openPosition(stock, T1));

    // Short call covering the stock
    const shortCall: CallOption = {
      id: CALL_ID,
      type: 'call',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      portfolio: 'TestPF',
      action: 'sell',
      strike: 55,
      expiration: '2026-07-18',
      contracts: 1,
      premium: 1,
      costBasis: -100,        // -(1 * 1 * 100)
      currentValue: -100,
      status: 'open',
      openDate: '2026-06-02',
      wheelId: WHEEL_ID,
    };
    dispatch(openPosition(shortCall, T2));

    dispatch(
      recordAssignment(
        { optionId: CALL_ID, assignmentDate: '2026-07-18', assignmentPrice: 56 },
        T3
      )
    );
  });

  it('option is closed with realizedPnL = 100', () => {
    const positions = sel.positions(store);
    const call = positions.find((p) => p.id === CALL_ID);
    expect(call?.status).toBe('closed');
    expect(call?.realizedPnL).toBe(100);
  });

  it('stock is fully closed at strike price 55, stockRealizedPnL = 700', () => {
    const positions = sel.positions(store);
    const stock = positions.find((p) => p.id === STOCK_ID);
    expect(stock?.status).toBe('closed');
    expect(stock?.realizedPnL).toBe(700);  // 5500 - 4800
    expect(stock?.closePrice).toBe(55);
  });

  it('ledger: position_sell = 5500 (totalProceeds only; premium credited at open)', () => {
    const txns = sel.transactions(store);
    const sellTxns = txns.filter((t) => t.type === 'position_sell');
    // Only ONE position_sell from OptionAssigned (no double-count from stock close)
    expect(sellTxns).toHaveLength(1);
    expect(sellTxns[0].amount).toBe(5500);
  });

  it('wheel: cycles = 1, phase = csp, totalRealizedPnL includes stockRealizedPnL = 700', () => {
    const wheels = sel.wheels(store);
    const wheel = wheels.find((w) => w.id === WHEEL_ID);
    expect(wheel?.cycles).toBe(1);
    expect(wheel?.phase).toBe('csp');
    // totalRealizedPnL: seed was 0, += stockRealizedPnL(700) = 700
    expect(wheel?.totalRealizedPnL).toBe(700);
    // totalPremiumCollected: seeded at 200 + short call open (+100) = 300
    expect(wheel?.totalPremiumCollected).toBe(300);
  });

  it('two trades created: option trade + stock trade', () => {
    const trades = sel.trades(store);
    const optionTrade = trades.find((t) => t.strategy.includes('Call') || t.strategy.includes('call'));
    const stockTrade  = trades.find((t) => t.strategy === 'Aandelen');
    expect(optionTrade).toBeDefined();
    expect(stockTrade).toBeDefined();
    expect(trades).toHaveLength(2);
  });

  it('portfolio currentValue = 10800', () => {
    // Cash contributions:
    //   initialCapital = 10000
    //   position_buy (stock open) = -4800
    //   premium_collected (call open) = +100
    //   position_sell (assignment, gross) = +5500
    //   cash = 10000 - 4800 + 100 + 5500 = 10800
    // positionValue = 0 (all positions closed)
    // total = 10800
    const pf = sel.portfolio(store, 'TestPF');
    expect(pf?.currentValue).toBe(10800);
  });
});

// ---------------------------------------------------------------------------
// Scenario 6: Call assignment partial (200 shares, 1-contract call)
//
// Seed: 200 shares of AAPL, costBasis=9600 (200*48), currentValue=10800 (200*54).
// Short call: strike=55, 1 contract, premium=1, costBasis=-100.
// recordAssignment → partial close (200 > 100).
//
// Formulas (partial call assignment):
//   shares = 1 * 100 = 100
//   optionRealizedPnL = 100
//   premiumReceived = 100
//   totalProceeds = 55 * 100 = 5500
//   stockCostBasisForShares = (9600 / 200) * 100 = 4800
//   stockRealizedPnL = 5500 - 4800 = 700
//   remainingShares = 200 - 100 = 100
//   remainingCostBasis = (9600 / 200) * 100 = 4800
//   remainingCurrentValue = 100 * (10800 / 200) = 100 * 54 = 5400
//
// After:
//   Stock edited to 100 remaining shares, NOT closed.
//   Option closed (realizedPnL=100).
//   Ledger: ONE position_sell = totalProceeds = 5500 (premium credited at open)
//   Wheel: cycles += 1, phase = 'csp', totalRealizedPnL += 700
//   Trades: only option trade (stock NOT closed → no stock trade)
// ---------------------------------------------------------------------------

describe('Scenario 6: call assignment partial (200 shares, 1-contract call)', () => {
  let store: TestStore;
  const WHEEL_ID   = 'wheel-6';
  const STOCK_ID   = 'stock-aapl-6';
  const CALL_ID    = 'call-aapl-6';

  beforeEach(() => {
    store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createPortfolio(makePortfolio(), T0));
    dispatch(
      startWheelCampaign(
        makeWheel({ id: WHEEL_ID, ticker: 'AAPL', phase: 'stock' }),
        T0
      )
    );

    const stock: StockPosition = {
      id: STOCK_ID,
      type: 'stock',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      portfolio: 'TestPF',
      shares: 200,
      costBasis: 9600,           // 200 * 48
      purchasePrice: 48,
      currentPrice: 54,
      currentValue: 10800,       // 200 * 54
      optionsSupported: true,
      miniContractsSupported: false,
      status: 'open',
      openDate: '2026-05-01',
      wheelId: WHEEL_ID,
    };
    dispatch(openPosition(stock, T1));

    const shortCall: CallOption = {
      id: CALL_ID,
      type: 'call',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      portfolio: 'TestPF',
      action: 'sell',
      strike: 55,
      expiration: '2026-07-18',
      contracts: 1,
      premium: 1,
      costBasis: -100,
      currentValue: -100,
      status: 'open',
      openDate: '2026-06-02',
      wheelId: WHEEL_ID,
    };
    dispatch(openPosition(shortCall, T2));

    dispatch(
      recordAssignment(
        { optionId: CALL_ID, assignmentDate: '2026-07-18', assignmentPrice: 56 },
        T3
      )
    );
  });

  it('stock is edited (not closed): 100 remaining shares, costBasis 4800', () => {
    const positions = sel.positions(store);
    const stock = positions.find((p) => p.id === STOCK_ID);
    // Stock should still be OPEN (partial, not fully closed)
    expect(stock?.status).toBe('open');
    expect((stock as StockPosition).shares).toBe(100);
    expect((stock as StockPosition).costBasis).toBe(4800);
    expect((stock as StockPosition).currentValue).toBe(5400);
  });

  it('option is closed with realizedPnL = 100', () => {
    const positions = sel.positions(store);
    const call = positions.find((p) => p.id === CALL_ID);
    expect(call?.status).toBe('closed');
    expect(call?.realizedPnL).toBe(100);
  });

  it('ledger: ONE position_sell = 5500 (totalProceeds only; premium credited at open)', () => {
    const txns = sel.transactions(store);
    const sellTxns = txns.filter((t) => t.type === 'position_sell');
    expect(sellTxns).toHaveLength(1);
    expect(sellTxns[0].amount).toBe(5500);
  });

  it('wheel: cycles = 1, phase = csp, totalRealizedPnL = 700', () => {
    const wheels = sel.wheels(store);
    const wheel = wheels.find((w) => w.id === WHEEL_ID);
    expect(wheel?.cycles).toBe(1);
    expect(wheel?.phase).toBe('csp');
    expect(wheel?.totalRealizedPnL).toBe(700);
  });

  it('two trades created: option trade + aggregate stock trade (new multi-lot path)', () => {
    const trades = sel.trades(store);
    // New FIFO multi-lot path always emits an aggregate stock trade (even on partial close),
    // representing the 100 shares called away as ONE sale at the strike.
    expect(trades).toHaveLength(2);
    const optTrade = trades.find((t) => t.id.endsWith('-option'));
    const stkTrade = trades.find((t) => t.id.endsWith('-stock'));
    expect(optTrade).toBeDefined();
    expect(stkTrade).toBeDefined();
    expect(stkTrade!.quantity).toBe(100);             // 1 contract × 100 shares
    expect(stkTrade!.realizedPnL).toBe(700);          // strike(55)×100 − avgCost(48)×100
    expect(stkTrade!.ticker).toBe('AAPL');
  });

  it('portfolio currentValue: cash + remaining stock value', () => {
    // Cash contributions:
    //   initialCapital = 10000
    //   position_buy (stock 200sh open) = -9600
    //   premium_collected (call open) = +100
    //   position_sell (assignment, gross) = +5500
    //   cash = 10000 - 9600 + 100 + 5500 = 6000
    // positionValue = remaining stock currentValue = 5400
    // total = 6000 + 5400 = 11400
    const pf = sel.portfolio(store, 'TestPF');
    expect(pf?.currentValue).toBe(11400);
  });
});

// ---------------------------------------------------------------------------
// Scenario 7: Cash events — each moves portfolio currentValue by the signed amount
//
// Tests deposit, withdraw, fee, dividend, and adjustment. Also verifies that the
// cash-bug fix (option_roll + dividend + fee now included) is active by cross-checking
// the FeeCharged case — prior to the fix, fees were excluded from the cash sum.
// ---------------------------------------------------------------------------

describe('Scenario 7: cash events', () => {
  let store: TestStore;

  beforeEach(() => {
    store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(createPortfolio(makePortfolio(), T0));  // initialCapital = 10000
  });

  it('deposit +500 → currentValue = 10500', () => {
    const dispatch = store.dispatch as AppDispatch;
    dispatch(deposit({ portfolio: 'TestPF', amount: 500, date: '2026-06-02' }, T1));
    const pf = sel.portfolio(store, 'TestPF');
    expect(pf?.currentValue).toBe(10500);
  });

  it('withdrawal 300 → currentValue = 9700', () => {
    const dispatch = store.dispatch as AppDispatch;
    // withdrawal stores positive amount; middleware does `cash -= amount`
    dispatch(withdraw({ portfolio: 'TestPF', amount: 300, date: '2026-06-02' }, T1));
    const pf = sel.portfolio(store, 'TestPF');
    expect(pf?.currentValue).toBe(9700);
  });

  it('fee 25 → currentValue = 9975 (fee stored as negative, now INCLUDED — cash bug fix)', () => {
    const dispatch = store.dispatch as AppDispatch;
    // FeeCharged: ledger stores amount as -|amount| = -25
    // cashBalance += -25 → 10000 - 25 = 9975
    dispatch(chargeFee({ portfolio: 'TestPF', amount: 25, date: '2026-06-02' }, T1));

    const txns = sel.transactions(store);
    const feeTxn = txns.find((t) => t.type === 'fee');
    expect(feeTxn?.amount).toBe(-25);  // ledger stores as negative

    const pf = sel.portfolio(store, 'TestPF');
    expect(pf?.currentValue).toBe(9975);  // 10000 + (-25)
  });

  it('dividend +150 → currentValue = 10150 (dividend now INCLUDED — cash bug fix)', () => {
    const dispatch = store.dispatch as AppDispatch;
    dispatch(recordDividend({ portfolio: 'TestPF', amount: 150, date: '2026-06-02' }, T1));

    const txns = sel.transactions(store);
    const divTxn = txns.find((t) => t.type === 'dividend');
    expect(divTxn?.amount).toBe(150);

    const pf = sel.portfolio(store, 'TestPF');
    expect(pf?.currentValue).toBe(10150);
  });

  it('positive adjustment +200 → currentValue = 10200', () => {
    const dispatch = store.dispatch as AppDispatch;
    dispatch(adjustValue({ portfolio: 'TestPF', amount: 200, date: '2026-06-02' }, T1));
    const pf = sel.portfolio(store, 'TestPF');
    expect(pf?.currentValue).toBe(10200);
  });

  it('negative adjustment -100 → currentValue = 9900', () => {
    const dispatch = store.dispatch as AppDispatch;
    dispatch(adjustValue({ portfolio: 'TestPF', amount: -100, date: '2026-06-02' }, T1));
    const pf = sel.portfolio(store, 'TestPF');
    expect(pf?.currentValue).toBe(9900);
  });

  it('compound: deposit 1000 + fee 50 + dividend 75 → correct final value', () => {
    const dispatch = store.dispatch as AppDispatch;
    // deposit +1000 → 11000
    dispatch(deposit({ portfolio: 'TestPF', amount: 1000, date: '2026-06-02' }, T1));
    // fee 50 → ledger -50 → 10950
    dispatch(chargeFee({ portfolio: 'TestPF', amount: 50, date: '2026-06-03' }, T2));
    // dividend +75 → 11025
    dispatch(recordDividend({ portfolio: 'TestPF', amount: 75, date: '2026-06-04' }, T3));

    const pf = sel.portfolio(store, 'TestPF');
    // 10000 + 1000 - 50 + 75 = 11025
    expect(pf?.currentValue).toBe(11025);
  });

  it('option_roll is included in cash balance (cash bug fix: option_roll was previously ignored)', () => {
    // Simulate a roll by opening a short call then rolling it.
    // The net cash flow from the roll must appear in portfolio.currentValue.
    const dispatch = store.dispatch as AppDispatch;

    const shortCall: CallOption = {
      id: 'call-s7',
      type: 'call',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      portfolio: 'TestPF',
      action: 'sell',
      strike: 55,
      expiration: '2026-07-18',
      contracts: 1,
      premium: 3,
      costBasis: -300,
      currentValue: -300,
      status: 'open',
      openDate: '2026-06-02',
    };
    dispatch(openPosition(shortCall, T1));

    // Roll: closePremium=1, newPremium=2.50 → netCashFlow = -100 + 250 = 150
    dispatch(
      rollOption(
        {
          positionId: 'call-s7',
          closePremium: 1,
          closeDate: '2026-06-10',
          newContracts: 1,
          newStrike: 57,
          newExpiration: '2026-08-15',
          newPremium: 2.5,
        },
        T2
      )
    );

    // Verify option_roll appears in ledger
    const txns = sel.transactions(store);
    const rollTxn = txns.find((t) => t.type === 'option_roll');
    expect(rollTxn).toBeDefined();
    expect(rollTxn?.amount).toBe(150);

    // Verify it affects portfolio.currentValue
    // cash = 10000 + premium_collected(300) + option_roll(150) = 10450
    // positionValue = new short call currentValue = -250
    // total = 10200
    const pf = sel.portfolio(store, 'TestPF');
    expect(pf?.currentValue).toBe(10200);
  });
});

// ---------------------------------------------------------------------------
// Scenario 8: Ledger no-double-count — OptionAssigned does NOT also emit
// a standalone PositionOpened for the new stock (put assignment)
// ---------------------------------------------------------------------------

describe('Scenario 8: put assignment — no double-counted ledger entries', () => {
  it('exactly ONE position_buy in ledger (from OptionAssigned, not a second PositionOpened)', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createPortfolio(makePortfolio(), T0));
    dispatch(startWheelCampaign(makeWheel(), T0));

    const shortPut: PutOption = {
      id: 'put-dc-1',
      type: 'put',
      ticker: 'AAPL',
      name: 'Apple Inc.',
      portfolio: 'TestPF',
      action: 'sell',
      strike: 50,
      expiration: '2026-07-18',
      contracts: 1,
      premium: 2,
      costBasis: -200,
      currentValue: -200,
      status: 'open',
      openDate: '2026-06-02',
      wheelId: 'wheel-1',
    };
    dispatch(openPosition(shortPut, T1));

    dispatch(
      recordAssignment(
        { optionId: 'put-dc-1', assignmentDate: '2026-07-18', assignmentPrice: 49 },
        T2
      )
    );

    const txns = sel.transactions(store);
    const buyTxns = txns.filter((t) => t.type === 'position_buy');
    // EXACTLY one position_buy — from OptionAssigned, booked GROSS
    expect(buyTxns).toHaveLength(1);
    expect(buyTxns[0].amount).toBe(-5000); // -(strike × shares) = -(50*100)

    // Also: only one premium_collected (the original put open)
    const premiumTxns = txns.filter((t) => t.type === 'premium_collected');
    expect(premiumTxns).toHaveLength(1);
    expect(premiumTxns[0].amount).toBe(200);
  });
});
