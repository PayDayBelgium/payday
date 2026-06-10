/**
 * URL safety helpers for user-supplied links rendered as anchors.
 *
 * `portfolio.url` can enter the store from paths that bypass the form's soft
 * validation (a restored backup, an AI-applied change), so render sites must
 * not trust it: a `javascript:` href would be self-XSS on click.
 */

/**
 * True only for absolute http:// or https:// URLs. Everything else —
 * javascript:, data:, vbscript:, relative paths, garbage — is rejected.
 */
export const isSafeHttpUrl = (url: unknown): url is string => {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};
