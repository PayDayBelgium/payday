// src/components/ai/AIComposer.tsx
import React, { useState } from 'react';
import { Send, Square } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAIAssistant } from '../../contexts/AIAssistantContext';

export const AIComposer: React.FC = () => {
  const { sendText, isStreaming, abort } = useAIAssistant();
  const { t } = useTranslation();
  const [value, setValue] = useState('');

  const submit = () => {
    const text = value;
    setValue('');
    void sendText(text);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming) submit();
    }
  };

  return (
    <div className="border-t border-ink-200 dark:border-trading-dark-600 p-3">
      <div className="flex items-end gap-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder={t('ai.inputPlaceholder')}
          className="flex-1 resize-none rounded-lg border border-ink-200 dark:border-trading-dark-600 bg-white dark:bg-trading-dark-800 px-3 py-2 text-sm text-ink-800 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-primary-500 max-h-32"
        />
        {isStreaming ? (
          <button
            onClick={abort}
            aria-label={t('ai.stop')}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-negative-600 hover:bg-negative-700 text-white"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={value.trim() === ''}
            aria-label={t('ai.send')}
            className="h-9 w-9 flex items-center justify-center rounded-lg bg-primary-700 hover:bg-primary-800 text-white disabled:bg-ink-300"
          >
            <Send className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
