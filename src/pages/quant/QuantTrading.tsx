import React, { useEffect } from 'react';
import { Sigma, Activity, Radar, TrendingUp } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';

export const QuantTrading: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  useEffect(() => {
    setPageTitle('Quant trading', 'Data-gedreven strategieën');
  }, [setPageTitle]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-600 dark:text-ink-300 max-w-2xl leading-relaxed">
        Hier draait alles om data: kwantitatieve modellen, edge-detectie en systematische
        signalen. Dit is een voorproefje — de tools volgen.
      </p>

      {/* Concept cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--line)] rounded-md overflow-hidden">
        {[
          { icon: Radar, t: 'Opportunity scanner', d: 'Rangschik kansen op IV rank, edge en liquiditeit.' },
          { icon: Activity, t: 'Edge-modellen', d: 'Kwantificeer verwachte waarde per strategie.' },
          { icon: TrendingUp, t: 'Backtesting', d: 'Test systematische regels op historische data.' },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="bg-white dark:bg-trading-dark-800 p-5">
            <div className="w-9 h-9 rounded-md bg-caution-50 text-caution-600 flex items-center justify-center mb-3">
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </div>
            <h3 className="font-semibold text-sm text-ink-900 dark:text-white tracking-tight mb-1">{t}</h3>
            <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>

      {/* Teaser visual */}
      <div className="surface-card p-8 text-center">
        <Sigma className="w-10 h-10 mx-auto text-caution-500 mb-3" strokeWidth={1.5} />
        <p className="eyebrow mb-2">Binnenkort</p>
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white tracking-tight mb-2">De off-piste toolkit</h2>
        <p className="text-sm text-ink-500 dark:text-ink-400 max-w-md mx-auto leading-relaxed">
          We bouwen hier de kwantitatieve tools uit. Blijf actief in de community om als eerste toegang te krijgen.
        </p>
      </div>
    </div>
  );
};
