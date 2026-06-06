// src/services/ai/config.ts
import type { AIProviderId } from './types';

export interface AIConfig {
  provider: AIProviderId;
  model: string;
  keys: Partial<Record<AIProviderId, string>>;
  // When false, we do not persist the API key in localStorage but
  // only for the current session (sessionStorage). Optional for
  // backward compat: if the flag is absent, the default behavior applies (true).
  persistKey?: boolean;
}

// Default model per provider. Anthropic: the most capable model.
export const DEFAULT_MODELS: Record<AIProviderId, string> = {
  anthropic: 'claude-opus-4-8',
  openai: 'gpt-4o', // used from Phase F onward
  gemini: 'gemini-2.5-pro', // used from Phase F onward
};

const STORAGE_KEY = 'payday-ai-config';
// Separate session storage for the API key when the user chooses not to
// persist it. Automatically cleared as soon as the tab closes.
const SESSION_KEY_STORAGE = 'payday-ai-session-key';

// PURE: backward-compat default. A config without an explicit flag persists
// the key (the existing default behavior).
const isPersistKey = (cfg: AIConfig): boolean => cfg.persistKey !== false;

const defaultConfig = (): AIConfig => ({
  provider: 'anthropic',
  model: DEFAULT_MODELS.anthropic,
  keys: {},
});

// PURE: tolerant parsing. Falls back to the default on null/invalid JSON.
// persistKey is only carried over when present, so the serialize/parse
// round-trip stays identical for configs without that flag (backward compat).
export const parseAIConfig = (raw: string | null): AIConfig => {
  if (!raw) return defaultConfig();
  try {
    const obj = JSON.parse(raw) as Partial<AIConfig>;
    const provider: AIProviderId = obj.provider ?? 'anthropic';
    const cfg: AIConfig = {
      provider,
      model: obj.model ?? DEFAULT_MODELS[provider],
      keys: obj.keys ?? {},
    };
    if (typeof obj.persistKey === 'boolean') {
      cfg.persistKey = obj.persistKey;
    }
    return cfg;
  } catch {
    return defaultConfig();
  }
};

// PURE
export const serializeAIConfig = (cfg: AIConfig): string => JSON.stringify(cfg);

// PURE: new config with (or without, for an empty string) a key for a provider.
export const withApiKey = (cfg: AIConfig, provider: AIProviderId, key: string): AIConfig => {
  const keys = { ...cfg.keys };
  if (key.trim() === '') {
    delete keys[provider];
  } else {
    keys[provider] = key.trim();
  }
  return { ...cfg, keys };
};

// PURE
export const isProviderConfigured = (cfg: AIConfig, provider: AIProviderId): boolean =>
  (cfg.keys[provider] ?? '').trim().length > 0;

// Storage wrappers (not used in unit tests).
// When persistKey is false, the Anthropic key lives in sessionStorage and the
// rest of the config (provider, model, persistKey flag) in localStorage.
export const loadAIConfig = (): AIConfig => {
  const cfg = parseAIConfig(localStorage.getItem(STORAGE_KEY));
  if (!isPersistKey(cfg)) {
    // Overlay the key from session storage onto the config (may be absent after closing the tab).
    const sessionKey = sessionStorage.getItem(SESSION_KEY_STORAGE);
    const keys = { ...cfg.keys };
    if (sessionKey && sessionKey.trim() !== '') {
      keys.anthropic = sessionKey;
    } else {
      delete keys.anthropic;
    }
    return { ...cfg, keys };
  }
  return cfg;
};

export const saveAIConfig = (cfg: AIConfig): void => {
  if (isPersistKey(cfg)) {
    // Default behavior: everything persisted, no session key needed anymore.
    sessionStorage.removeItem(SESSION_KEY_STORAGE);
    localStorage.setItem(STORAGE_KEY, serializeAIConfig(cfg));
    return;
  }
  // This-session-only: Anthropic key to sessionStorage, the rest to localStorage.
  const sessionKey = cfg.keys.anthropic ?? '';
  if (sessionKey.trim() !== '') {
    sessionStorage.setItem(SESSION_KEY_STORAGE, sessionKey);
  } else {
    sessionStorage.removeItem(SESSION_KEY_STORAGE);
  }
  const persistedKeys = { ...cfg.keys };
  delete persistedKeys.anthropic;
  localStorage.setItem(STORAGE_KEY, serializeAIConfig({ ...cfg, keys: persistedKeys }));
};
