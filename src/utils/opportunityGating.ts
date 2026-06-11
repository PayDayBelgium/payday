import type { FeatureId, UserLevel } from '../types';
import { isFeatureAvailable } from '../store/slices/userProgressSlice';
import type { AlertItem } from './alertEvaluator';
import type { CampaignType } from './campaignDetector';

/**
 * Maps an opportunity to the feature the user must unlock first
 * (level unlocked) before the opportunity may be shown.
 *
 * Didactic principle: an *opportunity* ("you could write extra income
 * here") is only shown once the corresponding strategy's knowledge has been
 * unlocked. *Alerts* (risk on an existing position) always stay visible
 * and are therefore NOT filtered here.
 *
 * Mapping based on the opportunity-id prefix from `alertEvaluator.ts`.
 * Returns `null` for opportunities that belong at the base level
 * (e.g. price-based rules on stocks/ETFs) — those always stay visible.
 */
export const getOpportunityRequiredFeature = (opportunityId: string): FeatureId | null => {
  // Order: most specific prefix first (spread-profit- before profit-).
  if (opportunityId.startsWith('stock-cc-opportunity-')) return 'covered_calls';
  // Writing a call against a LEAPS is treated as part of covered calls (medior),
  // so the indicator appears once covered_calls is unlocked (not only at PMCC/senior).
  if (opportunityId.startsWith('leaps-cc-opportunity-')) return 'covered_calls';
  if (opportunityId.startsWith('kaching-opportunity-')) return 'kaching';
  if (opportunityId.startsWith('expiring-short-put-opportunity-')) return 'cash_secured_puts';
  if (opportunityId.startsWith('spread-profit-opportunity-')) return 'spreads';
  if (opportunityId.startsWith('profit-opportunity-')) return 'options_basics';

  // Unknown / price-based (stocks-etfs rules): no gating, always show.
  return null;
};

/**
 * Feature required to USE a campaign type as a strategy: filter tabs,
 * empty-state coaching ("Buy LEAPS", "Buy protective put") and creation CTAs.
 *
 * Note: campaign DISPLAY of existing positions is never gated — the user
 * owns those positions and hiding their risk would violate the alert rule.
 * Only advice/creation surfaces should consult this mapping.
 */
export const getCampaignTypeRequiredFeature = (type: CampaignType): FeatureId => {
  switch (type) {
    case 'pmcc':
      return 'pmcc'; // senior
    case 'kaching':
      return 'kaching'; // expert
    case 'wheel':
      return 'wheel_strategy'; // medior
    case 'covered-call':
      return 'covered_calls'; // medior
  }
};

/**
 * Feature required to show a campaign's OPPORTUNITY block (advice message +
 * quick-create button). Kept consistent with `getOpportunityRequiredFeature`
 * so the campaign card never shows advice the dashboard hides: a PMCC
 * campaign's opportunity is "write a call against your LEAPS", which is
 * deliberately part of covered calls (medior) — see the leaps-cc mapping.
 */
export const getCampaignOpportunityRequiredFeature = (type: CampaignType): FeatureId => {
  switch (type) {
    case 'pmcc':
      return 'covered_calls'; // same as leaps-cc-opportunity (medior)
    case 'kaching':
      return 'kaching'; // expert
    case 'wheel':
      return 'wheel_strategy'; // medior
    case 'covered-call':
      return 'covered_calls'; // medior
  }
};

/**
 * Filters opportunities based on the user's unlocked levels.
 * Opportunities whose required feature is not yet unlocked are
 * omitted. Opportunities without a required feature are kept.
 */
export const filterOpportunitiesByAccess = (
  opportunities: AlertItem[],
  unlockedLevels: UserLevel[]
): AlertItem[] => {
  return opportunities.filter((opp) => {
    const requiredFeature = getOpportunityRequiredFeature(opp.id);
    if (requiredFeature === null) return true;
    return isFeatureAvailable(requiredFeature, unlockedLevels);
  });
};
