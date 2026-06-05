// src/services/ai/types.ts
// Provider-onafhankelijk berichtmodel voor de AI-assistent.

export type AIProviderId = 'anthropic' | 'openai' | 'gemini';

export type AIRole = 'user' | 'assistant';

// Inhoudsblokken van een bericht. In Fase A gebruiken we 'text';
// 'image' staat klaar voor de broker-screenshot (Fase D).
export type ContentBlock =
  | { kind: 'text'; text: string }
  | { kind: 'image'; mediaType: string; dataBase64: string };

export interface AIMessage {
  role: AIRole;
  content: ContentBlock[];
}

// Genormaliseerde stream-events die elke provider-adapter teruggeeft.
export type AIStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'done'; stopReason: 'end' | 'max_tokens' | 'aborted' }
  | { type: 'error'; message: string };

// Helper om snel een tekstbericht te maken.
export const textMessage = (role: AIRole, text: string): AIMessage => ({
  role,
  content: [{ kind: 'text', text }],
});
