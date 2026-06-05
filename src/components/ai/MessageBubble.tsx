// src/components/ai/MessageBubble.tsx
import React from 'react';
import type { ChatMessage } from '../../contexts/AIAssistantContext';

export const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  const text = message.content[0]?.kind === 'text' ? message.content[0].text : '';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-primary-700 text-white'
            : 'bg-surface-muted dark:bg-trading-dark-700 text-ink-800 dark:text-ink-100'
        }`}
      >
        {message.error ? (
          <span className="text-negative-600 dark:text-negative-400">{message.error}</span>
        ) : (
          <>
            {text}
            {message.pending && <span className="ml-1 animate-pulse">▋</span>}
          </>
        )}
      </div>
    </div>
  );
};
