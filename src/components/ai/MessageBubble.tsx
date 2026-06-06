// src/components/ai/MessageBubble.tsx
import React from 'react';
import type { ChatMessage } from '../../contexts/AIAssistantContext';

export const MessageBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  // Only show text and image blocks (tool blocks are internal).
  const visible = message.content.filter((b) => b.kind === 'text' || b.kind === 'image');
  const hasText = visible.some((b) => b.kind === 'text');

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 text-sm break-words ${
          isUser
            ? 'bg-primary-700 text-white'
            : 'bg-surface-muted dark:bg-trading-dark-700 text-ink-800 dark:text-ink-100'
        }`}
      >
        {message.error ? (
          <span className="text-negative-600 dark:text-negative-400">{message.error}</span>
        ) : (
          <div className="space-y-2">
            {visible.map((block, i) =>
              block.kind === 'image' ? (
                <img
                  key={i}
                  src={`data:${block.mediaType};base64,${block.dataBase64}`}
                  alt=""
                  className="max-w-full max-h-64 rounded-md"
                />
              ) : (
                <p key={i} className="whitespace-pre-wrap">
                  {block.text}
                  {message.pending && <span className="ml-1 animate-pulse">▋</span>}
                </p>
              )
            )}
            {message.pending && !hasText && <span className="animate-pulse">▋</span>}
          </div>
        )}
      </div>
    </div>
  );
};
