// src/services/ai/config.ts
import type { AIProviderId } from './types';

export interface AIConfig {
  provider: AIProviderId;
  model: string;
  keys: Partial<Record<AIProviderId, string>>;
  // Wanneer false bewaren we de API-key niet persistent in localStorage maar
  // alleen voor de huidige sessie (sessionStorage). Optioneel voor
  // backward-compat: ontbreekt de vlag, dan geldt het standaardgedrag (true).
  persistKey?: boolean;
}

// Standaardmodel per provider. Anthropic: het meest capabele model.
export const DEFAULT_MODELS: Record<AIProviderId, string> = {
  anthropic: 'claude-opus-4-8',
  openai: 'gpt-4o', // gebruikt vanaf Fase F
  gemini: 'gemini-2.5-pro', // gebruikt vanaf Fase F
};

const STORAGE_KEY = 'payday-ai-config';
// Aparte sessie-opslag voor de API-key wanneer de gebruiker kiest om die niet
// persistent te bewaren. Wordt automatisch gewist zodra de tab sluit.
const SESSION_KEY_STORAGE = 'payday-ai-session-key';

// PURE: backward-compat default. Een config zonder expliciete vlag bewaart
// de key persistent (het bestaande standaardgedrag).
const isPersistKey = (cfg: AIConfig): boolean => cfg.persistKey !== false;

const defaultConfig = (): AIConfig => ({
  provider: 'anthropic',
  model: DEFAULT_MODELS.anthropic,
  keys: {},
});

// PURE: tolerant parsen. Valt terug op de default bij null/ongeldige JSON.
// persistKey wordt alleen overgenomen wanneer aanwezig, zodat de serialize/parse
// round-trip identiek blijft voor configs zonder die vlag (backward-compat).
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

// PURE: nieuwe config met (of zonder, bij lege string) key voor een provider.
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

// Storage-wrappers (niet in unit-tests gebruikt).
// Wanneer persistKey false is, staat de Anthropic-key in sessionStorage en de
// overige config (provider, model, persistKey-vlag) in localStorage.
export const loadAIConfig = (): AIConfig => {
  const cfg = parseAIConfig(localStorage.getItem(STORAGE_KEY));
  if (!isPersistKey(cfg)) {
    // Key uit de sessie-opslag bovenop de config leggen (kan ontbreken na sluiten tab).
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
    // Standaardgedrag: alles persistent, geen sessie-key meer nodig.
    sessionStorage.removeItem(SESSION_KEY_STORAGE);
    localStorage.setItem(STORAGE_KEY, serializeAIConfig(cfg));
    return;
  }
  // Alleen-deze-sessie: Anthropic-key naar sessionStorage, rest naar localStorage.
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
