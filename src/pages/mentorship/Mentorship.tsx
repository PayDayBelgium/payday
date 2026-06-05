import React, { useEffect, useState } from 'react';
import { GraduationCap, Check } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { submitMentorshipRequest } from '../../store/actions/mentorshipActions';
import { selectLatestRequest } from '../../store/slices/mentorshipSlice';
import type { MentorshipFocus, MentorStyle, UserLevel } from '../../types';

const FOCUS_OPTIONS: { value: MentorshipFocus; label: string }[] = [
  { value: 'options', label: 'Optiestrategieën' },
  { value: 'risk', label: 'Risicobeheer' },
  { value: 'psychology', label: 'Trading-psychologie' },
  { value: 'portfolio', label: 'Portefeuille-opbouw' },
  { value: 'quant', label: 'Kwantitatief (off-piste)' },
];

const LEVEL_OPTIONS: { value: UserLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'medior', label: 'Medior' },
  { value: 'senior', label: 'Senior' },
  { value: 'expert', label: 'Expert' },
  { value: 'offpiste', label: 'Off-piste' },
];

const STYLE_OPTIONS: { value: MentorStyle; label: string }[] = [
  { value: 'hands_on', label: 'Hands-on (samen traden)' },
  { value: 'coaching', label: 'Coaching (periodieke reviews)' },
  { value: 'async', label: 'Asynchroon (berichten/feedback)' },
];

const FOCUS_LABEL = (v: MentorshipFocus) => FOCUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
const STYLE_LABEL = (v: MentorStyle) => STYLE_OPTIONS.find((o) => o.value === v)?.label ?? v;
const LEVEL_LABEL = (v: UserLevel) => LEVEL_OPTIONS.find((o) => o.value === v)?.label ?? v;

const fieldClass =
  'w-full rounded-md border border-[var(--line)] bg-white dark:bg-trading-dark-800 px-3 py-2 text-sm text-ink-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

export const Mentorship: React.FC = () => {
  const dispatch = useAppDispatch();
  const { setPageTitle } = usePageTitle();
  const latest = useAppSelector(selectLatestRequest);

  const [focus, setFocus] = useState<MentorshipFocus>('options');
  const [level, setLevel] = useState<UserLevel>('beginner');
  const [style, setStyle] = useState<MentorStyle>('coaching');
  const [availability, setAvailability] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setPageTitle('Mentorship', 'Ski-school · opleiding & begeleiding');
  }, [setPageTitle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(submitMentorshipRequest({ focus, level, style, availability, message }));
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="flex items-center gap-3 rounded-xl border border-caution-500/40 bg-caution-50 dark:bg-caution-600/10 px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-caution-500 text-white flex items-center justify-center">
          <GraduationCap className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div>
          <p className="eyebrow text-caution-600">Ski-school</p>
          <h1 className="text-base font-semibold text-ink-900 dark:text-white tracking-tight">Mentorship</h1>
        </div>
      </div>

      <p className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed max-w-3xl">
        Een ski-leraar leert je de berg lezen. Onze ski-school koppelt je aan een mentor voor
        opleiding en begeleiding. Dit staat los van credits en pistes — je vraagt het gewoon aan.
      </p>

      {latest && latest.status === 'pending' ? (
        <div className="surface-card p-6">
          <div className="flex items-center gap-2 text-positive-600 mb-3">
            <Check className="w-5 h-5" strokeWidth={2} />
            <p className="font-semibold text-sm">Je aanvraag is verstuurd</p>
          </div>
          <p className="text-sm text-ink-500 dark:text-ink-400 mb-4 leading-relaxed">
            We hebben je mentorship-aanvraag ontvangen. Een mentor neemt contact met je op.
          </p>
          <dl className="text-sm divide-y divide-[var(--line)]">
            <div className="flex justify-between py-2"><dt className="text-ink-400">Focus</dt><dd className="text-ink-900 dark:text-white">{FOCUS_LABEL(latest.focus)}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-ink-400">Niveau</dt><dd className="text-ink-900 dark:text-white">{LEVEL_LABEL(latest.level)}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-ink-400">Stijl</dt><dd className="text-ink-900 dark:text-white">{STYLE_LABEL(latest.style)}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-ink-400">Beschikbaarheid</dt><dd className="text-ink-900 dark:text-white">{latest.availability || '—'}</dd></div>
            <div className="py-2">
              <dt className="text-ink-400 mb-1">Bericht</dt>
              <dd className="text-ink-900 dark:text-white whitespace-pre-wrap">{latest.message || '—'}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="surface-card p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="mentor-focus" className="block text-xs font-semibold text-ink-500 mb-1.5">Focusgebied</label>
              <select id="mentor-focus" className={fieldClass} value={focus} onChange={(e) => setFocus(e.target.value as MentorshipFocus)}>
                {FOCUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="mentor-level" className="block text-xs font-semibold text-ink-500 mb-1.5">Huidig niveau</label>
              <select id="mentor-level" className={fieldClass} value={level} onChange={(e) => setLevel(e.target.value as UserLevel)}>
                {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="mentor-style" className="block text-xs font-semibold text-ink-500 mb-1.5">Voorkeur mentor-stijl</label>
              <select id="mentor-style" className={fieldClass} value={style} onChange={(e) => setStyle(e.target.value as MentorStyle)}>
                {STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="mentor-availability" className="block text-xs font-semibold text-ink-500 mb-1.5">Beschikbaarheid</label>
              <input id="mentor-availability" className={fieldClass} type="text" placeholder="bv. weekends, 2u per week" value={availability} onChange={(e) => setAvailability(e.target.value)} />
            </div>
          </div>
          <div>
            <label htmlFor="mentor-message" className="block text-xs font-semibold text-ink-500 mb-1.5">Bericht / motivatie</label>
            <textarea id="mentor-message" className={`${fieldClass} min-h-[120px] resize-y`} placeholder="Waar wil je in groeien?" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto sm:px-10 rounded-md bg-primary-700 text-white text-sm font-semibold py-2.5 hover:bg-primary-800 transition-colors"
          >
            Aanvraag versturen
          </button>
        </form>
      )}
    </div>
  );
};
