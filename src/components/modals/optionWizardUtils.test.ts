import { describe, it, expect, afterEach, vi } from 'vitest';
import { calculateDTE, checkCspCollateral, isNewShortCallNaked } from './optionWizardUtils';
import type { CallOption, StockPosition } from '../../types';

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

describe('checkCspCollateral', () => {
  it('is sufficient when free cash covers strike x 100 x contracts (exact match counts)', () => {
    expect(checkCspCollateral(100, 1, 10_000)).toEqual({
      required: 10_000,
      freeCash: 10_000,
      shortfall: 0,
      sufficient: true,
    });
  });

  it('reports the shortfall when free cash is insufficient', () => {
    expect(checkCspCollateral(50, 2, 4_000)).toEqual({
      required: 10_000,
      freeCash: 4_000,
      shortfall: 6_000,
      sufficient: false,
    });
  });

  it('handles zero or negative free cash (full collateral missing)', () => {
    expect(checkCspCollateral(20, 1, 0).shortfall).toBe(2_000);
    expect(checkCspCollateral(20, 1, -500)).toMatchObject({
      shortfall: 2_500,
      sufficient: false,
    });
  });
});

const stock = (over: Partial<StockPosition> = {}): StockPosition =>
  ({
    id: 's1',
    ticker: 'XYZ',
    portfolio: 'Test',
    openDate: '2026-01-01',
    status: 'open',
    type: 'stock',
    shares: 100,
    costBasis: 2500,
    currentValue: 3000,
    ...over,
  }) as StockPosition;

const leaps = (over: Partial<CallOption> = {}): CallOption =>
  ({
    id: 'leap1',
    ticker: 'XYZ',
    portfolio: 'Test',
    openDate: '2026-01-01',
    status: 'open',
    type: 'call',
    action: 'buy',
    strike: 80,
    expiration: '2027-01-15',
    contracts: 1,
    premium: 20,
    costBasis: 2000,
    currentValue: 2000,
    ...over,
  }) as CallOption;

const emptyGroup = { stocks: [], leaps: [], shortCalls: [] };
const newCall = { strike: 110, contracts: 1 };

describe('isNewShortCallNaked', () => {
  it('flags a sell call with no shares and no LEAPS as naked', () => {
    expect(
      isNewShortCallNaked({
        isShortCall: true,
        linkedToWheel: false,
        group: emptyGroup,
        newCall,
      })
    ).toBe(true);
  });

  it('is not naked when 100 shares cover the contract', () => {
    expect(
      isNewShortCallNaked({
        isShortCall: true,
        linkedToWheel: false,
        group: { ...emptyGroup, stocks: [stock()] },
        newCall,
      })
    ).toBe(false);
  });

  it('is not naked when a LEAPS with a lower strike covers it (PMCC)', () => {
    expect(
      isNewShortCallNaked({
        isShortCall: true,
        linkedToWheel: false,
        group: { ...emptyGroup, leaps: [leaps()] },
        newCall,
      })
    ).toBe(false);
  });

  it('IS naked when the only LEAPS has a higher strike (no valid diagonal)', () => {
    expect(
      isNewShortCallNaked({
        isShortCall: true,
        linkedToWheel: false,
        group: { ...emptyGroup, leaps: [{ ...leaps(), strike: 150 }] },
        newCall,
      })
    ).toBe(true);
  });

  it('never warns for long calls, wheel-linked calls, or an explicit initiator', () => {
    expect(
      isNewShortCallNaked({ isShortCall: false, linkedToWheel: false, group: emptyGroup, newCall })
    ).toBe(false);
    expect(
      isNewShortCallNaked({ isShortCall: true, linkedToWheel: true, group: emptyGroup, newCall })
    ).toBe(false);
    expect(
      isNewShortCallNaked({
        isShortCall: true,
        linkedToWheel: false,
        explicitUnderlyingId: 'leap1',
        group: emptyGroup,
        newCall,
      })
    ).toBe(false);
  });
});
