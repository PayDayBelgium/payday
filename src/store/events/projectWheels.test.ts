import { describe, it, expect } from 'vitest';
import { applyWheelEvent } from './projectWheels';
import type { WheelCampaign } from '../../types';
import type { DomainEvent } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function wheel(id: string, overrides: Partial<WheelCampaign> = {}): WheelCampaign {
  return {
    id,
    ticker: 'AAPL',
    portfolio: 'Main',
    phase: 'csp',
    targetContracts: 1,
    startDate: '2026-01-01',
    status: 'active',
    totalPremiumCollected: 0,
    totalRealizedPnL: 0,
    cycles: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function event<T extends DomainEvent['type']>(type: T, payload: unknown): DomainEvent {
  return { id: 'e', seq: 0, type, payload, timestamp: 't', actor: 'a', schemaVersion: 1 } as DomainEvent;
}

// ---------------------------------------------------------------------------
// Minimal position factory — just enough fields for the projection
// ---------------------------------------------------------------------------

function soldPut(id: string, wheelId: string, costBasis = -150): object {
  return {
    id,
    type: 'put',
    action: 'sell',
    ticker: 'AAPL',
    portfolio: 'Main',
    status: 'open',
    openDate: '2026-01-05',
    wheelId,
    costBasis, // negative: premium received (−150 → 150 collected)
    // other required fields omitted — projection only checks type/action/wheelId/costBasis
  };
}

function soldCall(id: string, wheelId: string, costBasis = -200): object {
  return {
    id,
    type: 'call',
    action: 'sell',
    ticker: 'AAPL',
    portfolio: 'Main',
    status: 'open',
    openDate: '2026-02-15',
    wheelId,
    costBasis,
  };
}

function boughtPut(id: string): object {
  return {
    id,
    type: 'put',
    action: 'buy',
    ticker: 'AAPL',
    portfolio: 'Main',
    status: 'open',
    openDate: '2026-01-05',
    costBasis: 150,
    // no wheelId
  };
}

function stockPosition(id: string, wheelId: string): object {
  return {
    id,
    type: 'stock',
    ticker: 'AAPL',
    portfolio: 'Main',
    status: 'open',
    openDate: '2026-02-01',
    wheelId,
    costBasis: 15_000,
  };
}

// ---------------------------------------------------------------------------
// Full lifecycle test
// ---------------------------------------------------------------------------

describe('applyWheelEvent — full lifecycle', () => {
  it('models a complete wheel cycle: start → sold CSP → put assigned → sold CC → call assigned', () => {
    const w1 = wheel('w1');
    let state: WheelCampaign[] = [];

    // 1. Wheel started
    state = applyWheelEvent(state, event('WheelCampaignStarted', { wheel: w1 }));
    expect(state).toHaveLength(1);
    expect(state[0].phase).toBe('csp');

    // 2. Sold CSP opened (premium received = |−150| = 150)
    state = applyWheelEvent(state, event('PositionOpened', { position: soldPut('opt1', 'w1', -150) }));
    expect(state[0].totalPremiumCollected).toBe(150);

    // 3. Put assigned → wheel moves to 'stock' phase
    state = applyWheelEvent(
      state,
      event('OptionAssigned', {
        kind: 'put',
        optionId: 'opt1',
        assignmentDate: '2026-02-01',
        assignmentPrice: 148,
        optionRealizedPnL: 150,
        newStock: stockPosition('stk1', 'w1'),
        effectiveCost: 14_850,
        portfolio: 'Main',
        wheelId: 'w1',
      })
    );
    expect(state[0].phase).toBe('stock');
    expect(state[0].cycles).toBe(0); // put assignment does not increment cycles

    // 4. Sold covered call opened (premium received = |−200| = 200)
    state = applyWheelEvent(state, event('PositionOpened', { position: soldCall('opt2', 'w1', -200) }));
    expect(state[0].totalPremiumCollected).toBe(350); // 150 + 200

    // 5. Call assigned (full close) → cycles+1, phase='csp', stockRealizedPnL added
    state = applyWheelEvent(
      state,
      event('OptionAssigned', {
        kind: 'call',
        optionId: 'opt2',
        assignmentDate: '2026-03-15',
        optionRealizedPnL: 200,
        stockId: 'stk1',
        portfolio: 'Main',
        totalProceeds: 15_000,
        premiumReceived: 200,
        wheelId: 'w1',
        stockClose: { fullClose: true, closePrice: 150, stockRealizedPnL: 500 },
      })
    );
    expect(state[0].cycles).toBe(1);
    expect(state[0].phase).toBe('csp');
    expect(state[0].totalRealizedPnL).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// Individual cases
// ---------------------------------------------------------------------------

describe('applyWheelEvent', () => {
  // --- WheelCampaignStarted ---
  it('WheelCampaignStarted appends the wheel', () => {
    const w1 = wheel('w1');
    const next = applyWheelEvent([], event('WheelCampaignStarted', { wheel: w1 }));
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('w1');
  });

  it('WheelCampaignStarted keeps existing wheels', () => {
    const w1 = wheel('w1');
    const w2 = wheel('w2');
    const next = applyWheelEvent([w1], event('WheelCampaignStarted', { wheel: w2 }));
    expect(next.map((w) => w.id)).toEqual(['w1', 'w2']);
  });

  // --- WheelEdited ---
  it('WheelEdited replaces the wheel by id', () => {
    const w1 = wheel('w1');
    const w2 = wheel('w2');
    const edited = { ...w1, notes: 'updated' };
    const next = applyWheelEvent([w1, w2], event('WheelEdited', { wheel: edited }));
    expect(next[0].notes).toBe('updated');
    expect(next[1]).toBe(w2);
  });

  it('WheelEdited is a no-op for unknown id', () => {
    const w1 = wheel('w1');
    const next = applyWheelEvent([w1], event('WheelEdited', { wheel: wheel('unknown') }));
    expect(next[0]).toBe(w1);
  });

  // --- WheelClosed ---
  it('WheelClosed marks the wheel completed', () => {
    const w1 = wheel('w1');
    const next = applyWheelEvent(
      [w1],
      event('WheelClosed', { id: 'w1', endDate: '2026-06-01' })
    );
    expect(next[0].status).toBe('completed');
    expect(next[0].phase).toBe('completed');
    expect(next[0].endDate).toBe('2026-06-01');
  });

  it('WheelClosed is a no-op for unknown id', () => {
    const w1 = wheel('w1');
    const next = applyWheelEvent([w1], event('WheelClosed', { id: 'unknown', endDate: '2026-06-01' }));
    expect(next[0]).toBe(w1);
  });

  // --- WheelDeleted ---
  it('WheelDeleted removes the wheel by id', () => {
    const w1 = wheel('w1');
    const w2 = wheel('w2');
    const next = applyWheelEvent([w1, w2], event('WheelDeleted', { id: 'w1' }));
    expect(next.map((w) => w.id)).toEqual(['w2']);
  });

  it('WheelDeleted is a no-op for unknown id', () => {
    const w1 = wheel('w1');
    const next = applyWheelEvent([w1], event('WheelDeleted', { id: 'unknown' }));
    expect(next[0]).toBe(w1);
  });

  // --- PositionOpened: premium accrual ---
  it('PositionOpened (sold put, wheel-linked) accrues premium', () => {
    const w1 = wheel('w1');
    const next = applyWheelEvent([w1], event('PositionOpened', { position: soldPut('opt1', 'w1', -250) }));
    expect(next[0].totalPremiumCollected).toBe(250);
  });

  it('PositionOpened (sold call, wheel-linked) accrues premium', () => {
    const w1 = wheel('w1');
    const next = applyWheelEvent([w1], event('PositionOpened', { position: soldCall('opt1', 'w1', -300) }));
    expect(next[0].totalPremiumCollected).toBe(300);
  });

  it('PositionOpened (bought put) does NOT accrue premium', () => {
    const w1 = wheel('w1');
    const next = applyWheelEvent([w1], event('PositionOpened', { position: boughtPut('opt1') }));
    expect(next[0]).toBe(w1);
  });

  it('PositionOpened (stock, wheel-linked) does NOT accrue premium', () => {
    const w1 = wheel('w1');
    const next = applyWheelEvent([w1], event('PositionOpened', { position: stockPosition('stk1', 'w1') }));
    expect(next[0]).toBe(w1);
  });

  it('PositionOpened (sold put, no wheelId) is a no-op for wheels', () => {
    const w1 = wheel('w1');
    const posNoWheel = { ...soldPut('opt1', 'w1'), wheelId: undefined };
    const next = applyWheelEvent([w1], event('PositionOpened', { position: posNoWheel }));
    expect(next[0]).toBe(w1);
  });

  // --- OptionAssigned: put ---
  it('OptionAssigned (put) transitions wheel to stock phase', () => {
    const w1 = wheel('w1', { phase: 'csp' });
    const next = applyWheelEvent(
      [w1],
      event('OptionAssigned', {
        kind: 'put',
        optionId: 'opt1',
        assignmentDate: '2026-02-01',
        assignmentPrice: 148,
        optionRealizedPnL: 150,
        newStock: stockPosition('stk1', 'w1'),
        effectiveCost: 14_850,
        portfolio: 'Main',
        wheelId: 'w1',
      })
    );
    expect(next[0].phase).toBe('stock');
    expect(next[0].cycles).toBe(0);
  });

  it('OptionAssigned (put, no wheelId) is a no-op for wheels', () => {
    const w1 = wheel('w1');
    const next = applyWheelEvent(
      [w1],
      event('OptionAssigned', {
        kind: 'put',
        optionId: 'opt1',
        assignmentDate: '2026-02-01',
        assignmentPrice: 148,
        optionRealizedPnL: 150,
        newStock: stockPosition('stk1', 'w1'),
        effectiveCost: 14_850,
        portfolio: 'Main',
        // no wheelId
      })
    );
    expect(next[0]).toBe(w1);
  });

  // --- OptionAssigned: call (full close) ---
  it('OptionAssigned (call, full close) increments cycles, sets phase=csp, adds stockRealizedPnL', () => {
    const w1 = wheel('w1', { phase: 'stock', totalRealizedPnL: 100 });
    const next = applyWheelEvent(
      [w1],
      event('OptionAssigned', {
        kind: 'call',
        optionId: 'opt2',
        assignmentDate: '2026-03-15',
        optionRealizedPnL: 200,
        stockId: 'stk1',
        portfolio: 'Main',
        totalProceeds: 15_000,
        premiumReceived: 200,
        wheelId: 'w1',
        stockClose: { fullClose: true, closePrice: 150, stockRealizedPnL: 500 },
      })
    );
    expect(next[0].cycles).toBe(1);
    expect(next[0].phase).toBe('csp');
    expect(next[0].totalRealizedPnL).toBe(600); // 100 + 500
  });

  // --- OptionAssigned: call (partial close) ---
  it('OptionAssigned (call, partial close) increments cycles, sets phase=csp, adds stockRealizedPnL (zero case)', () => {
    // When stockRealizedPnL = 0 the wheel totalRealizedPnL stays unchanged.
    const w1 = wheel('w1', { phase: 'stock', totalRealizedPnL: 100, cycles: 0 });
    const next = applyWheelEvent(
      [w1],
      event('OptionAssigned', {
        kind: 'call',
        optionId: 'opt2',
        assignmentDate: '2026-03-15',
        optionRealizedPnL: 200,
        stockId: 'stk1',
        portfolio: 'Main',
        totalProceeds: 5_000,
        premiumReceived: 200,
        wheelId: 'w1',
        stockClose: {
          fullClose: false,
          remainingShares: 50,
          remainingCostBasis: 7_500,
          remainingCurrentValue: 7_500,
          // Both PortfolioView and CampaignView book stockRealizedPnL to the wheel
          // even on partial closes; the command sets this value.
          stockRealizedPnL: 0,
        },
      })
    );
    expect(next[0].cycles).toBe(1);
    expect(next[0].phase).toBe('csp');
    expect(next[0].totalRealizedPnL).toBe(100); // 100 + 0
  });

  it('OptionAssigned (call, partial close) adds non-zero stockRealizedPnL to wheel', () => {
    const w1 = wheel('w1', { phase: 'stock', totalRealizedPnL: 100, cycles: 0 });
    const next = applyWheelEvent(
      [w1],
      event('OptionAssigned', {
        kind: 'call',
        optionId: 'opt2',
        assignmentDate: '2026-03-15',
        optionRealizedPnL: 200,
        stockId: 'stk1',
        portfolio: 'Main',
        totalProceeds: 5_000,
        premiumReceived: 200,
        wheelId: 'w1',
        stockClose: {
          fullClose: false,
          remainingShares: 50,
          remainingCostBasis: 7_500,
          remainingCurrentValue: 7_500,
          stockRealizedPnL: 350,
        },
      })
    );
    expect(next[0].cycles).toBe(1);
    expect(next[0].phase).toBe('csp');
    expect(next[0].totalRealizedPnL).toBe(450); // 100 + 350
  });

  it('OptionAssigned (call, no wheelId) is a no-op for wheels', () => {
    const w1 = wheel('w1', { phase: 'stock' });
    const next = applyWheelEvent(
      [w1],
      event('OptionAssigned', {
        kind: 'call',
        optionId: 'opt2',
        assignmentDate: '2026-03-15',
        optionRealizedPnL: 200,
        stockId: 'stk1',
        portfolio: 'Main',
        totalProceeds: 15_000,
        premiumReceived: 200,
        // no wheelId
        stockClose: { fullClose: true, closePrice: 150, stockRealizedPnL: 500 },
      })
    );
    expect(next[0]).toBe(w1);
  });

  // --- OptionAssigned call: new-path (lotCloses present) ---

  it('OptionAssigned call new-path: reads aggregate top-level stockRealizedPnL', () => {
    const w1 = wheel('w1', { phase: 'stock', totalRealizedPnL: 200, cycles: 0 });
    const next = applyWheelEvent(
      [w1],
      event('OptionAssigned', {
        kind: 'call',
        optionId: 'opt2',
        assignmentDate: '2026-03-15',
        optionRealizedPnL: 200,
        stockId: 'lot-1',
        portfolio: 'Main',
        totalProceeds: 31_000,
        premiumReceived: 200,
        wheelId: 'w1',
        stockClose: { fullClose: true, closePrice: 310, stockRealizedPnL: 999 }, // legacy — must be IGNORED
        lotCloses: [
          { stockId: 'lot-1', fullClose: true, sharesSold: 99, closePrice: 310, lotCostBasisForShares: 9_900 },
          { stockId: 'lot-2', fullClose: false, sharesSold: 1, closePrice: 310, lotCostBasisForShares: 220,
            remainingShares: 49, remainingCostBasis: 10_780, remainingCurrentValue: 11_270 },
        ],
        sharesSold: 100,
        stockRealizedPnL: 1_200, // aggregate GAK P&L — must be used, not 999 from stockClose
      })
    );
    expect(next[0].cycles).toBe(1);
    expect(next[0].phase).toBe('csp');
    // Must use aggregate stockRealizedPnL (1200), NOT stockClose.stockRealizedPnL (999)
    expect(next[0].totalRealizedPnL).toBe(1_400); // 200 + 1200
  });

  it('OptionAssigned call new-path: missing stockRealizedPnL defaults to 0', () => {
    const w1 = wheel('w1', { phase: 'stock', totalRealizedPnL: 100, cycles: 0 });
    const next = applyWheelEvent(
      [w1],
      event('OptionAssigned', {
        kind: 'call',
        optionId: 'opt2',
        assignmentDate: '2026-03-15',
        optionRealizedPnL: 100,
        stockId: 'lot-1',
        portfolio: 'Main',
        totalProceeds: 10_000,
        premiumReceived: 100,
        wheelId: 'w1',
        stockClose: { fullClose: true, closePrice: 100, stockRealizedPnL: 999 }, // legacy
        lotCloses: [
          { stockId: 'lot-1', fullClose: true, sharesSold: 100, closePrice: 100, lotCostBasisForShares: 10_000 },
        ],
        sharesSold: 100,
        // stockRealizedPnL deliberately absent → defaults to 0
      })
    );
    expect(next[0].totalRealizedPnL).toBe(100); // 100 + 0
  });

  it('OptionAssigned call backward-compat: old event (no lotCloses) reads stockClose.stockRealizedPnL', () => {
    const w1 = wheel('w1', { phase: 'stock', totalRealizedPnL: 50, cycles: 0 });
    const next = applyWheelEvent(
      [w1],
      event('OptionAssigned', {
        kind: 'call',
        optionId: 'opt2',
        assignmentDate: '2026-03-15',
        optionRealizedPnL: 200,
        stockId: 'stk1',
        portfolio: 'Main',
        totalProceeds: 15_000,
        premiumReceived: 200,
        wheelId: 'w1',
        stockClose: { fullClose: true, closePrice: 150, stockRealizedPnL: 400 },
        // No lotCloses — old event; must use stockClose.stockRealizedPnL
      })
    );
    expect(next[0].cycles).toBe(1);
    expect(next[0].totalRealizedPnL).toBe(450); // 50 + 400
  });

  // --- default / no-op ---
  it('ignores unrelated event types and returns the same reference', () => {
    const w1 = wheel('w1');
    const initial = [w1];
    const next = applyWheelEvent(initial, event('PositionClosed', { id: 'p1', closeDate: '2026-06-01' }));
    expect(next).toBe(initial);
  });

  // --- PortfolioRenamed ---
  it('PortfolioRenamed renames portfolio on matching wheels', () => {
    const w1 = wheel('w1', { portfolio: 'Old' });
    const w2 = wheel('w2', { portfolio: 'Other' });
    const next = applyWheelEvent(
      [w1, w2],
      event('PortfolioRenamed', { oldName: 'Old', newName: 'New' })
    );
    expect(next[0].portfolio).toBe('New');
    expect(next[1].portfolio).toBe('Other'); // unrelated — unchanged
  });

  it('PortfolioRenamed is a no-op (same ref) when no wheel matches oldName', () => {
    const w1 = wheel('w1', { portfolio: 'Main' });
    const initial = [w1];
    const next = applyWheelEvent(
      initial,
      event('PortfolioRenamed', { oldName: 'DoesNotExist', newName: 'New' })
    );
    expect(next).toBe(initial);
  });
});
