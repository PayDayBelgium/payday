import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { submitMentorshipRequest } from '../../store/actions/mentorshipActions';
import { selectLatestRequest } from '../../store/slices/mentorshipSlice';
import type { MentorshipFocus, MentorStyle, UserLevel } from '../../types';

const FOCUS_OPTIONS: { value: MentorshipFocus; labelKey: string }[] = [
  { value: 'options', labelKey: 'pagesA.mentorship.focusOptions' },
  { value: 'risk', labelKey: 'pagesA.mentorship.focusRisk' },
  { value: 'psychology', labelKey: 'pagesA.mentorship.focusPsychology' },
  { value: 'portfolio', labelKey: 'pagesA.mentorship.focusPortfolio' },
  { value: 'quant', labelKey: 'pagesA.mentorship.focusQuant' },
];

const LEVEL_OPTIONS: { value: UserLevel; labelKey: string }[] = [
  { value: 'beginner', labelKey: 'pagesA.mentorship.levelBeginner' },
  { value: 'medior', labelKey: 'pagesA.mentorship.levelMedior' },
  { value: 'senior', labelKey: 'pagesA.mentorship.levelSenior' },
  { value: 'expert', labelKey: 'pagesA.mentorship.levelExpert' },
  { value: 'offpiste', labelKey: 'pagesA.mentorship.levelOffpiste' },
];

const STYLE_OPTIONS: { value: MentorStyle; labelKey: string }[] = [
  { value: 'hands_on', labelKey: 'pagesA.mentorship.styleHandsOn' },
  { value: 'coaching', labelKey: 'pagesA.mentorship.styleCoaching' },
  { value: 'async', labelKey: 'pagesA.mentorship.styleAsync' },
];

const FOCUS_LABEL_KEY = (v: MentorshipFocus) =>
  FOCUS_OPTIONS.find((o) => o.value === v)?.labelKey ?? v;
const STYLE_LABEL_KEY = (v: MentorStyle) => STYLE_OPTIONS.find((o) => o.value === v)?.labelKey ?? v;
const LEVEL_LABEL_KEY = (v: UserLevel) => LEVEL_OPTIONS.find((o) => o.value === v)?.labelKey ?? v;

const fieldClass =
  'w-full rounded-md border border-[var(--line)] bg-white dark:bg-trading-dark-800 px-3 py-2 text-sm text-ink-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

export const Mentorship: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { setPageTitle } = usePageTitle();
  const latest = useAppSelector(selectLatestRequest);

  const [focus, setFocus] = useState<MentorshipFocus>('options');
  const [level, setLevel] = useState<UserLevel>('beginner');
  const [style, setStyle] = useState<MentorStyle>('coaching');
  const [availability, setAvailability] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setPageTitle('Mentorship', t('pagesA.mentorship.pageSubtitle'));
  }, [setPageTitle, t]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(submitMentorshipRequest({ focus, level, style, availability, message }));
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed max-w-3xl">
        {t('pagesA.mentorship.intro')}
      </p>

      {latest && latest.status === 'pending' ? (
        <div className="surface-card p-6">
          <div className="flex items-center gap-2 text-positive-600 mb-3">
            <Check className="w-5 h-5" strokeWidth={2} />
            <p className="font-semibold text-sm">{t('pagesA.mentorship.requestSentTitle')}</p>
          </div>
          <p className="text-sm text-ink-500 dark:text-ink-400 mb-4 leading-relaxed">
            {t('pagesA.mentorship.requestSentBody')}
          </p>
          <dl className="text-sm divide-y divide-[var(--line)]">
            <div className="flex justify-between py-2">
              <dt className="text-ink-400">{t('pagesA.mentorship.focus')}</dt>
              <dd className="text-ink-900 dark:text-white">{t(FOCUS_LABEL_KEY(latest.focus))}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-ink-400">{t('pagesA.mentorship.level')}</dt>
              <dd className="text-ink-900 dark:text-white">{t(LEVEL_LABEL_KEY(latest.level))}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-ink-400">{t('pagesA.mentorship.style')}</dt>
              <dd className="text-ink-900 dark:text-white">{t(STYLE_LABEL_KEY(latest.style))}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-ink-400">{t('pagesA.mentorship.availability')}</dt>
              <dd className="text-ink-900 dark:text-white">{latest.availability || '—'}</dd>
            </div>
            <div className="py-2">
              <dt className="text-ink-400 mb-1">{t('pagesA.mentorship.message')}</dt>
              <dd className="text-ink-900 dark:text-white whitespace-pre-wrap">
                {latest.message || '—'}
              </dd>
            </div>
          </dl>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="surface-card p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="mentor-focus"
                className="block text-xs font-semibold text-ink-500 mb-1.5"
              >
                {t('pagesA.mentorship.focusArea')}
              </label>
              <select
                id="mentor-focus"
                className={fieldClass}
                value={focus}
                onChange={(e) => setFocus(e.target.value as MentorshipFocus)}
              >
                {FOCUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="mentor-level"
                className="block text-xs font-semibold text-ink-500 mb-1.5"
              >
                {t('pagesA.mentorship.currentLevel')}
              </label>
              <select
                id="mentor-level"
                className={fieldClass}
                value={level}
                onChange={(e) => setLevel(e.target.value as UserLevel)}
              >
                {LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="mentor-style"
                className="block text-xs font-semibold text-ink-500 mb-1.5"
              >
                {t('pagesA.mentorship.preferredStyle')}
              </label>
              <select
                id="mentor-style"
                className={fieldClass}
                value={style}
                onChange={(e) => setStyle(e.target.value as MentorStyle)}
              >
                {STYLE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {t(o.labelKey)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="mentor-availability"
                className="block text-xs font-semibold text-ink-500 mb-1.5"
              >
                {t('pagesA.mentorship.availability')}
              </label>
              <input
                id="mentor-availability"
                className={fieldClass}
                type="text"
                placeholder={t('pagesA.mentorship.availabilityPlaceholder')}
                value={availability}
                onChange={(e) => setAvailability(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label
              htmlFor="mentor-message"
              className="block text-xs font-semibold text-ink-500 mb-1.5"
            >
              {t('pagesA.mentorship.messageMotivation')}
            </label>
            <textarea
              id="mentor-message"
              className={`${fieldClass} min-h-[120px] resize-y`}
              placeholder={t('pagesA.mentorship.messagePlaceholder')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto sm:px-10 rounded-md bg-primary-700 text-white text-sm font-semibold py-2.5 hover:bg-primary-800 transition-colors"
          >
            {t('pagesA.mentorship.submit')}
          </button>
        </form>
      )}
    </div>
  );
};
