import { describe, it, expect } from 'vitest';
import { isOptionChangeAllowed, type ProposedChange } from './tools';
import type { UserLevel } from '../../types';

const optionChange = (
  optionType: 'call' | 'put',
  action: 'buy' | 'sell'
): Extract<ProposedChange, { kind: 'option' }> => ({
  kind: 'option',
  toolUseId: 'tu-1',
  portfolio: 'Test',
  ticker: 'AAPL',
  optionType,
  action,
  strike: 100,
  expiration: '2026-12-18',
  contracts: 1,
  premium: 1,
  openDate: '2026-06-06',
});

describe('isOptionChangeAllowed', () => {
  const beginner: UserLevel[] = ['beginner'];
  const medior: UserLevel[] = ['beginner', 'medior'];

  it('beginner mag geen optie-voorstellen toepassen', () => {
    expect(isOptionChangeAllowed(optionChange('call', 'buy'), beginner)).toBe(false);
    expect(isOptionChangeAllowed(optionChange('call', 'sell'), beginner)).toBe(false);
    expect(isOptionChangeAllowed(optionChange('put', 'sell'), beginner)).toBe(false);
  });

  it('medior mag long kopen, covered call (short call) en CSP (short put)', () => {
    expect(isOptionChangeAllowed(optionChange('call', 'buy'), medior)).toBe(true);
    expect(isOptionChangeAllowed(optionChange('call', 'sell'), medior)).toBe(true);
    expect(isOptionChangeAllowed(optionChange('put', 'sell'), medior)).toBe(true);
  });
});
