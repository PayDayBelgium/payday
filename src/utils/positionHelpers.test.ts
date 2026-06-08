import { describe, it, expect } from 'vitest';
import { collectLeapsSectionIds } from './positionHelpers';
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

/** A spread-leg short call (has a Spread ID in notes). */
const spreadShortCall = (id: string): CallOption => ({
  ...shortCall(id, 110),
  notes: 'Spread ID: spread-001',
});

const ticker = (symbol: string, price: number): Ticker => ({
  symbol,
  name: symbol,
  type: 'stock',
  optionsAvailable: true,
  miniContractsAvailable: false,
  currentPrice: price,
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe('collectLeapsSectionIds', () => {
  it('returns empty set when there are no LEAPS positions', () => {
    const positions: Position[] = [stock('s1'), shortCall('c1')];
    const result = collectLeapsSectionIds(positions, [ticker('AAPL', 100)]);
    expect(result.size).toBe(0);
  });

  it('includes LEAPS id in the set even when no short calls are assigned', () => {
    const positions: Position[] = [leaps('l1')];
    const result = collectLeapsSectionIds(positions, []);
    expect(result.has('l1')).toBe(true);
    expect(result.size).toBe(1);
  });

  it('includes the LEAPS id AND its allocator-assigned short-call id', () => {
    // One LEAPS (1 contract), one short call with higher strike → assigned to LEAPS.
    const positions: Position[] = [leaps('l1', 80, 1), shortCall('c1', 110, 1)];
    const result = collectLeapsSectionIds(positions, [ticker('AAPL', 100)]);

    expect(result.has('l1')).toBe(true);
    expect(result.has('c1')).toBe(true);
    expect(result.size).toBe(2);
  });

  it('does NOT include a short call that the allocator assigns to the stock parent', () => {
    // Stock has enough capacity (100 shares → 1 contract).
    // stockOnlyCall has strike < LEAPS strike so allocator puts it on the stock.
    const positions: Position[] = [
      stock('s1', 100),
      leaps('l1', 80, 1),
      stockOnlyCall('cStock'), // goes to stock parent
      shortCall('cLeaps', 110, 1), // goes to LEAPS parent
    ];
    const result = collectLeapsSectionIds(positions, [ticker('AAPL', 100)]);

    expect(result.has('l1')).toBe(true); // LEAPS always in
    expect(result.has('cLeaps')).toBe(true); // assigned to LEAPS
    expect(result.has('cStock')).toBe(false); // assigned to stock → NOT in set
  });

  it('does NOT include a spread-leg LEAPS (getSpreadId is set)', () => {
    const spreadLeaps: CallOption = {
      ...leaps('lSpread', 80),
      notes: 'Spread ID: spread-001',
    };
    const positions: Position[] = [spreadLeaps, shortCall('c1', 110)];
    const result = collectLeapsSectionIds(positions, [ticker('AAPL', 100)]);

    // Spread-leg LEAPS must be skipped so the spread renderer owns it
    expect(result.has('lSpread')).toBe(false);
    // No LEAPS → no section → short call also not in set
    expect(result.has('c1')).toBe(false);
    expect(result.size).toBe(0);
  });

  it('handles multiple LEAPS for the same ticker, each getting their assigned calls', () => {
    const l1 = leaps('l1', 80, 1);
    const l2 = leaps('l2', 85, 1);
    // Both short calls have strike > both LEAPS strikes, allocator fills oldest LEAPS first.
    const c1 = shortCall('c1', 110, 1);
    const c2 = shortCall('c2', 115, 1);

    const positions: Position[] = [l1, l2, c1, c2];
    const result = collectLeapsSectionIds(positions, [ticker('AAPL', 100)]);

    expect(result.has('l1')).toBe(true);
    expect(result.has('l2')).toBe(true);
    // Both short calls should be assigned (one to each LEAPS)
    expect(result.has('c1')).toBe(true);
    expect(result.has('c2')).toBe(true);
  });

  it('skips wheel-linked positions', () => {
    const wheelLeaps: CallOption = {
      ...leaps('lWheel', 80),
      wheelId: 'wheel-1',
    } as CallOption & { wheelId: string };
    const positions: Position[] = [wheelLeaps];
    const result = collectLeapsSectionIds(positions, []);
    expect(result.size).toBe(0);
  });
});
