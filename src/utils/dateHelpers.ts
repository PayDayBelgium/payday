import { differenceInDays, parseISO } from 'date-fns';

/**
 * Get today's date in YYYY-MM-DD format for HTML date inputs
 */
export const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Calculate days between a date string and today
 * Uses start of day for both dates to get accurate day count
 */
export const getDaysToExpiration = (expirationDate: string): number => {
  const expDate = parseISO(expirationDate);
  const today = new Date();

  // Set both dates to start of day to compare just the dates
  const expDateStart = new Date(expDate.getFullYear(), expDate.getMonth(), expDate.getDate());
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return differenceInDays(expDateStart, todayStart);
};

/**
 * Get expiration warning level based on days remaining
 */
export const getExpirationWarningLevel = (
  daysToExpiration: number
): 'critical' | 'warning' | 'normal' => {
  if (daysToExpiration <= 7) return 'critical';
  if (daysToExpiration <= 14) return 'warning';
  return 'normal';
};

/**
 * Format a date string to a more readable format
 */
export const formatDateString = (dateString: string): string => {
  const date = parseISO(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
