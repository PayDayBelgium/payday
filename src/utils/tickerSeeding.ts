import type { AppDispatch, RootState } from '../store';
import { ensureTicker } from '../store/commands/tickerCommands';
import type { Ticker } from '../types';

const seedFlagKey = (username: string) => `payday-tickers-seeded-${username}`;

/**
 * Default tickers seeded into a brand-new (empty) account. All optionable
 * stocks; the metadata (options/mini/dividend) can be edited per ticker in the
 * UI afterwards.
 */
const DEFAULT_SEED_TICKERS: Omit<Ticker, 'createdAt'>[] = [
  { symbol: 'TSLA', name: 'Tesla', type: 'stock', optionsAvailable: true, miniContractsAvailable: false, hasDividend: false },
  { symbol: 'HIMS', name: 'Hims & Hers', type: 'stock', optionsAvailable: true, miniContractsAvailable: false, hasDividend: false },
  { symbol: 'SOFI', name: 'SoFi', type: 'stock', optionsAvailable: true, miniContractsAvailable: false, hasDividend: false },
  { symbol: 'NBIS', name: 'Nebius', type: 'stock', optionsAvailable: true, miniContractsAvailable: false, hasDividend: false },
  { symbol: 'PLTR', name: 'Palantir', type: 'stock', optionsAvailable: true, miniContractsAvailable: false, hasDividend: false },
  { symbol: 'NVDA', name: 'Nvidia', type: 'stock', optionsAvailable: true, miniContractsAvailable: false, hasDividend: false },
];

/**
 * Seed the default tickers for a brand-new account.
 *
 * Gated twice so it runs at most once and never touches an account that already
 * has tickers:
 *  1. a per-user localStorage flag (set after the first run), and
 *  2. the ticker list must be empty (an account with tickers — migrated or
 *     manually added — is only marked seeded and left untouched).
 *
 * Seeding goes through `ensureTicker`, so each ticker is emitted as a TickerAdded
 * event and persists via the event log like any other ticker.
 *
 * @returns the number of tickers seeded (0 when gated out).
 */
export const seedDefaultTickersIfMissing = (
  dispatch: AppDispatch,
  getState: () => RootState,
  username?: string
): number => {
  if (!username) return 0;

  const flagKey = seedFlagKey(username);
  if (localStorage.getItem(flagKey)) return 0;

  if (getState().tickers.tickers.length > 0) {
    // Existing account with tickers — mark seeded so we never re-evaluate, but
    // do not add anything.
    localStorage.setItem(flagKey, 'true');
    return 0;
  }

  const timestamp = new Date().toISOString();
  DEFAULT_SEED_TICKERS.forEach((ticker) => {
    dispatch(ensureTicker({ ...ticker, createdAt: timestamp }, timestamp));
  });

  localStorage.setItem(flagKey, 'true');
  console.log(
    `[TickerSeeding] Seeded ${DEFAULT_SEED_TICKERS.length} default tickers for ${username}`
  );
  return DEFAULT_SEED_TICKERS.length;
};
