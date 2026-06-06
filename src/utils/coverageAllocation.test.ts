import { describe, it, expect } from 'vitest';
import {
  allocateCallCoverage,
  pickParentForNewShortCall,
  suggestCoveredCallStrike,
  type CallCoverageInput,
} from './coverageAllocation';
import type { StockPosition, CallOption } from '../types';

const stock = (
  id: string,
  shares: number,
  costPerShare = 90,
  openDate = '2026-01-01'
): StockPosition => ({
  id,
  type: 'stock',
  ticker: 'AAPL',
  portfolio: 'Test',
  openDate,
  status: 'open',
  shares,
  costBasis: shares * costPerShare,
  purchasePrice: costPerShare,
  currentPrice: 100,
  currentValue: shares * 100,
  optionsSupported: true,
  miniContractsSupported: false,
});

const shortCall = (
  id: string,
  strike: number,
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
  expiration: '2026-03-20',
  contracts,
  premium: 2,
  costBasis: -2 * contracts * 100,
  currentValue: -2 * contracts * 100,
  ...extra,
});

const leapsCall = (id: string, strike: number, contracts = 1): CallOption => ({
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

const base = (over: Partial<CallCoverageInput>): CallCoverageInput => ({
  stocks: [],
  leaps: [],
  shortCalls: [],
  ...over,
});

describe('allocateCallCoverage', () => {
  it('wijst een short call toe aan aandelen (1 contract per 100 aandelen)', () => {
    const result = allocateCallCoverage(
      base({ stocks: [stock('s1', 100)], shortCalls: [shortCall('c1', 110)] })
    );
    expect(result.stock?.coveredContracts).toBe(1);
    expect(result.stock?.freeContracts).toBe(0);
    expect(result.stock?.assigned.map((c) => c.id)).toEqual(['c1']);
    expect(result.uncovered).toHaveLength(0);
    expect(result.leaps).toHaveLength(0);
  });

  it('telt dezelfde call NIET dubbel bij aandelen én LEAPS (dedup, geen phantom)', () => {
    // 100 shares (cap 1) + 1 LEAPS (cap 1) + 2 short calls → 1 on shares, 1 on LEAPS, 0 free
    const result = allocateCallCoverage(
      base({
        stocks: [stock('s1', 100)],
        leaps: [leapsCall('l1', 100)],
        shortCalls: [shortCall('c1', 110), shortCall('c2', 115)],
      })
    );
    expect(result.stock?.freeContracts).toBe(0);
    const leap = result.leaps.find((l) => l.parentId === 'l1');
    expect(leap?.coveredContracts).toBe(1);
    expect(leap?.freeContracts).toBe(0);
    expect(result.uncovered).toHaveLength(0);
    // each call assigned exactly once
    const assignedIds = [
      ...(result.stock?.assigned ?? []),
      ...result.leaps.flatMap((l) => l.assigned),
    ].map((c) => c.id);
    expect(assignedIds.sort()).toEqual(['c1', 'c2']);
  });

  it('vult aandelen vóór LEAPS', () => {
    // 200 shares (cap 2) + 1 LEAPS (cap 1) + 2 short calls → both on shares, LEAPS free 1
    const result = allocateCallCoverage(
      base({
        stocks: [stock('s1', 200)],
        leaps: [leapsCall('l1', 100)],
        shortCalls: [shortCall('c1', 110), shortCall('c2', 115)],
      })
    );
    expect(result.stock?.coveredContracts).toBe(2);
    expect(result.leaps[0]?.coveredContracts).toBe(0);
    expect(result.leaps[0]?.freeContracts).toBe(1);
  });

  it('respecteert expliciete underlyingId naar de LEAPS ook als aandelen vrij zijn', () => {
    const result = allocateCallCoverage(
      base({
        stocks: [stock('s1', 100)],
        leaps: [leapsCall('l1', 100)],
        shortCalls: [shortCall('c1', 110, 1, { underlyingId: 'l1' })],
      })
    );
    expect(result.stock?.coveredContracts).toBe(0);
    expect(result.stock?.freeContracts).toBe(1);
    expect(result.leaps[0]?.assigned.map((c) => c.id)).toEqual(['c1']);
  });

  it('geeft een call die de LEAPS niet kan dekken (strike ≤ LEAPS-strike) voorrang op de aandelen', () => {
    const result = allocateCallCoverage(
      base({
        stocks: [stock('s1', 100)],
        leaps: [leapsCall('l1', 120)],
        // c2 (strike 110 < 120) cannot cover the LEAPS → must go on the shares; c1 covers the LEAPS
        shortCalls: [shortCall('c1', 130), shortCall('c2', 110)],
      })
    );
    expect(result.stock?.assigned.map((c) => c.id)).toEqual(['c2']);
    expect(result.leaps[0]?.assigned.map((c) => c.id)).toEqual(['c1']);
    expect(result.uncovered).toHaveLength(0);
  });

  it('markeert een call als naked als er geen capaciteit en geen geldige LEAPS is', () => {
    const result = allocateCallCoverage(
      base({
        stocks: [stock('s1', 100)], // cap 1
        shortCalls: [shortCall('c1', 110), shortCall('c2', 115)],
      })
    );
    expect(result.stock?.coveredContracts).toBe(1);
    expect(result.uncovered).toHaveLength(1);
  });

  it('kiest bij krappe capaciteit de call het dichtst bij 15% OTM (boven break-even)', () => {
    // cap 1, price 100 → target ~115; candidates 105 and 130; both ≥ break-even (90) → pick 105
    const result = allocateCallCoverage(
      base({
        stocks: [stock('s1', 100, 90)],
        shortCalls: [shortCall('c1', 130), shortCall('c2', 105)],
        currentPrice: 100,
      })
    );
    expect(result.stock?.assigned.map((c) => c.id)).toEqual(['c2']);
    expect(result.uncovered.map((c) => c.id)).toEqual(['c1']);
  });

  it('verkiest strike ≥ break-even boven dichter-bij-15%', () => {
    // break-even 120, price 100 → target 115; candidates 110 (<BE) and 125 (≥BE) → pick 125
    const result = allocateCallCoverage(
      base({
        stocks: [stock('s1', 100, 120)],
        shortCalls: [shortCall('c1', 110), shortCall('c2', 125)],
        currentPrice: 100,
      })
    );
    expect(result.stock?.assigned.map((c) => c.id)).toEqual(['c2']);
  });
});

describe('suggestCoveredCallStrike', () => {
  it('richt op 15% OTM maar nooit onder break-even', () => {
    expect(suggestCoveredCallStrike(90, 100)).toBe(115); // max(90, 115)
    expect(suggestCoveredCallStrike(130, 100)).toBe(130); // break-even higher than 15% OTM
  });
});

describe('pickParentForNewShortCall', () => {
  it('kiest aandelen als die vrije capaciteit hebben', () => {
    const parent = pickParentForNewShortCall(
      base({ stocks: [stock('s1', 100)], leaps: [leapsCall('l1', 100)] }),
      shortCall('new', 110)
    );
    expect(parent).toEqual({ parentKind: 'stock', parentId: 's1' });
  });

  it('kiest de LEAPS als aandelen vol zijn en strike > LEAPS-strike', () => {
    const parent = pickParentForNewShortCall(
      base({
        stocks: [stock('s1', 100)],
        leaps: [leapsCall('l1', 100)],
        shortCalls: [shortCall('c1', 110)], // fills the shares
      }),
      shortCall('new', 115)
    );
    expect(parent).toEqual({ parentKind: 'leaps', parentId: 'l1' });
  });

  it('geeft null als er geen geldige parent is', () => {
    const parent = pickParentForNewShortCall(
      base({ stocks: [stock('s1', 100)], shortCalls: [shortCall('c1', 110)] }),
      shortCall('new', 120)
    );
    expect(parent).toBeNull();
  });
});
