import { describe, it, expect } from 'vitest';
import { calculatePortfolioFreeCash } from './alertEvaluator';
import type { Portfolio, Position } from '../types';

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
    expiration: '2026-12-31',
    contracts: 1,
    costBasis: -200,
    currentValue: -200,
    cashReserved: 2000,
    ...over,
  }) as unknown as Position;

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
