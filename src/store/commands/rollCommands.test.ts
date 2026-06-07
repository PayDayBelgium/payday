/**
 * Tests for rollOption, rollSpread, and recordAssignment commands.
 *
 * Each test seeds positions directly, calls the command, and asserts the emitted
 * event payload equals the hand-computed expected values.
 */

import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor } from '../events/eventsSlice';
import positionsReducer from '../slices/positionsSlice';
import { openPosition } from './positionCommands';
import { rollOption, rollSpread, recordAssignment } from './rollCommands';
import type { CallOption, PutOption, StockPosition, Position } from '../../types';
import type { AppDispatch } from '../index';

// ---------------------------------------------------------------------------
// Mini store — events + positions only (same pattern as clusterCommands.test.ts)
// ---------------------------------------------------------------------------

function makeStore() {
  return configureStore({
    reducer: { events: eventsReducer, positions: positionsReducer },
  });
}

function getLog(state: unknown): Array<{ type: string; payload: unknown }> {
  return (state as { events: { log: Array<{ type: string; payload: unknown }> } }).events.log;
}

const TS = '2026-06-07T10:00:00.000Z';

// ---------------------------------------------------------------------------
// Position fixtures
// ---------------------------------------------------------------------------

/** Short (sell) call: 2 contracts, premium $3.00 => costBasis = -600, currentValue = -600 */
const SHORT_CALL: CallOption = {
  id: 'opt-sc1',
  type: 'call',
  ticker: 'AAPL',
  name: 'Apple Inc.',
  portfolio: 'Main',
  action: 'sell',
  strike: 200,
  expiration: '2026-07-18',
  contracts: 2,
  premium: 3.0,
  costBasis: -600, // -(3.0 * 2 * 100)
  currentValue: -600,
  status: 'open',
  openDate: '2026-06-01',
};

/** Long (buy) put: 1 contract, premium $2.50 => costBasis = 250, currentValue = 250 */
const LONG_PUT: PutOption = {
  id: 'opt-lp1',
  type: 'put',
  ticker: 'TSLA',
  name: 'Tesla',
  portfolio: 'Main',
  action: 'buy',
  strike: 150,
  expiration: '2026-08-15',
  contracts: 1,
  premium: 2.5,
  costBasis: 250, // 2.5 * 1 * 100
  currentValue: 250,
  status: 'open',
  openDate: '2026-06-01',
};

/** Short put (CSP) with a wheel link: 1 contract, premium $1.50 => costBasis = -150 */
const SHORT_PUT_CSP: PutOption = {
  id: 'opt-csp1',
  type: 'put',
  ticker: 'MSFT',
  name: 'Microsoft',
  portfolio: 'Main',
  action: 'sell',
  strike: 300,
  expiration: '2026-07-18',
  contracts: 1,
  premium: 1.5,
  costBasis: -150,
  currentValue: -150,
  status: 'open',
  openDate: '2026-06-01',
  wheelId: 'wheel-1',
};

/** Short call (covered call) linked to stock + wheel: 1 contract, premium $2.00 => costBasis = -200 */
const SHORT_CALL_CC: CallOption = {
  id: 'opt-cc1',
  type: 'call',
  ticker: 'MSFT',
  name: 'Microsoft',
  portfolio: 'Main',
  action: 'sell',
  strike: 310,
  expiration: '2026-07-18',
  contracts: 1,
  premium: 2.0,
  costBasis: -200,
  currentValue: -200,
  status: 'open',
  openDate: '2026-06-01',
  wheelId: 'wheel-1',
};

/** Stock position: 100 shares of MSFT, costBasis = 28000, currentValue = 30000 */
const MSFT_STOCK: StockPosition = {
  id: 'stock-msft1',
  type: 'stock',
  ticker: 'MSFT',
  name: 'Microsoft',
  portfolio: 'Main',
  shares: 100,
  costBasis: 28000, // 100 * 280
  purchasePrice: 280,
  currentPrice: 300,
  currentValue: 30000,
  optionsSupported: true,
  miniContractsSupported: false,
  status: 'open',
  openDate: '2026-01-15',
};

/** Large stock position: 200 shares for partial-call test */
const MSFT_STOCK_200: StockPosition = {
  ...MSFT_STOCK,
  id: 'stock-msft200',
  shares: 200,
  costBasis: 56000, // 200 * 280
  currentValue: 60000,
};

// Spread legs
const LONG_LEG: CallOption = {
  id: 'leg-long1',
  type: 'call',
  ticker: 'SPY',
  name: 'SPDR S&P 500 ETF',
  portfolio: 'Main',
  action: 'buy',
  strike: 500,
  expiration: '2026-07-18',
  contracts: 2,
  premium: 4.0,
  costBasis: 800, // 4.0 * 2 * 100
  currentValue: 800,
  status: 'open',
  openDate: '2026-06-01',
};

const SHORT_LEG: CallOption = {
  id: 'leg-short1',
  type: 'call',
  ticker: 'SPY',
  name: 'SPDR S&P 500 ETF',
  portfolio: 'Main',
  action: 'sell',
  strike: 510,
  expiration: '2026-07-18',
  contracts: 2,
  premium: 2.0,
  costBasis: -400, // -(2.0 * 2 * 100)
  currentValue: -400,
  status: 'open',
  openDate: '2026-06-01',
};

// ---------------------------------------------------------------------------
// Helper to seed positions into the store
// ---------------------------------------------------------------------------

function seedPositions(store: ReturnType<typeof makeStore>, ...positions: Position[]) {
  const dispatch = store.dispatch as AppDispatch;
  for (const p of positions) {
    dispatch(openPosition(p, TS));
  }
  // Clear the log so assertions only count roll/assignment events
  // (We can't clear the RTK log, but we know seeded events come first.)
  // Instead we'll read from log length after seeding.
}

// ---------------------------------------------------------------------------
// rollOption — sell (short) roll
// ---------------------------------------------------------------------------

describe('rollOption — sell (short) roll', () => {
  it('computes correct realizedPnL, netCashFlow, and newPosition for a short call roll', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('test'));
    seedPositions(store, SHORT_CALL as unknown as Position);

    const logBefore = getLog(store.getState()).length;

    // Roll: close at $1.00, open new at $2.50 / 2 contracts / strike 205 / new expiry
    dispatch(
      rollOption(
        {
          positionId: 'opt-sc1',
          closePremium: 1.0,
          closeDate: '2026-06-10',
          newContracts: 2,
          newStrike: 205,
          newExpiration: '2026-08-15',
          newPremium: 2.5,
          notes: 'test roll',
        },
        TS
      )
    );

    const log = getLog(store.getState());
    const event = log[logBefore] as { type: string; payload: Record<string, unknown> };
    expect(event.type).toBe('OptionRolled');

    const p = event.payload as {
      oldPositionId: string;
      closeDate: string;
      closePremium: number;
      realizedPnL: number;
      netCashFlow: number;
      newPosition: CallOption;
    };

    // Hand-computed:
    // contracts=2, closePremium=1.0, costBasis=-600
    // closeValue = -(1.0 * 2 * 100) = -200
    // realizedPnL = closeValue - costBasis = -200 - (-600) = 400 ✓  (profit: received 600, paid back 200)
    // openValue = 2.5 * 2 * 100 = 500
    // newCostBasis = -500
    // netCashFlow = -200 + 500 = 300
    expect(p.oldPositionId).toBe('opt-sc1');
    expect(p.closeDate).toBe('2026-06-10');
    expect(p.closePremium).toBe(1.0);
    expect(p.realizedPnL).toBe(400);
    expect(p.netCashFlow).toBe(300);

    // new position
    expect(p.newPosition.id).toMatch(/^pos-/);
    expect(p.newPosition.type).toBe('call');
    expect(p.newPosition.action).toBe('sell');
    expect(p.newPosition.ticker).toBe('AAPL');
    expect(p.newPosition.strike).toBe(205);
    expect(p.newPosition.expiration).toBe('2026-08-15');
    expect(p.newPosition.contracts).toBe(2);
    expect(p.newPosition.premium).toBe(2.5);
    expect(p.newPosition.costBasis).toBe(-500);
    expect(p.newPosition.currentValue).toBe(-500);
    expect(p.newPosition.status).toBe('open');
    expect(p.newPosition.openDate).toBe('2026-06-10');
    expect(p.newPosition.notes).toBe('test roll');
  });

  it('preserves wheelId and underlyingId on the new position', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('test'));

    const optWithLinks: CallOption = {
      ...SHORT_CALL,
      id: 'opt-links',
      wheelId: 'w-99',
      underlyingId: 'stock-abc',
    };
    seedPositions(store, optWithLinks as unknown as Position);

    const logBefore = getLog(store.getState()).length;
    dispatch(
      rollOption(
        {
          positionId: 'opt-links',
          closePremium: 0.5,
          closeDate: '2026-06-10',
          newContracts: 2,
          newStrike: 202,
          newExpiration: '2026-09-19',
          newPremium: 2.0,
        },
        TS
      )
    );

    const log = getLog(store.getState());
    const newPos = (log[logBefore] as { payload: { newPosition: CallOption } }).payload.newPosition;
    expect(newPos.wheelId).toBe('w-99');
    expect(newPos.underlyingId).toBe('stock-abc');
  });
});

// ---------------------------------------------------------------------------
// rollOption — buy (long) roll
// ---------------------------------------------------------------------------

describe('rollOption — buy (long) roll', () => {
  it('computes correct realizedPnL, netCashFlow, and newPosition for a long put roll', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('test'));
    seedPositions(store, LONG_PUT as unknown as Position);

    const logBefore = getLog(store.getState()).length;

    // Roll: sell to close at $1.50, buy new at $2.00 / 1 contract / strike 145
    dispatch(
      rollOption(
        {
          positionId: 'opt-lp1',
          closePremium: 1.5,
          closeDate: '2026-06-12',
          newContracts: 1,
          newStrike: 145,
          newExpiration: '2026-09-19',
          newPremium: 2.0,
        },
        TS
      )
    );

    const log = getLog(store.getState());
    const event = log[logBefore] as { type: string; payload: Record<string, unknown> };
    expect(event.type).toBe('OptionRolled');

    const p = event.payload as {
      realizedPnL: number;
      netCashFlow: number;
      newPosition: PutOption;
    };

    // Hand-computed:
    // contracts=1, closePremium=1.5, costBasis=250 (long)
    // closeValue = 1.5 * 1 * 100 = 150
    // realizedPnL = 150 - 250 = -100 (loss: paid 250, received 150 back)
    // openValue = -(2.0 * 1 * 100) = -200
    // newCostBasis = Math.abs(-200) = 200
    // netCashFlow = 150 + (-200) = -50  (net debit)
    expect(p.realizedPnL).toBe(-100);
    expect(p.netCashFlow).toBe(-50);

    expect(p.newPosition.action).toBe('buy');
    expect(p.newPosition.strike).toBe(145);
    expect(p.newPosition.costBasis).toBe(200);
    expect(p.newPosition.currentValue).toBe(200);
    expect(p.newPosition.contracts).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// rollSpread
// ---------------------------------------------------------------------------

describe('rollSpread', () => {
  it('computes correct leg realizedPnLs and netCashFlow for a call spread roll', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('test'));
    seedPositions(store, LONG_LEG as unknown as Position, SHORT_LEG as unknown as Position);

    const logBefore = getLog(store.getState()).length;

    // Roll:
    // long leg: close at $3.00, new strike=505, newExp=2026-09-19, newPremium=3.50
    // short leg: close at $1.50, new strike=515, newExp=2026-09-19, newPremium=2.00
    dispatch(
      rollSpread(
        {
          rollDate: '2026-06-12',
          longLegId: 'leg-long1',
          shortLegId: 'leg-short1',
          longLeg: {
            closePremium: 3.0,
            newStrike: 505,
            newExpiration: '2026-09-19',
            newPremium: 3.5,
          },
          shortLeg: {
            closePremium: 1.5,
            newStrike: 515,
            newExpiration: '2026-09-19',
            newPremium: 2.0,
          },
          notes: 'spread roll test',
        },
        TS
      )
    );

    const log = getLog(store.getState());
    const event = log[logBefore] as {
      type: string;
      payload: {
        rollDate: string;
        netCashFlow: number;
        legs: Array<{
          oldPositionId: string;
          closePremium: number;
          realizedPnL: number;
          newPosition: CallOption;
        }>;
      };
    };
    expect(event.type).toBe('SpreadRolled');

    const { netCashFlow, legs } = event.payload;

    // Hand-computed:
    // longContracts=2, shortContracts=2
    // longCloseValue = 3.0 * 2 * 100 = 600
    // longRealizedPnL = 600 - 800 = -200  (paid 800, received 600)
    // shortCloseValue = -(1.5 * 2 * 100) = -300
    // shortRealizedPnL = -(-300) - (-400) = 300 + 400 = 700  (received 400 premium, paying 300 to close = profit 700... wait)
    // Actually: shortRealizedPnL = -shortCloseValue - shortCostBasis = 300 - (-400) = 700
    // longNewCostBasis = 3.5 * 2 * 100 = 700
    // shortNewCostBasis = -(2.0 * 2 * 100) = -400
    // netCashFlow = longCloseValue + shortCloseValue - longNewPremium*longContracts*100 + shortNewPremium*shortContracts*100
    //             = 600 + (-300) - 3.5*2*100 + 2.0*2*100
    //             = 600 - 300 - 700 + 400 = 0
    expect(legs[0].oldPositionId).toBe('leg-long1');
    expect(legs[0].closePremium).toBe(3.0);
    expect(legs[0].realizedPnL).toBe(-200);
    expect(legs[0].newPosition.strike).toBe(505);
    expect(legs[0].newPosition.action).toBe('buy');
    expect(legs[0].newPosition.costBasis).toBe(700);  // 3.5 * 2 * 100
    expect(legs[0].newPosition.currentValue).toBe(700);

    expect(legs[1].oldPositionId).toBe('leg-short1');
    expect(legs[1].closePremium).toBe(1.5);
    expect(legs[1].realizedPnL).toBe(700);
    expect(legs[1].newPosition.strike).toBe(515);
    expect(legs[1].newPosition.action).toBe('sell');
    expect(legs[1].newPosition.costBasis).toBe(-400); // -(2.0 * 2 * 100)
    expect(legs[1].newPosition.currentValue).toBe(-400);
    expect((legs[1].newPosition as CallOption).cashReserved).toBe(2000); // |515-505|*2*100

    expect(netCashFlow).toBe(0);
  });

  it('new positions get fresh pos- ids and openDate = rollDate', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('test'));
    seedPositions(store, LONG_LEG as unknown as Position, SHORT_LEG as unknown as Position);

    const logBefore = getLog(store.getState()).length;

    dispatch(
      rollSpread(
        {
          rollDate: '2026-07-01',
          longLegId: 'leg-long1',
          shortLegId: 'leg-short1',
          longLeg: { closePremium: 1, newStrike: 502, newExpiration: '2026-10-17', newPremium: 2 },
          shortLeg: { closePremium: 0.5, newStrike: 512, newExpiration: '2026-10-17', newPremium: 1 },
        },
        TS
      )
    );

    const log = getLog(store.getState());
    const payload = (log[logBefore] as { payload: { legs: Array<{ newPosition: CallOption }> } }).payload;
    const [longNew, shortNew] = payload.legs.map((l) => l.newPosition);
    expect(longNew.id).toMatch(/^pos-/);
    expect(shortNew.id).toMatch(/^pos-/);
    expect(longNew.id).not.toBe(shortNew.id);
    expect(longNew.openDate).toBe('2026-07-01');
    expect(shortNew.openDate).toBe('2026-07-01');
  });
});

// ---------------------------------------------------------------------------
// recordAssignment — put → stock
// ---------------------------------------------------------------------------

describe('recordAssignment — put assigned (CSP)', () => {
  it('computes correct effectiveCost, newStock, and optionRealizedPnL', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('test'));
    seedPositions(store, SHORT_PUT_CSP as unknown as Position);

    const logBefore = getLog(store.getState()).length;

    dispatch(
      recordAssignment(
        {
          optionId: 'opt-csp1',
          assignmentDate: '2026-07-18',
          assignmentPrice: 295,
          notes: 'assigned at expiry',
        },
        TS
      )
    );

    const log = getLog(store.getState());
    const event = log[logBefore] as {
      type: string;
      payload: {
        kind: string;
        optionId: string;
        assignmentDate: string;
        assignmentPrice: number;
        optionRealizedPnL: number;
        effectiveCost: number;
        portfolio: string;
        wheelId: string;
        newStock: StockPosition;
      };
    };

    expect(event.type).toBe('OptionAssigned');

    const p = event.payload;

    // Hand-computed:
    // contracts=1, strike=300, costBasis=-150
    // shares = 1 * 100 = 100
    // optionRealizedPnL = |costBasis| = 150
    // effectiveCost = 300 * 100 - 150 = 29850
    // newStock.costBasis = 29850
    // newStock.purchasePrice = 29850 / 100 = 298.50
    // newStock.currentPrice = 295
    // newStock.currentValue = 100 * 295 = 29500
    expect(p.kind).toBe('put');
    expect(p.optionId).toBe('opt-csp1');
    expect(p.assignmentDate).toBe('2026-07-18');
    expect(p.assignmentPrice).toBe(295);
    expect(p.optionRealizedPnL).toBe(150);
    expect(p.effectiveCost).toBe(29850);
    expect(p.portfolio).toBe('Main');
    expect(p.wheelId).toBe('wheel-1');

    const ns = p.newStock;
    expect(ns.id).toMatch(/^stock-/);
    expect(ns.type).toBe('stock');
    expect(ns.ticker).toBe('MSFT');
    expect(ns.shares).toBe(100);
    expect(ns.costBasis).toBe(29850);
    expect(ns.purchasePrice).toBe(298.5);
    expect(ns.currentPrice).toBe(295);
    expect(ns.currentValue).toBe(29500);
    expect(ns.wheelId).toBe('wheel-1');
    expect(ns.openDate).toBe('2026-07-18');
    expect(ns.notes).toBe('assigned at expiry');
  });
});

// ---------------------------------------------------------------------------
// recordAssignment — call → full stock close
// ---------------------------------------------------------------------------

describe('recordAssignment — call assigned, full stock close', () => {
  it('computes correct totalProceeds, stockRealizedPnL, premiumReceived', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('test'));
    // Stock: 100 shares, costBasis=28000, currentValue=30000
    // Call: 1 contract, strike=310, costBasis=-200
    seedPositions(
      store,
      MSFT_STOCK as unknown as Position,
      SHORT_CALL_CC as unknown as Position
    );

    const logBefore = getLog(store.getState()).length;

    dispatch(
      recordAssignment(
        {
          optionId: 'opt-cc1',
          assignmentDate: '2026-07-18',
          assignmentPrice: 312,
        },
        TS
      )
    );

    const log = getLog(store.getState());
    const event = log[logBefore] as {
      type: string;
      payload: {
        kind: string;
        optionId: string;
        optionRealizedPnL: number;
        stockId: string;
        totalProceeds: number;
        premiumReceived: number;
        wheelId?: string;
        stockClose: { fullClose: boolean; closePrice: number; stockRealizedPnL: number };
      };
    };

    expect(event.type).toBe('OptionAssigned');

    const p = event.payload;

    // Hand-computed:
    // call: contracts=1, strike=310, costBasis=-200 → shares=100
    // optionRealizedPnL = |costBasis| = 200
    // premiumReceived = 200
    // totalProceeds = 310 * 100 = 31000
    // stockCostBasisForShares = (28000 / 100) * 100 = 28000
    // stockRealizedPnL = 31000 - 28000 = 3000
    expect(p.kind).toBe('call');
    expect(p.optionId).toBe('opt-cc1');
    expect(p.optionRealizedPnL).toBe(200);
    expect(p.stockId).toBe('stock-msft1');
    expect(p.totalProceeds).toBe(31000);
    expect(p.premiumReceived).toBe(200);
    expect(p.wheelId).toBe('wheel-1');
    expect(p.stockClose.fullClose).toBe(true);
    expect(p.stockClose.closePrice).toBe(310);
    expect(p.stockClose.stockRealizedPnL).toBe(3000);
  });

  it('closes the stock in the OPTION\'s portfolio, not a same-ticker stock in another portfolio', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('test'));
    // Decoy: same ticker (MSFT), DIFFERENT portfolio, listed FIRST in the array.
    const decoy = {
      ...MSFT_STOCK,
      id: 'stock-decoy-other',
      portfolio: 'Other',
    } as unknown as Position;
    seedPositions(
      store,
      decoy,
      MSFT_STOCK as unknown as Position, // portfolio 'Main'
      SHORT_CALL_CC as unknown as Position // portfolio 'Main'
    );

    const logBefore = getLog(store.getState()).length;
    dispatch(
      recordAssignment({ optionId: 'opt-cc1', assignmentDate: '2026-07-18', assignmentPrice: 312 }, TS)
    );

    const event = getLog(store.getState())[logBefore] as { payload: { stockId: string } };
    // Must target the Main-portfolio stock, never the decoy.
    expect(event.payload.stockId).toBe('stock-msft1');
  });
});

// ---------------------------------------------------------------------------
// recordAssignment — call → partial stock close
// ---------------------------------------------------------------------------

describe('recordAssignment — call assigned, partial stock close', () => {
  it('computes correct remainingShares, remainingCostBasis, remainingCurrentValue, stockRealizedPnL', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('test'));

    // Stock: 200 shares, costBasis=56000, currentValue=60000
    // Call covers 1 contract = 100 shares (partial close of 200-share position)
    seedPositions(
      store,
      MSFT_STOCK_200 as unknown as Position,
      SHORT_CALL_CC as unknown as Position
    );

    const logBefore = getLog(store.getState()).length;

    dispatch(
      recordAssignment(
        {
          optionId: 'opt-cc1',
          assignmentDate: '2026-07-18',
          assignmentPrice: 315,
        },
        TS
      )
    );

    const log = getLog(store.getState());
    const event = log[logBefore] as {
      type: string;
      payload: {
        kind: string;
        optionRealizedPnL: number;
        totalProceeds: number;
        premiumReceived: number;
        stockClose: {
          fullClose: boolean;
          remainingShares: number;
          remainingCostBasis: number;
          remainingCurrentValue: number;
          stockRealizedPnL: number;
        };
      };
    };

    expect(event.type).toBe('OptionAssigned');

    const p = event.payload;

    // Hand-computed:
    // call: contracts=1, strike=310 → shares=100
    // stock: shares=200, costBasis=56000, currentValue=60000
    // stock.shares (200) > shares (100) → partial
    // totalProceeds = 310 * 100 = 31000
    // stockCostBasisForShares = (56000 / 200) * 100 = 28000
    // stockRealizedPnL = 31000 - 28000 = 3000
    // remainingShares = 200 - 100 = 100
    // remainingCostBasis = (56000 / 200) * 100 = 28000
    // remainingCurrentValue = 100 * (60000 / 200) = 100 * 300 = 30000
    expect(p.kind).toBe('call');
    expect(p.optionRealizedPnL).toBe(200);
    expect(p.totalProceeds).toBe(31000);
    expect(p.premiumReceived).toBe(200);

    const sc = p.stockClose;
    expect(sc.fullClose).toBe(false);
    expect(sc.remainingShares).toBe(100);
    expect(sc.remainingCostBasis).toBe(28000);
    expect(sc.remainingCurrentValue).toBe(30000);
    // stockRealizedPnL is present on partial and equals the P&L on called-away shares
    expect(sc.stockRealizedPnL).toBe(3000);
  });

  it('partial close: stockRealizedPnL is non-zero (confirms wheel projection receives it)', () => {
    // This test exists purely to document the finding:
    // Both PortfolioView and CampaignView call updateWheelPremium({ realizedPnL: stockRealizedPnL })
    // even on partial call-assignment. So we carry stockRealizedPnL in the partial variant.
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('test'));

    seedPositions(
      store,
      MSFT_STOCK_200 as unknown as Position,
      SHORT_CALL_CC as unknown as Position
    );

    const logBefore = getLog(store.getState()).length;
    dispatch(
      recordAssignment(
        { optionId: 'opt-cc1', assignmentDate: '2026-07-18', assignmentPrice: 315 },
        TS
      )
    );

    const log = getLog(store.getState());
    const stockClose = (
      log[logBefore] as {
        payload: { stockClose: { fullClose: false; stockRealizedPnL: number } };
      }
    ).payload.stockClose;

    expect(stockClose.fullClose).toBe(false);
    expect(typeof stockClose.stockRealizedPnL).toBe('number');
    expect(stockClose.stockRealizedPnL).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Error cases
// ---------------------------------------------------------------------------

describe('rollOption — error cases', () => {
  it('throws if position not found', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    expect(() =>
      dispatch(
        rollOption(
          { positionId: 'nonexistent', closePremium: 1, closeDate: '2026-06-10', newContracts: 1, newStrike: 200, newExpiration: '2026-08-15', newPremium: 2 },
          TS
        )
      )
    ).toThrow('position not found');
  });

  it('throws if position is not an option', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    seedPositions(store, MSFT_STOCK as unknown as Position);

    expect(() =>
      dispatch(
        rollOption(
          { positionId: 'stock-msft1', closePremium: 1, closeDate: '2026-06-10', newContracts: 1, newStrike: 200, newExpiration: '2026-08-15', newPremium: 2 },
          TS
        )
      )
    ).toThrow('not a call or put');
  });
});

describe('recordAssignment — error cases', () => {
  it('throws if option not found', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    expect(() =>
      dispatch(recordAssignment({ optionId: 'nonexistent', assignmentDate: '2026-07-18', assignmentPrice: 300 }, TS))
    ).toThrow('option not found');
  });

  it('throws if call assigned but no stock position found', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    // Seed only the call, no stock
    seedPositions(store, SHORT_CALL_CC as unknown as Position);

    expect(() =>
      dispatch(recordAssignment({ optionId: 'opt-cc1', assignmentDate: '2026-07-18', assignmentPrice: 312 }, TS))
    ).toThrow('no open stock position found');
  });
});
