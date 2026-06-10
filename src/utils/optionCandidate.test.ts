import { describe, it, expect } from 'vitest';
import { generateMockOptionData, scoreOptionCandidate } from './optionCandidate';
import type { MockOptionData } from './optionCandidate';
import type { Ticker } from '../types';

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

const ticker = (over: Partial<Ticker> = {}): Ticker => ({
  symbol: 'AAPL',
  name: 'Apple',
  type: 'stock',
  optionsAvailable: true,
  ...over,
});

const data = (over: Partial<MockOptionData> = {}): MockOptionData => ({
  ivRank: 70,
  openInterest: 2000,
  optionVolume: 1000,
  bidAskSpreadPct: 3,
  annualizedPremiumPct: 25,
  daysToEarnings: 30,
  ...over,
});

describe('scoreOptionCandidate', () => {
  it('a strong candidate scores excellent', () => {
    const r = scoreOptionCandidate(ticker(), data());
    expect(r.verdict).toBe('excellent');
    expect(r.totalScore).toBeGreaterThanOrEqual(80);
    expect(r.criteria).toHaveLength(5);
  });

  it('no options available forces unsuitable and score 0', () => {
    const r = scoreOptionCandidate(ticker({ optionsAvailable: false }), data());
    expect(r.verdict).toBe('unsuitable');
    expect(r.totalScore).toBe(0);
    const optionable = r.criteria.find((c) => c.key === 'optionable');
    expect(optionable!.status).toBe('bad');
  });

  it('a weak candidate scores unsuitable', () => {
    const r = scoreOptionCandidate(
      ticker(),
      data({
        ivRank: 10,
        openInterest: 50,
        optionVolume: 10,
        bidAskSpreadPct: 20,
        annualizedPremiumPct: 2,
        daysToEarnings: 3,
      })
    );
    expect(r.verdict).toBe('unsuitable');
    expect(r.totalScore).toBeLessThan(40);
  });

  it('flags imminent earnings as bad', () => {
    const r = scoreOptionCandidate(ticker(), data({ daysToEarnings: 3 }));
    const earnings = r.criteria.find((c) => c.key === 'earnings');
    expect(earnings!.status).toBe('bad');
  });

  it('low IV-rank is bad, mid is ok, high is good', () => {
    const lo = scoreOptionCandidate(ticker(), data({ ivRank: 10 })).criteria.find(
      (c) => c.key === 'ivRank'
    )!;
    const mid = scoreOptionCandidate(ticker(), data({ ivRank: 40 })).criteria.find(
      (c) => c.key === 'ivRank'
    )!;
    const hi = scoreOptionCandidate(ticker(), data({ ivRank: 70 })).criteria.find(
      (c) => c.key === 'ivRank'
    )!;
    expect(lo.status).toBe('bad');
    expect(mid.status).toBe('ok');
    expect(hi.status).toBe('good');
  });
});

describe('scoreOptionCandidate verdict tiers and boundaries', () => {
  it('a middling candidate scores suitable (60–79)', () => {
    // optionable 100, liquidity ~50 (OI 300, vol 150, spread 8), ivRank 55, premium 60, earnings 60
    const r = scoreOptionCandidate(
      ticker(),
      data({
        ivRank: 55,
        openInterest: 300,
        optionVolume: 150,
        bidAskSpreadPct: 8,
        annualizedPremiumPct: 12,
        daysToEarnings: 10,
      })
    );
    expect(r.verdict).toBe('suitable');
    expect(r.totalScore).toBeGreaterThanOrEqual(60);
    expect(r.totalScore).toBeLessThan(80);
  });

  it('a mediocre candidate scores mediocre (40–59)', () => {
    const r = scoreOptionCandidate(
      ticker(),
      data({
        ivRank: 30,
        openInterest: 300,
        optionVolume: 150,
        bidAskSpreadPct: 8,
        annualizedPremiumPct: 6,
        daysToEarnings: 10,
      })
    );
    expect(r.verdict).toBe('mediocre');
    expect(r.totalScore).toBeGreaterThanOrEqual(40);
    expect(r.totalScore).toBeLessThan(60);
  });

  it('earnings boundary: 7 days is ok, 21 days is good', () => {
    const at7 = scoreOptionCandidate(ticker(), data({ daysToEarnings: 7 })).criteria.find(
      (c) => c.key === 'earnings'
    )!;
    const at21 = scoreOptionCandidate(ticker(), data({ daysToEarnings: 21 })).criteria.find(
      (c) => c.key === 'earnings'
    )!;
    expect(at7.status).toBe('ok');
    expect(at21.status).toBe('good');
  });

  it('premium boundary: 10% is ok, 20% is good', () => {
    const at10 = scoreOptionCandidate(ticker(), data({ annualizedPremiumPct: 10 })).criteria.find(
      (c) => c.key === 'premium'
    )!;
    const at20 = scoreOptionCandidate(ticker(), data({ annualizedPremiumPct: 20 })).criteria.find(
      (c) => c.key === 'premium'
    )!;
    expect(at10.status).toBe('ok');
    expect(at20.status).toBe('good');
  });
});
