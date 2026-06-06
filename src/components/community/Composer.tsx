import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

export const Composer: React.FC<{
  initials: string;
  color: string;
  placeholder?: string;
  onSubmit: (text: string) => void;
}> = ({ initials, color, placeholder, onSubmit }) => {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  };
  return (
    <div className="flex gap-2.5 bg-white dark:bg-trading-dark-800 border border-[var(--line)] rounded-lg p-2.5">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        style={{ background: color }}
      >
        {initials}
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={placeholder ?? t('learnFeat.composerPlaceholder')}
        className="flex-1 bg-transparent outline-none text-sm text-ink-700 dark:text-ink-200 placeholder:text-ink-400"
      />
      <button onClick={submit} className="btn-primary rounded-md px-3 py-1.5 text-xs font-semibold">
        {t('learnFeat.composerPost')}
      </button>
    </div>
  );
};
