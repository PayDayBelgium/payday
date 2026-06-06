// src/components/ai/ProposedChangesCard.tsx
import React from 'react';
import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAIAssistant } from '../../contexts/AIAssistantContext';
import { describeChange } from '../../services/ai/tools';

// Shows the proposed changes with confirm/cancel buttons.
export const ProposedChangesCard: React.FC = () => {
  const { pendingChanges, confirmChanges, cancelChanges } = useAIAssistant();
  const { t } = useTranslation();

  if (pendingChanges.length === 0) return null;

  return (
    <div className="mx-3 mb-2 rounded-lg border border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-trading-dark-800 p-3">
      <p className="text-sm font-medium text-ink-800 dark:text-ink-100 mb-2">
        {t('ai.proposalTitle')}
      </p>
      <ul className="space-y-1 mb-3 max-h-48 overflow-y-auto">
        {pendingChanges.map((c, i) => (
          <li key={i} className="text-sm text-ink-700 dark:text-ink-200">
            • {describeChange(c)}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button
          onClick={confirmChanges}
          className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-positive-600 hover:bg-positive-700 text-white px-3 py-1.5 text-sm"
        >
          <Check className="h-4 w-4" /> {t('ai.confirmCreate')}
        </button>
        <button
          onClick={cancelChanges}
          className="inline-flex items-center justify-center gap-1 rounded-lg bg-surface-muted dark:bg-trading-dark-700 text-ink-700 dark:text-ink-200 px-3 py-1.5 text-sm"
        >
          <X className="h-4 w-4" /> {t('common.cancel')}
        </button>
      </div>
    </div>
  );
};
