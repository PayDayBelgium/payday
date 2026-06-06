// src/services/ai/providers/types.ts
import type { AIMessage, AIStreamEvent, ToolSchema } from '../types';

export interface StreamChatInput {
  system: string;
  messages: AIMessage[];
  model: string;
  tools?: ToolSchema[];
  signal: AbortSignal;
}

export interface AIProvider {
  readonly id: 'anthropic' | 'openai' | 'gemini';
  // Sends the conversation and yields a stream of normalized events.
  streamChat(input: StreamChatInput): AsyncIterable<AIStreamEvent>;
}
