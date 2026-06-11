import { describe, it, expect } from 'vitest';
import { applyWheelEvent, emptyWheelsProjection } from './projectWheels';
import type { WheelsProjectionState } from './projectWheels';
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

function projection(
  wheels: WheelCampaign[],
  openSoldOptions: Record<string, string> = {}
): WheelsProjectionState {
  return { wheels, openSoldOptions };
}

function event<T extends DomainEvent['type']>(type: T, payload: unknown): DomainEvent {
  return { id: 'e', seq: 0, type, payload, timestamp: 't', actor: 'a', schemaVersion: 1 } as DomainEvent;
}

/** Fold a single event over a wheels-only projection and return the wheels. */
function fold(wheels: WheelCampaign[], e: DomainEvent): WheelCampaign[] {
  return applyWheelEvent(projection(wheels), e).wheels;
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
  it('models a complete wheel cycle: start → sold CSP → put assigned → sold CC → call assigned → sold CSP → rolled → bought back', () => {
    const w1 = wheel('w1');
    let state = emptyWheelsProjection();

    // 1. Wheel started
    state = applyWheelEvent(state, event('WheelCampaignStarted', { wheel: w1 }));
    expect(state.wheels).toHaveLength(1);
    expect(state.wheels[0].phase).toBe('csp');

    // 2. Sold CSP opened (premium received = |−150| = 150)
    state = applyWheelEvent(state, event('PositionOpened', { position: soldPut('opt1', 'w1', -150) }));
    expect(state.wheels[0].totalPremiumCollected).toBe(150);

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
    expect(state.wheels[0].phase).toBe('stock');
    expect(state.wheels[0].cycles).toBe(0); // put assignment does not increment cycles

    // 4. Sold covered call opened (premium received = |−200| = 200)
    state = applyWheelEvent(state, event('PositionOpened', { position: soldCall('opt2', 'w1', -200) }));
    expect(state.wheels[0].totalPremiumCollected).toBe(350); // 150 + 200

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
    expect(state.wheels[0].cycles).toBe(1);
    expect(state.wheels[0].phase).toBe('csp');
    expect(state.wheels[0].totalRealizedPnL).toBe(500);

    // 6. New CSP sold for the next cycle (premium = 180)
    state = applyWheelEvent(state, event('PositionOpened', { position: soldPut('opt3', 'w1', -180) }));
    expect(state.wheels[0].totalPremiumCollected).toBe(530); // 350 + 180

    // 7. CSP rolled: old leg closed at a profit of 80, new leg collects 120
    state = applyWheelEvent(
      state,
      event('OptionRolled', {
        oldPositionId: 'opt3',
        closeDate: '2026-04-10',
        closePremium: 1,
        realizedPnL: 80,
        newPosition: soldPut('opt4', 'w1', -120),
        netCashFlow: 20,
      })
    );
    expect(state.wheels[0].totalPremiumCollected).toBe(650); // 530 + 120
    expect(state.wheels[0].totalRealizedPnL).toBe(580); // 500 + 80

    // 8. Rolled CSP bought back at a loss of −40 → realized P&L only
    state = applyWheelEvent(
      state,
      event('PositionClosed', { id: 'opt4', closeDate: '2026-05-01', closePremium: 1.6, realizedPnL: -40 })
    );
    expect(state.wheels[0].totalPremiumCollected).toBe(650); // unchanged on buyback
    expect(state.wheels[0].totalRealizedPnL).toBe(540); // 580 − 40
  });
});

// ---------------------------------------------------------------------------
// Individual cases
// ---------------------------------------------------------------------------

describe('applyWheelEvent', () => {
  // --- WheelCampaignStarted ---
  it('WheelCampaignStarted appends the wheel', () => {
    const next = applyWheelEvent(emptyWheelsProjection(), event('WheelCampaignStarted', { wheel: wheel('w1') }));
    expect(next.wheels).toHaveLength(1);
    expect(next.wheels[0].id).toBe('w1');
  });

  it('WheelCampaignStarted keeps existing wheels', () => {
    const w1 = wheel('w1');
    const w2 = wheel('w2');
    const next = fold([w1], event('WheelCampaignStarted', { wheel: w2 }));
    expect(next.map((w) => w.id)).toEqual(['w1', 'w2']);
  });

  // --- WheelEdited ---
  it('WheelEdited replaces the wheel by id', () => {
    const w1 = wheel('w1');
    const w2 = wheel('w2');
    const edited = { ...w1, notes: 'updated' };
    const next = fold([w1, w2], event('WheelEdited', { wheel: edited }));
    expect(next[0].notes).toBe('updated');
    expect(next[1]).toBe(w2);
  });

  it('WheelEdited is a no-op for unknown id', () => {
    const w1 = wheel('w1');
    const next = fold([w1], event('WheelEdited', { wheel: wheel('unknown') }));
    expect(next[0]).toBe(w1);
  });

  // --- WheelClosed ---
  it('WheelClosed marks the wheel completed', () => {
    const w1 = wheel('w1');
    const next = fold([w1], event('WheelClosed', { id: 'w1', endDate: '2026-06-01' }));
    expect(next[0].status).toBe('completed');
    expect(next[0].phase).toBe('completed');
    expect(next[0].endDate).toBe('2026-06-01');
  });

  it('WheelClosed is a no-op for unknown id', () => {
    const w1 = wheel('w1');
    const next = fold([w1], event('WheelClosed', { id: 'unknown', endDate: '2026-06-01' }));
    expect(next[0]).toBe(w1);
  });

  // --- WheelDeleted ---
  it('WheelDeleted removes the wheel by id', () => {
    const w1 = wheel('w1');
    const w2 = wheel('w2');
    const next = fold([w1, w2], event('WheelDeleted', { id: 'w1' }));
    expect(next.map((w) => w.id)).toEqual(['w2']);
  });

  it('WheelDeleted is a no-op for unknown id', () => {
    const w1 = wheel('w1');
    const next = fold([w1], event('WheelDeleted', { id: 'unknown' }));
    expect(next[0]).toBe(w1);
  });

  // --- PositionOpened: premium accrual ---
  it('PositionOpened (sold put, wheel-linked) accrues premium', () => {
    const w1 = wheel('w1');
    const next = fold([w1], event('PositionOpened', { position: soldPut('opt1', 'w1', -250) }));
    expect(next[0].totalPremiumCollected).toBe(250);
  });

  it('PositionOpened (sold call, wheel-linked) accrues premium', () => {
    const w1 = wheel('w1');
    const next = fold([w1], event('PositionOpened', { position: soldCall('opt1', 'w1', -300) }));
    expect(next[0].totalPremiumCollected).toBe(300);
  });

  it('PositionOpened (sold option) registers the option in openSoldOptions', () => {
    const w1 = wheel('w1');
    const next = applyWheelEvent(projection([w1]), event('PositionOpened', { position: soldPut('opt1', 'w1') }));
    expect(next.openSoldOptions).toEqual({ opt1: 'w1' });
  });

  it('PositionOpened (bought put) does NOT accrue premium', () => {
    const w1 = wheel('w1');
    const initial = projection([w1]);
    const next = applyWheelEvent(initial, event('PositionOpened', { position: boughtPut('opt1') }));
    expect(next).toBe(initial);
  });

  it('PositionOpened (stock, wheel-linked) does NOT accrue premium', () => {
    const w1 = wheel('w1');
    const initial = projection([w1]);
    const next = applyWheelEvent(initial, event('PositionOpened', { position: stockPosition('stk1', 'w1') }));
    expect(next).toBe(initial);
  });

  it('PositionOpened (sold put, no wheelId) is a no-op for wheels', () => {
    const w1 = wheel('w1');
    const posNoWheel = { ...soldPut('opt1', 'w1'), wheelId: undefined };
    const initial = projection([w1]);
    const next = applyWheelEvent(initial, event('PositionOpened', { position: posNoWheel }));
    expect(next).toBe(initial);
  });

  // --- PositionEdited: index maintenance ---
  it('PositionEdited linking a sold option to a wheel makes its later buyback book to that wheel', () => {
    const w1 = wheel('w1');
    // Sold put opened WITHOUT a wheel link, then edited to link it to w1.
    let state = applyWheelEvent(
      projection([w1]),
      event('PositionOpened', { position: { ...soldPut('opt1', 'w1'), wheelId: undefined } })
    );
    state = applyWheelEvent(state, event('PositionEdited', { position: soldPut('opt1', 'w1') }));
    expect(state.openSoldOptions).toEqual({ opt1: 'w1' });
    // Buyback after linking books realized P&L to the wheel.
    state = applyWheelEvent(
      state,
      event('PositionClosed', { id: 'opt1', closeDate: '2026-03-01', realizedPnL: 60 })
    );
    expect(state.wheels[0].totalRealizedPnL).toBe(60);
  });

  it('PositionEdited unlinking a sold option removes it from the index', () => {
    const w1 = wheel('w1');
    let state = applyWheelEvent(projection([w1]), event('PositionOpened', { position: soldPut('opt1', 'w1') }));
    state = applyWheelEvent(
      state,
      event('PositionEdited', { position: { ...soldPut('opt1', 'w1'), wheelId: undefined } })
    );
    expect(state.openSoldOptions).toEqual({});
  });

  it('PositionEdited with an unchanged wheel link is a no-op (same reference)', () => {
    const w1 = wheel('w1');
    const state = applyWheelEvent(projection([w1]), event('PositionOpened', { position: soldPut('opt1', 'w1') }));
    const next = applyWheelEvent(state, event('PositionEdited', { position: soldPut('opt1', 'w1', -999) }));
    expect(next).toBe(state);
  });

  // --- PositionClosed: buyback of a wheel-linked sold option ---
  it('PositionClosed (wheel-linked sold option) adds realizedPnL but NOT premium', () => {
    const w1 = wheel('w1', { totalPremiumCollected: 150, totalRealizedPnL: 100 });
    const next = applyWheelEvent(
      projection([w1], { opt1: 'w1' }),
      event('PositionClosed', { id: 'opt1', closeDate: '2026-03-01', closePremium: 0.5, realizedPnL: 95 })
    );
    expect(next.wheels[0].totalRealizedPnL).toBe(195); // 100 + 95
    // Premium was already booked at open ("premium collected when sold");
    // the buyback cost is inside realizedPnL, not negative premium.
    expect(next.wheels[0].totalPremiumCollected).toBe(150);
    expect(next.openSoldOptions).toEqual({});
  });

  it('PositionClosed with a buyback loss subtracts from totalRealizedPnL', () => {
    const w1 = wheel('w1', { totalRealizedPnL: 100 });
    const next = applyWheelEvent(
      projection([w1], { opt1: 'w1' }),
      event('PositionClosed', { id: 'opt1', closeDate: '2026-03-01', realizedPnL: -250 })
    );
    expect(next.wheels[0].totalRealizedPnL).toBe(-150);
  });

  it('PositionClosed without realizedPnL still removes the option from the index', () => {
    const w1 = wheel('w1', { totalRealizedPnL: 100 });
    const next = applyWheelEvent(
      projection([w1], { opt1: 'w1' }),
      event('PositionClosed', { id: 'opt1', closeDate: '2026-03-01' })
    );
    expect(next.wheels[0].totalRealizedPnL).toBe(100);
    expect(next.openSoldOptions).toEqual({});
  });

  it('PositionClosed for an unknown position is a no-op (same reference)', () => {
    const w1 = wheel('w1');
    const initial = projection([w1]);
    const next = applyWheelEvent(initial, event('PositionClosed', { id: 'p1', closeDate: '2026-06-01' }));
    expect(next).toBe(initial);
  });

  it('PositionClosed twice for the same id only books once', () => {
    const w1 = wheel('w1', { totalRealizedPnL: 0 });
    let state = applyWheelEvent(
      projection([w1], { opt1: 'w1' }),
      event('PositionClosed', { id: 'opt1', closeDate: '2026-03-01', realizedPnL: 50 })
    );
    state = applyWheelEvent(
      state,
      event('PositionClosed', { id: 'opt1', closeDate: '2026-03-01', realizedPnL: 50 })
    );
    expect(state.wheels[0].totalRealizedPnL).toBe(50);
  });

  // --- OptionRolled ---
  it('OptionRolled (wheel-linked) accrues the new premium and the closed leg realizedPnL', () => {
    const w1 = wheel('w1', { totalPremiumCollected: 150, totalRealizedPnL: 0 });
    const next = applyWheelEvent(
      projection([w1], { opt1: 'w1' }),
      event('OptionRolled', {
        oldPositionId: 'opt1',
        closeDate: '2026-03-01',
        closePremium: 0.5,
        realizedPnL: 100,
        newPosition: soldPut('opt2', 'w1', -120),
        netCashFlow: 70,
      })
    );
    expect(next.wheels[0].totalPremiumCollected).toBe(270); // 150 + 120
    expect(next.wheels[0].totalRealizedPnL).toBe(100);
    // Index swaps the old leg for the new one.
    expect(next.openSoldOptions).toEqual({ opt2: 'w1' });
  });

  it('OptionRolled at a loss subtracts the loss from totalRealizedPnL', () => {
    const w1 = wheel('w1', { totalRealizedPnL: 200 });
    const next = applyWheelEvent(
      projection([w1], { opt1: 'w1' }),
      event('OptionRolled', {
        oldPositionId: 'opt1',
        closeDate: '2026-03-01',
        closePremium: 3,
        realizedPnL: -80,
        newPosition: soldCall('opt2', 'w1', -250),
        netCashFlow: -50,
      })
    );
    expect(next.wheels[0].totalRealizedPnL).toBe(120); // 200 − 80
    expect(next.wheels[0].totalPremiumCollected).toBe(250);
  });

  it('OptionRolled (not wheel-linked) is a no-op (same reference)', () => {
    const w1 = wheel('w1');
    const initial = projection([w1]);
    const next = applyWheelEvent(
      initial,
      event('OptionRolled', {
        oldPositionId: 'opt1',
        closeDate: '2026-03-01',
        closePremium: 0.5,
        realizedPnL: 100,
        newPosition: { ...soldPut('opt2', 'w1'), wheelId: undefined },
        netCashFlow: 70,
      })
    );
    expect(next).toBe(initial);
  });

  it('OptionRolled (long wheel-linked option) does not accrue premium or P&L', () => {
    // Wheels track SOLD options only — same convention as PositionOpened.
    const w1 = wheel('w1');
    const initial = projection([w1]);
    const next = applyWheelEvent(
      initial,
      event('OptionRolled', {
        oldPositionId: 'opt1',
        closeDate: '2026-03-01',
        closePremium: 0.5,
        realizedPnL: 100,
        newPosition: { ...boughtPut('opt2'), wheelId: 'w1' },
        netCashFlow: 70,
      })
    );
    expect(next).toBe(initial);
  });

  // --- OptionAssigned: put ---
  it('OptionAssigned (put) transitions wheel to stock phase', () => {
    const w1 = wheel('w1', { phase: 'csp' });
    const next = fold(
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

  it('OptionAssigned removes the assigned option from the index (no later double-count)', () => {
    const w1 = wheel('w1', { phase: 'csp' });
    let state = applyWheelEvent(
      projection([w1], { opt1: 'w1' }),
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
    expect(state.openSoldOptions).toEqual({});
    // A (bogus) later PositionClosed for the assigned option books nothing.
    state = applyWheelEvent(
      state,
      event('PositionClosed', { id: 'opt1', closeDate: '2026-02-02', realizedPnL: 999 })
    );
    expect(state.wheels[0].totalRealizedPnL).toBe(0);
  });

  it('OptionAssigned (put, no wheelId) is a no-op for wheels', () => {
    const w1 = wheel('w1');
    const initial = projection([w1]);
    const next = applyWheelEvent(
      initial,
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
    expect(next).toBe(initial);
  });

  // --- OptionAssigned: call (full close) ---
  it('OptionAssigned (call, full close) increments cycles, sets phase=csp, adds stockRealizedPnL', () => {
    const w1 = wheel('w1', { phase: 'stock', totalRealizedPnL: 100 });
    const next = fold(
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
    const next = fold(
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
    const next = fold(
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
    const initial = projection([w1]);
    const next = applyWheelEvent(
      initial,
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
    expect(next).toBe(initial);
  });

  // --- OptionAssigned call: new-path (lotCloses present) ---

  it('OptionAssigned call new-path: reads aggregate top-level stockRealizedPnL', () => {
    const w1 = wheel('w1', { phase: 'stock', totalRealizedPnL: 200, cycles: 0 });
    const next = fold(
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
    const next = fold(
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
    const next = fold(
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
    const initial = projection([w1]);
    const next = applyWheelEvent(initial, event('TodoAdded', { todo: { id: 't1' } }));
    expect(next).toBe(initial);
  });

  // --- PortfolioRenamed ---
  it('PortfolioRenamed renames portfolio on matching wheels', () => {
    const w1 = wheel('w1', { portfolio: 'Old' });
    const w2 = wheel('w2', { portfolio: 'Other' });
    const next = fold([w1, w2], event('PortfolioRenamed', { oldName: 'Old', newName: 'New' }));
    expect(next[0].portfolio).toBe('New');
    expect(next[1].portfolio).toBe('Other'); // unrelated — unchanged
  });

  it('PortfolioRenamed is a no-op (same ref) when no wheel matches oldName', () => {
    const w1 = wheel('w1', { portfolio: 'Main' });
    const initial = projection([w1]);
    const next = applyWheelEvent(initial, event('PortfolioRenamed', { oldName: 'DoesNotExist', newName: 'New' }));
    expect(next).toBe(initial);
  });
});
