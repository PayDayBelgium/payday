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
 * A stock/ETF ticker group with covered calls nested under it.
 * Produced by buildPortfolioSections — one group per ticker that has open lots.
 */
export interface StockCoveredCallGroup {
  /** Ticker symbol (upper-cased). */
  ticker: string;
  /** All open stock/ETF lots for this ticker. */
  lots: StockPosition[];
  /** Short calls assigned to the stock lots by the allocator. */
  assigned: CallOption[];
  /** Current price of the underlying. */
  currentPrice: number;
}

/**
 * Combined result of buildPortfolioSections.
 */
export interface PortfolioSections {
  leapsGroups: LeapsGroup[];
  stockGroups: StockCoveredCallGroup[];
  /** Single dedup set: every position ID owned by the stocks or LEAPS sections. */
  sectionIds: Set<string>;
}

/**
 * A single LEAPS entry with its allocator-assigned short calls and coverage info.
 * Defined here (single source of truth) and re-exported by GroupedLeapsList.tsx.
 */
export interface LeapsGroup {
  leap: CallOption;
  /** Short calls assigned to this LEAPS by the allocator. */
  assigned: CallOption[];
  /** How many contracts of this LEAPS are NOT yet covered by a short call. */
  freeContracts: number;
  /** How many contracts of this LEAPS are covered by a short call. */
  coveredContracts: number;
  /** Current price of the underlying, used by OptionRow for price display. */
  currentPrice: number;
}

/**
 * Build the LEAPS section data and dedup set in a single allocator pass per ticker.
 *
 * Returns:
 *   - `groups`: ordered LeapsGroup[] for rendering (sorted by ticker then openDate)
 *   - `sectionIds`: Set of every position ID that belongs to the LEAPS section
 *     (every qualifying LEAPS id + every short-call id assigned to one of those LEAPS).
 *     Use this to exclude those positions from the strategy-grouped table.
 *
 * A LEAPS is included when it is:
 *   - open, non-wheel (`wheelId` absent), non-spread-leg (`getSpreadId` returns null)
 *   - qualifies as LEAPS per campaignDetector.isLEAPS (isLeapsForCoverage)
 *
 * Pure function — no React, no store.
 *
 * @param openPositions   All open positions for the portfolio (pre-filtered to status === 'open').
 * @param tickers         Ticker store slice (for currentPrice lookups).
 */
export function buildLeapsSection(
  openPositions: Position[],
  tickers: Ticker[]
): { groups: LeapsGroup[]; sectionIds: Set<string> } {
  const groups: LeapsGroup[] = [];
  const sectionIds = new Set<string>();

  // Group by ticker, excluding wheel-linked positions
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
    // ONE allocator pass per ticker — result feeds BOTH groups[] and sectionIds
    const alloc = allocateCallCoverage({ stocks, leaps, shortCalls, currentPrice: price });

    for (const leap of leaps) {
      sectionIds.add(leap.id);

      const la = alloc.leaps.find((l) => l.parentId === leap.id);
      const assigned = la?.assigned ?? [];
      const freeContracts = la?.freeContracts ?? leap.contracts ?? 0;
      const coveredContracts = la?.coveredContracts ?? 0;

      // Add assigned short-call IDs to the dedup set
      for (const c of assigned) {
        sectionIds.add(c.id);
      }

      groups.push({
        leap,
        assigned,
        freeContracts,
        coveredContracts,
        currentPrice: price ?? 0,
      });
    }
  }

  // Sort groups by ticker then by LEAPS openDate (oldest first)
  groups.sort((a, b) => {
    const tc = a.leap.ticker.localeCompare(b.leap.ticker);
    if (tc !== 0) return tc;
    return new Date(a.leap.openDate).getTime() - new Date(b.leap.openDate).getTime();
  });

  return { groups, sectionIds };
}

/**
 * Build ALL fixed-section data in a single pass.
 *
 * Runs ONE `allocateCallCoverage` call per ticker and feeds both the
 * LEAPS groups and the stock groups from the same result, so the
 * sectionIds Set is guaranteed to be the single dedup point — no
 * position can appear in two sections.
 *
 * Rules:
 *   - Ticker has LEAPS → push LeapsGroup(s), add leap + assigned-call ids.
 *   - Ticker has stock/ETF lots → push StockCoveredCallGroup, add all lot ids
 *     AND every call assigned to the stock parent.
 *   - A ticker may have BOTH a LeapsGroup and a StockCoveredCallGroup (PMCC).
 *   - Do NOT skip a ticker just because it has no LEAPS.
 *   - Wheel-linked positions are excluded.
 *   - Spread-leg LEAPS are excluded (getSpreadId check).
 *
 * @param openPositions   All open positions (pre-filtered to status === 'open').
 * @param tickers         Ticker store slice (for currentPrice lookups).
 */
export function buildPortfolioSections(
  openPositions: Position[],
  tickers: Ticker[]
): PortfolioSections {
  const leapsGroups: LeapsGroup[] = [];
  const stockGroups: StockCoveredCallGroup[] = [];
  const sectionIds = new Set<string>();

  // Group by ticker, excluding wheel-linked positions
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

    // Skip this ticker entirely if it has neither stocks nor LEAPS
    // (standalone options are classified later in PortfolioView).
    if (stocks.length === 0 && leaps.length === 0) continue;

    const price = tickers.find((t) => t.symbol.toUpperCase() === ticker)?.currentPrice;

    // ONE allocator pass per ticker — result feeds BOTH sections and sectionIds.
    const alloc = allocateCallCoverage({ stocks, leaps, shortCalls, currentPrice: price });

    // ── LEAPS branch ─────────────────────────────────────────────────────────
    for (const leap of leaps) {
      sectionIds.add(leap.id);

      const la = alloc.leaps.find((l) => l.parentId === leap.id);
      const assigned = la?.assigned ?? [];
      const freeContracts = la?.freeContracts ?? leap.contracts ?? 0;
      const coveredContracts = la?.coveredContracts ?? 0;

      for (const c of assigned) {
        sectionIds.add(c.id);
      }

      leapsGroups.push({
        leap,
        assigned,
        freeContracts,
        coveredContracts,
        currentPrice: price ?? 0,
      });
    }

    // ── Stock branch ──────────────────────────────────────────────────────────
    // Tickers with plain stock lots always produce a StockCoveredCallGroup,
    // even when there are no LEAPS (covered calls of plain-stock tickers).
    if (stocks.length > 0) {
      const assignedCalls = alloc.stock?.assigned ?? [];

      // Add every lot id
      for (const lot of stocks) {
        sectionIds.add(lot.id);
      }
      // Add every stock-assigned call id
      for (const c of assignedCalls) {
        sectionIds.add(c.id);
      }

      stockGroups.push({
        ticker,
        lots: stocks,
        assigned: assignedCalls,
        currentPrice: price ?? 0,
      });
    }
  }

  // Sort groups consistently
  leapsGroups.sort((a, b) => {
    const tc = a.leap.ticker.localeCompare(b.leap.ticker);
    if (tc !== 0) return tc;
    return new Date(a.leap.openDate).getTime() - new Date(b.leap.openDate).getTime();
  });
  stockGroups.sort((a, b) => a.ticker.localeCompare(b.ticker));

  return { leapsGroups, stockGroups, sectionIds };
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

/** Per-leg close premiums for closing a two-leg spread at ONE net premium. */
export interface SpreadCloseAllocation {
  /** Close premium per share for the long (buy) leg. */
  longClosePremium: number;
  /** Close premium per share for the short (sell) leg. */
  shortClosePremium: number;
}

/**
 * Allocate the single entered net close premium of a two-leg spread to its legs.
 *
 * The user enters ONE net premium (per share) for the whole spread. Applying it
 * to both legs cancels it out of the combined P&L and nets the ledger cash to
 * zero. Instead, the net premium is attributed to exactly ONE leg and the other
 * leg closes at 0:
 *
 * - debit spread (long premium > short premium): the spread is SOLD for a
 *   credit → the long leg receives the net premium, the short leg closes at 0.
 * - credit spread (short premium > long premium): the spread is BOUGHT BACK
 *   for a debit → the short leg pays the net premium, the long leg closes at 0.
 *
 * Classification uses the same rule as `calculateSpreadSummary`:
 * `isCredit = shortLeg.premium > longLeg.premium`.
 *
 * Resulting invariants (with `calculateOptionRealizedPnL` per leg):
 * - total realized P&L = ±X·contracts·100 − (longCB + shortCB)
 *   (+ when a debit spread is sold, − when a credit spread is bought back)
 * - net ledger cash at close = +X·contracts·100 (debit) / −X·contracts·100 (credit)
 */
export const allocateSpreadClosePremium = (
  longLeg: CallOption | PutOption,
  shortLeg: CallOption | PutOption,
  netClosePremium: number
): SpreadCloseAllocation => {
  const isCredit = shortLeg.premium > longLeg.premium;
  return isCredit
    ? { longClosePremium: 0, shortClosePremium: netClosePremium }
    : { longClosePremium: netClosePremium, shortClosePremium: 0 };
};
