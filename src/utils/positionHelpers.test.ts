import { describe, it, expect } from 'vitest';
import { buildLeapsSection } from './positionHelpers';
import type { Position, StockPosition, CallOption, Ticker } from '../types';

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
  miniContractsSupported: false,
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

const ticker = (symbol: string, price: number): Ticker => ({
  symbol,
  name: symbol,
  type: 'stock',
  optionsAvailable: true,
  miniContractsAvailable: false,
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
