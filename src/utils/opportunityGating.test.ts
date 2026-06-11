import { describe, it, expect } from 'vitest';
import {
  getOpportunityRequiredFeature,
  getCampaignTypeRequiredFeature,
  getCampaignOpportunityRequiredFeature,
  filterOpportunitiesByAccess,
} from './opportunityGating';
import type { AlertItem } from './alertEvaluator';
import type { UserLevel } from '../types';

const makeOpp = (id: string): AlertItem => ({
  id,
  ticker: 'AAPL',
  portfolio: 'Test',
  message: 'msg',
  type: 'opportunity',
});

describe('getOpportunityRequiredFeature', () => {
  it('koppelt stock covered call aan covered_calls (medior)', () => {
    expect(getOpportunityRequiredFeature('stock-cc-opportunity-AAPL-Test')).toBe('covered_calls');
  });

  it('koppelt LEAPS covered call aan covered_calls (medior)', () => {
    expect(getOpportunityRequiredFeature('leaps-cc-opportunity-123')).toBe('covered_calls');
  });

  it('koppelt kaching aan kaching (expert)', () => {
    expect(getOpportunityRequiredFeature('kaching-opportunity-123')).toBe('kaching');
  });

  it('koppelt expirerende short put aan cash_secured_puts (medior)', () => {
    expect(getOpportunityRequiredFeature('expiring-short-put-opportunity-123')).toBe(
      'cash_secured_puts'
    );
  });

  it('koppelt spread-winst aan spreads (expert)', () => {
    expect(getOpportunityRequiredFeature('spread-profit-opportunity-456')).toBe('spreads');
  });

  it('koppelt optie-winst aan options_basics (medior)', () => {
    expect(getOpportunityRequiredFeature('profit-opportunity-789')).toBe('options_basics');
  });

  it('geeft null voor prijs-gebaseerde / onbekende opportunities (basisniveau)', () => {
    expect(getOpportunityRequiredFeature('pos-123-rule-456')).toBeNull();
    expect(getOpportunityRequiredFeature('iets-anders')).toBeNull();
  });
});

describe('getCampaignTypeRequiredFeature', () => {
  it('maps each campaign type to the feature that unlocks the strategy', () => {
    expect(getCampaignTypeRequiredFeature('covered-call')).toBe('covered_calls'); // medior
    expect(getCampaignTypeRequiredFeature('pmcc')).toBe('pmcc'); // senior
    expect(getCampaignTypeRequiredFeature('kaching')).toBe('kaching'); // expert
    expect(getCampaignTypeRequiredFeature('wheel')).toBe('wheel_strategy'); // medior
  });
});

describe('getCampaignOpportunityRequiredFeature', () => {
  it('maps campaign opportunities consistently with the dashboard opportunity gating', () => {
    expect(getCampaignOpportunityRequiredFeature('covered-call')).toBe('covered_calls');
    // Writing a call against a LEAPS is part of covered calls (medior),
    // same as the leaps-cc-opportunity prefix mapping above.
    expect(getCampaignOpportunityRequiredFeature('pmcc')).toBe('covered_calls');
    expect(getCampaignOpportunityRequiredFeature('kaching')).toBe('kaching');
    expect(getCampaignOpportunityRequiredFeature('wheel')).toBe('wheel_strategy');
  });
});

describe('filterOpportunitiesByAccess', () => {
  const opportunities: AlertItem[] = [
    makeOpp('stock-cc-opportunity-AAPL-Test'), // covered_calls (medior)
    makeOpp('leaps-cc-opportunity-1'), // covered_calls (medior) — CC against a LEAPS
    makeOpp('kaching-opportunity-1'), // kaching (expert)
    makeOpp('pos-1-rule-1'), // no feature (base level)
  ];

  it('beginner ziet géén opties-opportunities, wél de prijs-gebaseerde', () => {
    const beginner: UserLevel[] = ['beginner'];
    const result = filterOpportunitiesByAccess(opportunities, beginner);
    expect(result.map((o) => o.id)).toEqual(['pos-1-rule-1']);
  });

  it('medior ziet stock- én leaps-covered-call maar niet KaChing', () => {
    const medior: UserLevel[] = ['beginner', 'medior'];
    const result = filterOpportunitiesByAccess(opportunities, medior);
    expect(result.map((o) => o.id).sort()).toEqual(
      ['leaps-cc-opportunity-1', 'pos-1-rule-1', 'stock-cc-opportunity-AAPL-Test'].sort()
    );
  });

  it('medior ziet de leaps-CC, maar niet KaChing (expert)', () => {
    const medior: UserLevel[] = ['beginner', 'medior'];
    const result = filterOpportunitiesByAccess(opportunities, medior);
    expect(result.map((o) => o.id)).toContain('leaps-cc-opportunity-1');
    expect(result.map((o) => o.id)).not.toContain('kaching-opportunity-1');
  });

  it('expert ziet alle opportunities', () => {
    const expert: UserLevel[] = ['beginner', 'medior', 'senior', 'expert'];
    const result = filterOpportunitiesByAccess(opportunities, expert);
    expect(result).toHaveLength(opportunities.length);
  });
});
