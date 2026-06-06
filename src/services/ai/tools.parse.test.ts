import { describe, it, expect } from 'vitest';
import { parseProposedChange } from './tools';

describe('parseProposedChange', () => {
  it('returns null for unknown / read-only tools', () => {
    expect(parseProposedChange('get_portfolios', {}, 'id1')).toBeNull();
    expect(parseProposedChange('something_else', { foo: 1 }, 'id1')).toBeNull();
  });

  it('parses a portfolio proposal and defaults invalid currency to USD', () => {
    expect(
      parseProposedChange(
        'propose_create_portfolio',
        { name: 'Growth', currency: 'GBP', availableCash: 5000 },
        'tu1'
      )
    ).toEqual({
      kind: 'portfolio',
      toolUseId: 'tu1',
      name: 'Growth',
      currency: 'USD',
      availableCash: 5000,
    });
  });

  it('keeps EUR when explicitly provided', () => {
    const result = parseProposedChange(
      'propose_create_portfolio',
      { name: 'X', currency: 'EUR' },
      'tu2'
    );
    expect(result).toMatchObject({ currency: 'EUR', availableCash: 0 });
  });

  it('parses a stock proposal, upper-cases the ticker and defaults assetType to stock', () => {
    expect(
      parseProposedChange(
        'propose_create_stock',
        {
          portfolio: 'Growth',
          ticker: 'aapl',
          name: 'Apple',
          shares: 10,
          purchasePrice: 150,
          openDate: '2026-01-02',
        },
        'tu3'
      )
    ).toEqual({
      kind: 'stock',
      toolUseId: 'tu3',
      portfolio: 'Growth',
      ticker: 'AAPL',
      name: 'Apple',
      assetType: 'stock',
      shares: 10,
      purchasePrice: 150,
      currentPrice: undefined,
      openDate: '2026-01-02',
    });
  });

  it('parses an option proposal with sane fallbacks (optionType, action, contracts)', () => {
    const result = parseProposedChange(
      'propose_create_option',
      {
        portfolio: 'Growth',
        ticker: 'msft',
        optionType: 'banana', // invalid -> call
        action: 'sell',
        strike: 400,
        expiration: '2026-03-20',
        premium: 5,
        openDate: '2026-01-02',
      },
      'tu4'
    );
    expect(result).toMatchObject({
      kind: 'option',
      ticker: 'MSFT',
      optionType: 'call',
      action: 'sell',
      strike: 400,
      contracts: 1, // defaulted
      premium: 5,
    });
  });
});
