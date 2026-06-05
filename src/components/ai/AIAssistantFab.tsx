// src/components/ai/AIAssistantFab.tsx
import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAIAssistant } from '../../contexts/AIAssistantContext';
import { AIAssistantDrawer } from './AIAssistantDrawer';

export const AIAssistantFab: React.FC = () => {
  const { isOpen, toggle } = useAIAssistant();
  const { t } = useTranslation();

  return (
    <>
      {!isOpen && (
        <button
          onClick={toggle}
          aria-label={t('ai.title')}
          className="fixed bottom-6 right-6 z-40 h-14 w-14 flex items-center justify-center rounded-full bg-primary-700 hover:bg-primary-800 text-white shadow-lg hover:shadow-xl transition-all"
        >
          <Sparkles className="h-6 w-6" />
        </button>
      )}
      <AIAssistantDrawer />
    </>
  );
};
