// src/services/ai/types.ts
// Provider-independent message model for the AI assistant.

export type AIProviderId = 'anthropic' | 'openai' | 'gemini';

export type AIRole = 'user' | 'assistant';

// Content blocks of a message.
export type ContentBlock =
  | { kind: 'text'; text: string }
  | { kind: 'image'; mediaType: string; dataBase64: string }
  | { kind: 'tool_use'; id: string; name: string; input: unknown }
  | { kind: 'tool_result'; toolUseId: string; content: string; isError?: boolean };

export interface AIMessage {
  role: AIRole;
  content: ContentBlock[];
}

// Tool definition that is sent to the provider (JSON schema for the arguments).
export interface ToolSchema {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

// Normalized stream events that every provider adapter returns.
export type AIStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'done'; stopReason: 'end' | 'tool_use' | 'max_tokens' | 'aborted' }
  | { type: 'error'; message: string };

// Helper to quickly create a text message.
export const textMessage = (role: AIRole, text: string): AIMessage => ({
  role,
  content: [{ kind: 'text', text }],
});
