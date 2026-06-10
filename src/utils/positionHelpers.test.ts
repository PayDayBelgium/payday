import { describe, it, expect } from 'vitest';
import {
  buildLeapsSection,
  buildPortfolioSections,
  allocateSpreadClosePremium,
} from './positionHelpers';
import { calculateOptionRealizedPnL } from './pnlCalculations';
import type { Position, StockPosition, CallOption, PutOption, Ticker } from '../types';

// ── Factory helpers ──────────────────────────────────────────────────────────

const stock = (id: string, shares = 100): StockPosition => ({
  id,
  type: 'stock',
  ticker: 'AAPL',
  portfolio: 'Test',
  openDate: '2026-01-01',
  status: 'open',
  shares,
  costBasis: shares * 90,
  purchasePrice: 90,
  currentPrice: 100,
  currentValue: shares * 100,
  optionsSupported: true,
});

/**
 * A LEAPS call: opened 2025-06-01, expires 2027-01-15 → well over 90 days from open.
 * isLEAPS (campaignDetector) measures open→expiration, so this qualifies.
 */
const leaps = (id: string, strike = 80, contracts = 1): CallOption => ({
  id,
  type: 'call',
  ticker: 'AAPL',
  portfolio: 'Test',
  openDate: '2025-06-01',
  status: 'open',
  action: 'buy',
  strike,
  expiration: '2027-01-15',
  contracts,
  premium: 20,
  costBasis: 20 * contracts * 100,
  currentValue: 20 * contracts * 100,
  breakEven: strike + 20,
});

/** Short call with a strike above the LEAPS strike (required for PMCC). */
const shortCall = (
  id: string,
  strike = 110,
  contracts = 1,
  extra: Partial<CallOption> = {}
): CallOption => ({
  id,
  type: 'call',
  ticker: 'AAPL',
  portfolio: 'Test',
  openDate: '2026-02-01',
  status: 'open',
  action: 'sell',
  strike,
  expiration: '2026-06-20',
  contracts,
  premium: 2,
  costBasis: -2 * contracts * 100,
  currentValue: -2 * contracts * 100,
  ...extra,
});

/**
 * A short call that is NOT PMCC-eligible: strike ≤ LEAPS strike (80) so the
 * allocator keeps it on the stock parent.
 */
const stockOnlyCall = (id: string): CallOption =>
  shortCall(id, 70, 1); // strike 70 < LEAPS strike 80

/** Short put (cash secured put) */
const shortPut = (id: string, strike = 95): PutOption => ({
  id,
  type: 'put',
  ticker: 'AAPL',
  portfolio: 'Test',
  openDate: '2026-02-01',
  status: 'open',
  action: 'sell',
  strike,
  expiration: '2026-06-20',
  contracts: 1,
  premium: 3,
  costBasis: -3 * 100,
  currentValue: -3 * 100,
});

/** Naked short call (no stock/LEAPS backing it) */
const nakedCall = (id: string, strike = 130): CallOption =>
  shortCall(id, strike); // no stock/LEAPS in the test will cover it

const ticker = (symbol: string, price: number): Ticker => ({
  symbol,
  name: symbol,
  type: 'stock',
  optionsAvailable: true,
  currentPrice: price,
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe('buildLeapsSection', () => {
  it('returns empty groups and empty sectionIds when there are no LEAPS positions', () => {
    const positions: Position[] = [stock('s1'), shortCall('c1')];
    const { groups, sectionIds } = buildLeapsSection(positions, [ticker('AAPL', 100)]);
    expect(groups).toHaveLength(0);
    expect(sectionIds.size).toBe(0);
  });

  it('includes LEAPS in groups and sectionIds even when no short calls are assigned', () => {
    const positions: Position[] = [leaps('l1')];
    const { groups, sectionIds } = buildLeapsSection(positions, []);

    expect(groups).toHaveLength(1);
    expect(groups[0].leap.id).toBe('l1');
    expect(groups[0].assigned).toHaveLength(0);
    expect(groups[0].freeContracts).toBeGreaterThan(0);
    expect(groups[0].coveredContracts).toBe(0);

    expect(sectionIds.has('l1')).toBe(true);
    expect(sectionIds.size).toBe(1);
  });

  it('includes the LEAPS id AND its allocator-assigned short-call id in sectionIds and groups', () => {
    // One LEAPS (1 contract), one short call with higher strike → assigned to LEAPS.
    const positions: Position[] = [leaps('l1', 80, 1), shortCall('c1', 110, 1)];
    const { groups, sectionIds } = buildLeapsSection(positions, [ticker('AAPL', 100)]);

    expect(groups).toHaveLength(1);
    expect(groups[0].leap.id).toBe('l1');
    expect(groups[0].assigned.map((c) => c.id)).toContain('c1');
    expect(groups[0].coveredContracts).toBeGreaterThan(0);

    expect(sectionIds.has('l1')).toBe(true);
    expect(sectionIds.has('c1')).toBe(true);
    expect(sectionIds.size).toBe(2);
  });

  it('does NOT include a short call assigned to the stock parent in sectionIds', () => {
    // Stock has enough capacity (100 shares → 1 contract).
    // stockOnlyCall has strike < LEAPS strike so allocator puts it on the stock.
    const positions: Position[] = [
      stock('s1', 100),
      leaps('l1', 80, 1),
      stockOnlyCall('cStock'), // goes to stock parent
      shortCall('cLeaps', 110, 1), // goes to LEAPS parent
    ];
    const { groups, sectionIds } = buildLeapsSection(positions, [ticker('AAPL', 100)]);

    expect(groups).toHaveLength(1);
    expect(groups[0].leap.id).toBe('l1');
    expect(groups[0].assigned.map((c) => c.id)).toContain('cLeaps');
    expect(groups[0].assigned.map((c) => c.id)).not.toContain('cStock');

    expect(sectionIds.has('l1')).toBe(true);    // LEAPS always in
    expect(sectionIds.has('cLeaps')).toBe(true); // assigned to LEAPS
    expect(sectionIds.has('cStock')).toBe(false); // assigned to stock → NOT in set
  });

  it('does NOT include a spread-leg LEAPS (getSpreadId is set)', () => {
    const spreadLeaps: CallOption = {
      ...leaps('lSpread', 80),
      notes: 'Spread ID: spread-001',
    };
    const positions: Position[] = [spreadLeaps, shortCall('c1', 110)];
    const { groups, sectionIds } = buildLeapsSection(positions, [ticker('AAPL', 100)]);

    // Spread-leg LEAPS must be skipped so the spread renderer owns it
    expect(groups).toHaveLength(0);
    expect(sectionIds.has('lSpread')).toBe(false);
    // No LEAPS → no section → short call also not in set
    expect(sectionIds.has('c1')).toBe(false);
    expect(sectionIds.size).toBe(0);
  });

  it('handles multiple LEAPS for the same ticker, each getting their assigned calls', () => {
    const l1 = leaps('l1', 80, 1);
    const l2 = leaps('l2', 85, 1);
    // Both short calls have strike > both LEAPS strikes, allocator fills oldest LEAPS first.
    const c1 = shortCall('c1', 110, 1);
    const c2 = shortCall('c2', 115, 1);

    const positions: Position[] = [l1, l2, c1, c2];
    const { groups, sectionIds } = buildLeapsSection(positions, [ticker('AAPL', 100)]);

    expect(groups).toHaveLength(2);
    const ids = groups.map((g) => g.leap.id);
    expect(ids).toContain('l1');
    expect(ids).toContain('l2');
    // Both short calls should be assigned (one to each LEAPS)
    const allAssigned = groups.flatMap((g) => g.assigned.map((c) => c.id));
    expect(allAssigned).toContain('c1');
    expect(allAssigned).toContain('c2');

    expect(sectionIds.has('l1')).toBe(true);
    expect(sectionIds.has('l2')).toBe(true);
    expect(sectionIds.has('c1')).toBe(true);
    expect(sectionIds.has('c2')).toBe(true);
  });

  it('skips wheel-linked positions (not included in groups or sectionIds)', () => {
    const wheelLeaps: CallOption = {
      ...leaps('lWheel', 80),
      wheelId: 'wheel-1',
    } as CallOption & { wheelId: string };
    const positions: Position[] = [wheelLeaps];
    const { groups, sectionIds } = buildLeapsSection(positions, []);
    expect(groups).toHaveLength(0);
    expect(sectionIds.size).toBe(0);
  });

  it('groups and sectionIds are always in sync (assigned call in group ↔ in sectionIds)', () => {
    const positions: Position[] = [leaps('l1', 80, 2), shortCall('c1', 110, 1), shortCall('c2', 115, 1)];
    const { groups, sectionIds } = buildLeapsSection(positions, [ticker('AAPL', 100)]);

    expect(groups).toHaveLength(1);
    // Every assigned call in any group must also be in sectionIds
    for (const g of groups) {
      expect(sectionIds.has(g.leap.id)).toBe(true);
      for (const c of g.assigned) {
        expect(sectionIds.has(c.id)).toBe(true);
      }
    }
    // sectionIds must not contain IDs absent from groups
    const groupLeapIds = new Set(groups.map((g) => g.leap.id));
    const groupAssignedIds = new Set(groups.flatMap((g) => g.assigned.map((c) => c.id)));
    for (const id of sectionIds) {
      expect(groupLeapIds.has(id) || groupAssignedIds.has(id)).toBe(true);
    }
  });
});

// ── buildPortfolioSections ───────────────────────────────────────────────────

describe('buildPortfolioSections', () => {
  it('stock-only ticker → one stock group with assigned:[] and lot id in sectionIds', () => {
    const s1 = stock('s1', 100);
    const { stockGroups, leapsGroups, sectionIds } = buildPortfolioSections(
      [s1],
      [ticker('AAPL', 100)]
    );

    expect(stockGroups).toHaveLength(1);
    expect(stockGroups[0].ticker).toBe('AAPL');
    expect(stockGroups[0].lots).toHaveLength(1);
    expect(stockGroups[0].assigned).toHaveLength(0);
    expect(leapsGroups).toHaveLength(0);
    expect(sectionIds.has('s1')).toBe(true);
    expect(sectionIds.size).toBe(1);
  });

  it('stock + covered call → call appears in stockGroups[].assigned and in sectionIds', () => {
    const s1 = stock('s1', 100);
    const c1 = shortCall('c1', 110, 1);
    const { stockGroups, sectionIds } = buildPortfolioSections(
      [s1, c1],
      [ticker('AAPL', 100)]
    );

    expect(stockGroups).toHaveLength(1);
    expect(stockGroups[0].assigned.map((c) => c.id)).toContain('c1');
    expect(sectionIds.has('s1')).toBe(true);
    expect(sectionIds.has('c1')).toBe(true);
    expect(sectionIds.size).toBe(2);
  });

  it('stock + LEAPS + two short calls (one stock-eligible, one PMCC) → correct split, combined sectionIds has all ids', () => {
    // stockOnlyCall (strike 70) cannot cover LEAPS (strike 80), so it goes to stock.
    // regular shortCall (strike 110) is PMCC-eligible → goes to LEAPS.
    const s1 = stock('s1', 100);
    const l1 = leaps('l1', 80, 1);
    const cStock = stockOnlyCall('cStock'); // strike 70 → stock parent
    const cLeaps = shortCall('cLeaps', 110, 1); // strike 110 → LEAPS parent

    const { stockGroups, leapsGroups, sectionIds } = buildPortfolioSections(
      [s1, l1, cStock, cLeaps],
      [ticker('AAPL', 100)]
    );

    // LEAPS group should have the PMCC call
    expect(leapsGroups).toHaveLength(1);
    expect(leapsGroups[0].assigned.map((c) => c.id)).toContain('cLeaps');
    expect(leapsGroups[0].assigned.map((c) => c.id)).not.toContain('cStock');

    // Stock group should have the stock-covered call
    expect(stockGroups).toHaveLength(1);
    expect(stockGroups[0].assigned.map((c) => c.id)).toContain('cStock');
    expect(stockGroups[0].assigned.map((c) => c.id)).not.toContain('cLeaps');

    // Combined sectionIds has all four ids
    expect(sectionIds.has('s1')).toBe(true);
    expect(sectionIds.has('l1')).toBe(true);
    expect(sectionIds.has('cStock')).toBe(true);
    expect(sectionIds.has('cLeaps')).toBe(true);
    expect(sectionIds.size).toBe(4);

    // No id appears in both groups (no overlap)
    const allStockIds = new Set([
      ...stockGroups[0].lots.map((l) => l.id),
      ...stockGroups[0].assigned.map((c) => c.id),
    ]);
    const allLeapsIds = new Set([
      leapsGroups[0].leap.id,
      ...leapsGroups[0].assigned.map((c) => c.id),
    ]);
    for (const id of allStockIds) {
      expect(allLeapsIds.has(id)).toBe(false);
    }
  });

  it('a standalone CSP is NOT in sectionIds', () => {
    const csp = shortPut('csp1');
    const { sectionIds } = buildPortfolioSections([csp], [ticker('AAPL', 100)]);
    expect(sectionIds.has('csp1')).toBe(false);
    expect(sectionIds.size).toBe(0);
  });

  it('a naked short call (no shares/LEAPS) is NOT in sectionIds', () => {
    const nc = nakedCall('nc1');
    const { sectionIds } = buildPortfolioSections([nc], [ticker('AAPL', 100)]);
    expect(sectionIds.has('nc1')).toBe(false);
    expect(sectionIds.size).toBe(0);
  });

  it('sync invariant: every id in sectionIds traces to a lot/leap/assigned call in the returned groups', () => {
    const s1 = stock('s1', 100);
    const l1 = leaps('l1', 80, 1);
    const cStock = stockOnlyCall('cStock');
    const cLeaps = shortCall('cLeaps', 110, 1);

    const { stockGroups, leapsGroups, sectionIds } = buildPortfolioSections(
      [s1, l1, cStock, cLeaps],
      [ticker('AAPL', 100)]
    );

    const knownIds = new Set<string>([
      ...stockGroups.flatMap((sg) => [...sg.lots.map((l) => l.id), ...sg.assigned.map((c) => c.id)]),
      ...leapsGroups.flatMap((lg) => [lg.leap.id, ...lg.assigned.map((c) => c.id)]),
    ]);

    for (const id of sectionIds) {
      expect(knownIds.has(id)).toBe(true);
    }
  });
});

// ── allocateSpreadClosePremium ───────────────────────────────────────────────

describe('allocateSpreadClosePremium', () => {
  /** Build a spread leg with an explicit premium and costBasis. */
  const leg = (
    action: 'buy' | 'sell',
    premium: number,
    costBasis: number,
    contracts = 1
  ): CallOption => ({
    id: `leg-${action}`,
    type: 'call',
    ticker: 'AAPL',
    portfolio: 'Test',
    openDate: '2026-01-01',
    status: 'open',
    action,
    strike: action === 'buy' ? 100 : 110,
    expiration: '2026-06-19',
    contracts,
    premium,
    costBasis,
    currentValue: costBasis,
  });

  it('debit spread: the long leg gets the full net close premium, short leg closes at 0', () => {
    // Worked example A: longCB 500 (premium 5), shortCB -200 (premium 2) → net debit 300.
    const longLeg = leg('buy', 5, 500);
    const shortLeg = leg('sell', 2, -200);

    const alloc = allocateSpreadClosePremium(longLeg, shortLeg, 4);
    expect(alloc.longClosePremium).toBe(4);
    expect(alloc.shortClosePremium).toBe(0);
  });

  it('credit spread: the short leg gets the full net close premium, long leg closes at 0', () => {
    // Worked example B: longCB +50 (premium 0.5), shortCB -150 (premium 1.5) → net credit 100.
    const longLeg = leg('buy', 0.5, 50);
    const shortLeg = leg('sell', 1.5, -150);

    const alloc = allocateSpreadClosePremium(longLeg, shortLeg, 0.4);
    expect(alloc.longClosePremium).toBe(0);
    expect(alloc.shortClosePremium).toBe(0.4);
  });

  it('invariant (debit, example A): total P&L = +X·c·100 − (longCB + shortCB) and net cash = +X·c·100', () => {
    // Debit spread closed (sold) at net 4.00, 1 contract → cash +400, total P&L +100.
    const longLeg = leg('buy', 5, 500);
    const shortLeg = leg('sell', 2, -200);
    const X = 4;

    const alloc = allocateSpreadClosePremium(longLeg, shortLeg, X);
    const longPnL = calculateOptionRealizedPnL({
      action: 'buy',
      costBasis: longLeg.costBasis,
      closePremium: alloc.longClosePremium,
      contracts: longLeg.contracts,
    });
    const shortPnL = calculateOptionRealizedPnL({
      action: 'sell',
      costBasis: shortLeg.costBasis,
      closePremium: alloc.shortClosePremium,
      contracts: shortLeg.contracts,
    });
    // Total P&L = +400 − (500 − 200) = +100
    expect(longPnL + shortPnL).toBe(100);

    // Net ledger cash: long leg sold (+) at its close premium, short leg bought back (−).
    const netCash =
      alloc.longClosePremium * longLeg.contracts * 100 -
      alloc.shortClosePremium * shortLeg.contracts * 100;
    expect(netCash).toBe(400);
  });

  it('invariant (credit, example B): total P&L = −X·c·100 − (longCB + shortCB) and net cash = −X·c·100', () => {
    // Credit spread (net credit 100) bought back at 0.40 → cash −40, total P&L +60.
    const longLeg = leg('buy', 0.5, 50);
    const shortLeg = leg('sell', 1.5, -150);
    const X = 0.4;

    const alloc = allocateSpreadClosePremium(longLeg, shortLeg, X);
    const longPnL = calculateOptionRealizedPnL({
      action: 'buy',
      costBasis: longLeg.costBasis,
      closePremium: alloc.longClosePremium,
      contracts: longLeg.contracts,
    });
    const shortPnL = calculateOptionRealizedPnL({
      action: 'sell',
      costBasis: shortLeg.costBasis,
      closePremium: alloc.shortClosePremium,
      contracts: shortLeg.contracts,
    });
    // Total P&L = −40 − (50 − 150) = +60
    expect(longPnL + shortPnL).toBe(60);

    const netCash =
      alloc.longClosePremium * longLeg.contracts * 100 -
      alloc.shortClosePremium * shortLeg.contracts * 100;
    expect(netCash).toBe(-40);
  });

  it('zero close (expire worthless): both legs close at 0; total P&L = −(longCB + shortCB)', () => {
    const longLeg = leg('buy', 5, 500);
    const shortLeg = leg('sell', 2, -200);

    const alloc = allocateSpreadClosePremium(longLeg, shortLeg, 0);
    expect(alloc.longClosePremium).toBe(0);
    expect(alloc.shortClosePremium).toBe(0);

    const longPnL = calculateOptionRealizedPnL({
      action: 'buy',
      costBasis: longLeg.costBasis,
      closePremium: 0,
      contracts: longLeg.contracts,
    });
    const shortPnL = calculateOptionRealizedPnL({
      action: 'sell',
      costBasis: shortLeg.costBasis,
      closePremium: 0,
      contracts: shortLeg.contracts,
    });
    // Net debit 300 lost entirely
    expect(longPnL + shortPnL).toBe(-300);
  });

  it('multi-contract spread scales with contracts', () => {
    // 3-contract debit spread: longCB 1500, shortCB −600 (net debit 900), closed at 4.00.
    const longLeg = leg('buy', 5, 1500, 3);
    const shortLeg = leg('sell', 2, -600, 3);
    const X = 4;

    const alloc = allocateSpreadClosePremium(longLeg, shortLeg, X);
    const longPnL = calculateOptionRealizedPnL({
      action: 'buy',
      costBasis: longLeg.costBasis,
      closePremium: alloc.longClosePremium,
      contracts: longLeg.contracts,
    });
    const shortPnL = calculateOptionRealizedPnL({
      action: 'sell',
      costBasis: shortLeg.costBasis,
      closePremium: alloc.shortClosePremium,
      contracts: shortLeg.contracts,
    });
    // Total = +1200 − 900 = +300
    expect(longPnL + shortPnL).toBe(300);
  });
});
