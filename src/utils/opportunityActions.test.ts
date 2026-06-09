import { describe, it, expect } from 'vitest';
import { parseCoveredCallOpportunity } from './opportunityActions';

describe('parseCoveredCallOpportunity', () => {
  it('returns ticker + portfolio and no underlyingId for stock-cc-opportunity', () => {
    const result = parseCoveredCallOpportunity({
      id: 'stock-cc-opportunity-AAPL-MyPortfolio',
      ticker: 'AAPL',
      portfolio: 'MyPortfolio',
    });
    expect(result).toEqual({ ticker: 'AAPL', portfolio: 'MyPortfolio', underlyingId: undefined });
  });

  it('returns ticker + portfolio + underlyingId for leaps-cc-opportunity', () => {
    const result = parseCoveredCallOpportunity({
      id: 'leaps-cc-opportunity-leap-123',
      ticker: 'AAPL',
      portfolio: 'MyPortfolio',
    });
    expect(result).toEqual({ ticker: 'AAPL', portfolio: 'MyPortfolio', underlyingId: 'leap-123' });
  });

  it('returns null for kaching- ids', () => {
    expect(
      parseCoveredCallOpportunity({
        id: 'kaching-opportunity-AAPL-MyPortfolio',
        ticker: 'AAPL',
        portfolio: 'MyPortfolio',
      })
    ).toBeNull();
  });

  it('returns null for profit- ids', () => {
    expect(
      parseCoveredCallOpportunity({
        id: 'profit-target-AAPL',
        ticker: 'AAPL',
        portfolio: 'MyPortfolio',
      })
    ).toBeNull();
  });

  it('returns null for expiring- ids', () => {
    expect(
      parseCoveredCallOpportunity({
        id: 'expiring-option-pos-abc',
        ticker: 'AAPL',
        portfolio: 'MyPortfolio',
      })
    ).toBeNull();
  });

  it('returns null for price-rule ids', () => {
    expect(
      parseCoveredCallOpportunity({
        id: 'price-decrease-AAPL',
        ticker: 'AAPL',
        portfolio: 'MyPortfolio',
      })
    ).toBeNull();
  });
});
