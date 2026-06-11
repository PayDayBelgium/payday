import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Lock } from 'lucide-react';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { getLevelConfig } from '../../store/slices/userProgressSlice';
import { getTradeIdeaRequiredFeature } from '../../utils/opportunityGating';
import type { TradeIdea } from '../../types';

const STRATEGY_LABEL: Partial<Record<TradeIdea['strategy'], string>> = {
  cash_secured_puts: 'Cash Secured Put',
  covered_calls: 'Covered Call',
  pmcc: 'PMCC',
  leaps: 'LEAPS',
  spreads: 'Spread',
};

export const TradeIdeaCard: React.FC<{
  idea: TradeIdea;
  onPlaceTrade?: (idea: TradeIdea) => void;
  compact?: boolean;
}> = ({ idea, onPlaceTrade, compact = false }) => {
  const { t } = useTranslation();
  // The idea card is educational content and stays visible at any level,
  // but ACTING on it is gated: below the strategy's level the place-trade
  // button is replaced by an explicit unlock hint (no silent no-op).
  const { hasAccess, requiredLevel } = useFeatureAccess(getTradeIdeaRequiredFeature(idea));
  const requiredLevelConfig = requiredLevel ? getLevelConfig(requiredLevel) : null;
  const juiceLabel = (iv: number) =>
    iv >= 70
      ? t('learnFeat.tradeJuiceHigh')
      : iv >= 50
        ? t('learnFeat.tradeJuiceMedium')
        : t('learnFeat.tradeJuiceLow');
  return (
    <div className="border border-[var(--line)] rounded-lg p-3 bg-surface-subtle dark:bg-trading-dark-700/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tabular-nums">{idea.ticker}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
            {STRATEGY_LABEL[idea.strategy] ?? idea.strategy.replace(/_/g, ' ')}
          </span>
        </div>
        <span className="text-[11px] text-ink-400">
          {t('learnFeat.tradeExpires', { expiry: idea.expiry })}
        </span>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between text-[11px] text-ink-500">
          <span>{t('learnFeat.tradeJuiceLabel')}</span>
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
              {t('learnFeat.tradeStrike')}{' '}
              <b className="text-ink-900 dark:text-white">${idea.strike}</b>
            </span>
          )}
          {idea.premium != null && (
            <span>
              {t('learnFeat.tradePremium')}{' '}
              <b className="text-ink-900 dark:text-white">${idea.premium}</b>
            </span>
          )}
          {idea.returnPct != null && (
            <span>
              {t('learnFeat.tradeReturn')}{' '}
              <b className="text-ink-900 dark:text-white">{idea.returnPct}%</b>
            </span>
          )}
          {idea.delta != null && (
            <span>
              Δ <b className="text-ink-900 dark:text-white">{idea.delta}</b>
            </span>
          )}
        </div>
      )}

      {onPlaceTrade &&
        (hasAccess ? (
          <button
            onClick={() => onPlaceTrade(idea)}
            className="mt-3 inline-flex items-center gap-1.5 bg-positive-500 hover:bg-positive-600 text-white rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
          >
            {t('learnFeat.tradePlace')}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] text-ink-500 dark:text-ink-400">
            <Lock className="w-3.5 h-3.5 flex-shrink-0" />
            {t('safetyRails.tradeIdeaLocked', {
              slope: requiredLevelConfig?.slopeName ?? '',
              level: requiredLevelConfig?.name ?? '',
            })}
          </p>
        ))}
    </div>
  );
};
