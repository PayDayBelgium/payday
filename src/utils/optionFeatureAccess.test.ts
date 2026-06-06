import { describe, it, expect } from 'vitest';
import { getOptionActionFeature } from './optionFeatureAccess';

describe('getOptionActionFeature', () => {
  it('kopen (long) vereist options_basics', () => {
    expect(getOptionActionFeature('call', 'buy')).toBe('options_basics');
    expect(getOptionActionFeature('put', 'buy')).toBe('options_basics');
  });

  it('short call / covered call vereist covered_calls', () => {
    expect(getOptionActionFeature('call', 'sell')).toBe('covered_calls');
    expect(getOptionActionFeature('call', 'covered-call')).toBe('covered_calls');
    expect(getOptionActionFeature('put', 'covered-call')).toBe('covered_calls');
  });

  it('short put (CSP) vereist cash_secured_puts', () => {
    expect(getOptionActionFeature('put', 'sell')).toBe('cash_secured_puts');
  });

  it('spreads vereisen spreads (expert)', () => {
    expect(getOptionActionFeature('call', 'credit-spread')).toBe('spreads');
    expect(getOptionActionFeature('call', 'debit-spread')).toBe('spreads');
    expect(getOptionActionFeature('put', 'credit-spread')).toBe('spreads');
    expect(getOptionActionFeature('put', 'debit-spread')).toBe('spreads');
    expect(getOptionActionFeature('call', 'spread')).toBe('spreads');
  });
});
