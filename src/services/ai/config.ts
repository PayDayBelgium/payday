// src/services/ai/config.ts
import type { AIProviderId } from './types';

export interface AIConfig {
  provider: AIProviderId;
  model: string;
  keys: Partial<Record<AIProviderId, string>>;
}

// Standaardmodel per provider. Anthropic: het meest capabele model.
export const DEFAULT_MODELS: Record<AIProviderId, string> = {
  anthropic: 'claude-opus-4-8',
  openai: 'gpt-4o', // gebruikt vanaf Fase F
  gemini: 'gemini-2.5-pro', // gebruikt vanaf Fase F
};

const STORAGE_KEY = 'payday-ai-config';

const defaultConfig = (): AIConfig => ({
  provider: 'anthropic',
  model: DEFAULT_MODELS.anthropic,
  keys: {},
});

// PURE: tolerant parsen. Valt terug op de default bij null/ongeldige JSON.
export const parseAIConfig = (raw: string | null): AIConfig => {
  if (!raw) return defaultConfig();
  try {
    const obj = JSON.parse(raw) as Partial<AIConfig>;
    const provider: AIProviderId = obj.provider ?? 'anthropic';
    return {
      provider,
      model: obj.model ?? DEFAULT_MODELS[provider],
      keys: obj.keys ?? {},
    };
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

// localStorage-wrappers (niet in unit-tests gebruikt).
export const loadAIConfig = (): AIConfig => parseAIConfig(localStorage.getItem(STORAGE_KEY));

export const saveAIConfig = (cfg: AIConfig): void => {
  localStorage.setItem(STORAGE_KEY, serializeAIConfig(cfg));
};
