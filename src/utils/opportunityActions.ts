import type { AlertItem } from './alertEvaluator';

export interface CoveredCallOpportunityTarget {
  ticker: string;
  portfolio: string;
  underlyingId?: string;
}

/**
 * If the opportunity is a covered-call one (stock or LEAPS), return the wizard
 * target (ticker, portfolio, and the LEAPS underlyingId when applicable); else null.
 */
export function parseCoveredCallOpportunity(
  opp: Pick<AlertItem, 'id' | 'ticker' | 'portfolio'>
): CoveredCallOpportunityTarget | null {
  if (opp.id.startsWith('stock-cc-opportunity-')) {
    return { ticker: opp.ticker, portfolio: opp.portfolio };
  }
  if (opp.id.startsWith('leaps-cc-opportunity-')) {
    return {
      ticker: opp.ticker,
      portfolio: opp.portfolio,
      underlyingId: opp.id.slice('leaps-cc-opportunity-'.length),
    };
  }
  return null;
}
