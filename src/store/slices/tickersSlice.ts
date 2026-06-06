import { createSlice, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Ticker } from '../../types';
import type { RootState } from '../index';

interface TickersState {
  tickers: Ticker[];
}

const initialState: TickersState = {
  tickers: [],
};

const tickersSlice = createSlice({
  name: 'tickers',
  initialState,
  reducers: {
    // Add a new ticker
    addTicker: (state, action: PayloadAction<Ticker>) => {
      // Check if ticker already exists
      const existingIndex = state.tickers.findIndex(
        (t) => t.symbol.toUpperCase() === action.payload.symbol.toUpperCase()
      );
      if (existingIndex === -1) {
        state.tickers.push({
          ...action.payload,
          symbol: action.payload.symbol.toUpperCase(),
          createdAt: action.payload.createdAt || new Date().toISOString(),
        });
      }
    },

    // Update ticker (name, price, etc.)
    updateTicker: (state, action: PayloadAction<Partial<Ticker> & { symbol: string }>) => {
      const index = state.tickers.findIndex(
        (t) => t.symbol.toUpperCase() === action.payload.symbol.toUpperCase()
      );
      if (index !== -1) {
        // Ensure currentPrice doesn't go below 0
        const updatedPayload = { ...action.payload };
        if (updatedPayload.currentPrice !== undefined && updatedPayload.currentPrice < 0) {
          updatedPayload.currentPrice = 0;
        }
        state.tickers[index] = {
          ...state.tickers[index],
          ...updatedPayload,
          symbol: action.payload.symbol.toUpperCase(),
        };
      }
    },

    // Update ticker price
    updateTickerPrice: (state, action: PayloadAction<{ symbol: string; price: number }>) => {
      const ticker = state.tickers.find(
        (t) => t.symbol.toUpperCase() === action.payload.symbol.toUpperCase()
      );
      if (ticker) {
        // Ensure price doesn't go below 0
        ticker.currentPrice = Math.max(0, action.payload.price);
      }
    },

    // Update ticker name
    updateTickerName: (state, action: PayloadAction<{ symbol: string; name: string }>) => {
      const ticker = state.tickers.find(
        (t) => t.symbol.toUpperCase() === action.payload.symbol.toUpperCase()
      );
      if (ticker) {
        ticker.name = action.payload.name;
      }
    },

    // Remove ticker
    removeTicker: (state, action: PayloadAction<string>) => {
      state.tickers = state.tickers.filter(
        (t) => t.symbol.toUpperCase() !== action.payload.toUpperCase()
      );
    },

    // Add to watchlist (create ticker if doesn't exist, or mark as watchlist)
    addToWatchlist: (state, action: PayloadAction<Ticker>) => {
      const existingIndex = state.tickers.findIndex(
        (t) => t.symbol.toUpperCase() === action.payload.symbol.toUpperCase()
      );
      if (existingIndex === -1) {
        state.tickers.push({
          ...action.payload,
          symbol: action.payload.symbol.toUpperCase(),
          isWatchlist: true,
          createdAt: new Date().toISOString(),
        });
      } else {
        state.tickers[existingIndex].isWatchlist = true;
      }
    },

    // Remove from watchlist
    removeFromWatchlist: (state, action: PayloadAction<string>) => {
      const ticker = state.tickers.find(
        (t) => t.symbol.toUpperCase() === action.payload.toUpperCase()
      );
      if (ticker) {
        ticker.isWatchlist = false;
      }
    },

    // Load all tickers (for initialization)
    loadTickers: (state, action: PayloadAction<Ticker[]>) => {
      state.tickers = action.payload;
    },

    // Ensure ticker exists (used when creating positions)
    ensureTicker: (state, action: PayloadAction<Ticker>) => {
      const existingIndex = state.tickers.findIndex(
        (t) => t.symbol.toUpperCase() === action.payload.symbol.toUpperCase()
      );
      if (existingIndex === -1) {
        state.tickers.push({
          ...action.payload,
          symbol: action.payload.symbol.toUpperCase(),
          createdAt: new Date().toISOString(),
        });
      } else {
        // Update lastUsed
        state.tickers[existingIndex].lastUsed = new Date().toISOString();
      }
    },
  },
});

export const {
  addTicker,
  updateTicker,
  updateTickerPrice,
  updateTickerName,
  removeTicker,
  addToWatchlist,
  removeFromWatchlist,
  loadTickers,
  ensureTicker,
} = tickersSlice.actions;

// Base Selectors
export const selectAllTickers = (state: RootState) => state.tickers.tickers;

// Memoized selectors
export const selectTickerBySymbol = (symbol: string) =>
  createSelector([selectAllTickers], (tickers) =>
    tickers.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase())
  );

export const selectWatchlistTickers = createSelector([selectAllTickers], (tickers) =>
  tickers.filter((t) => t.isWatchlist)
);

export const selectNonWatchlistTickers = createSelector([selectAllTickers], (tickers) =>
  tickers.filter((t) => !t.isWatchlist)
);

export const selectTickerPrice = (symbol: string) =>
  createSelector(
    [selectAllTickers],
    (tickers) => tickers.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase())?.currentPrice
  );

// Memoized selector for tickers sorted by last used
export const selectTickersSorted = createSelector([selectAllTickers], (tickers) => {
  if (!tickers || !Array.isArray(tickers)) return [];
  return [...tickers].sort((a, b) => {
    if (!a.lastUsed) return 1;
    if (!b.lastUsed) return -1;
    return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
  });
});

export default tickersSlice.reducer;
