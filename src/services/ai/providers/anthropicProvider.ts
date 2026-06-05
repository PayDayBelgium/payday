// src/services/ai/providers/anthropicProvider.ts
import Anthropic from '@anthropic-ai/sdk';
import type { AIMessage, AIStreamEvent, ContentBlock } from '../types';
import type { AIProvider, StreamChatInput } from './types';

// Vertaalt onze genormaliseerde content naar het Anthropic-formaat.
const toAnthropicContent = (blocks: ContentBlock[]): Anthropic.ContentBlockParam[] =>
  blocks.map((b): Anthropic.ContentBlockParam => {
    switch (b.kind) {
      case 'text':
        return { type: 'text', text: b.text };
      case 'image':
        return {
          type: 'image',
          source: { type: 'base64', media_type: b.mediaType as 'image/png', data: b.dataBase64 },
        };
      case 'tool_use':
        return { type: 'tool_use', id: b.id, name: b.name, input: b.input };
      case 'tool_result':
        return {
          type: 'tool_result',
          tool_use_id: b.toolUseId,
          content: b.content,
          is_error: b.isError,
        };
    }
  });

const toAnthropicMessages = (messages: AIMessage[]): Anthropic.MessageParam[] =>
  messages.map((m) => ({ role: m.role, content: toAnthropicContent(m.content) }));

// Normaliseert een fout naar een korte code (overbelast/limiet/auth) of een
// leesbare boodschap. De context vertaalt de codes naar gebruikerstekst.
const normalizeError = (err: unknown): string => {
  const raw = err instanceof Error ? err.message : String(err);
  const status = err instanceof Anthropic.APIError ? err.status : undefined;
  if (status === 529 || /overloaded/i.test(raw)) return 'OVERLOADED';
  if (status === 429 || /rate.?limit/i.test(raw)) return 'RATE_LIMIT';
  if (status === 401 || /authentication/i.test(raw)) return 'AUTH';
  if (err instanceof Anthropic.APIError) return `${status ?? ''} ${err.message}`.trim();
  return raw || 'Onbekende fout';
};

export const createAnthropicProvider = (apiKey: string): AIProvider => {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  return {
    id: 'anthropic',
    async *streamChat(input: StreamChatInput): AsyncIterable<AIStreamEvent> {
      try {
        const stream = client.messages.stream(
          {
            model: input.model,
            max_tokens: 4096,
            system: input.system,
            messages: toAnthropicMessages(input.messages),
            ...(input.tools && input.tools.length > 0
              ? { tools: input.tools as Anthropic.Tool[] }
              : {}),
          },
          { signal: input.signal },
        );

        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            yield { type: 'text_delta', text: event.delta.text };
          }
        }

        const final = await stream.finalMessage();
        // Tool-use-blokken uit het uiteindelijke bericht doorgeven.
        for (const block of final.content) {
          if (block.type === 'tool_use') {
            yield { type: 'tool_use', id: block.id, name: block.name, input: block.input };
          }
        }
        const stop =
          final.stop_reason === 'tool_use'
            ? 'tool_use'
            : final.stop_reason === 'max_tokens'
              ? 'max_tokens'
              : 'end';
        yield { type: 'done', stopReason: stop };
      } catch (err) {
        if (input.signal.aborted) {
          yield { type: 'done', stopReason: 'aborted' };
          return;
        }
        yield { type: 'error', message: normalizeError(err) };
      }
    },
  };
};
