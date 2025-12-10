/**
 * Standard option contract multiplier (1 contract = 100 shares)
 */
export const OPTION_CONTRACT_MULTIPLIER = 100;

/**
 * Expiration warning thresholds (in days)
 */
export const EXPIRATION_THRESHOLDS = {
  CRITICAL: 7,
  WARNING: 14,
} as const;

/**
 * Profit capture thresholds (in percentage)
 */
export const PROFIT_THRESHOLDS = {
  TAKE_PROFIT: 80, // 80% of premium captured
} as const;

/**
 * Default values for calculations
 */
export const CALCULATION_DEFAULTS = {
  DAYS_PER_YEAR: 365,
  PERCENT_MULTIPLIER: 100,
} as const;
