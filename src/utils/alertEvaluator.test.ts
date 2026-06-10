import { describe, it, expect } from 'vitest';
import { calculatePortfolioFreeCash, evaluateProfitOpportunities } from './alertEvaluator';
import type { Portfolio, Position } from '../types';

// Clock-relative expiration (~6 months out) so the suite never expires:
// evaluateProfitOpportunities computes daysToExpiration from new Date() and
// skips anything <= 0, which would silently make these tests vacuous.
const farExpiration = new Date(Date.now() + 180 * 86_400_000).toISOString().slice(0, 10);

const portfolio = (over: Partial<Portfolio> = {}): Portfolio =>
  ({
    id: 'pf1',
    name: 'Test',
    logo: '',
    pricePerContract: 100,
    strategy: '',
    hasOptions: true,
    strategies: [],
    currency: 'EUR',
    initialCapital: 10000,
    currentValue: 10000,
    ...over,
  }) as Portfolio;

const stock = (over: Record<string, unknown> = {}): Position =>
  ({
    id: 's1',
    ticker: 'XYZ',
    portfolio: 'Test',
    openDate: '2026-01-01',
    status: 'open',
    type: 'stock',
    shares: 100,
    costBasis: 2500,
    currentValue: 3000,
    ...over,
  }) as unknown as Position;

const shortPut = (over: Record<string, unknown> = {}): Position =>
  ({
    id: 'p1',
    ticker: 'XYZ',
    portfolio: 'Test',
    openDate: '2026-01-01',
    status: 'open',
    type: 'put',
    action: 'sell',
    strike: 100,
    expiration: farExpiration,
    contracts: 1,
    costBasis: -200,
    currentValue: -200,
    cashReserved: 2000,
    ...over,
  }) as unknown as Position;

const longCall = (over: Record<string, unknown> = {}): Position =>
  ({
    id: 'c1',
    ticker: 'XYZ',
    portfolio: 'Test',
    openDate: '2026-01-01',
    status: 'open',
    type: 'call',
    action: 'buy',
    strike: 100,
    expiration: farExpiration,
    contracts: 1,
    premium: 1,
    costBasis: 100,
    currentValue: 100,
    ...over,
  }) as unknown as Position;

describe('evaluateProfitOpportunities', () => {
  describe('single options', () => {
    it('fires for a short put with 80% profit (liability shrank)', () => {
      // Short put: received $300 credit (costBasis -300), buyback now costs $60
      // (currentValue -60) -> P&L +240 = 80% of premium received.
      const result = evaluateProfitOpportunities(
        [shortPut({ costBasis: -300, currentValue: -60 })],
        new Set()
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('profit-opportunity-p1');
      expect(result[0].message).toContain('80% winst');
    });

    it('does not fire for a short put at a loss (liability grew)', () => {
      // Short put: received $300 credit, buyback now costs $600 -> P&L -300.
      const result = evaluateProfitOpportunities(
        [shortPut({ costBasis: -300, currentValue: -600 })],
        new Set()
      );
      expect(result).toHaveLength(0);
    });

    it('fires for a long call with 90% profit', () => {
      const result = evaluateProfitOpportunities(
        [longCall({ costBasis: 100, currentValue: 190 })],
        new Set()
      );
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('profit-opportunity-c1');
      expect(result[0].message).toContain('90% winst');
    });

    it('does not fire for a long call at a loss', () => {
      const result = evaluateProfitOpportunities(
        [longCall({ costBasis: 100, currentValue: 40 })],
        new Set()
      );
      expect(result).toHaveLength(0);
    });
  });

  describe('spreads', () => {
    const spreadNotes = 'Spread ID: spread-1';

    it('fires for a profitable put credit spread with positive total P&L', () => {
      // Short put: $150 credit, now a $30 liability -> +120.
      // Long put: $50 paid, now worth $10 -> -40. Total P&L +80.
      // Net premium = (1.50 - 0.50) * 1 * 100 = $100 -> 80% of max profit.
      const legs = [
        shortPut({
          id: 'sp-short',
          strike: 100,
          premium: 1.5,
          costBasis: -150,
          currentValue: -30,
          notes: spreadNotes,
        }),
        shortPut({
          id: 'sp-long',
          action: 'buy',
          strike: 95,
          premium: 0.5,
          costBasis: 50,
          currentValue: 10,
          notes: spreadNotes,
        }),
      ];
      const result = evaluateProfitOpportunities(legs, new Set());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('spread-profit-opportunity-spread-1');
      expect(result[0].message).toContain('80% van max winst');
      expect(result[0].message).toContain('Put credit spread');
    });

    it('does not fire for a put credit spread at a loss', () => {
      // Short put liability grew from $150 to $300 -> total P&L is negative.
      const legs = [
        shortPut({
          id: 'sp-short',
          strike: 100,
          premium: 1.5,
          costBasis: -150,
          currentValue: -300,
          notes: spreadNotes,
        }),
        shortPut({
          id: 'sp-long',
          action: 'buy',
          strike: 95,
          premium: 0.5,
          costBasis: 50,
          currentValue: 80,
          notes: spreadNotes,
        }),
      ];
      expect(evaluateProfitOpportunities(legs, new Set())).toHaveLength(0);
    });

    it('classifies a call credit spread (short LOWER strike) as credit', () => {
      // Call credit spread: sell the LOWER strike call for more premium.
      // Net premium = (2.00 - 0.80) * 1 * 100 = $120 (max profit).
      // P&L = (200 - 10) + (5 - 80) = +115 -> 96% of max profit.
      const legs = [
        longCall({
          id: 'cs-short',
          action: 'sell',
          strike: 100,
          premium: 2,
          costBasis: -200,
          currentValue: -10,
          notes: spreadNotes,
        }),
        longCall({
          id: 'cs-long',
          strike: 105,
          premium: 0.8,
          costBasis: 80,
          currentValue: 5,
          notes: spreadNotes,
        }),
      ];
      const result = evaluateProfitOpportunities(legs, new Set());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('spread-profit-opportunity-spread-1');
      expect(result[0].message).toContain('Call credit spread');
    });

    it('fires for a call debit spread at 80% of max profit', () => {
      // Call debit spread: buy the LOWER strike call for more premium.
      // Net premium paid = (2.00 - 0.80) * 1 * 100 = $120 (debit).
      // Max profit = width $5 * 100 - $120 = $380.
      // P&L = long (434 - 200) + short (80 - 10) = +304 -> exactly 80%.
      const legs = [
        longCall({
          id: 'ds-long',
          strike: 100,
          premium: 2,
          costBasis: 200,
          currentValue: 434,
          notes: spreadNotes,
        }),
        longCall({
          id: 'ds-short',
          action: 'sell',
          strike: 105,
          premium: 0.8,
          costBasis: -80,
          currentValue: -10,
          notes: spreadNotes,
        }),
      ];
      const result = evaluateProfitOpportunities(legs, new Set());
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('spread-profit-opportunity-spread-1');
      expect(result[0].message).toContain('80% van max winst');
      expect(result[0].message).toContain('Call debit spread');
    });
  });
});

describe('calculatePortfolioFreeCash', () => {
  it('with no positions, all portfolio value is free cash', () => {
    expect(calculatePortfolioFreeCash(portfolio(), [])).toEqual({
      totalCash: 10000,
      allocatedCash: 0,
      freeCash: 10000,
    });
  });

  it('a long stock reduces cash by its current value', () => {
    // cash = 10000 - 3000 (long) + 0 (short) = 7000
    expect(calculatePortfolioFreeCash(portfolio(), [stock()])).toEqual({
      totalCash: 7000,
      allocatedCash: 0,
      freeCash: 7000,
    });
  });

  it('a short put adds its liability back to cash but reserves collateral', () => {
    // long 3000, short 200 -> cash = 10000 - 3000 + 200 = 7200
    // allocated = cashReserved 2000 -> free = 5200
    expect(calculatePortfolioFreeCash(portfolio(), [stock(), shortPut()])).toEqual({
      totalCash: 7200,
      allocatedCash: 2000,
      freeCash: 5200,
    });
  });

  it('ignores positions from other portfolios and closed positions', () => {
    const other = stock({ id: 's2', portfolio: 'Other', currentValue: 9999 });
    const closed = stock({ id: 's3', status: 'closed', currentValue: 9999 });
    expect(calculatePortfolioFreeCash(portfolio(), [other, closed])).toEqual({
      totalCash: 10000,
      allocatedCash: 0,
      freeCash: 10000,
    });
  });

  it('clamps total cash at 0 when long value exceeds portfolio value', () => {
    expect(
      calculatePortfolioFreeCash(portfolio({ currentValue: 1000 }), [stock({ currentValue: 5000 })])
    ).toEqual({ totalCash: 0, allocatedCash: 0, freeCash: 0 });
  });
});
