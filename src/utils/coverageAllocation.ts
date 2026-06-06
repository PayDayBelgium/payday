import type { StockPosition, CallOption } from '../types';
import { isSpreadLeg } from './spreadHelpers';

/**
 * Deterministic coverage allocation for covered calls / PMCC.
 *
 * Assigns each open short call to exactly one "parent": the share group or
 * a specific LEAPS call. Rules (agreed with the user):
 *  1. An explicit `underlyingId` always wins.
 *  2. Shares before LEAPS (fill share capacity first, then LEAPS).
 *  3. A call that cannot cover any LEAPS (strike ≤ all LEAPS strikes)
 *     takes priority on the shares, so it doesn't become naked unnecessarily.
 *  4. When capacity is tight we pick the call with strike ≥ break-even that is
 *     closest to ~15% OTM (current price); without a price, closest to
 *     the break-even.
 *  5. A PMCC call must have strike > LEAPS strike.
 *
 * Pure function: operates on a single ticker+portfolio group, reads no store.
 * Shared by campaignDetector and alertEvaluator so that coverage and
 * opportunities stay consistent (no double-counting / phantom opportunities).
 */

export interface CallCoverageInput {
  /** Open share/ETF lots of the same ticker+portfolio (not wheel-linked). */
  stocks: StockPosition[];
  /** Open long calls that qualify as LEAPS (not wheel-linked). */
  leaps: CallOption[];
  /** Open short calls (not wheel-linked, no spread legs). */
  shortCalls: CallOption[];
  /** Current price of the underlying, for the 15%-OTM weighting. */
  currentPrice?: number;
}

export interface ParentAllocation {
  parentId: string;
  parentKind: 'stock' | 'leaps';
  /** Capacity in contracts. */
  capacity: number;
  assigned: CallOption[];
  coveredContracts: number;
  freeContracts: number;
  /** Break-even per share of the parent. */
  breakEven: number;
}

export interface CallCoverageAllocation {
  stock: ParentAllocation | null;
  leaps: ParentAllocation[];
  /** Short calls without valid coverage (naked). */
  uncovered: CallOption[];
}

const OTM_TARGET_FACTOR = 1.15; // ~15% above the current price

const sumContracts = (calls: CallOption[]): number =>
  calls.reduce((sum, c) => sum + (c.contracts || 0), 0);

/** Break-even per share for a share group = weighted cost basis per share. */
const stockBreakEven = (stocks: StockPosition[]): number => {
  const totalShares = stocks.reduce((s, lot) => s + lot.shares, 0);
  if (totalShares <= 0) return 0;
  const totalCost = stocks.reduce((s, lot) => s + lot.costBasis, 0);
  return totalCost / totalShares;
};

const leapsBreakEven = (leap: CallOption): number =>
  leap.breakEven ?? leap.strike + (leap.premium || 0);

/**
 * Sort candidate calls by "fit" for a parent with a given break-even.
 * Strike ≥ break-even first; then closest to ~15% OTM (or, when the price is
 * missing, closest to the break-even); then oldest first; then id.
 */
const byFit =
  (breakEven: number, target: number | null) =>
  (a: CallOption, b: CallOption): number => {
    const aAbove = a.strike >= breakEven ? 0 : 1;
    const bAbove = b.strike >= breakEven ? 0 : 1;
    if (aAbove !== bAbove) return aAbove - bAbove;

    const ref = target ?? breakEven;
    const aDist = Math.abs(a.strike - ref);
    const bDist = Math.abs(b.strike - ref);
    if (aDist !== bDist) return aDist - bDist;

    const aDate = new Date(a.openDate).getTime();
    const bDate = new Date(b.openDate).getTime();
    if (aDate !== bDate) return aDate - bDate;

    return a.id.localeCompare(b.id);
  };

/** Greedy: assign calls until capacity runs out (only whole calls that fit). */
const fillCapacity = (
  candidates: CallOption[],
  remainingCapacity: number,
  assigned: CallOption[],
  pool: Set<string>
): number => {
  let remaining = remainingCapacity;
  for (const call of candidates) {
    if (!pool.has(call.id)) continue;
    const need = call.contracts || 0;
    if (need > 0 && need <= remaining) {
      assigned.push(call);
      pool.delete(call.id);
      remaining -= need;
    }
  }
  return remaining;
};

export function allocateCallCoverage(input: CallCoverageInput): CallCoverageAllocation {
  const { stocks, leaps, currentPrice } = input;
  const shortCalls = input.shortCalls.filter((c) => !isSpreadLeg(c));
  const target = currentPrice && currentPrice > 0 ? currentPrice * OTM_TARGET_FACTOR : null;

  // --- Build parents ---
  const totalShares = stocks.reduce((s, lot) => s + lot.shares, 0);
  const miniSupported = stocks[0]?.miniContractsSupported ?? false;
  const sharesPerContract = miniSupported ? 10 : 100;
  const stockCapacity = Math.floor(totalShares / sharesPerContract);
  const representativeLot = [...stocks].sort(
    (a, b) => new Date(a.openDate).getTime() - new Date(b.openDate).getTime()
  )[0];
  const lotIds = new Set(stocks.map((s) => s.id));
  const stockBE = stockBreakEven(stocks);

  const stockAssigned: CallOption[] = [];
  const sortedLeaps = [...leaps].sort((a, b) => {
    const d = new Date(a.openDate).getTime() - new Date(b.openDate).getTime();
    return d !== 0 ? d : a.id.localeCompare(b.id);
  });
  const leapsState = sortedLeaps.map((leap) => ({
    leap,
    assigned: [] as CallOption[],
    capacity: leap.contracts || 0,
    breakEven: leapsBreakEven(leap),
  }));
  const leapsById = new Map(leapsState.map((l) => [l.leap.id, l]));

  const pool = new Set(shortCalls.map((c) => c.id));
  const byId = new Map(shortCalls.map((c) => [c.id, c]));

  // --- 1. Honor explicit underlyingId ---
  for (const call of shortCalls) {
    if (!call.underlyingId || !pool.has(call.id)) continue;
    if (lotIds.has(call.underlyingId) && stocks.length > 0) {
      stockAssigned.push(call);
      pool.delete(call.id);
    } else if (leapsById.has(call.underlyingId)) {
      leapsById.get(call.underlyingId)!.assigned.push(call);
      pool.delete(call.id);
    }
    // Unknown/stale link → stays in the pool for automatic allocation.
  }

  // Helper: can this call cover any LEAPS? (strike > LEAPS strike)
  const pmccEligible = (call: CallOption): boolean =>
    leapsState.some((l) => call.strike > l.leap.strike);

  // --- 2. Fill shares: first calls that CANNOT cover any LEAPS, then the rest ---
  if (stocks.length > 0 && stockCapacity > 0) {
    let remaining = stockCapacity - sumContracts(stockAssigned);
    const remainingCalls = [...pool].map((id) => byId.get(id)!);
    const stockOnly = remainingCalls.filter((c) => !pmccEligible(c)).sort(byFit(stockBE, target));
    const alsoLeaps = remainingCalls.filter((c) => pmccEligible(c)).sort(byFit(stockBE, target));
    remaining = fillCapacity(stockOnly, remaining, stockAssigned, pool);
    fillCapacity(alsoLeaps, remaining, stockAssigned, pool);
  }

  // --- 3. Fill LEAPS with the remaining calls (strike > LEAPS strike) ---
  for (const state of leapsState) {
    const remaining = state.capacity - sumContracts(state.assigned);
    if (remaining <= 0) continue;
    const candidates = [...pool]
      .map((id) => byId.get(id)!)
      .filter((c) => c.strike > state.leap.strike)
      .sort(byFit(state.breakEven, target));
    fillCapacity(candidates, remaining, state.assigned, pool);
  }

  // --- 4. Assemble the result ---
  const stock: ParentAllocation | null =
    stocks.length > 0
      ? {
          parentId: representativeLot.id,
          parentKind: 'stock',
          capacity: stockCapacity,
          assigned: stockAssigned,
          coveredContracts: sumContracts(stockAssigned),
          freeContracts: Math.max(0, stockCapacity - sumContracts(stockAssigned)),
          breakEven: stockBE,
        }
      : null;

  const leapsResult: ParentAllocation[] = leapsState.map((state) => ({
    parentId: state.leap.id,
    parentKind: 'leaps',
    capacity: state.capacity,
    assigned: state.assigned,
    coveredContracts: sumContracts(state.assigned),
    freeContracts: Math.max(0, state.capacity - sumContracts(state.assigned)),
    breakEven: state.breakEven,
  }));

  const uncovered = [...pool].map((id) => byId.get(id)!);

  return { stock, leaps: leapsResult, uncovered };
}

/**
 * Target strike for a new covered call: ~15% OTM, but never below the
 * break-even of the underlying.
 */
export function suggestCoveredCallStrike(breakEven: number, currentPrice: number): number {
  const otmTarget = Math.round(currentPrice * OTM_TARGET_FACTOR);
  return Math.max(breakEven, otmTarget);
}

/**
 * Automatically determines the parent for a NEW short call to be written,
 * following the same rules (shares before LEAPS). Returns the parentId that
 * should be set as `underlyingId` on the new position, or null (naked).
 */
export function pickParentForNewShortCall(
  group: CallCoverageInput,
  newCall: Pick<CallOption, 'strike' | 'contracts'>
): { parentKind: 'stock' | 'leaps'; parentId: string } | null {
  // Allocate the existing calls and see where there is still free capacity.
  const allocation = allocateCallCoverage(group);
  const need = newCall.contracts || 1;

  if (allocation.stock && allocation.stock.freeContracts >= need) {
    return { parentKind: 'stock', parentId: allocation.stock.parentId };
  }

  // First LEAPS with free capacity where the new call's strike rises above it.
  const leapMatch = allocation.leaps.find((l) => {
    if (l.freeContracts < need) return false;
    const leap = group.leaps.find((g) => g.id === l.parentId);
    return leap ? newCall.strike > leap.strike : false;
  });
  if (leapMatch) {
    return { parentKind: 'leaps', parentId: leapMatch.parentId };
  }

  return null;
}
