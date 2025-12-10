import type { Portfolio, CurrencyType } from '../types';
import { getCurrentLocale } from './numberFormat';
import { getCurrencySymbol } from './currency';

// Re-export getCurrencySymbol for convenience
export { getCurrencySymbol };

/**
 * Check if there are multiple currencies across portfolios
 */
export const hasMixedCurrencies = (portfolios: Portfolio[]): boolean => {
  const currencies = new Set(portfolios.map(b => b.currency));
  return currencies.size > 1;
};

/**
 * Get currency symbol for display, returns empty string if mixed currencies
 */
export const getCurrencyForDisplay = (portfolios: Portfolio[], specificCurrency?: CurrencyType): string => {
  if (specificCurrency) {
    return getCurrencySymbol(specificCurrency);
  }

  if (hasMixedCurrencies(portfolios)) {
    return '';
  }

  if (portfolios.length === 0) {
    return '$'; // Default fallback
  }

  return getCurrencySymbol(portfolios[0].currency);
};

/**
 * Format a number as currency with appropriate symbol
 * Returns just the number without symbol if mixed currencies
 * Uses browser/app locale for formatting
 */
export const formatCurrency = (
  value: number,
  portfolios: Portfolio[],
  options?: Intl.NumberFormatOptions
): string => {
  const currencySymbol = getCurrencyForDisplay(portfolios);
  const formattedNumber = value.toLocaleString(getCurrentLocale(), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });

  return currencySymbol ? `${currencySymbol}${formattedNumber}` : formattedNumber;
};
