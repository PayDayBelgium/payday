// src/services/ai/providers/anthropicProvider.ts
import Anthropic from '@anthropic-ai/sdk';
import type { AIMessage, AIStreamEvent, ContentBlock } from '../types';
import type { AIProvider, StreamChatInput } from './types';

// Vertaalt onze genormaliseerde content naar het Anthropic-formaat.
const toAnthropicContent = (blocks: ContentBlock[]): Anthropic.ContentBlockParam[] =>
  blocks.map((b) => {
    if (b.kind === 'text') {
      return { type: 'text', text: b.text };
    }
    return {
      type: 'image',
      source: { type: 'base64', media_type: b.mediaType as 'image/png', data: b.dataBase64 },
    };
  });

const toAnthropicMessages = (messages: AIMessage[]): Anthropic.MessageParam[] =>
  messages.map((m) => ({ role: m.role, content: toAnthropicContent(m.content) }));

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
          },
          { signal: input.signal },
        );

        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            yield { type: 'text_delta', text: event.delta.text };
          }
        }

        const final = await stream.finalMessage();
        const stop = final.stop_reason === 'max_tokens' ? 'max_tokens' : 'end';
        yield { type: 'done', stopReason: stop };
      } catch (err) {
        if (input.signal.aborted) {
          yield { type: 'done', stopReason: 'aborted' };
          return;
        }
        const message =
          err instanceof Anthropic.APIError
            ? `${err.status ?? ''} ${err.message}`.trim()
            : err instanceof Error
              ? err.message
              : 'Onbekende fout';
        yield { type: 'error', message };
      }
    },
  };
};
