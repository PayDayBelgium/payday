import type { StockPosition, CallOption } from '../types';
import { isSpreadLeg } from './spreadHelpers';

export interface CoveredCallCapacity {
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
 * @param lots Open stock/ETF lots of the same ticker (e.g. an 80-share and a 20-share buy).
 * @param soldCalls Open sold calls of the SAME ticker+portfolio. Spread legs are
 *                  filtered out internally — a spread's short call is covered by its
 *                  long leg, not by shares.
 */
export function computeCoveredCallCapacity(
  lots: StockPosition[],
  soldCalls: CallOption[]
): CoveredCallCapacity {
  const totalShares = lots.reduce((sum, lot) => sum + lot.shares, 0);

  // Derived from the ticker; lots of the same ticker are consistent.
  const miniSupported = lots[0]?.miniContractsSupported ?? false;
  const optionsSupported = lots.length > 0 && lots.every((lot) => lot.optionsSupported);
  const sharesPerContract = miniSupported ? 10 : 100;

  const maxContracts = Math.floor(totalShares / sharesPerContract);

  const coveredContracts = soldCalls
    .filter((call) => !isSpreadLeg(call))
    .reduce((sum, call) => sum + (call.contracts || 0), 0);

  const freeContracts = Math.max(0, maxContracts - coveredContracts);
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
