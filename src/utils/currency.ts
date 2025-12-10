import type { CurrencyType } from '../types';
import { getCurrentLocale } from './numberFormat';

export const getCurrencySymbol = (currency: CurrencyType): string => {
  return currency === 'EUR' ? '€' : '$';
};

export const formatCurrency = (amount: number, currency: CurrencyType): string => {
  const symbol = getCurrencySymbol(currency);
  // Use browser/app locale for formatting
  return `${symbol}${amount.toLocaleString(getCurrentLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};
