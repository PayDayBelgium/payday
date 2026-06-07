import type { Ticker } from '../../types';
import type {
  DomainEvent,
  TickerAddedPayload,
  TickerUpdatedPayload,
  TickerRenamedPayload,
  TickerRemovedPayload,
  AddedToWatchlistPayload,
  RemovedFromWatchlistPayload,
} from './types';

/**
 * Pure fold of a single domain event into the tickers list.
 * Returns the same array reference for events this projection does not own,
 * so callers can cheaply detect no-ops.
 *
 * Invariants:
 * - `symbol` is the identity key (case-insensitive comparison; stored uppercase).
 * - TickerAdded is idempotent: if the symbol already exists the event is ignored.
 * - AddedToWatchlist is also idempotent: if the symbol exists it sets isWatchlist=true,
 *   otherwise it appends a new ticker.
 * - `currentPrice` is a runtime value managed by `updateTickerPrice` — it is never
 *   touched by these folds.
 */
export function applyTickerEvent(tickers: Ticker[], event: DomainEvent): Ticker[] {
  switch (event.type) {
    case 'TickerAdded': {
      const { ticker } = event.payload as TickerAddedPayload;
      const symbolUp = ticker.symbol.toUpperCase();
      // Idempotent: ignore if symbol already present
      if (tickers.some((t) => t.symbol.toUpperCase() === symbolUp)) {
        return tickers;
      }
      return [
        ...tickers,
        {
          ...ticker,
          symbol: symbolUp,
          // currentPrice is never persisted via events — strip it so the fold
          // starts clean; the live feed will repopulate it.
          currentPrice: undefined,
        },
      ];
    }

    case 'TickerUpdated': {
      const { ticker: patch } = event.payload as TickerUpdatedPayload;
      const symbolUp = patch.symbol.toUpperCase();
      const idx = tickers.findIndex((t) => t.symbol.toUpperCase() === symbolUp);
      if (idx === -1) return tickers;
      const updated: Ticker = {
        ...tickers[idx],
        ...patch,
        symbol: symbolUp,
        // Never overwrite runtime currentPrice from a persisted event
        currentPrice: tickers[idx].currentPrice,
      };
      return tickers.map((t, i) => (i === idx ? updated : t));
    }

    case 'TickerRenamed': {
      const { symbol, name } = event.payload as TickerRenamedPayload;
      const symbolUp = symbol.toUpperCase();
      const idx = tickers.findIndex((t) => t.symbol.toUpperCase() === symbolUp);
      if (idx === -1) return tickers;
      return tickers.map((t, i) => (i === idx ? { ...t, name } : t));
    }

    case 'TickerRemoved': {
      const { symbol } = event.payload as TickerRemovedPayload;
      const symbolUp = symbol.toUpperCase();
      return tickers.filter((t) => t.symbol.toUpperCase() !== symbolUp);
    }

    case 'AddedToWatchlist': {
      const { ticker } = event.payload as AddedToWatchlistPayload;
      const symbolUp = ticker.symbol.toUpperCase();
      const idx = tickers.findIndex((t) => t.symbol.toUpperCase() === symbolUp);
      if (idx === -1) {
        // Ticker does not yet exist — append it as a watchlist entry
        return [
          ...tickers,
          {
            ...ticker,
            symbol: symbolUp,
            isWatchlist: true,
            currentPrice: undefined,
          },
        ];
      }
      // Ticker already exists — just mark it as watchlist
      return tickers.map((t, i) => (i === idx ? { ...t, isWatchlist: true } : t));
    }

    case 'RemovedFromWatchlist': {
      const { symbol } = event.payload as RemovedFromWatchlistPayload;
      const symbolUp = symbol.toUpperCase();
      const idx = tickers.findIndex((t) => t.symbol.toUpperCase() === symbolUp);
      if (idx === -1) return tickers;
      return tickers.map((t, i) => (i === idx ? { ...t, isWatchlist: false } : t));
    }

    default:
      return tickers;
  }
}
