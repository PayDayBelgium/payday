// src/components/ai/MessageList.tsx
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAIAssistant } from '../../contexts/AIAssistantContext';
import { MessageBubble } from './MessageBubble';

export const MessageList: React.FC = () => {
  const { messages, sendText, isStreaming } = useAIAssistant();
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    const examples = t('ai.examples', { returnObjects: true }) as unknown as string[];
    return (
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-center text-ink-500 dark:text-ink-400">{t('ai.emptyState')}</p>
        <div className="w-full space-y-2">
          {Array.isArray(examples) &&
            examples.map((ex, i) => (
              <button
                key={i}
                disabled={isStreaming}
                onClick={() => void sendText(ex)}
                className="w-full text-left rounded-lg border border-ink-200 dark:border-trading-dark-600 px-3 py-2 text-sm text-ink-700 dark:text-ink-200 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 disabled:opacity-50"
              >
                {ex}
              </button>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
};
