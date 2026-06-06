// src/components/ai/AIAssistantDrawer.tsx
import React from 'react';
import { Sparkles, X, SquarePen } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAIAssistant } from '../../contexts/AIAssistantContext';
import { MessageList } from './MessageList';
import { AIComposer } from './AIComposer';
import { ProposedChangesCard } from './ProposedChangesCard';

export const AIAssistantDrawer: React.FC = () => {
  const { isOpen, close, clear, messages, isStreaming } = useAIAssistant();
  const { t } = useTranslation();

  return (
    <div
      className={`fixed top-0 right-0 z-50 h-full w-full sm:w-96 bg-white dark:bg-trading-dark-900 shadow-xl border-l border-ink-200 dark:border-trading-dark-700 flex flex-col transition-transform duration-300 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
      role="dialog"
      aria-label={t('ai.title')}
      aria-hidden={!isOpen}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-ink-200 dark:border-trading-dark-700">
        <div className="flex items-center gap-2 text-ink-800 dark:text-ink-100 font-semibold">
          <Sparkles className="h-5 w-5 text-primary-600" />
          {t('ai.title')}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clear}
            disabled={isStreaming || messages.length === 0}
            aria-label={t('ai.newChat')}
            title={t('ai.newChat')}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-surface-subtle dark:hover:bg-trading-dark-700 text-ink-600 dark:text-ink-300 disabled:opacity-40"
          >
            <SquarePen className="h-[18px] w-[18px]" />
          </button>
          <button
            onClick={close}
            aria-label={t('common.close')}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-surface-subtle dark:hover:bg-trading-dark-700 text-ink-600 dark:text-ink-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      <MessageList />
      <ProposedChangesCard />
      <AIComposer />
    </div>
  );
};
