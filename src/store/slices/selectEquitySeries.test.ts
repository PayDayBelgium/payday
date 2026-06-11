import { describe, it, expect } from 'vitest';
import { selectEquitySeries } from './portfoliosSlice';
import type { Portfolio, PortfolioTransaction } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePortfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  return {
    id: 'p1',
    name: 'TestPortfolio',
    logo: '',
    pricePerContract: 1,
    strategy: 'wheel',
    hasOptions: true,
    strategies: [],
    currency: 'USD',
    initialCapital: 10_000,
    currentValue: 10_000,
    ...overrides,
  };
}

function txn(
  overrides: Partial<PortfolioTransaction> & Pick<PortfolioTransaction, 'type' | 'amount' | 'date'>
): PortfolioTransaction {
  return {
    id: Math.random().toString(36).slice(2),
    portfolio: 'TestPortfolio',
    description: overrides.type,
    createdAt: overrides.date + 'T00:00:00.000Z',
    ...overrides,
  };
}

/** Thin RootState stub that satisfies the selectors used by selectEquitySeries. */
function makeState(
  portfolios: Portfolio[],
  transactions: PortfolioTransaction[]
): { portfolios: { portfolios: Portfolio[]; transactions: PortfolioTransaction[] } } {
  return { portfolios: { portfolios, transactions } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('selectEquitySeries', () => {
  it('emits a bootstrap point when there are no transactions', () => {
    const portfolio = makePortfolio({ startDate: '2024-01-01', currentValue: 10_000 });
    const state = makeState([portfolio], []);

    const series = selectEquitySeries(state as any);

    expect(series).toHaveLength(1);
    expect(series[0]).toMatchObject({
      date: '2024-01-01',
      portfolio: 'TestPortfolio',
      totalValue: 10_000,
      cash: 10_000,
      dailyPnL: 0,
    });
  });

  it('computes cumulative cash correctly with the approved test scenario', () => {
    // Scenario from the spec:
    //   initialCapital = 10 000
    //   d1: deposit +5000     → runningCash = 15 000
    //   d2: position_buy -3000 + premium_collected +200 → runningCash = 12 200
    //   d3: withdrawal 1000   → runningCash = 11 200
    // The final point's totalValue must equal portfolio.currentValue (11 200 in this test).
    const portfolio = makePortfolio({ initialCapital: 10_000, currentValue: 11_200 });

    const transactions: PortfolioTransaction[] = [
      txn({ type: 'deposit', amount: 5_000, date: '2024-01-01' }),
      txn({ type: 'position_buy', amount: -3_000, date: '2024-01-02' }),
      txn({ type: 'premium_collected', amount: 200, date: '2024-01-02' }),
      txn({ type: 'withdrawal', amount: 1_000, date: '2024-01-03' }),
    ];

    const state = makeState([portfolio], transactions);
    const series = selectEquitySeries(state as any);

    expect(series).toHaveLength(3);

    // d1: 10 000 + 5 000 = 15 000
    const d1 = series.find((p) => p.date === '2024-01-01');
    expect(d1?.cash).toBe(15_000);

    // d2: 15 000 - 3 000 + 200 = 12 200 (cash reflects running)
    const d2 = series.find((p) => p.date === '2024-01-02');
    expect(d2?.cash).toBe(12_200);

    // d3: 12 200 - 1 000 = 11 200; totalValue is overridden by currentValue
    const d3 = series.find((p) => p.date === '2024-01-03');
    expect(d3?.cash).toBe(11_200);
    expect(d3?.totalValue).toBe(11_200); // live portfolio.currentValue
  });

  it('sets the final point totalValue to portfolio.currentValue (mark-to-market)', () => {
    // The portfolio has unrealised gains: cash is 12 000 but positions push it to 15 000.
    const portfolio = makePortfolio({ initialCapital: 10_000, currentValue: 15_000 });

    const transactions: PortfolioTransaction[] = [
      txn({ type: 'deposit', amount: 2_000, date: '2024-02-01' }),
    ];

    const state = makeState([portfolio], transactions);
    const series = selectEquitySeries(state as any);

    expect(series).toHaveLength(1);
    // cash reflects the running cash after transactions; totalValue is live
    const point = series[0];
    expect(point.cash).toBe(12_000); // 10 000 + 2 000
    expect(point.totalValue).toBe(15_000); // portfolio.currentValue
  });

  it('handles multiple portfolios independently', () => {
    const p1 = makePortfolio({
      id: 'p1',
      name: 'Alpha',
      initialCapital: 5_000,
      currentValue: 6_000,
    });
    const p2 = makePortfolio({
      id: 'p2',
      name: 'Beta',
      initialCapital: 8_000,
      currentValue: 8_500,
    });

    const transactions: PortfolioTransaction[] = [
      txn({ type: 'deposit', amount: 1_000, date: '2024-03-01', portfolio: 'Alpha' }),
      txn({ type: 'dividend', amount: 500, date: '2024-03-02', portfolio: 'Beta' }),
    ];

    const state = makeState([p1, p2], transactions);
    const series = selectEquitySeries(state as any);

    const alphaSeries = series.filter((p) => p.portfolio === 'Alpha');
    const betaSeries = series.filter((p) => p.portfolio === 'Beta');

    expect(alphaSeries).toHaveLength(1);
    expect(alphaSeries[0].cash).toBe(6_000); // 5 000 + 1 000
    expect(alphaSeries[0].totalValue).toBe(6_000); // currentValue

    expect(betaSeries).toHaveLength(1);
    expect(betaSeries[0].cash).toBe(8_500); // 8 000 + 500
    expect(betaSeries[0].totalValue).toBe(8_500); // currentValue
  });

  it('applies withdrawal as subtraction, everything else as addition', () => {
    const portfolio = makePortfolio({ initialCapital: 10_000, currentValue: 9_500 });

    const transactions: PortfolioTransaction[] = [
      txn({ type: 'fee', amount: -100, date: '2024-04-01' }), // fee: add the signed amount → -100
      txn({ type: 'withdrawal', amount: 400, date: '2024-04-02' }), // withdrawal: subtract amount → -400
    ];

    const state = makeState([portfolio], transactions);
    const series = selectEquitySeries(state as any);

    const d1 = series.find((p) => p.date === '2024-04-01');
    expect(d1?.cash).toBe(9_900); // 10 000 + (-100)

    const d2 = series.find((p) => p.date === '2024-04-02');
    expect(d2?.cash).toBe(9_500); // 9 900 - 400
    expect(d2?.totalValue).toBe(9_500); // currentValue
  });

  it('groups same-date transactions into a single point', () => {
    const portfolio = makePortfolio({ initialCapital: 10_000, currentValue: 10_300 });

    const transactions: PortfolioTransaction[] = [
      txn({ type: 'deposit', amount: 200, date: '2024-05-01' }),
      txn({ type: 'dividend', amount: 100, date: '2024-05-01' }),
    ];

    const state = makeState([portfolio], transactions);
    const series = selectEquitySeries(state as any);

    expect(series).toHaveLength(1);
    expect(series[0].cash).toBe(10_300); // 10 000 + 200 + 100
    expect(series[0].totalValue).toBe(10_300); // currentValue
  });
});
