// src/pages/settings/AISettings.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/common/Button';
import { loadAIConfig, saveAIConfig, withApiKey, isProviderConfigured } from '../../services/ai/config';

export const AISettings: React.FC = () => {
  const { t } = useTranslation();
  const [config, setConfig] = useState(loadAIConfig());
  const [keyInput, setKeyInput] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  const configured = isProviderConfigured(config, 'anthropic');

  const save = () => {
    const next = withApiKey(config, 'anthropic', keyInput);
    saveAIConfig(next);
    setConfig(next);
    setKeyInput('');
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 2000);
  };

  return (
    <div className="max-w-xl space-y-6">
      <h2 className="text-lg font-semibold text-ink-800 dark:text-ink-100">{t('ai.settingsHeading')}</h2>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink-700 dark:text-ink-200">
          {t('ai.provider')}
        </label>
        <div className="text-sm text-ink-600 dark:text-ink-300">Anthropic (Claude)</div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-ink-700 dark:text-ink-200">
          {t('ai.apiKey')} {configured && <span className="text-positive-600">{t('ai.apiKeySet')}</span>}
        </label>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder={configured ? '••••••••' : 'sk-ant-...'}
          className="w-full rounded-lg border border-ink-200 dark:border-trading-dark-600 bg-white dark:bg-trading-dark-800 px-3 py-2 text-sm text-ink-800 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <p className="text-xs text-ink-500 dark:text-ink-400">{t('ai.apiKeyHelp')}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={keyInput.trim() === ''}>
          {t('common.save')}
        </Button>
        {justSaved && <span className="text-sm text-positive-600">{t('ai.saved')}</span>}
      </div>
    </div>
  );
};
