import { evaluateAllAlerts, getAlertConfigVersion, type AlertItem } from './alertEvaluator';
import type { Portfolio, Position, Ticker } from '../types';

/**
 * Shared, memoized entry point around evaluateAllAlerts.
 *
 * Several useAlerts hook instances are mounted at once (dashboard header,
 * widgets, portfolio views) and each used to run the FULL evaluation on every
 * store change. All inputs are compared BY REFERENCE with the previous call
 * (redux state slices get a new reference whenever they change; the dismissed
 * set is shared via useAlerts' module-level cache; config changes bump
 * getAlertConfigVersion()), so N hooks with identical store refs trigger ONE
 * evaluation instead of N.
 *
 * One memo entry is kept per portfolioFilter value so consumers with
 * different filters (e.g. a portfolio page next to the dashboard) don't evict
 * each other.
 */
interface MemoEntry {
  portfolios: Portfolio[];
  positions: Position[];
  dismissedAlerts: Set<string>;
  tickers: Ticker[] | undefined;
  configVersion: number;
  result: { alerts: AlertItem[]; opportunities: AlertItem[] };
}

const memo = new Map<string, MemoEntry>();

let evaluationCount = 0;

/** Test-only: how often the underlying evaluator actually ran. */
export const getSharedAlertEvaluationCount = (): number => evaluationCount;

/** Test-only: drop all memoized results. */
export const clearSharedAlertEvaluationCache = (): void => {
  memo.clear();
};

export const evaluateAllAlertsShared = (
  portfolios: Portfolio[],
  positions: Position[],
  dismissedAlerts: Set<string>,
  portfolioFilter?: string,
  tickers?: Ticker[]
): { alerts: AlertItem[]; opportunities: AlertItem[] } => {
  const key = portfolioFilter ?? '';
  const configVersion = getAlertConfigVersion();

  const prev = memo.get(key);
  if (
    prev &&
    prev.portfolios === portfolios &&
    prev.positions === positions &&
    prev.dismissedAlerts === dismissedAlerts &&
    prev.tickers === tickers &&
    prev.configVersion === configVersion
  ) {
    return prev.result;
  }

  evaluationCount++;
  const result = evaluateAllAlerts(
    portfolios,
    positions,
    dismissedAlerts,
    portfolioFilter,
    tickers
  );
  memo.set(key, { portfolios, positions, dismissedAlerts, tickers, configVersion, result });
  return result;
};
