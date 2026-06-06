import 'react-i18next';
import type { en } from './locales/en';

// Makes t() keys type-safe and gives autocomplete: keys are derived from the
// English locale (the fallback). See docs/CODE-REVIEW-2026-06.md I4.
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
  }
}
