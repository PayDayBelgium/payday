import { describe, it, expect, afterEach } from 'vitest';
// The REAL app i18n instance (initializes the i18next singleton with the
// locale bundles) — numberFormat.ts subscribes to the same singleton.
import i18n from '../i18n/config';
import { formatNumber, parseLocalizedNumber, invalidateLocaleCache } from './numberFormat';

// ---------------------------------------------------------------------------
// Pins the module-load wiring `i18n.on('languageChanged', invalidateLocaleCache)`
// in numberFormat.ts. It is the only link in the formatter-cache chain that no
// other test exercises: every other numberFormat/inputFormat test calls
// invalidateLocaleCache() manually, so deleting that wiring would keep all of
// them green while the app shows stale-locale numbers after a language switch.
//
// The flow mirrors the real language switcher (Header/LoginPage): write
// localStorage('payday-language') first, then i18n.changeLanguage(lang).
// ---------------------------------------------------------------------------

const originalLanguage = i18n.language;

const switchLanguage = async (lang: string): Promise<void> => {
  localStorage.setItem('payday-language', lang);
  await i18n.changeLanguage(lang);
};

afterEach(async () => {
  // Restore for other test files: language back, key removed, cache cleared.
  localStorage.removeItem('payday-language');
  await i18n.changeLanguage(originalLanguage);
  invalidateLocaleCache();
});

describe('numberFormat ↔ i18n languageChanged wiring', () => {
  it('formatNumber switches locale after i18n.changeLanguage WITHOUT manual cache invalidation', async () => {
    await switchLanguage('en');
    // Warm the locale cache under en-US.
    expect(formatNumber(1234.5, 2)).toBe('1,234.50');

    // Switch to Dutch — only the languageChanged listener may invalidate.
    await switchLanguage('nl');
    expect(formatNumber(1234.5, 2)).toBe('1.234,50');

    // And back again.
    await switchLanguage('en');
    expect(formatNumber(1234.5, 2)).toBe('1,234.50');
  });

  it('parseLocalizedNumber follows the language switch too', async () => {
    await switchLanguage('en');
    expect(parseLocalizedNumber('1,234.50')).toBe(1234.5);

    await switchLanguage('nl');
    expect(parseLocalizedNumber('1.234,50')).toBe(1234.5);
  });
});
