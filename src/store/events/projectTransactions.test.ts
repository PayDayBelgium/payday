import { describe, it, expect } from 'vitest';
import { applyTransactionEvent } from './projectTransactions';
import type { StockPosition, CallOption, PutOption, PortfolioTransaction } from '../../types';
import type { DomainEvent } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function event(
  type: string,
  payload: unknown,
  id = 'ev1',
  timestamp = '2026-01-15T12:00:00.000Z'
): DomainEvent {
  return {
    id,
    seq: 1,
    type,
    payload,
    timestamp,
    actor: 'test',
    schemaVersion: 1,
  } as unknown as DomainEvent;
}

const EMPTY: PortfolioTransaction[] = [];

// ---------------------------------------------------------------------------
// Fixture builders
// ---------------------------------------------------------------------------

function stockPos(overrides: Partial<StockPosition> = {}): StockPosition {
  return {
    id: 'pos-stock-1',
    type: 'stock',
    ticker: 'AAPL',
    portfolio: 'Main',
    status: 'open',
    openDate: '2026-01-01',
    shares: 100,
    purchasePrice: 150,
    costBasis: 15000, // 100 * 150
    currentPrice: 155,
    currentValue: 15500,
    optionsSupported: true,
    ...overrides,
  } as StockPosition;
}

function callOption(overrides: Partial<CallOption> = {}): CallOption {
  return {
    id: 'pos-call-1',
    type: 'call',
    action: 'sell',
    ticker: 'AAPL',
    portfolio: 'Main',
    status: 'open',
    openDate: '2026-01-01',
    strike: 160,
    expiration: '2026-03-21',
    contracts: 1,
    premium: 3,
    costBasis: -300, // -premium * contracts * 100 for sold
    currentValue: -300,
    ...overrides,
  } as CallOption;
}

function putOption(overrides: Partial<PutOption> = {}): PutOption {
  return {
    id: 'pos-put-1',
    type: 'put',
    action: 'sell',
    ticker: 'AAPL',
    portfolio: 'Main',
    status: 'open',
    openDate: '2026-01-01',
    strike: 145,
    expiration: '2026-03-21',
    contracts: 2,
    premium: 2.5,
    costBasis: -500, // -premium * contracts * 100
    currentValue: -500,
    ...overrides,
  } as PutOption;
}

// ---------------------------------------------------------------------------
// Cash events
// ---------------------------------------------------------------------------

describe('CashDeposited', () => {
  it('produces a deposit transaction with positive amount', () => {
    const ev = event('CashDeposited', {
      id: 'cash-1',
      portfolio: 'Main',
      amount: 5000,
      date: '2026-01-10',
    });
    const [txn] = applyTransactionEvent(EMPTY, ev, []);
    expect(txn.type).toBe('deposit');
    expect(txn.amount).toBe(5000);
    expect(txn.portfolio).toBe('Main');
    expect(txn.date).toBe('2026-01-10');
    expect(txn.id).toBe('txn-ev1');
    expect(txn.createdAt).toBe('2026-01-15T12:00:00.000Z');
  });
});

describe('CashWithdrawn', () => {
  it('produces a withdrawal transaction with positive magnitude', () => {
    const ev = event('CashWithdrawn', {
      id: 'cash-2',
      portfolio: 'Main',
      amount: 1000,
      date: '2026-01-11',
      description: 'Monthly withdrawal',
    });
    const [txn] = applyTransactionEvent(EMPTY, ev, []);
    expect(txn.type).toBe('withdrawal');
    expect(txn.amount).toBe(1000); // positive magnitude
    expect(txn.description).toBe('Monthly withdrawal');
  });
});

describe('FeeCharged', () => {
  it('produces a fee transaction with negative amount', () => {
    const ev = event('FeeCharged', {
      id: 'cash-3',
      portfolio: 'Main',
      amount: 15, // stored as positive in payload
      date: '2026-01-12',
    });
    const [txn] = applyTransactionEvent(EMPTY, ev, []);
    expect(txn.type).toBe('fee');
    expect(txn.amount).toBe(-15); // always negative
  });

  it('normalises a negative-valued fee payload to negative amount', () => {
    const ev = event('FeeCharged', {
      id: 'cash-3b',
      portfolio: 'Main',
      amount: -15, // some callers may already send negative
      date: '2026-01-12',
    });
    const [txn] = applyTransactionEvent(EMPTY, ev, []);
    expect(txn.amount).toBe(-15);
  });
});

describe('DividendReceived', () => {
  it('produces a dividend transaction with positive amount', () => {
    const ev = event('DividendReceived', {
      id: 'cash-4',
      portfolio: 'Main',
      amount: 75,
      date: '2026-01-13',
    });
    const [txn] = applyTransactionEvent(EMPTY, ev, []);
    expect(txn.type).toBe('dividend');
    expect(txn.amount).toBe(75);
  });
});

describe('ValueAdjusted', () => {
  it('produces an adjustment with the signed amount as given (positive)', () => {
    const ev = event('ValueAdjusted', {
      id: 'cash-5',
      portfolio: 'Main',
      amount: 200,
      date: '2026-01-14',
    });
    const [txn] = applyTransactionEvent(EMPTY, ev, []);
    expect(txn.type).toBe('adjustment');
    expect(txn.amount).toBe(200);
  });

  it('preserves a negative adjustment sign', () => {
    const ev = event('ValueAdjusted', {
      id: 'cash-5b',
      portfolio: 'Main',
      amount: -300,
      date: '2026-01-14',
    });
    const [txn] = applyTransactionEvent(EMPTY, ev, []);
    expect(txn.amount).toBe(-300);
  });
});

// ---------------------------------------------------------------------------
// PositionOpened
// ---------------------------------------------------------------------------

describe('PositionOpened — stock', () => {
  it('produces a negative position_buy (cash out)', () => {
    const pos = stockPos();
    const ev = event('PositionOpened', { position: pos });
    const [txn] = applyTransactionEvent(EMPTY, ev, []);
    expect(txn.type).toBe('position_buy');
    expect(txn.amount).toBe(-15000); // -costBasis
    expect(txn.relatedPositionId).toBe('pos-stock-1');
    expect(txn.date).toBe('2026-01-01');
    expect(txn.portfolio).toBe('Main');
  });
});

describe('PositionOpened — sold call option', () => {
  it('produces a positive premium_collected', () => {
    const pos = callOption({ action: 'sell', costBasis: -300 });
    const ev = event('PositionOpened', { position: pos });
    const [txn] = applyTransactionEvent(EMPTY, ev, []);
    expect(txn.type).toBe('premium_collected');
    expect(txn.amount).toBe(300); // Math.abs(-300)
    expect(txn.relatedPositionId).toBe('pos-call-1');
  });
});

describe('PositionOpened — bought put option', () => {
  it('produces a negative premium_paid', () => {
    const pos = putOption({ action: 'buy', costBasis: 500 });
    const ev = event('PositionOpened', { position: pos });
    const [txn] = applyTransactionEvent(EMPTY, ev, []);
    expect(txn.type).toBe('premium_paid');
    expect(txn.amount).toBe(-500); // -Math.abs(costBasis)
    expect(txn.relatedPositionId).toBe('pos-put-1');
  });
});

// ---------------------------------------------------------------------------
// PositionClosed
// ---------------------------------------------------------------------------

describe('PositionClosed — stock', () => {
  it('produces position_sell = closePrice * shares', () => {
    const pos = stockPos();
    const ev = event('PositionClosed', {
      id: 'pos-stock-1',
      closeDate: '2026-02-15',
      closePrice: 160,
    });
    const [txn] = applyTransactionEvent(EMPTY, ev, [pos]);
    expect(txn.type).toBe('position_sell');
    expect(txn.amount).toBe(16000); // 160 * 100
    expect(txn.date).toBe('2026-02-15');
    expect(txn.relatedPositionId).toBe('pos-stock-1');
    expect(txn.portfolio).toBe('Main');
  });
});

describe('PositionClosed — long (buy) option', () => {
  it('produces positive position_sell = closePremium * contracts * 100', () => {
    const pos = callOption({ action: 'buy', costBasis: 400 });
    const ev = event('PositionClosed', {
      id: 'pos-call-1',
      closeDate: '2026-02-20',
      closePremium: 5,
    });
    const [txn] = applyTransactionEvent(EMPTY, ev, [pos]);
    expect(txn.type).toBe('position_sell');
    expect(txn.amount).toBe(500); // 5 * 1 * 100 — positive cash inflow for long close
  });
});

describe('PositionClosed — short (sell) option', () => {
  it('produces negative position_sell = -(closePremium * contracts * 100)', () => {
    const pos = putOption({ action: 'sell', contracts: 2, costBasis: -500 });
    const ev = event('PositionClosed', {
      id: 'pos-put-1',
      closeDate: '2026-02-20',
      closePremium: 1, // buying back at 1 per contract
    });
    const [txn] = applyTransactionEvent(EMPTY, ev, [pos]);
    expect(txn.type).toBe('position_sell');
    expect(txn.amount).toBe(-200); // -(1 * 2 * 100)
  });
});

describe('PositionClosed — missing position', () => {
  it('returns the same array reference unchanged', () => {
    const ev = event('PositionClosed', {
      id: 'nonexistent',
      closeDate: '2026-02-01',
    });
    const result = applyTransactionEvent(EMPTY, ev, []);
    expect(result).toBe(EMPTY); // same reference
  });
});

// ---------------------------------------------------------------------------
// OptionRolled
// ---------------------------------------------------------------------------

describe('OptionRolled', () => {
  it('produces a single option_roll with netCashFlow', () => {
    const newPos = callOption({ id: 'pos-call-new', action: 'sell', costBasis: -350 });
    const ev = event('OptionRolled', {
      oldPositionId: 'pos-call-1',
      closeDate: '2026-02-21',
      closePremium: 1,
      realizedPnL: 200,
      newPosition: newPos,
      netCashFlow: 50, // e.g. collected 350 on new - paid 300 to close = 50 net
    });
    const [txn] = applyTransactionEvent(EMPTY, ev, []);
    expect(txn.type).toBe('option_roll');
    expect(txn.amount).toBe(50);
    expect(txn.relatedPositionId).toBe('pos-call-new');
    expect(txn.portfolio).toBe('Main');
    expect(txn.date).toBe('2026-02-21');
    expect(txn.id).toBe('txn-ev1');
  });

  it('produces exactly one transaction even when netCashFlow is negative', () => {
    const newPos = callOption({ id: 'pos-call-new2', action: 'buy', costBasis: 200 });
    const ev = event('OptionRolled', {
      oldPositionId: 'pos-call-1',
      closeDate: '2026-02-21',
      closePremium: 1,
      realizedPnL: -100,
      newPosition: newPos,
      netCashFlow: -80,
    });
    const result = applyTransactionEvent(EMPTY, ev, []);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(-80);
  });
});

// ---------------------------------------------------------------------------
// SpreadRolled
// ---------------------------------------------------------------------------

describe('SpreadRolled', () => {
  it('produces a single option_roll using the first leg and netCashFlow', () => {
    const longNew = callOption({ id: 'leg-long-new', action: 'buy', costBasis: 400 });
    const shortNew = callOption({ id: 'leg-short-new', action: 'sell', costBasis: -600 });
    const ev = event('SpreadRolled', {
      rollDate: '2026-02-25',
      legs: [
        { oldPositionId: 'leg-long-old', closePremium: 3, realizedPnL: -100, newPosition: longNew },
        {
          oldPositionId: 'leg-short-old',
          closePremium: 2,
          realizedPnL: 200,
          newPosition: shortNew,
        },
      ],
      netCashFlow: 200,
    });
    const result = applyTransactionEvent(EMPTY, ev, []);
    expect(result).toHaveLength(1);
    const [txn] = result;
    expect(txn.type).toBe('option_roll');
    expect(txn.amount).toBe(200);
    expect(txn.date).toBe('2026-02-25');
    expect(txn.relatedPositionId).toBe('leg-long-new'); // first leg
    expect(txn.portfolio).toBe('Main');
  });
});

// ---------------------------------------------------------------------------
// OptionAssigned — put → stock purchase
// ---------------------------------------------------------------------------

describe('OptionAssigned kind=put', () => {
  it('produces position_buy with amount = -(strike × shares), NOT -effectiveCost', () => {
    // The premium was already credited at open via premium_collected, so the
    // assignment ledger line must book the GROSS cash outflow (strike × shares).
    // Gross = effectiveCost + optionRealizedPnL (optionRealizedPnL = |costBasis| = premium kept).
    const newStock = stockPos({ id: 'stock-assigned', shares: 200, purchasePrice: 145 });
    const ev = event('OptionAssigned', {
      kind: 'put',
      optionId: 'pos-put-1',
      assignmentDate: '2026-03-21',
      assignmentPrice: 145,
      optionRealizedPnL: 500,
      newStock,
      effectiveCost: 28500, // strike*shares - premium = 29000 - 500
      portfolio: 'Main',
    });
    const result = applyTransactionEvent(EMPTY, ev, []);
    expect(result).toHaveLength(1);
    const [txn] = result;
    expect(txn.type).toBe('position_buy');
    expect(txn.amount).toBe(-29000); // -(strike × shares) = -(145 × 200)
    expect(txn.relatedPositionId).toBe('stock-assigned');
    expect(txn.portfolio).toBe('Main');
    expect(txn.date).toBe('2026-03-21');
  });

  it('invariant: sum of ledger lines over open+assign = premium − strike×shares', () => {
    // Open a short put: 2 contracts, strike 145, premium 2.50 → collect 500.
    const shortPut = putOption({ action: 'sell', contracts: 2, strike: 145, costBasis: -500 });
    let txns = applyTransactionEvent(
      EMPTY,
      event('PositionOpened', { position: shortPut }, 'e-open'),
      []
    );

    // Assign: buy 200 shares @ 145 → gross outflow 29000.
    const newStock = stockPos({ id: 'stock-assigned', shares: 200 });
    txns = applyTransactionEvent(
      txns,
      event(
        'OptionAssigned',
        {
          kind: 'put',
          optionId: shortPut.id,
          assignmentDate: '2026-03-21',
          assignmentPrice: 145,
          optionRealizedPnL: 500,
          newStock,
          effectiveCost: 28500,
          portfolio: 'Main',
        },
        'e-assign'
      ),
      [shortPut]
    );

    const sum = txns.reduce((s, t) => s + t.amount, 0);
    // premium − strike×shares = 500 − 29000
    expect(sum).toBe(-28500);
  });
});

// ---------------------------------------------------------------------------
// OptionAssigned — call → stock called away
// ---------------------------------------------------------------------------

describe('OptionAssigned kind=call', () => {
  it('produces position_sell with amount = totalProceeds only (premium was credited at open)', () => {
    const ev = event('OptionAssigned', {
      kind: 'call',
      optionId: 'pos-call-1',
      assignmentDate: '2026-03-21',
      optionRealizedPnL: 300,
      stockId: 'pos-stock-1',
      portfolio: 'Main',
      totalProceeds: 16000, // strike * shares
      premiumReceived: 300, // |costBasis| of the call — already booked at open
      stockClose: { fullClose: true, closePrice: 160, stockRealizedPnL: 1000 },
    });
    const result = applyTransactionEvent(EMPTY, ev, []);
    expect(result).toHaveLength(1);
    const [txn] = result;
    expect(txn.type).toBe('position_sell');
    expect(txn.amount).toBe(16000); // totalProceeds only
    expect(txn.relatedPositionId).toBe('pos-call-1');
    expect(txn.portfolio).toBe('Main');
    expect(txn.date).toBe('2026-03-21');
  });

  it('invariant: sum of ledger lines over open+assign = premium + strike×shares', () => {
    // Open a short call: 1 contract, strike 160, premium 3 → collect 300.
    const shortCall = callOption({ action: 'sell', contracts: 1, strike: 160, costBasis: -300 });
    let txns = applyTransactionEvent(
      EMPTY,
      event('PositionOpened', { position: shortCall }, 'e-open'),
      []
    );

    // Assign: stock called away at strike → proceeds 16000.
    txns = applyTransactionEvent(
      txns,
      event(
        'OptionAssigned',
        {
          kind: 'call',
          optionId: shortCall.id,
          assignmentDate: '2026-03-21',
          optionRealizedPnL: 300,
          stockId: 'pos-stock-1',
          portfolio: 'Main',
          totalProceeds: 16000,
          premiumReceived: 300,
          stockClose: { fullClose: true, closePrice: 160, stockRealizedPnL: 1000 },
        },
        'e-assign'
      ),
      [shortCall]
    );

    const sum = txns.reduce((s, t) => s + t.amount, 0);
    // premium + strike×shares = 300 + 16000
    expect(sum).toBe(16300);
  });
});

// ---------------------------------------------------------------------------
// OptionAssigned — call with lotCloses (new multi-lot path) → ONE position_sell
// ---------------------------------------------------------------------------

describe('OptionAssigned kind=call new-path (lotCloses)', () => {
  it('new-path multi-lot: still produces exactly ONE position_sell (lot-agnostic)', () => {
    const ev = event('OptionAssigned', {
      kind: 'call',
      optionId: 'pos-call-1',
      assignmentDate: '2026-03-21',
      optionRealizedPnL: 300,
      stockId: 'lot-1',
      portfolio: 'Main',
      totalProceeds: 31_000,
      premiumReceived: 300,
      stockClose: { fullClose: true, closePrice: 310, stockRealizedPnL: 999 }, // legacy
      lotCloses: [
        {
          stockId: 'lot-1',
          fullClose: true,
          sharesSold: 99,
          closePrice: 310,
          lotCostBasisForShares: 9_900,
        },
        {
          stockId: 'lot-2',
          fullClose: false,
          sharesSold: 1,
          closePrice: 310,
          lotCostBasisForShares: 220,
          remainingShares: 49,
          remainingCostBasis: 10_780,
          remainingCurrentValue: 11_270,
        },
      ],
      sharesSold: 100,
      stockRealizedPnL: 10_000,
    });
    const result = applyTransactionEvent(EMPTY, ev, []);
    expect(result).toHaveLength(1);
    const [txn] = result;
    expect(txn.type).toBe('position_sell');
    // amount = totalProceeds only (premium was already credited at open)
    expect(txn.amount).toBe(31_000);
    expect(txn.portfolio).toBe('Main');
    expect(txn.date).toBe('2026-03-21');
  });
});

// ---------------------------------------------------------------------------
// Unrelated events → same reference
// ---------------------------------------------------------------------------

describe('unrelated events', () => {
  it('returns the same transactions reference for an unrelated event', () => {
    const initial: PortfolioTransaction[] = [
      {
        id: 'txn-existing',
        portfolio: 'Main',
        date: '2026-01-01',
        type: 'deposit',
        amount: 1000,
        description: 'pre-existing',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ];
    const ev = event('PortfolioCreated', { portfolio: { id: 'p1', name: 'Main' } });
    const result = applyTransactionEvent(initial, ev, []);
    expect(result).toBe(initial); // exact same reference
  });

  it('returns the same reference for PositionEdited', () => {
    const ev = event('PositionEdited', { position: stockPos() });
    const result = applyTransactionEvent(EMPTY, ev, []);
    expect(result).toBe(EMPTY);
  });
});

// ---------------------------------------------------------------------------
// Accumulation: multiple events fold correctly
// ---------------------------------------------------------------------------

describe('accumulation across multiple events', () => {
  it('folds deposit → position_buy → premium_collected in order', () => {
    let txns: PortfolioTransaction[] = EMPTY;

    txns = applyTransactionEvent(
      txns,
      event(
        'CashDeposited',
        {
          id: 'c1',
          portfolio: 'Main',
          amount: 20000,
          date: '2026-01-01',
        },
        'e1'
      ),
      []
    );

    const pos = stockPos();
    txns = applyTransactionEvent(txns, event('PositionOpened', { position: pos }, 'e2'), []);

    const optPos = callOption({ action: 'sell', costBasis: -300 });
    txns = applyTransactionEvent(txns, event('PositionOpened', { position: optPos }, 'e3'), []);

    expect(txns).toHaveLength(3);
    expect(txns[0].type).toBe('deposit');
    expect(txns[1].type).toBe('position_buy');
    expect(txns[2].type).toBe('premium_collected');

    // id determinism
    expect(txns[0].id).toBe('txn-e1');
    expect(txns[1].id).toBe('txn-e2');
    expect(txns[2].id).toBe('txn-e3');
  });
});

// ---------------------------------------------------------------------------
// PortfolioRenamed — ledger portfolio-ref cascade
// ---------------------------------------------------------------------------

describe('applyTransactionEvent — PortfolioRenamed', () => {
  function txn(overrides: Partial<PortfolioTransaction> = {}): PortfolioTransaction {
    return {
      id: 't1',
      portfolio: 'Old',
      date: '2026-01-01',
      type: 'deposit',
      amount: 1000,
      description: 'Deposit',
      createdAt: '2026-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  it('PortfolioRenamed renames portfolio on matching transactions', () => {
    const t1 = txn({ id: 't1', portfolio: 'Old' });
    const t2 = txn({ id: 't2', portfolio: 'Other' });
    const next = applyTransactionEvent(
      [t1, t2],
      event('PortfolioRenamed', { oldName: 'Old', newName: 'New' }),
      []
    );
    expect(next[0].portfolio).toBe('New');
    expect(next[1].portfolio).toBe('Other'); // unrelated — unchanged
  });

  it('PortfolioRenamed is a no-op (same ref) when no transaction matches oldName', () => {
    const t1 = txn({ portfolio: 'Main' });
    const initial = [t1];
    const next = applyTransactionEvent(
      initial,
      event('PortfolioRenamed', { oldName: 'DoesNotExist', newName: 'New' }),
      []
    );
    expect(next).toBe(initial);
  });
});
