import { describe, it, expect } from 'vitest';
import i18next from 'i18next';
import { en } from './locales/en';

// Raw source of every component/page/util, so we can verify each literal t() key
// actually resolves. tsc's react-i18next key typing degrades to `string` for very
// deep locale trees, so this runtime check is the real guard against missing keys.
const files = import.meta.glob('../**/*.{ts,tsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('i18n key integrity', () => {
  it('every literal t() key resolves in the en locale', async () => {
    const inst = i18next.createInstance();
    await inst.init({ resources: { en: { translation: en } }, lng: 'en', fallbackLng: 'en' });

    const re = /\bt\(\s*'([^'${}]+)'/g; // t('key') / i18n.t('key'); skip template/dynamic
    const missing: { file: string; key: string }[] = [];
    const seen = new Set<string>();

    for (const [path, src] of Object.entries(files)) {
      if (path.includes('/i18n/') || path.includes('.test.')) continue;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const key = m[1];
        const id = `${path}::${key}`;
        if (seen.has(id)) continue;
        seen.add(id);
        // exists() does not account for i18next plural suffixes, so accept a key
        // when its _one/_other plural variants are present.
        const resolves =
          inst.exists(key) || inst.exists(`${key}_one`) || inst.exists(`${key}_other`);
        if (!resolves) missing.push({ file: path.replace('../', 'src/'), key });
      }
    }

    if (missing.length) {
      // eslint-disable-next-line no-console
      console.log(
        `MISSING i18n KEYS (${missing.length}):\n` +
          missing.map((x) => `  ${x.key}  (${x.file})`).join('\n')
      );
    }
    expect(missing).toEqual([]);
  });
});
