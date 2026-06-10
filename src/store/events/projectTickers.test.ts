import { describe, it, expect } from 'vitest';
import { applyTickerEvent } from './projectTickers';
import type { Ticker } from '../../types';
import type { DomainEvent } from './types';

// --- Helpers ---

function makeTicker(symbol: string, overrides: Partial<Ticker> = {}): Ticker {
  return {
    symbol,
    name: `${symbol} Corp`,
    type: 'stock',
    optionsAvailable: true,
    hasDividend: false,
    isWatchlist: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function event<T extends DomainEvent['type']>(
  type: T,
  payload: unknown,
  timestamp = 't'
): DomainEvent {
  return {
    id: 'e',
    seq: 0,
    type,
    payload,
    timestamp,
    actor: 'a',
    schemaVersion: 1,
  } as DomainEvent;
}

// --- TickerAdded ---

describe('applyTickerEvent — TickerAdded', () => {
  it('appends a new ticker to an empty list', () => {
    const t1 = makeTicker('AAPL');
    const result = applyTickerEvent([], event('TickerAdded', { ticker: t1 }));
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('AAPL');
  });

  it('uppercases the symbol on fold', () => {
    const t1 = makeTicker('aapl');
    const result = applyTickerEvent([], event('TickerAdded', { ticker: t1 }));
    expect(result[0].symbol).toBe('AAPL');
  });

  it('appends multiple tickers in order', () => {
    let tickers: Ticker[] = [];
    tickers = applyTickerEvent(tickers, event('TickerAdded', { ticker: makeTicker('AAPL') }));
    tickers = applyTickerEvent(tickers, event('TickerAdded', { ticker: makeTicker('MSFT') }));
    expect(tickers.map((t) => t.symbol)).toEqual(['AAPL', 'MSFT']);
  });

  it('is idempotent — duplicate symbol is ignored', () => {
    const t1 = makeTicker('AAPL');
    let tickers = applyTickerEvent([], event('TickerAdded', { ticker: t1 }));
    const before = tickers;
    tickers = applyTickerEvent(tickers, event('TickerAdded', { ticker: makeTicker('AAPL', { name: 'Different' }) }));
    expect(tickers).toBe(before); // same reference
    expect(tickers).toHaveLength(1);
    expect(tickers[0].name).toBe('AAPL Corp'); // original kept
  });

  it('strips currentPrice from the folded ticker', () => {
    const t1 = makeTicker('AAPL', { currentPrice: 150 });
    const result = applyTickerEvent([], event('TickerAdded', { ticker: t1 }));
    expect(result[0].currentPrice).toBeUndefined();
  });
});

// --- TickerUpdated ---

describe('applyTickerEvent — TickerUpdated', () => {
  it('updates metadata on an existing ticker', () => {
    const tickers = [makeTicker('AAPL')];
    const result = applyTickerEvent(
      tickers,
      event('TickerUpdated', { ticker: { symbol: 'AAPL', name: 'Apple Updated', optionsAvailable: false } })
    );
    expect(result[0].name).toBe('Apple Updated');
    expect(result[0].optionsAvailable).toBe(false);
  });

  it('does not touch currentPrice even if the patch includes it', () => {
    const tickers = [{ ...makeTicker('AAPL'), currentPrice: 150 }];
    const result = applyTickerEvent(
      tickers,
      event('TickerUpdated', { ticker: { symbol: 'AAPL', currentPrice: 999 } })
    );
    // currentPrice must stay at runtime value (150), not the event payload (999)
    expect(result[0].currentPrice).toBe(150);
  });

  it('is a no-op for unknown symbol', () => {
    const tickers = [makeTicker('AAPL')];
    const result = applyTickerEvent(
      tickers,
      event('TickerUpdated', { ticker: { symbol: 'MSFT', name: 'Should not appear' } })
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('AAPL Corp');
  });
});

// --- TickerRenamed ---

describe('applyTickerEvent — TickerRenamed', () => {
  it('renames an existing ticker', () => {
    const tickers = [makeTicker('AAPL')];
    const result = applyTickerEvent(
      tickers,
      event('TickerRenamed', { symbol: 'AAPL', name: 'Apple Inc.' })
    );
    expect(result[0].name).toBe('Apple Inc.');
  });

  it('is case-insensitive on symbol lookup', () => {
    const tickers = [makeTicker('AAPL')];
    const result = applyTickerEvent(
      tickers,
      event('TickerRenamed', { symbol: 'aapl', name: 'Apple Inc.' })
    );
    expect(result[0].name).toBe('Apple Inc.');
  });

  it('is a no-op for unknown symbol', () => {
    const tickers = [makeTicker('AAPL')];
    const result = applyTickerEvent(
      tickers,
      event('TickerRenamed', { symbol: 'MSFT', name: 'Microsoft' })
    );
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('AAPL Corp');
  });
});

// --- TickerRemoved ---

describe('applyTickerEvent — TickerRemoved', () => {
  it('removes an existing ticker', () => {
    const tickers = [makeTicker('AAPL'), makeTicker('MSFT')];
    const result = applyTickerEvent(tickers, event('TickerRemoved', { symbol: 'AAPL' }));
    expect(result.map((t) => t.symbol)).toEqual(['MSFT']);
  });

  it('is a no-op for unknown symbol', () => {
    const tickers = [makeTicker('AAPL')];
    const result = applyTickerEvent(tickers, event('TickerRemoved', { symbol: 'MSFT' }));
    expect(result).toHaveLength(1);
  });
});

// --- AddedToWatchlist ---

describe('applyTickerEvent — AddedToWatchlist', () => {
  it('marks an existing ticker as watchlist', () => {
    const tickers = [makeTicker('AAPL', { isWatchlist: false })];
    const result = applyTickerEvent(
      tickers,
      event('AddedToWatchlist', { ticker: makeTicker('AAPL') })
    );
    expect(result[0].isWatchlist).toBe(true);
    expect(result).toHaveLength(1);
  });

  it('appends a new ticker as watchlist when symbol does not exist', () => {
    const result = applyTickerEvent(
      [],
      event('AddedToWatchlist', { ticker: makeTicker('AAPL') })
    );
    expect(result).toHaveLength(1);
    expect(result[0].symbol).toBe('AAPL');
    expect(result[0].isWatchlist).toBe(true);
    expect(result[0].currentPrice).toBeUndefined();
  });

  it('is idempotent when the ticker is already on the watchlist', () => {
    const tickers = [makeTicker('AAPL', { isWatchlist: true })];
    const result = applyTickerEvent(
      tickers,
      event('AddedToWatchlist', { ticker: makeTicker('AAPL') })
    );
    expect(result[0].isWatchlist).toBe(true);
    expect(result).toHaveLength(1);
  });
});

// --- RemovedFromWatchlist ---

describe('applyTickerEvent — RemovedFromWatchlist', () => {
  it('clears the isWatchlist flag on an existing ticker', () => {
    const tickers = [makeTicker('AAPL', { isWatchlist: true })];
    const result = applyTickerEvent(
      tickers,
      event('RemovedFromWatchlist', { symbol: 'AAPL' })
    );
    expect(result[0].isWatchlist).toBe(false);
  });

  it('is a no-op for unknown symbol', () => {
    const tickers = [makeTicker('AAPL', { isWatchlist: true })];
    const result = applyTickerEvent(
      tickers,
      event('RemovedFromWatchlist', { symbol: 'MSFT' })
    );
    expect(result[0].isWatchlist).toBe(true);
    expect(result).toHaveLength(1);
  });
});

// --- Unrelated events (default branch) ---

describe('applyTickerEvent — unrelated events', () => {
  it('returns the same array reference for events it does not own', () => {
    const tickers = [makeTicker('AAPL')];
    const result = applyTickerEvent(tickers, event('PositionOpened', { position: {} }));
    expect(result).toBe(tickers);
  });

  it('returns the same reference for strategy events', () => {
    const tickers = [makeTicker('AAPL')];
    const result = applyTickerEvent(
      tickers,
      event('TradingStrategyCreated', { strategy: {} })
    );
    expect(result).toBe(tickers);
  });
});
