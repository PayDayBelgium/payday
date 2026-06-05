// src/services/ai/providers/types.ts
import type { AIMessage, AIStreamEvent } from '../types';

export interface StreamChatInput {
  system: string;
  messages: AIMessage[];
  model: string;
  signal: AbortSignal;
}

export interface AIProvider {
  readonly id: 'anthropic' | 'openai' | 'gemini';
  // Stuurt het gesprek en levert een stream van genormaliseerde events.
  streamChat(input: StreamChatInput): AsyncIterable<AIStreamEvent>;
}
