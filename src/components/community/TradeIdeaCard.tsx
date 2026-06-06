import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { TradeIdea } from '../../types';

const STRATEGY_LABEL: Partial<Record<TradeIdea['strategy'], string>> = {
  cash_secured_puts: 'Cash Secured Put',
  covered_calls: 'Covered Call',
  pmcc: 'PMCC',
  leaps: 'LEAPS',
  spreads: 'Spread',
};

const juiceLabel = (iv: number) => (iv >= 70 ? 'hoog' : iv >= 50 ? 'matig' : 'laag');

export const TradeIdeaCard: React.FC<{
  idea: TradeIdea;
  onPlaceTrade?: (idea: TradeIdea) => void;
  compact?: boolean;
}> = ({ idea, onPlaceTrade, compact = false }) => {
  return (
    <div className="border border-[var(--line)] rounded-lg p-3 bg-surface-subtle dark:bg-trading-dark-700/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tabular-nums">{idea.ticker}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
            {STRATEGY_LABEL[idea.strategy] ?? idea.strategy.replace(/_/g, ' ')}
          </span>
        </div>
        <span className="text-[11px] text-ink-400">vervalt {idea.expiry}</span>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between text-[11px] text-ink-500">
          <span>Juice (IV rank)</span>
          <span>
            <b className="text-ink-900 dark:text-white">{idea.ivRank}%</b> ·{' '}
            {juiceLabel(idea.ivRank)}
          </span>
        </div>
        <div className="h-1.5 rounded bg-[var(--line)] overflow-hidden mt-1">
          <div
            className="h-full rounded"
            style={{
              width: `${Math.min(100, Math.max(0, idea.ivRank))}%`,
              background: 'linear-gradient(90deg,#0F9D58,#F0B429)',
            }}
          />
        </div>
      </div>

      {!compact && (
        <div className="flex gap-4 mt-2 text-[11px] text-ink-500">
          {idea.strike != null && (
            <span>
              Strike <b className="text-ink-900 dark:text-white">${idea.strike}</b>
            </span>
          )}
          {idea.premium != null && (
            <span>
              Premie <b className="text-ink-900 dark:text-white">${idea.premium}</b>
            </span>
          )}
          {idea.returnPct != null && (
            <span>
              Rend. <b className="text-ink-900 dark:text-white">{idea.returnPct}%</b>
            </span>
          )}
          {idea.delta != null && (
            <span>
              Δ <b className="text-ink-900 dark:text-white">{idea.delta}</b>
            </span>
          )}
        </div>
      )}

      {onPlaceTrade && (
        <button
          onClick={() => onPlaceTrade(idea)}
          className="mt-3 inline-flex items-center gap-1.5 bg-positive-500 hover:bg-positive-600 text-white rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
        >
          Leg deze trade in
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
