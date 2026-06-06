// src/services/ai/providers/anthropicProvider.ts
import Anthropic from '@anthropic-ai/sdk';
import type { AIMessage, AIStreamEvent, ContentBlock } from '../types';
import type { AIProvider, StreamChatInput } from './types';

// Translates our normalized content into the Anthropic format.
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

// Normalizes an error into a short code (overloaded/limit/auth) or a
// readable message. The context translates the codes into user-facing text.
const normalizeError = (err: unknown): string => {
  const raw = err instanceof Error ? err.message : String(err);
  const status = err instanceof Anthropic.APIError ? err.status : undefined;
  if (status === 529 || /overloaded/i.test(raw)) return 'OVERLOADED';
  if (status === 429 || /rate.?limit/i.test(raw)) return 'RATE_LIMIT';
  if (status === 401 || /authentication/i.test(raw)) return 'AUTH';
  if (err instanceof Anthropic.APIError) return `${status ?? ''} ${err.message}`.trim();
  return raw || 'Onbekende fout';
};

// Waits, but aborts immediately if the user cancels.
const sleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true }
    );
  });

// Increasing wait times before a retry on overload/rate limit.
const RETRY_DELAYS_MS = [1000, 2500];

export const createAnthropicProvider = (apiKey: string): AIProvider => {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  return {
    id: 'anthropic',
    async *streamChat(input: StreamChatInput): AsyncIterable<AIStreamEvent> {
      // At most RETRY_DELAYS_MS.length retries on overload/rate limit,
      // as long as no text/tool has been streamed yet in this attempt.
      for (let attempt = 0; ; attempt++) {
        let yieldedAnything = false;
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
            { signal: input.signal }
          );

          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              yieldedAnything = true;
              yield { type: 'text_delta', text: event.delta.text };
            }
          }

          const final = await stream.finalMessage();
          for (const block of final.content) {
            if (block.type === 'tool_use') {
              yieldedAnything = true;
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
          return;
        } catch (err) {
          if (input.signal.aborted) {
            yield { type: 'done', stopReason: 'aborted' };
            return;
          }
          const code = normalizeError(err);
          const retryable =
            (code === 'OVERLOADED' || code === 'RATE_LIMIT') &&
            !yieldedAnything &&
            attempt < RETRY_DELAYS_MS.length;
          if (retryable) {
            await sleep(RETRY_DELAYS_MS[attempt], input.signal);
            if (input.signal.aborted) {
              yield { type: 'done', stopReason: 'aborted' };
              return;
            }
            continue;
          }
          yield { type: 'error', message: code };
          return;
        }
      }
    },
  };
};
