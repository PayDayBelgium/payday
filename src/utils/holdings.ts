import type { Position, StockPosition, CallOption, PortfolioName } from '../types';
import { computeCoveredCallCapacity } from './coveredCallEligibility';
import { isLEAPS } from './campaignDetector';

export interface Holding {
  ticker: string;
  name?: string;
  type: 'stock' | 'etf';
  lots: StockPosition[]; // individual buy transactions, oldest first
  totalShares: number; // display total: includes wheel-linked lots
  totalCostBasis: number;
  averageCost: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  optionsSupported: boolean;
  // Covered-call capacity (from computeCoveredCallCapacity):
  coveredContracts: number;
  maxContracts: number;
  freeContracts: number;
  canWriteCoveredCall: boolean;
}

/**
 * Minimal ticker shape needed for the price lookup — callers can pass the
 * full `Ticker[]` from tickersSlice (the single source for prices).
 */
export type TickerPriceSource = ReadonlyArray<{ symbol: string; currentPrice?: number }>;

/**
 * Group a portfolio's open stock/ETF positions into one Holding per ticker.
 * Covered-call capacity is computed per ticker from the aggregated lots and the
 * portfolio's open sold calls for that ticker.
 *
 * @param tickers Optional ticker list used to thread the current price into
 *   the capacity allocator's tight-capacity tie-break. Pass it whenever ticker
 *   prices are available (store selector, wizards) so the wizard's
 *   freeContracts matches the dashboard's price-aware allocation.
 */
export function groupHoldings(
  positions: Position[],
  portfolio: PortfolioName,
  tickers?: TickerPriceSource
): Holding[] {
  const openInPortfolio = positions.filter((p) => p.portfolio === portfolio && p.status === 'open');

  const stockLots = openInPortfolio.filter(
    (p): p is StockPosition => p.type === 'stock' || p.type === 'etf'
  );

  const soldCalls = openInPortfolio.filter(
    (p): p is CallOption => p.type === 'call' && (p as CallOption).action === 'sell'
  );

  // LEAPS participate in coverage allocation so PMCC calls assigned to a
  // LEAPS don't consume share capacity (same inputs as alertEvaluator).
  const leapsCalls = openInPortfolio.filter(
    (p): p is CallOption =>
      p.type === 'call' && (p as CallOption).action === 'buy' && isLEAPS(p as CallOption)
  );

  const byTicker = new Map<string, StockPosition[]>();
  for (const lot of stockLots) {
    const list = byTicker.get(lot.ticker) ?? [];
    list.push(lot);
    byTicker.set(lot.ticker, list);
  }

  const priceBySymbol = new Map<string, number>();
  for (const t of tickers ?? []) {
    if (typeof t.currentPrice === 'number' && t.currentPrice > 0) {
      priceBySymbol.set(t.symbol.toUpperCase(), t.currentPrice);
    }
  }

  const holdings: Holding[] = [];
  for (const [ticker, lots] of byTicker) {
    const sorted = [...lots].sort(
      (a, b) => new Date(a.openDate).getTime() - new Date(b.openDate).getTime()
    );
    const tickerSoldCalls = soldCalls.filter((c) => c.ticker === ticker);
    const tickerLeaps = leapsCalls.filter((c) => c.ticker === ticker);
    const capacity = computeCoveredCallCapacity(
      sorted,
      tickerSoldCalls,
      tickerLeaps,
      priceBySymbol.get(ticker.toUpperCase())
    );

    // Display totals cover ALL lots (incl. wheel-linked ones); the capacity
    // fields above deliberately exclude wheel-linked positions.
    const displayShares = sorted.reduce((sum, l) => sum + l.shares, 0);
    const totalCostBasis = sorted.reduce((sum, l) => sum + l.costBasis, 0);
    const totalValue = sorted.reduce((sum, l) => sum + l.currentValue, 0);
    const profitLoss = totalValue - totalCostBasis;

    holdings.push({
      ticker,
      name: sorted[0]?.name,
      type: sorted[0]?.type ?? 'stock',
      lots: sorted,
      totalShares: displayShares,
      totalCostBasis,
      averageCost: displayShares > 0 ? totalCostBasis / displayShares : 0,
      totalValue,
      profitLoss,
      profitLossPercentage: totalCostBasis > 0 ? (profitLoss / totalCostBasis) * 100 : 0,
      optionsSupported: capacity.optionsSupported,
      coveredContracts: capacity.coveredContracts,
      maxContracts: capacity.maxContracts,
      freeContracts: capacity.freeContracts,
      canWriteCoveredCall: capacity.canWriteCoveredCall,
    });
  }

  return holdings;
}
