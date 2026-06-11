import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PutOptionWizard } from '../modals/PutOptionWizard';
import { CallOptionWizard } from '../modals/CallOptionWizard';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useToast } from '../../contexts/ToastContext';
import {
  selectUnlockedLevels,
  isFeatureAvailable,
  getFeatureRequiredLevel,
  getLevelConfig,
} from '../../store/slices/userProgressSlice';
import { getTradeIdeaRequiredFeature } from '../../utils/opportunityGating';
import type { TradeIdea, Ticker } from '../../types';

type Kind = 'put' | 'call' | null;

export function useTradeIdeaWizard() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const portfolios = useAppSelector((s) => s.portfolios.portfolios);
  const unlockedLevels = useAppSelector(selectUnlockedLevels);
  const [kind, setKind] = useState<Kind>(null);
  const [ticker, setTicker] = useState<Ticker | null>(null);

  const launch = useCallback(
    (idea: TradeIdea) => {
      // Defensive level gate behind the (already gated) place-trade button:
      // never a silent no-op — explain what unlocks the action instead.
      const feature = getTradeIdeaRequiredFeature(idea);
      if (!isFeatureAvailable(feature, unlockedLevels)) {
        const level = getFeatureRequiredLevel(feature);
        const config = level ? getLevelConfig(level) : null;
        showToast(
          'warning',
          t('safetyRails.featureLockedToast', {
            slope: config?.slopeName ?? '',
            level: config?.name ?? '',
          })
        );
        return;
      }
      setTicker({
        symbol: idea.ticker,
        name: idea.ticker,
        type: 'stock',
        optionsAvailable: true,
      });
      setKind(idea.strategy === 'covered_calls' ? 'call' : 'put');
    },
    [unlockedLevels, showToast, t]
  );

  const close = () => {
    setKind(null);
    setTicker(null);
  };

  const portfolio = portfolios[0];
  const canLaunch = !!portfolio;

  const wizard = portfolio ? (
    <>
      <PutOptionWizard
        isOpen={kind === 'put'}
        onClose={close}
        portfolio={portfolio}
        initialAction="sell"
        initialTicker={ticker || undefined}
        initialStep={2}
      />
      <CallOptionWizard
        isOpen={kind === 'call'}
        onClose={close}
        portfolio={portfolio}
        initialAction="sell"
        initialTicker={ticker || undefined}
        initialStep={2}
      />
    </>
  ) : null;

  return { launch, wizard, canLaunch };
}
