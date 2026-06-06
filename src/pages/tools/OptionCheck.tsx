import React, { useEffect, useMemo, useState } from 'react';
import { Info, Plus } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { selectAllTickers, addTicker } from '../../store/slices/tickersSlice';
import { TickerSelector } from '../../components/widgets/TickerSelector';
import { generateMockOptionData, scoreOptionCandidate } from '../../utils/optionCandidate';
import type { CriterionStatus, Verdict } from '../../utils/optionCandidate';
import type { Ticker } from '../../types';

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

const fieldClass =
  'w-full rounded-md border border-[var(--line)] bg-white dark:bg-trading-dark-800 px-3 py-2 text-sm text-ink-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

export const OptionCheck: React.FC = () => {
  const dispatch = useAppDispatch();
  const { setPageTitle } = usePageTitle();
  const tickers = useAppSelector(selectAllTickers);
  const [symbol, setSymbol] = useState('');
  const [isCreatingTicker, setIsCreatingTicker] = useState(false);
  const [newTicker, setNewTicker] = useState<{
    symbol: string;
    name: string;
    type: 'stock' | 'etf';
    optionsAvailable: boolean;
  }>({ symbol: '', name: '', type: 'stock', optionsAvailable: true });

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

  const handleOpenCreateTicker = (sym: string) => {
    setNewTicker({ symbol: sym.toUpperCase(), name: '', type: 'stock', optionsAvailable: true });
    setIsCreatingTicker(true);
  };

  const handleCreateTicker = () => {
    if (!newTicker.symbol || !newTicker.name) return;
    const ticker: Ticker = {
      symbol: newTicker.symbol.toUpperCase(),
      name: newTicker.name,
      type: newTicker.type,
      optionsAvailable: newTicker.optionsAvailable,
      miniContractsAvailable: false,
      lastUsed: new Date().toISOString(),
    };
    dispatch(addTicker(ticker));
    setSymbol(ticker.symbol);
    setIsCreatingTicker(false);
  };

  return (
    <div className="space-y-6">
      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-md border border-caution-500/40 bg-caution-50 dark:bg-caution-600/10 px-3 py-2 text-xs text-caution-700 dark:text-caution-300 max-w-3xl">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
        <span>
          De optie-cijfers hieronder zijn <strong>gesimuleerd</strong> (de app heeft geen live
          optie-feed) en dienen enkel ter illustratie.
        </span>
      </div>

      {/* Ticker selection / add */}
      <div className="surface-card p-5">
        <p className="text-xs font-semibold text-ink-500 mb-1.5">Ticker</p>
        {isCreatingTicker ? (
          <div className="space-y-3">
            <input
              className={fieldClass}
              type="text"
              value={newTicker.symbol}
              onChange={(e) =>
                setNewTicker((p) => ({ ...p, symbol: e.target.value.toUpperCase() }))
              }
              placeholder="Symbool (bv. AAPL)"
            />
            <input
              className={fieldClass}
              type="text"
              value={newTicker.name}
              onChange={(e) => setNewTicker((p) => ({ ...p, name: e.target.value }))}
              placeholder="Naam (bv. Apple Inc.)"
            />
            <div className="flex flex-wrap items-center gap-4">
              <select
                className={`${fieldClass} w-auto`}
                value={newTicker.type}
                onChange={(e) =>
                  setNewTicker((p) => ({ ...p, type: e.target.value as 'stock' | 'etf' }))
                }
              >
                <option value="stock">Aandeel</option>
                <option value="etf">ETF</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-300">
                <input
                  type="checkbox"
                  checked={newTicker.optionsAvailable}
                  onChange={(e) =>
                    setNewTicker((p) => ({ ...p, optionsAvailable: e.target.checked }))
                  }
                  className="rounded border-[var(--line)]"
                />
                Opties beschikbaar
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateTicker}
                disabled={!newTicker.symbol || !newTicker.name}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 text-white text-sm font-semibold px-4 py-2 hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" /> Toevoegen
              </button>
              <button
                onClick={() => setIsCreatingTicker(false)}
                className="rounded-md border border-[var(--line)] text-sm font-medium px-4 py-2 text-ink-600 dark:text-ink-300 hover:bg-surface-subtle transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        ) : (
          <TickerSelector
            value={symbol}
            onChange={(t) => setSymbol(t.symbol)}
            onCreateNew={handleOpenCreateTicker}
            placeholder="Zoek of voeg een ticker toe…"
          />
        )}
      </div>

      {assessment ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left column: verdict + figures */}
          <div className="space-y-6">
            {/* Verdict */}
            <div className="surface-card p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="eyebrow">Verdict — {selected!.symbol}</p>
                <span className="text-2xl font-bold tabular-nums text-ink-900 dark:text-white">
                  {assessment.result.totalScore}
                  <span className="text-sm text-ink-400">/100</span>
                </span>
              </div>
              <p
                className={`text-lg font-semibold tracking-tight ${VERDICT_META[assessment.result.verdict].cls}`}
              >
                {VERDICT_META[assessment.result.verdict].label}
              </p>
              <div
                className="mt-3 h-2 rounded-full bg-surface-subtle dark:bg-trading-dark-700 overflow-hidden"
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

            {/* Figures card — simulated option data */}
            <div className="surface-card p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="eyebrow">Optie-cijfers</p>
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-caution-600 bg-caution-50 dark:bg-caution-600/15 px-2 py-0.5 rounded-full">
                  Gesimuleerd
                </span>
              </div>
              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                {[
                  { label: 'IV-rank', value: `${assessment.data.ivRank}/100` },
                  {
                    label: 'Open interest',
                    value: assessment.data.openInterest.toLocaleString('nl-NL'),
                  },
                  {
                    label: 'Volume/dag',
                    value: assessment.data.optionVolume.toLocaleString('nl-NL'),
                  },
                  { label: 'Bid-ask spread', value: `${assessment.data.bidAskSpreadPct}%` },
                  { label: 'Premie (gean.)', value: `${assessment.data.annualizedPremiumPct}%` },
                  { label: 'Earnings over', value: `${assessment.data.daysToEarnings} d` },
                ].map((f) => (
                  <div key={f.label}>
                    <dt className="text-xs text-ink-400">{f.label}</dt>
                    <dd className="text-sm font-semibold tabular-nums text-ink-900 dark:text-white mt-0.5">
                      {f.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* Right column: criteria */}
          <div className="surface-card divide-y divide-[var(--line)]">
            {assessment.result.criteria.map((c) => (
              <div key={c.key} className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{c.label}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{c.detail}</p>
                </div>
                <span
                  className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${STATUS_BADGE[c.status]}`}
                >
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-400">Kies of voeg een ticker toe om de check te starten.</p>
      )}
    </div>
  );
};
