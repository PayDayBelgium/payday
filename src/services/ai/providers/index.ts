// src/services/ai/providers/index.ts
import type { AIConfig } from '../config';
import { createAnthropicProvider } from './anthropicProvider';
import type { AIProvider } from './types';

// Maakt de juiste provider op basis van de config.
// Gooit een leesbare fout als er geen key is, of de provider nog niet bestaat (Fase F).
export const createProvider = (config: AIConfig): AIProvider => {
  const key = config.keys[config.provider];
  if (!key) {
    throw new Error('NO_API_KEY');
  }
  switch (config.provider) {
    case 'anthropic':
      return createAnthropicProvider(key);
    default:
      throw new Error('PROVIDER_NOT_AVAILABLE');
  }
};

export type { AIProvider } from './types';
