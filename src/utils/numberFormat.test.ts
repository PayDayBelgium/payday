import { describe, it, expect, afterEach } from 'vitest';
import { parseLocalizedNumber } from './numberFormat';

// getCurrentLocale() reads the i18n language from localStorage('payday-language').
const setLanguage = (lang: 'en' | 'nl' | 'fr') => localStorage.setItem('payday-language', lang);

afterEach(() => {
  localStorage.removeItem('payday-language');
});

describe('parseLocalizedNumber', () => {
  describe('en locale (1,234.56)', () => {
    it('treats the comma as a thousand separator, not a decimal (the 1000x bug)', () => {
      setLanguage('en');
      expect(parseLocalizedNumber('1,000')).toBe(1000);
      expect(parseLocalizedNumber('2,500')).toBe(2500);
    });

    it('parses fully grouped numbers with decimals', () => {
      setLanguage('en');
      expect(parseLocalizedNumber('1,234.56')).toBe(1234.56);
    });

    it('parses plain decimals and ungrouped integers', () => {
      setLanguage('en');
      expect(parseLocalizedNumber('1.5')).toBe(1.5);
      expect(parseLocalizedNumber('1000')).toBe(1000);
    });
  });

  describe('nl locale (1.234,56)', () => {
    it('treats the period as a thousand separator (the 1000x bug)', () => {
      setLanguage('nl');
      expect(parseLocalizedNumber('1.000')).toBe(1000);
    });

    it('parses fully grouped numbers with decimals', () => {
      setLanguage('nl');
      expect(parseLocalizedNumber('1.234,56')).toBe(1234.56);
    });

    it('parses plain decimals and ungrouped integers', () => {
      setLanguage('nl');
      expect(parseLocalizedNumber('1,5')).toBe(1.5);
      expect(parseLocalizedNumber('1000')).toBe(1000);
    });
  });

  describe('fr locale (1 234,56 — space-grouped)', () => {
    it('strips (non-breaking) space thousand separators', () => {
      setLanguage('fr');
      // Intl formats fr-FR with U+202F (narrow no-break space) as the group separator;
      // users typically type a regular space, so both must parse.
      expect(parseLocalizedNumber('1 234,56')).toBe(1234.56);
      expect(parseLocalizedNumber('1 234,56')).toBe(1234.56);
    });
  });

  describe('contract: empty / invalid input', () => {
    it('returns 0 for empty input (callers bind value={x || ""})', () => {
      setLanguage('en');
      expect(parseLocalizedNumber('')).toBe(0);
    });

    it('returns 0 for unparseable input instead of NaN', () => {
      setLanguage('en');
      expect(parseLocalizedNumber('abc')).toBe(0);
    });

    it('keeps the sign on negative numbers', () => {
      setLanguage('nl');
      expect(parseLocalizedNumber('-1,5')).toBe(-1.5);
    });
  });
});
