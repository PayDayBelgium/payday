/**
 * Get the current locale from i18n or fallback to browser locale
 * @returns The current locale string (e.g., 'nl-NL', 'en-US')
 */
export const getCurrentLocale = (): string => {
  // Try to get the locale from localStorage (used by i18n)
  const savedLanguage = localStorage.getItem('payday-language');

  // Map language codes to full locales
  const localeMap: Record<string, string> = {
    nl: 'nl-NL',
    en: 'en-US',
    fr: 'fr-FR',
  };

  if (savedLanguage && localeMap[savedLanguage]) {
    return localeMap[savedLanguage];
  }

  // Fallback to browser locale
  return navigator.language || 'en-US';
};

/**
 * Format a percentage value using the application's locale settings
 * @param value - The percentage value (e.g., 50 for 50%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string with % symbol
 */
export const formatPercent = (value: number, decimals: number = 2): string => {
  const formattedNumber = formatNumber(value, decimals);
  return `${formattedNumber}%`;
};

/**
 * Format a number for chart axes (abbreviated with k, M, B suffixes)
 * @param value - The number to format
 * @param currencySymbol - Optional currency symbol to prepend
 * @returns Formatted abbreviated string
 */
export const formatCompactNumber = (value: number, currencySymbol: string = ''): string => {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  let formatted: string;
  if (absValue >= 1_000_000_000) {
    formatted = formatNumber(absValue / 1_000_000_000, 1) + 'B';
  } else if (absValue >= 1_000_000) {
    formatted = formatNumber(absValue / 1_000_000, 1) + 'M';
  } else if (absValue >= 1_000) {
    formatted = formatNumber(absValue / 1_000, 0) + 'k';
  } else {
    formatted = formatNumber(absValue, 0);
  }

  return `${sign}${currencySymbol}${formatted}`;
};

/**
 * Format a number using the application's locale settings (from i18n) or browser's locale
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param useGrouping - Whether to use thousand separators (default: true)
 * @returns Formatted number string
 */
export const formatNumber = (
  value: number,
  decimals: number = 2,
  useGrouping: boolean = true
): string => {
  return new Intl.NumberFormat(getCurrentLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: useGrouping,
  }).format(value);
};

/**
 * Format a currency value using the application's locale settings (from i18n) or browser's locale
 * @param value - The number to format
 * @param currencySymbol - Currency symbol to prepend (e.g., '€', '$')
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: number,
  currencySymbol: string = '€',
  decimals: number = 2
): string => {
  const formattedNumber = formatNumber(value, decimals);
  return `${currencySymbol}${formattedNumber}`;
};

/**
 * Get the decimal separator for the current locale (from i18n or browser)
 * @returns The decimal separator character (e.g., '.' or ',')
 */
export const getDecimalSeparator = (): string => {
  const numberWithDecimalSeparator = 1.1;
  const formatted = Intl.NumberFormat(getCurrentLocale()).format(numberWithDecimalSeparator);
  return formatted[1]; // The character at index 1 is the decimal separator
};

/**
 * Get the thousand separator for the current locale (from i18n or browser)
 * @returns The thousand separator character (e.g., ',' or '.' or ' ')
 */
export const getThousandSeparator = (): string => {
  const numberWithThousandSeparator = 1000;
  const formatted = Intl.NumberFormat(getCurrentLocale()).format(numberWithThousandSeparator);
  // The separator is the character at index 1 in the formatted string
  // For example: "1,000" -> "," or "1.000" -> "." or "1 000" -> " "
  if (formatted.length >= 5) {
    // Format should be like "1X000" where X is the separator
    return formatted[1];
  }
  return '';
};

/**
 * Parse a localized number string to a number, using the current locale's
 * separators (same algorithm as `inputFormat.parseNumberInput`, which
 * delegates here so there is exactly one parsing behavior).
 *
 * The locale's thousand separator is stripped FIRST, then the locale's
 * decimal separator is swapped for '.'. A locale-agnostic "guess the decimal
 * separator" heuristic is deliberately NOT used: it parsed grouped input such
 * as "1,000" (en) or "1.000" (nl) as 1, a silent 1000x error, while
 * `validateNumberInput` explicitly allows typing the thousand separator.
 *
 * @param str - The string to parse
 * @returns The parsed number; 0 for empty or unparseable input
 */
export const parseLocalizedNumber = (str: string): number => {
  if (!str) return 0;

  // Remove all whitespace. This also covers locales whose thousand separator
  // is a (narrow no-break) space, e.g. fr-FR — users type a regular space.
  let normalized = str.trim().replace(/\s/g, '');

  const decimalSeparator = getDecimalSeparator();
  const thousandSeparator = getThousandSeparator();

  // Strip the locale thousand separator, then swap the locale decimal
  // separator for '.' so parseFloat understands it.
  if (thousandSeparator && thousandSeparator !== decimalSeparator) {
    normalized = normalized.split(thousandSeparator).join('');
  }
  if (decimalSeparator !== '.') {
    normalized = normalized.replace(decimalSeparator, '.');
  }

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? 0 : parsed;
};
