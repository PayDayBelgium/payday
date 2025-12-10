import type { AppDispatch, RootState } from '../store';
import { addTicker } from '../store/slices/tickersSlice';
import type { Ticker } from '../types';

/**
 * Migrates tickers from portfoliosSlice to tickersSlice
 * This ensures all existing tickers are consolidated in the new single source of truth
 */
export const migrateTickersToStore = (dispatch: AppDispatch, getState: () => RootState) => {
  const state = getState();

  // Get tickers from both stores
  const portfolioTickers = state.portfolios.tickers || [];
  const tickersStoreTickers = state.tickers.tickers || [];

  // Create a set of existing ticker symbols in tickersSlice for quick lookup
  const existingSymbols = new Set(
    tickersStoreTickers.map((t: Ticker) => t.symbol.toUpperCase())
  );

  // Migrate any tickers from portfoliosSlice that don't exist in tickersSlice
  let migratedCount = 0;
  portfolioTickers.forEach((ticker: Ticker) => {
    if (!existingSymbols.has(ticker.symbol.toUpperCase())) {
      dispatch(addTicker({
        ...ticker,
        symbol: ticker.symbol.toUpperCase(),
        createdAt: ticker.createdAt || new Date().toISOString(),
      }));
      migratedCount++;
    }
  });

  if (migratedCount > 0) {
    console.log(`[TickerMigration] Migrated ${migratedCount} tickers from portfoliosSlice to tickersSlice`);
  }

  return migratedCount;
};
