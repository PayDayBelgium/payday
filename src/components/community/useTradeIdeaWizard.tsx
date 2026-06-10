import React, { useState, useCallback } from 'react';
import { PutOptionWizard } from '../modals/PutOptionWizard';
import { CallOptionWizard } from '../modals/CallOptionWizard';
import { useAppSelector } from '../../hooks/useAppSelector';
import type { TradeIdea, Ticker } from '../../types';

type Kind = 'put' | 'call' | null;

export function useTradeIdeaWizard() {
  const portfolios = useAppSelector((s) => s.portfolios.portfolios);
  const [kind, setKind] = useState<Kind>(null);
  const [ticker, setTicker] = useState<Ticker | null>(null);

  const launch = useCallback((idea: TradeIdea) => {
    setTicker({
      symbol: idea.ticker,
      name: idea.ticker,
      type: 'stock',
      optionsAvailable: true,
    });
    setKind(idea.strategy === 'covered_calls' ? 'call' : 'put');
  }, []);

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
