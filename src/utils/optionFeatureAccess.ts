import type { FeatureId } from '../types';

/** Call or put — determines whether a short position is a covered call or a CSP. */
export type OptionKind = 'call' | 'put';

/** All option actions that can be created by the wizards/AI. */
export type GatedOptionAction =
  | 'buy'
  | 'sell'
  | 'covered-call'
  | 'credit-spread'
  | 'debit-spread'
  | 'spread';

/**
 * Maps an option action to the feature the user must have
 * unlocked (level unlocked) in order to create that action.
 *
 * Didactic principle: a user may only create a strategy once the
 * corresponding knowledge has been unlocked.
 *
 * - buying (long call/put) → `options_basics` (medior)
 * - short call / covered call → `covered_calls` (medior)
 * - short put (CSP) → `cash_secured_puts` (medior)
 * - spreads (credit/debit) → `spreads` (expert)
 */
export const getOptionActionFeature = (
  optionType: OptionKind,
  action: GatedOptionAction
): FeatureId => {
  if (action === 'credit-spread' || action === 'debit-spread' || action === 'spread') {
    return 'spreads';
  }
  if (action === 'buy') return 'options_basics';
  if (action === 'covered-call') return 'covered_calls';
  // action === 'sell'
  return optionType === 'put' ? 'cash_secured_puts' : 'covered_calls';
};
