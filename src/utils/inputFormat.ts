import { getCurrentLocale, getDecimalSeparator, getThousandSeparator } from './numberFormat';

/**
 * Utility functions for consistent locale-aware number input formatting
 *
 * Uses the application's locale settings (from i18n) or browser locale.
 * Examples (nl-NL): 1.234,56 | Examples (en-US): 1,234.56
 */

/**
 * Format a number for display using current locale
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted string with locale-appropriate separators
 */
export function formatNumberInput(value: number | string, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';

  return num.toLocaleString(getCurrentLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Parse a locale-formatted number string to a number
 * Automatically detects the format based on current locale
 * @param value - The formatted string (e.g., "1.234,56" for nl-NL or "1,234.56" for en-US)
 * @returns The parsed number
 */
export function parseNumberInput(value: string): number {
  if (!value) return 0;

  const decimalSep = getDecimalSeparator();
  const thousandSep = getThousandSeparator();

  // Remove thousand separators and replace decimal separator with .
  let normalized = value;
  if (thousandSep) {
    normalized = normalized.split(thousandSep).join('');
  }
  if (decimalSep !== '.') {
    normalized = normalized.replace(decimalSep, '.');
  }

  return parseFloat(normalized) || 0;
}

/**
 * Get the placeholder text for a number input field
 * @param example - Example value to show (e.g., 150 or 5.50)
 * @param decimals - Number of decimal places
 * @returns Formatted placeholder string
 */
export function getNumberPlaceholder(example: number, decimals: number = 2): string {
  return formatNumberInput(example, decimals);
}

/**
 * Validate and format user input in real-time for Dutch number format
 * Allows: digits, comma (decimal), period (thousand separator)
 */
export function validateNumberInput(value: string): boolean {
  // Allow empty
  if (!value) return true;

  // Allow only digits, comma, and period
  const dutchNumberPattern = /^[\d.,]*$/;
  if (!dutchNumberPattern.test(value)) return false;

  // Only one comma allowed
  const commas = (value.match(/,/g) || []).length;
  if (commas > 1) return false;

  return true;
}
