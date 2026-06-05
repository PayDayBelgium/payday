// src/components/ai/MessageList.tsx
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAIAssistant } from '../../contexts/AIAssistantContext';
import { MessageBubble } from './MessageBubble';

export const MessageList: React.FC = () => {
  const { messages } = useAIAssistant();
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center text-sm text-ink-500 dark:text-ink-400">
        {t('ai.emptyState')}
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
