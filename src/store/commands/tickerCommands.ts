import type { AppDispatch, RootState } from '../index';
import { commit } from '../events/eventsSlice';
import { createEvent } from '../events/types';
import type { Ticker } from '../../types';

/**
 * Add a new ticker to the store. Emits TickerAdded.
 * The fold is idempotent: if the symbol already exists the event is ignored.
 */
export const addTicker = (ticker: Ticker, timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(
    commit([
      createEvent(
        'TickerAdded',
        {
          ticker: {
            ...ticker,
            symbol: ticker.symbol.toUpperCase(),
            createdAt: ticker.createdAt ?? timestamp,
          },
        },
        timestamp
      ),
    ])
  );

/**
 * Ensure a ticker exists. Reads state for idempotency — emits TickerAdded only
 * when the symbol is absent. Safe to call repeatedly with the same symbol.
 */
export const ensureTicker =
  (ticker: Ticker, timestamp: string) => (dispatch: AppDispatch, getState: () => RootState) => {
    const symbolUp = ticker.symbol.toUpperCase();
    const exists = getState().tickers.tickers.some((t) => t.symbol.toUpperCase() === symbolUp);
    if (exists) return;
    dispatch(
      commit([
        createEvent(
          'TickerAdded',
          {
            ticker: {
              ...ticker,
              symbol: symbolUp,
              createdAt: ticker.createdAt ?? timestamp,
            },
          },
          timestamp
        ),
      ])
    );
  };

/**
 * Update general metadata on an existing ticker. Emits TickerUpdated.
 * `currentPrice` in the patch is accepted but will NOT be persisted to the
 * event fold — use `updateTickerPrice` (runtime action) for live prices.
 */
export const updateTicker =
  (patch: Partial<Ticker> & { symbol: string }, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(
      commit([
        createEvent(
          'TickerUpdated',
          { ticker: { ...patch, symbol: patch.symbol.toUpperCase() } },
          timestamp
        ),
      ])
    );

/**
 * Rename a ticker (explicit name change). Emits TickerRenamed.
 */
export const renameTicker =
  (symbol: string, name: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(
      commit([createEvent('TickerRenamed', { symbol: symbol.toUpperCase(), name }, timestamp)])
    );

/**
 * Remove a ticker by symbol. Emits TickerRemoved.
 */
export const removeTicker = (symbol: string, timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(commit([createEvent('TickerRemoved', { symbol: symbol.toUpperCase() }, timestamp)]));

/**
 * Add a ticker to the watchlist. If the ticker already exists in the store it
 * is marked as watchlist; otherwise it is also created. Emits AddedToWatchlist.
 */
export const addToWatchlist = (ticker: Ticker, timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(
    commit([
      createEvent(
        'AddedToWatchlist',
        {
          ticker: {
            ...ticker,
            symbol: ticker.symbol.toUpperCase(),
            isWatchlist: true,
            createdAt: ticker.createdAt ?? timestamp,
          },
        },
        timestamp
      ),
    ])
  );

/**
 * Remove a ticker from the watchlist (clears the isWatchlist flag).
 * Emits RemovedFromWatchlist.
 */
export const removeFromWatchlist = (symbol: string, timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(
    commit([createEvent('RemovedFromWatchlist', { symbol: symbol.toUpperCase() }, timestamp)])
  );
