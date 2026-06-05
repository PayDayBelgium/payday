import { describe, it, expect } from 'vitest';
import { generateMockOptionData } from './optionCandidate';

describe('generateMockOptionData', () => {
  it('is deterministic for the same symbol + seed', () => {
    expect(generateMockOptionData('AAPL')).toEqual(generateMockOptionData('AAPL'));
    expect(generateMockOptionData('AAPL', 3)).toEqual(generateMockOptionData('AAPL', 3));
  });

  it('is case-insensitive on the symbol', () => {
    expect(generateMockOptionData('aapl')).toEqual(generateMockOptionData('AAPL'));
  });

  it('varies with a different seed', () => {
    expect(generateMockOptionData('AAPL', 0)).not.toEqual(generateMockOptionData('AAPL', 1));
  });

  it('produces values within the expected ranges', () => {
    for (const sym of ['AAPL', 'TSLA', 'SPY', 'KO', 'XYZ']) {
      const d = generateMockOptionData(sym);
      expect(d.ivRank).toBeGreaterThanOrEqual(0);
      expect(d.ivRank).toBeLessThanOrEqual(100);
      expect(d.openInterest).toBeGreaterThanOrEqual(20);
      expect(d.openInterest).toBeLessThanOrEqual(5000);
      expect(d.optionVolume).toBeGreaterThanOrEqual(5);
      expect(d.optionVolume).toBeLessThanOrEqual(2000);
      expect(d.bidAskSpreadPct).toBeGreaterThanOrEqual(1);
      expect(d.bidAskSpreadPct).toBeLessThanOrEqual(25);
      expect(d.annualizedPremiumPct).toBeGreaterThanOrEqual(2);
      expect(d.annualizedPremiumPct).toBeLessThanOrEqual(40);
      expect(d.daysToEarnings).toBeGreaterThanOrEqual(1);
      expect(d.daysToEarnings).toBeLessThanOrEqual(60);
    }
  });
});
