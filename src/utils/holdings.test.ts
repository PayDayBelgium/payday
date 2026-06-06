import { describe, it, expect } from 'vitest';
import { groupHoldings } from './holdings';
import type { StockPosition, CallOption, Position } from '../types';

const lot = (shares: number, over: Partial<StockPosition> = {}): StockPosition => {
  const { id: overId, ...rest } = over;
  return {
    id: `lot-${overId ?? shares}`,
    type: 'stock',
    ticker: 'TSLA',
    portfolio: 'Test',
    openDate: '2026-01-01',
    status: 'open',
    shares,
    costBasis: shares * 10,
    purchasePrice: 10,
    currentPrice: 12,
    currentValue: shares * 12,
    optionsSupported: true,
    miniContractsSupported: false,
    name: 'Tesla',
    ...rest,
  };
};

const soldCall = (contracts: number, over: Partial<CallOption> = {}): CallOption => ({
  id: `cc-${over.id ?? contracts}`,
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

describe('groupHoldings', () => {
  it('groups two lots of the same ticker into one holding of 100 shares', () => {
    const positions: Position[] = [lot(80, { id: 'a' }), lot(20, { id: 'b' })];
    const holdings = groupHoldings(positions, 'Test');
    expect(holdings).toHaveLength(1);
    const h = holdings[0];
    expect(h.ticker).toBe('TSLA');
    expect(h.totalShares).toBe(100);
    expect(h.lots).toHaveLength(2);
    expect(h.canWriteCoveredCall).toBe(true);
    expect(h.freeContracts).toBe(1);
  });

  it('computes average cost across lots', () => {
    const positions: Position[] = [
      lot(80, { id: 'a', costBasis: 800 }),
      lot(20, { id: 'b', costBasis: 400 }),
    ];
    const h = groupHoldings(positions, 'Test')[0];
    expect(h.totalCostBasis).toBe(1200);
    expect(h.averageCost).toBe(12); // 1200 / 100
  });

  it('subtracts existing covered calls from free contracts', () => {
    const positions: Position[] = [lot(100, { id: 'a' }), soldCall(1)];
    const h = groupHoldings(positions, 'Test')[0];
    expect(h.coveredContracts).toBe(1);
    expect(h.freeContracts).toBe(0);
    expect(h.canWriteCoveredCall).toBe(false);
  });

  it('ignores closed positions and other portfolios', () => {
    const positions: Position[] = [
      lot(100, { id: 'a' }),
      lot(100, { id: 'closed', status: 'closed' }),
      lot(100, { id: 'other', portfolio: 'Other' }),
    ];
    const holdings = groupHoldings(positions, 'Test');
    expect(holdings).toHaveLength(1);
    expect(holdings[0].totalShares).toBe(100);
  });

  it('sorts lots oldest first', () => {
    const positions: Position[] = [
      lot(20, { id: 'new', openDate: '2026-03-01' }),
      lot(80, { id: 'old', openDate: '2026-01-01' }),
    ];
    const h = groupHoldings(positions, 'Test')[0];
    expect(h.lots[0].id).toBe('lot-old');
  });
});
