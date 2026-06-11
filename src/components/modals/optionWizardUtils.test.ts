import { describe, it, expect, afterEach, vi } from 'vitest';
import { calculateDTE } from './optionWizardUtils';

afterEach(() => {
  vi.useRealTimers();
});

describe('calculateDTE', () => {
  it('returns 0 for an empty expiration', () => {
    expect(calculateDTE('')).toBe(0);
  });

  it('returns 1 for tomorrow even at 23:30 local time', () => {
    vi.useFakeTimers();
    // new Date(y, m, d, h, min) is constructed in LOCAL time — deterministic in any TZ.
    vi.setSystemTime(new Date(2026, 5, 11, 23, 30)); // 2026-06-11 23:30 local
    expect(calculateDTE('2026-06-12')).toBe(1);
  });

  it('returns 0 for today just after local midnight (UTC may still be yesterday)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 11, 0, 30)); // 2026-06-11 00:30 local
    expect(calculateDTE('2026-06-11')).toBe(0);
  });

  it('clamps past expirations to 0', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 11, 12, 0));
    expect(calculateDTE('2026-06-01')).toBe(0);
  });
});
