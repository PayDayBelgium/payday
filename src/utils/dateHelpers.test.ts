import { describe, it, expect, afterEach, vi } from 'vitest';
import { getTodayDateString, getDaysToExpiration } from './dateHelpers';

/** Build a YYYY-MM-DD string from the LOCAL date parts of a Date. */
const localDateString = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

afterEach(() => {
  vi.useRealTimers();
});

describe('getTodayDateString', () => {
  it('returns the LOCAL date parts of now (never the UTC date)', () => {
    // Timezone-agnostic: compares against the local calendar date, so this
    // holds in any runner timezone.
    expect(getTodayDateString()).toBe(localDateString(new Date()));
  });

  it('returns the local date just after local midnight (UTC may still be yesterday)', () => {
    vi.useFakeTimers();
    // new Date(y, m, d, h, min) is constructed in LOCAL time — deterministic in any TZ.
    vi.setSystemTime(new Date(2026, 5, 11, 0, 30)); // 2026-06-11 00:30 local
    expect(getTodayDateString()).toBe('2026-06-11');
  });

  it('returns the local date just before local midnight (UTC may already be tomorrow)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 11, 23, 30)); // 2026-06-11 23:30 local
    expect(getTodayDateString()).toBe('2026-06-11');
  });
});

describe('getDaysToExpiration', () => {
  it('returns 1 for tomorrow even at 23:30 local time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 11, 23, 30));
    expect(getDaysToExpiration('2026-06-12')).toBe(1);
  });

  it('returns 0 for today just after local midnight', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 11, 0, 30));
    expect(getDaysToExpiration('2026-06-11')).toBe(0);
  });

  it('returns a negative count for past dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 11, 12, 0));
    expect(getDaysToExpiration('2026-06-01')).toBe(-10);
  });
});
