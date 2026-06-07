import { createSlice, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Ticker } from '../../types';
import type { RootState } from '../index';
import { applyTickerEvent } from '../events/projectTickers';
import { appendEvents, replayEvents } from '../events/eventsSlice';
import type { DomainEvent } from '../events/types';

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
    // -----------------------------------------------------------------
    // Runtime-only: live price from the WebSocket feed.
    // This is NOT event-sourced — prices are transient runtime values
    // that the feed repopulates after each reload.
    // tickerPriceMiddleware triggers on this action to propagate the new
    // price to open positions and fire ITM/price-change alerts.
    // -----------------------------------------------------------------
    updateTickerPrice: (state, action: PayloadAction<{ symbol: string; price: number }>) => {
      const ticker = state.tickers.find(
        (t) => t.symbol.toUpperCase() === action.payload.symbol.toUpperCase()
      );
      if (ticker) {
        ticker.currentPrice = Math.max(0, action.payload.price);
      }
    },

    // -----------------------------------------------------------------
    // Runtime-only: bulk load from backup/restore path.
    // Deferred until the backup/restore path is fully event-sourced.
    // Kept as a harmless runtime reducer so backupActions.ts continues
    // to work.
    // -----------------------------------------------------------------
    loadTickers: (state, action: PayloadAction<Ticker[]>) => {
      state.tickers = action.payload;
    },
  },
  extraReducers: (builder) => {
    const fold = (state: TickersState, events: DomainEvent[]) => {
      let next = state.tickers;
      for (const event of events) {
        next = applyTickerEvent(next, event);
      }
      state.tickers = next;
    };

    builder.addCase(appendEvents, (state, action) => fold(state, action.payload.events));

    builder.addCase(replayEvents, (state, action) => {
      // Cold-boot replay: reset the tickers list and replay the full event log.
      // currentPrice values are NOT in the event log — they will be repopulated
      // by the live price feed after boot.
      state.tickers = [];
      fold(state, action.payload);
    });
  },
});

export const { updateTickerPrice, loadTickers } = tickersSlice.actions;

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
