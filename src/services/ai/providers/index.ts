// src/services/ai/providers/index.ts
import type { AIConfig } from '../config';
import { createAnthropicProvider } from './anthropicProvider';
import type { AIProvider } from './types';

// Creates the appropriate provider based on the config.
// Throws a readable error if there is no key, or the provider does not exist yet (Phase F).
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
