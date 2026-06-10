import { describe, it, expect } from 'vitest';
import { computeCoveredCallCapacity } from './coveredCallEligibility';
import type { StockPosition, CallOption } from '../types';

const lot = (shares: number, over: Partial<StockPosition> = {}): StockPosition => ({
  id: `lot-${Math.round(shares)}-${over.id ?? ''}`,
  type: 'stock',
  ticker: 'TSLA',
  portfolio: 'Test',
  openDate: '2026-01-01',
  status: 'open',
  shares,
  costBasis: shares * 10,
  purchasePrice: 10,
  currentPrice: 10,
  currentValue: shares * 10,
  optionsSupported: true,
  ...over,
});

const soldCall = (contracts: number, over: Partial<CallOption> = {}): CallOption => ({
  id: `cc-${contracts}-${over.id ?? ''}`,
  type: 'call',
  action: 'sell',
  ticker: 'TSLA',
  portfolio: 'Test',
  openDate: '2026-01-01',
  status: 'open',
  strike: 100,
  expiration: '2026-06-19',
  contracts,
  premium: 2,
  costBasis: -200 * contracts,
  currentValue: -200 * contracts,
  ...over,
});

describe('computeCoveredCallCapacity', () => {
  it('aggregates split lots: 80 + 20 = 100 → 1 free contract', () => {
    const cap = computeCoveredCallCapacity([lot(80, { id: 'a' }), lot(20, { id: 'b' })], []);
    expect(cap.totalShares).toBe(100);
    expect(cap.maxContracts).toBe(1);
    expect(cap.freeContracts).toBe(1);
    expect(cap.canWriteCoveredCall).toBe(true);
  });

  it('only 80 shares → 0 contracts, cannot write', () => {
    const cap = computeCoveredCallCapacity([lot(80)], []);
    expect(cap.maxContracts).toBe(0);
    expect(cap.canWriteCoveredCall).toBe(false);
  });

  it('250 shares with 1 active covered call → 1 free contract', () => {
    const cap = computeCoveredCallCapacity([lot(250)], [soldCall(1)]);
    expect(cap.maxContracts).toBe(2);
    expect(cap.coveredContracts).toBe(1);
    expect(cap.freeContracts).toBe(1);
    expect(cap.canWriteCoveredCall).toBe(true);
  });

  it('100 shares fully covered → 0 free, cannot write', () => {
    const cap = computeCoveredCallCapacity([lot(100)], [soldCall(1)]);
    expect(cap.freeContracts).toBe(0);
    expect(cap.canWriteCoveredCall).toBe(false);
  });

  it('excludes spread-leg sold calls from covered contracts', () => {
    const spreadShort = soldCall(1, { id: 'spread', notes: 'Spread ID: spread-123' });
    const cap = computeCoveredCallCapacity([lot(100)], [spreadShort]);
    expect(cap.coveredContracts).toBe(0);
    expect(cap.freeContracts).toBe(1);
    expect(cap.canWriteCoveredCall).toBe(true);
  });

  it('respects optionsSupported=false', () => {
    const cap = computeCoveredCallCapacity([lot(100, { optionsSupported: false })], []);
    expect(cap.canWriteCoveredCall).toBe(false);
  });

  it('empty lots → safe zero', () => {
    const cap = computeCoveredCallCapacity([], []);
    expect(cap.totalShares).toBe(0);
    expect(cap.maxContracts).toBe(0);
    expect(cap.canWriteCoveredCall).toBe(false);
  });
});

const leapsCall = (over: Partial<CallOption> = {}): CallOption => ({
  id: `leaps-${over.id ?? '1'}`,
  type: 'call',
  action: 'buy',
  ticker: 'TSLA',
  portfolio: 'Test',
  openDate: '2026-01-01',
  status: 'open',
  strike: 50,
  expiration: '2027-06-18',
  contracts: 1,
  premium: 30,
  costBasis: 3000,
  currentValue: 3200,
  ...over,
});

describe('computeCoveredCallCapacity – allocator consistency', () => {
  it('a PMCC call explicitly linked to a LEAPS does not consume stock capacity', () => {
    const leaps = leapsCall({ id: 'l1' });
    const pmcc = soldCall(1, { id: 'pmcc', strike: 130, underlyingId: leaps.id });
    const cap = computeCoveredCallCapacity([lot(100)], [pmcc], [leaps]);
    expect(cap.coveredContracts).toBe(0);
    expect(cap.freeContracts).toBe(1);
    expect(cap.canWriteCoveredCall).toBe(true);
  });

  it('overflow beyond stock capacity lands on the LEAPS, not as stock over-coverage', () => {
    const leaps = leapsCall({ id: 'l1' });
    const calls = [soldCall(1, { id: 'c1', strike: 130 }), soldCall(1, { id: 'c2', strike: 135 })];
    const cap = computeCoveredCallCapacity([lot(100)], calls, [leaps]);
    expect(cap.coveredContracts).toBe(1);
    expect(cap.freeContracts).toBe(0);
  });

  it('wheel-linked sold calls do not consume covered-call capacity', () => {
    const cap = computeCoveredCallCapacity([lot(100)], [soldCall(1, { wheelId: 'w1' })]);
    expect(cap.coveredContracts).toBe(0);
    expect(cap.freeContracts).toBe(1);
    expect(cap.canWriteCoveredCall).toBe(true);
  });

  it('wheel-linked share lots provide no covered-call capacity', () => {
    const cap = computeCoveredCallCapacity([lot(100, { wheelId: 'w1' })], []);
    expect(cap.maxContracts).toBe(0);
    expect(cap.canWriteCoveredCall).toBe(false);
  });
});
