import i18n from 'i18next';

/** Map i18n language codes to full BCP 47 locales. */
const LOCALE_MAP: Record<string, string> = {
  nl: 'nl-NL',
  en: 'en-US',
  fr: 'fr-FR',
};

// ---------------------------------------------------------------------------
// Caches
//
// The formatting helpers below run thousands of times per render pass (every
// cell of the position tables re-renders on every live price tick), so both
// the localStorage-backed locale lookup and the Intl.NumberFormat instances
// are cached at module level. The key space is tiny (3 supported locales x a
// handful of decimal/grouping settings), so the maps never need eviction.
// ---------------------------------------------------------------------------

let cachedLocale: string | null = null;

const formatterCache = new Map<string, Intl.NumberFormat>();
const separatorCache = new Map<string, { decimal: string; group: string }>();

/**
 * Invalidate the cached locale so the next call re-resolves it.
 * Wired to i18next's `languageChanged` event below; also used by tests that
 * write `localStorage['payday-language']` directly instead of going through
 * `i18n.changeLanguage`.
 */
export const invalidateLocaleCache = (): void => {
  cachedLocale = null;
};

// The app changes language exclusively via `i18n.changeLanguage()` (Header and
// LoginPage), which also writes localStorage('payday-language'). Subscribing to
// the i18next singleton keeps the cached locale in sync without a localStorage
// read on every format call. Note: this imports 'i18next' (the bare singleton),
// NOT '@/i18n/config', so this module does not pull in the locale bundles and
// there is no import cycle with the i18n setup.
i18n.on('languageChanged', invalidateLocaleCache);

/**
 * Get the current locale from i18n or fallback to browser locale
 * @returns The current locale string (e.g., 'nl-NL', 'en-US')
 */
export const getCurrentLocale = (): string => {
  if (cachedLocale !== null) {
    return cachedLocale;
  }

  // The locale saved by the language switcher (used by i18n), with the
  // browser locale as fallback. Cached until the language changes.
  const savedLanguage = localStorage.getItem('payday-language');
  cachedLocale = (savedLanguage && LOCALE_MAP[savedLanguage]) || navigator.language || 'en-US';
  return cachedLocale;
};

/** Get (or create and cache) the Intl.NumberFormat for the current locale. */
const getNumberFormatter = (decimals: number, useGrouping: boolean): Intl.NumberFormat => {
  const locale = getCurrentLocale();
  const key = `${locale}|${decimals}|${useGrouping}`;
  let formatter = formatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      useGrouping: useGrouping,
    });
    formatterCache.set(key, formatter);
  }
  return formatter;
};

/** Get (or compute and cache) the decimal/group separators for a locale. */
const getSeparators = (locale: string): { decimal: string; group: string } => {
  let separators = separatorCache.get(locale);
  if (!separators) {
    const parts = new Intl.NumberFormat(locale).formatToParts(1000.1);
    separators = {
      decimal: parts.find((part) => part.type === 'decimal')?.value ?? '.',
      // Locales without grouping have no 'group' part; mirror the old
      // behavior of returning '' for the thousand separator in that case.
      group: parts.find((part) => part.type === 'group')?.value ?? '',
    };
    separatorCache.set(locale, separators);
  }
  return separators;
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
  return getNumberFormatter(decimals, useGrouping).format(value);
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
  return getSeparators(getCurrentLocale()).decimal;
};

/**
 * Get the thousand separator for the current locale (from i18n or browser)
 * @returns The thousand separator character (e.g., ',' or '.' or ' '), or ''
 *          when the locale does not group thousands
 */
export const getThousandSeparator = (): string => {
  return getSeparators(getCurrentLocale()).group;
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
