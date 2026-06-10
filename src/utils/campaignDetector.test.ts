import { describe, it, expect } from 'vitest';
import { detectCampaigns } from './campaignDetector';
import type { Position, StockPosition, CallOption } from '../types';

const stock = (id: string, shares: number): StockPosition => ({
  id,
  type: 'stock',
  ticker: 'AAPL',
  portfolio: 'Test',
  openDate: '2026-01-01',
  status: 'open',
  shares,
  costBasis: shares * 90,
  purchasePrice: 90,
  currentPrice: 100,
  currentValue: shares * 100,
  optionsSupported: true,
});

const leaps = (id: string, strike: number, contracts = 1): CallOption => ({
  id,
  type: 'call',
  ticker: 'AAPL',
  portfolio: 'Test',
  openDate: '2025-06-01',
  status: 'open',
  action: 'buy',
  strike,
  expiration: '2027-01-15',
  contracts,
  premium: 20,
  costBasis: 20 * contracts * 100,
  currentValue: 20 * contracts * 100,
});

const shortCall = (id: string, strike: number): CallOption => ({
  id,
  type: 'call',
  ticker: 'AAPL',
  portfolio: 'Test',
  openDate: '2026-02-01',
  status: 'open',
  action: 'sell',
  strike,
  expiration: '2026-03-20',
  contracts: 1,
  premium: 2,
  costBasis: -200,
  currentValue: -200,
});

describe('detectCampaigns — coverage dedup', () => {
  it('telt een short call niet dubbel bij aandelen én LEAPS (geen phantom-opportuniteit)', () => {
    // 100 shares (cap 1) + 1 LEAPS (cap 1) + 2 short calls → 1 covers shares, 1 covers LEAPS
    const positions: Position[] = [
      stock('s1', 100),
      leaps('l1', 100),
      shortCall('c1', 110),
      shortCall('c2', 115),
    ];

    const campaigns = detectCampaigns(positions, []);
    const cc = campaigns.find((c) => c.type === 'covered-call');
    const pmcc = campaigns.find((c) => c.type === 'pmcc');

    expect(cc?.coverage).toBe('1/1');
    expect(cc?.hasOpportunity).toBe(false);
    expect(pmcc?.coverage).toBe('1/1');
    expect(pmcc?.hasOpportunity).toBe(false);

    // Each short call assigned exactly once across all campaigns.
    const assignedIds = campaigns
      .flatMap((c) => c.activeOptions)
      .map((o) => o.position.id)
      .sort();
    expect(assignedIds).toEqual(['c1', 'c2']);
  });

  it('toont een legitieme opportuniteit voor de onbenutte LEAPS-capaciteit', () => {
    // 100 shares + 1 LEAPS + 1 short call → call covers shares, LEAPS still has room
    const positions: Position[] = [stock('s1', 100), leaps('l1', 100), shortCall('c1', 110)];

    const campaigns = detectCampaigns(positions, []);
    const cc = campaigns.find((c) => c.type === 'covered-call');
    const pmcc = campaigns.find((c) => c.type === 'pmcc');

    expect(cc?.hasOpportunity).toBe(false); // shares fully covered
    expect(pmcc?.hasOpportunity).toBe(true); // LEAPS still free
    expect(pmcc?.coverage).toBe('0/1');
  });
});
