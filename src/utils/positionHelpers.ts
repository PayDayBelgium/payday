import type { Position, CallOption, PutOption, StockPosition, Ticker } from '../types';
import { getDaysToExpiration } from './dateHelpers';
import { isLEAPS as isLeapsForCoverage } from './campaignDetector';
import { getSpreadId } from './spreadHelpers';
import { allocateCallCoverage } from './coverageAllocation';

/**
 * Calculate the number of days to expiration (DTE) for an option.
 *
 * NOTE: this is a PortfolioView-specific variant that handles `undefined`
 * and delegates to `getDaysToExpiration`. Deliberately NOT reused from
 * optionWizardUtils.calculateDTE — that implementation differs (its own Math.max/ceil).
 */
export const calculateDTE = (expiration: string | undefined): number => {
  if (!expiration) return 0;
  return getDaysToExpiration(expiration);
};

/**
 * Check whether an option is a LEAP (>90 days / 3 months to expiration).
 *
 * NOTE: this is a PortfolioView-specific variant that considers calls
 * only and measures DTE from today. Deliberately NOT reused from
 * campaignDetector.isLEAPS — that one measures from openDate and looks at calls + puts.
 */
export const isLEAPS = (position: Position): boolean => {
  if (position.type !== 'call') return false;
  const option = position as CallOption;
  return calculateDTE(option.expiration) > 90;
};

/**
 * Build the set of position IDs that belong to the LEAPS section:
 * every open non-wheel, non-spread-leg LEAPS call + every short call
 * that the allocator assigns to one of those LEAPS.
 *
 * Pure function: receives the allocator inputs directly so the caller
 * (PortfolioView) can share ONE allocator pass for both the section
 * data and this dedup Set.
 *
 * @param openPositions   All open positions for the portfolio (no status filter needed — only open are passed).
 * @param tickers         Ticker store slice (for currentPrice lookups).
 */
export function collectLeapsSectionIds(
  openPositions: Position[],
  tickers: Ticker[]
): Set<string> {
  const ids = new Set<string>();

  // Group by ticker, mirroring the callCoverageByCallId memo in PortfolioView
  const openByTicker = new Map<string, Position[]>();
  for (const p of openPositions) {
    if ((p as { wheelId?: string }).wheelId) continue;
    const key = p.ticker.toUpperCase();
    const list = openByTicker.get(key) ?? [];
    list.push(p);
    openByTicker.set(key, list);
  }

  for (const [ticker, group] of openByTicker) {
    const shortCalls = group.filter(
      (p) => p.type === 'call' && (p as CallOption).action === 'sell'
    ) as CallOption[];
    const stocks = group.filter(
      (p) => p.type === 'stock' || p.type === 'etf'
    ) as StockPosition[];
    const leaps = group.filter(
      (p) =>
        p.type === 'call' &&
        (p as CallOption).action === 'buy' &&
        isLeapsForCoverage(p as CallOption) &&
        !getSpreadId(p) // spread-diagonal legs stay in the spread renderer
    ) as CallOption[];

    if (leaps.length === 0) continue;

    const price = tickers.find((t) => t.symbol.toUpperCase() === ticker)?.currentPrice;
    const alloc = allocateCallCoverage({ stocks, leaps, shortCalls, currentPrice: price });

    for (const leap of leaps) {
      ids.add(leap.id);
    }
    for (const la of alloc.leaps) {
      for (const c of la.assigned) {
        ids.add(c.id);
      }
    }
  }

  return ids;
}

/**
 * Calculate the summary of a spread (2 legs: long + short).
 */
export const calculateSpreadSummary = (legs: Position[]) => {
  if (legs.length !== 2) return null;

  const options = legs as (CallOption | PutOption)[];
  const longLeg = options.find((o) => o.action === 'buy');
  const shortLeg = options.find((o) => o.action === 'sell');

  if (!longLeg || !shortLeg) return null;

  const isCredit = shortLeg.premium > longLeg.premium;
  const netPremium = (shortLeg.premium - longLeg.premium) * shortLeg.contracts * 100;
  const spreadWidth = Math.abs(shortLeg.strike - longLeg.strike);
  const totalCostBasis = longLeg.costBasis + shortLeg.costBasis;
  const totalCurrentValue = longLeg.currentValue + shortLeg.currentValue;
  const totalPnL = totalCurrentValue - totalCostBasis;

  const maxProfit = isCredit
    ? netPremium
    : (spreadWidth - Math.abs(netPremium / (shortLeg.contracts * 100))) * shortLeg.contracts * 100;

  const maxLoss = isCredit
    ? (spreadWidth - Math.abs(netPremium / (shortLeg.contracts * 100))) * shortLeg.contracts * 100
    : Math.abs(netPremium);

  return {
    ticker: longLeg.ticker,
    type: longLeg.type,
    spreadType: isCredit ? 'credit' : 'debit',
    contracts: shortLeg.contracts,
    longStrike: longLeg.strike,
    shortStrike: shortLeg.strike,
    expiration: longLeg.expiration,
    netPremium,
    spreadWidth,
    maxProfit,
    maxLoss,
    totalPnL,
    totalCostBasis,
    totalCurrentValue,
    collateral: isCredit ? spreadWidth * shortLeg.contracts * 100 : 0,
  };
};
