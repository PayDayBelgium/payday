import { describe, it, expect, beforeEach, vi } from 'vitest';
import { seedDefaultTickersIfMissing } from './tickerSeeding';
import type { AppDispatch, RootState } from '../store';

const makeGetState = (tickers: unknown[]) =>
  (() => ({ tickers: { tickers } })) as unknown as () => RootState;

describe('seedDefaultTickersIfMissing', () => {
  beforeEach(() => localStorage.clear());

  it('seeds the 6 default tickers for a brand-new (empty) account and sets the flag', () => {
    const dispatch = vi.fn() as unknown as AppDispatch;
    const seeded = seedDefaultTickersIfMissing(dispatch, makeGetState([]), 'alice');

    expect(seeded).toBe(6);
    expect((dispatch as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(6);
    expect(localStorage.getItem('payday-tickers-seeded-alice')).toBe('true');
  });

  it('does nothing when the account was already seeded (flag set)', () => {
    localStorage.setItem('payday-tickers-seeded-alice', 'true');
    const dispatch = vi.fn() as unknown as AppDispatch;

    const seeded = seedDefaultTickersIfMissing(dispatch, makeGetState([]), 'alice');

    expect(seeded).toBe(0);
    expect((dispatch as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
  });

  it('does not seed an account that already has tickers, but marks it seeded', () => {
    const dispatch = vi.fn() as unknown as AppDispatch;

    const seeded = seedDefaultTickersIfMissing(dispatch, makeGetState([{ symbol: 'AAPL' }]), 'bob');

    expect(seeded).toBe(0);
    expect((dispatch as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(0);
    // Marked seeded so it is never re-evaluated.
    expect(localStorage.getItem('payday-tickers-seeded-bob')).toBe('true');
  });

  it('returns 0 (no-op) when there is no username', () => {
    const dispatch = vi.fn() as unknown as AppDispatch;
    expect(seedDefaultTickersIfMissing(dispatch, makeGetState([]), undefined)).toBe(0);
  });
});
