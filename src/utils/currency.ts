import type { CurrencyType } from '../types';

export const getCurrencySymbol = (currency: CurrencyType): string => {
  return currency === 'EUR' ? '€' : '$';
};

// NOTE: a third formatCurrency used to live here but was unused (dead). The two
// remaining implementations are utils/numberFormat.ts (formatCurrency by symbol)
// and utils/currencyHelpers.ts (formatCurrency by portfolios). Prefer those.
