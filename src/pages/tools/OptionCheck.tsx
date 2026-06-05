import React, { useEffect, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import { generateMockOptionData, scoreOptionCandidate } from '../../utils/optionCandidate';
import type { CriterionStatus, Verdict } from '../../utils/optionCandidate';

const STATUS_BADGE: Record<CriterionStatus, string> = {
  good: 'bg-positive-50 text-positive-600 dark:bg-positive-700/15',
  ok: 'bg-caution-50 text-caution-600 dark:bg-caution-600/15',
  bad: 'bg-negative-50 text-negative-600 dark:bg-negative-700/15',
};

const STATUS_LABEL: Record<CriterionStatus, string> = {
  good: 'Goed',
  ok: 'Matig',
  bad: 'Zwak',
};

const VERDICT_META: Record<Verdict, { label: string; cls: string }> = {
  excellent: { label: 'Uitstekende kandidaat', cls: 'text-positive-600' },
  suitable: { label: 'Geschikte kandidaat', cls: 'text-positive-600' },
  mediocre: { label: 'Matige kandidaat', cls: 'text-caution-600' },
  unsuitable: { label: 'Ongeschikt', cls: 'text-negative-600' },
};

export const OptionCheck: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  const tickers = useAppSelector(selectAllTickers);
  const [symbol, setSymbol] = useState('');

  useEffect(() => {
    setPageTitle('Optie-Check', 'Is deze ticker geschikt voor opties?');
  }, [setPageTitle]);

  const selected = useMemo(
    () => tickers.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase()),
    [tickers, symbol]
  );

  const assessment = useMemo(() => {
    if (!selected) return null;
    const data = generateMockOptionData(selected.symbol);
    return { data, result: scoreOptionCandidate(selected, data) };
  }, [selected]);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-md border border-caution-500/40 bg-caution-50 dark:bg-caution-600/10 px-3 py-2 text-xs text-caution-700 dark:text-caution-300">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
        <span>De optie-cijfers hieronder zijn <strong>gesimuleerd</strong> (de app heeft geen live optie-feed) en dienen enkel ter illustratie.</span>
      </div>

      {/* Ticker select */}
      <div>
        {tickers.length === 0 ? (
          <p className="text-sm text-ink-400">Nog geen tickers. Voeg er eerst een toe via Tickers.</p>
        ) : (
          <>
            <label htmlFor="oc-ticker" className="block text-xs font-semibold text-ink-500 mb-1.5">Ticker</label>
            <select
              id="oc-ticker"
              className="w-full rounded-md border border-[var(--line)] bg-white dark:bg-trading-dark-800 px-3 py-2 text-sm text-ink-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
            >
              <option value="">Kies een ticker…</option>
              {tickers.map((t) => (
                <option key={t.symbol} value={t.symbol}>{t.symbol} — {t.name}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {assessment && (
        <>
          {/* Verdict */}
          <div className="surface-card p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="eyebrow">Verdict</p>
              <span className="text-2xl font-bold tabular-nums text-ink-900 dark:text-white">{assessment.result.totalScore}<span className="text-sm text-ink-400">/100</span></span>
            </div>
            <p className={`text-lg font-semibold tracking-tight ${VERDICT_META[assessment.result.verdict].cls}`}>
              {VERDICT_META[assessment.result.verdict].label}
            </p>
            <div
              className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden"
              role="progressbar"
              aria-valuenow={assessment.result.totalScore}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Geschiktheidsscore"
            >
              <div
                className="h-full rounded-full bg-primary-600 transition-all"
                style={{ width: `${assessment.result.totalScore}%` }}
              />
            </div>
          </div>

          {/* Criteria */}
          <div className="surface-card divide-y divide-[var(--line)]">
            {assessment.result.criteria.map((c) => (
              <div key={c.key} className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{c.label}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{c.detail}</p>
                </div>
                <span className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${STATUS_BADGE[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
