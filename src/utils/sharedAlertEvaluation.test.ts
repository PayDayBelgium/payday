import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateAllAlertsShared,
  getSharedAlertEvaluationCount,
  clearSharedAlertEvaluationCache,
} from './sharedAlertEvaluation';
import {
  evaluateAllAlerts,
  getSystemAlertConfig,
  saveSystemAlertConfig,
  invalidateAlertConfigCache,
} from './alertEvaluator';
import type { Portfolio, Position, Ticker } from '../types';

// Clock-relative expiration (~5 days out) so the expiring-option alert path is
// actually exercised by the shared evaluation.
const soonExpiration = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);

const portfolios: Portfolio[] = [
  {
    id: 'pf1',
    name: 'Test',
    logo: '',
    pricePerContract: 100,
    strategy: '',
    hasOptions: true,
    strategies: [],
    currency: 'EUR',
    initialCapital: 10000,
    currentValue: 10000,
  } as Portfolio,
];

const positions: Position[] = [
  {
    id: 'p1',
    ticker: 'XYZ',
    portfolio: 'Test',
    openDate: '2026-01-01',
    status: 'open',
    type: 'put',
    action: 'sell',
    strike: 100,
    expiration: soonExpiration,
    contracts: 1,
    costBasis: -200,
    currentValue: -50,
    cashReserved: 2000,
  } as unknown as Position,
];

const tickers: Ticker[] = [
  {
    symbol: 'XYZ',
    name: 'XYZ Corp',
    type: 'stock',
    optionsAvailable: true,
    currentPrice: 110,
  },
];

const dismissed = new Set<string>();

describe('evaluateAllAlertsShared', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSharedAlertEvaluationCache();
    invalidateAlertConfigCache();
  });

  it('returns the same result as the unshared evaluator for identical inputs', () => {
    // Some evaluators stamp the embedded rule with `new Date().toISOString()`,
    // which differs between two wall-clock calls — normalize it before comparing.
    const normalize = (items: { rule?: { createdAt?: string } }[]) =>
      items.map((item) =>
        item.rule ? { ...item, rule: { ...item.rule, createdAt: 'normalized' } } : item
      );

    const shared = evaluateAllAlertsShared(portfolios, positions, dismissed, undefined, tickers);
    const direct = evaluateAllAlerts(portfolios, positions, dismissed, undefined, tickers);
    expect(normalize(shared.alerts)).toEqual(normalize(direct.alerts));
    expect(normalize(shared.opportunities)).toEqual(normalize(direct.opportunities));
  });

  it('runs the evaluator body ONCE for repeated calls with identical input references', () => {
    const before = getSharedAlertEvaluationCount();
    const first = evaluateAllAlertsShared(portfolios, positions, dismissed, undefined, tickers);
    const second = evaluateAllAlertsShared(portfolios, positions, dismissed, undefined, tickers);
    const third = evaluateAllAlertsShared(portfolios, positions, dismissed, undefined, tickers);
    expect(getSharedAlertEvaluationCount() - before).toBe(1);
    // Memo hit returns the exact same result object.
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it('re-evaluates when any input reference changes', () => {
    const before = getSharedAlertEvaluationCount();
    evaluateAllAlertsShared(portfolios, positions, dismissed, undefined, tickers);
    // New positions array (same content) -> reference change -> re-evaluation.
    evaluateAllAlertsShared(portfolios, [...positions], dismissed, undefined, tickers);
    expect(getSharedAlertEvaluationCount() - before).toBe(2);
  });

  it('re-evaluates when a new dismissed set is provided and drops the dismissed alert', () => {
    const first = evaluateAllAlertsShared(portfolios, positions, dismissed, undefined, tickers);
    expect(first.alerts.length).toBeGreaterThan(0);

    const dismissedAll = new Set<string>(first.alerts.map((a) => a.id));
    const second = evaluateAllAlertsShared(portfolios, positions, dismissedAll, undefined, tickers);
    expect(second.alerts).toHaveLength(0);
  });

  it('keeps separate memo entries per portfolioFilter so consumers do not evict each other', () => {
    const before = getSharedAlertEvaluationCount();
    evaluateAllAlertsShared(portfolios, positions, dismissed, undefined, tickers);
    evaluateAllAlertsShared(portfolios, positions, dismissed, 'Test', tickers);
    // Back to the unfiltered consumer: still a memo hit.
    evaluateAllAlertsShared(portfolios, positions, dismissed, undefined, tickers);
    evaluateAllAlertsShared(portfolios, positions, dismissed, 'Test', tickers);
    expect(getSharedAlertEvaluationCount() - before).toBe(2);
  });

  it('re-evaluates after a config change (invalidation bumps the version)', () => {
    const first = evaluateAllAlertsShared(portfolios, positions, dismissed, undefined, tickers);
    // Default expiringOptionDays = 7 -> the 5-days-out option produces an alert.
    expect(first.alerts.some((a) => a.id === 'expiring-p1')).toBe(true);

    // Settings writer persists a tighter window; saveSystemAlertConfig invalidates.
    saveSystemAlertConfig({ expiringOptionDays: 2, enabled: true });

    const second = evaluateAllAlertsShared(portfolios, positions, dismissed, undefined, tickers);
    expect(second).not.toBe(first);
    expect(second.alerts.some((a) => a.id === 'expiring-p1')).toBe(false);
  });
});

describe('alert config caching', () => {
  beforeEach(() => {
    localStorage.clear();
    invalidateAlertConfigCache();
  });

  it('serves cached config until invalidated, then re-reads localStorage', () => {
    expect(getSystemAlertConfig().expiringOptionDays).toBe(7);

    // A raw localStorage write WITHOUT invalidation is not picked up (cached)...
    localStorage.setItem(
      'system-alert-config',
      JSON.stringify({ expiringOptionDays: 3, enabled: true })
    );
    expect(getSystemAlertConfig().expiringOptionDays).toBe(7);

    // ...until a writer invalidates the cache.
    invalidateAlertConfigCache();
    expect(getSystemAlertConfig().expiringOptionDays).toBe(3);
  });

  it('saveSystemAlertConfig invalidates so the next read is fresh', () => {
    expect(getSystemAlertConfig().expiringOptionDays).toBe(7);
    saveSystemAlertConfig({ expiringOptionDays: 14, enabled: true });
    expect(getSystemAlertConfig().expiringOptionDays).toBe(14);
  });
});
