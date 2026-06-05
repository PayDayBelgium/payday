// src/services/ai/config.test.ts
import { describe, it, expect } from 'vitest';
import {
  parseAIConfig,
  serializeAIConfig,
  withApiKey,
  isProviderConfigured,
  DEFAULT_MODELS,
  type AIConfig,
} from './config';

describe('parseAIConfig', () => {
  it('geeft een veilige default bij null', () => {
    const cfg = parseAIConfig(null);
    expect(cfg.provider).toBe('anthropic');
    expect(cfg.model).toBe(DEFAULT_MODELS.anthropic);
    expect(cfg.keys).toEqual({});
  });

  it('geeft de default bij ongeldige JSON', () => {
    const cfg = parseAIConfig('{niet-json');
    expect(cfg.provider).toBe('anthropic');
  });

  it('leest een geldige config terug', () => {
    const raw = JSON.stringify({
      provider: 'anthropic',
      model: 'claude-opus-4-8',
      keys: { anthropic: 'sk-test' },
    });
    const cfg = parseAIConfig(raw);
    expect(cfg.keys.anthropic).toBe('sk-test');
  });

  it('vult een ontbrekend model aan met de provider-default', () => {
    const raw = JSON.stringify({ provider: 'anthropic', keys: {} });
    const cfg = parseAIConfig(raw);
    expect(cfg.model).toBe(DEFAULT_MODELS.anthropic);
  });
});

describe('serializeAIConfig round-trip', () => {
  it('serialiseert en parset terug naar dezelfde waarde', () => {
    const cfg: AIConfig = {
      provider: 'anthropic',
      model: 'claude-opus-4-8',
      keys: { anthropic: 'sk-abc' },
    };
    expect(parseAIConfig(serializeAIConfig(cfg))).toEqual(cfg);
  });
});

describe('withApiKey', () => {
  it('zet de key voor een provider zonder andere keys te wissen', () => {
    const cfg: AIConfig = { provider: 'anthropic', model: 'm', keys: { openai: 'o' } };
    const next = withApiKey(cfg, 'anthropic', 'a');
    expect(next.keys).toEqual({ openai: 'o', anthropic: 'a' });
  });

  it('verwijdert de key bij een lege string', () => {
    const cfg: AIConfig = { provider: 'anthropic', model: 'm', keys: { anthropic: 'a' } };
    const next = withApiKey(cfg, 'anthropic', '');
    expect(next.keys.anthropic).toBeUndefined();
  });
});

describe('isProviderConfigured', () => {
  it('is waar als er een niet-lege key is', () => {
    const cfg: AIConfig = { provider: 'anthropic', model: 'm', keys: { anthropic: 'a' } };
    expect(isProviderConfigured(cfg, 'anthropic')).toBe(true);
  });
  it('is onwaar zonder key', () => {
    const cfg: AIConfig = { provider: 'anthropic', model: 'm', keys: {} };
    expect(isProviderConfigured(cfg, 'anthropic')).toBe(false);
  });
});
