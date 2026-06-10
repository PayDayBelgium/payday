import type { StockPosition, CallOption } from '../types';
import { allocateCallCoverage } from './coverageAllocation';

export interface CoveredCallCapacity {
  /** Shares backing covered-call capacity (wheel-linked lots excluded). */
  totalShares: number;
  sharesPerContract: number; // 10 for mini, otherwise 100
  maxContracts: number;
  coveredContracts: number;
  freeContracts: number;
  optionsSupported: boolean;
  canWriteCoveredCall: boolean;
}

/**
 * Compute covered-call capacity for ONE ticker within ONE portfolio.
 *
 * Coverage is derived from the deterministic allocator (allocateCallCoverage)
 * — the same source campaignDetector and alertEvaluator use — so the wizard
 * and the dashboard opportunities agree by construction. Re-deriving coverage
 * with ad-hoc counting is exactly what caused contradicting numbers before
 * (a PMCC call assigned to a LEAPS was counted against the shares here).
 *
 * Wheel-linked positions belong to their wheel campaign and are excluded,
 * mirroring alertEvaluator's coverage groups.
 *
 * @param lots Open stock/ETF lots of the same ticker (e.g. an 80-share and a 20-share buy).
 * @param soldCalls Open sold calls of the SAME ticker+portfolio. Spread legs are
 *                  filtered out by the allocator — a spread's short call is covered
 *                  by its long leg, not by shares.
 * @param leaps Open long LEAPS calls of the same ticker+portfolio, so short calls
 *              the allocator assigns to a LEAPS do not consume share capacity.
 */
export function computeCoveredCallCapacity(
  lots: StockPosition[],
  soldCalls: CallOption[],
  leaps: CallOption[] = []
): CoveredCallCapacity {
  const ccLots = lots.filter((l) => !l.wheelId);
  const ccCalls = soldCalls.filter((c) => !c.wheelId);
  const ccLeaps = leaps.filter((c) => !c.wheelId);

  const totalShares = ccLots.reduce((sum, lot) => sum + lot.shares, 0);

  // Derived from the ticker; lots of the same ticker are consistent.
  const miniSupported = ccLots[0]?.miniContractsSupported ?? false;
  const optionsSupported = ccLots.length > 0 && ccLots.every((lot) => lot.optionsSupported);
  const sharesPerContract = miniSupported ? 10 : 100;

  const allocation = allocateCallCoverage({
    stocks: ccLots,
    leaps: ccLeaps,
    shortCalls: ccCalls,
  });

  const maxContracts = allocation.stock?.capacity ?? 0;
  const coveredContracts = allocation.stock?.coveredContracts ?? 0;
  const freeContracts = allocation.stock?.freeContracts ?? 0;
  const canWriteCoveredCall = optionsSupported && freeContracts >= 1;

  return {
    totalShares,
    sharesPerContract,
    maxContracts,
    coveredContracts,
    freeContracts,
    optionsSupported,
    canWriteCoveredCall,
  };
}
