import type { FeatureId, UserLevel } from '../types';
import { isFeatureAvailable } from '../store/slices/userProgressSlice';
import type { AlertItem } from './alertEvaluator';

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
  if (opportunityId.startsWith('leaps-cc-opportunity-')) return 'pmcc';
  if (opportunityId.startsWith('kaching-opportunity-')) return 'kaching';
  if (opportunityId.startsWith('expiring-short-put-opportunity-')) return 'cash_secured_puts';
  if (opportunityId.startsWith('spread-profit-opportunity-')) return 'spreads';
  if (opportunityId.startsWith('profit-opportunity-')) return 'options_basics';

  // Unknown / price-based (stocks-etfs rules): no gating, always show.
  return null;
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
