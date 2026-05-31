import type { Position, StockPosition, CallOption, PortfolioName } from '../types';
import { computeCoveredCallCapacity } from './coveredCallEligibility';

export interface Holding {
  ticker: string;
  name?: string;
  type: 'stock' | 'etf';
  lots: StockPosition[]; // individual buy transactions, oldest first
  totalShares: number;
  totalCostBasis: number;
  averageCost: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  optionsSupported: boolean;
  miniContractsSupported: boolean;
  // Covered-call capacity (from computeCoveredCallCapacity):
  coveredContracts: number;
  maxContracts: number;
  freeContracts: number;
  canWriteCoveredCall: boolean;
}

/**
 * Group a portfolio's open stock/ETF positions into one Holding per ticker.
 * Covered-call capacity is computed per ticker from the aggregated lots and the
 * portfolio's open sold calls for that ticker.
 */
export function groupHoldings(positions: Position[], portfolio: PortfolioName): Holding[] {
  const openInPortfolio = positions.filter(
    p => p.portfolio === portfolio && p.status === 'open'
  );

  const stockLots = openInPortfolio.filter(
    (p): p is StockPosition => p.type === 'stock' || p.type === 'etf'
  );

  const soldCalls = openInPortfolio.filter(
    (p): p is CallOption => p.type === 'call' && (p as CallOption).action === 'sell'
  );

  const byTicker = new Map<string, StockPosition[]>();
  for (const lot of stockLots) {
    const list = byTicker.get(lot.ticker) ?? [];
    list.push(lot);
    byTicker.set(lot.ticker, list);
  }

  const holdings: Holding[] = [];
  for (const [ticker, lots] of byTicker) {
    const sorted = [...lots].sort(
      (a, b) => new Date(a.openDate).getTime() - new Date(b.openDate).getTime()
    );
    const tickerSoldCalls = soldCalls.filter(c => c.ticker === ticker);
    const capacity = computeCoveredCallCapacity(sorted, tickerSoldCalls);

    const totalCostBasis = sorted.reduce((sum, l) => sum + l.costBasis, 0);
    const totalValue = sorted.reduce((sum, l) => sum + l.currentValue, 0);
    const profitLoss = totalValue - totalCostBasis;

    holdings.push({
      ticker,
      name: sorted[0]?.name,
      type: sorted[0]?.type ?? 'stock',
      lots: sorted,
      totalShares: capacity.totalShares,
      totalCostBasis,
      averageCost: capacity.totalShares > 0 ? totalCostBasis / capacity.totalShares : 0,
      totalValue,
      profitLoss,
      profitLossPercentage: totalCostBasis > 0 ? (profitLoss / totalCostBasis) * 100 : 0,
      optionsSupported: capacity.optionsSupported,
      miniContractsSupported: sorted[0]?.miniContractsSupported ?? false,
      coveredContracts: capacity.coveredContracts,
      maxContracts: capacity.maxContracts,
      freeContracts: capacity.freeContracts,
      canWriteCoveredCall: capacity.canWriteCoveredCall,
    });
  }

  return holdings;
}
