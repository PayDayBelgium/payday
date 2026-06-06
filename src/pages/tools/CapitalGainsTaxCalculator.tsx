import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { Info, ArrowRight } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { formatNumber } from '../../utils/numberFormat';

export const CapitalGainsTaxCalculator: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  const nationality = useAppSelector((state) => state.auth.nationality);
  const [realizedGains, setRealizedGains] = useState<string>('');
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    setPageTitle(
      'Meerwaardebelasting simulator',
      'Belgische belasting op meerwaarden aandelen (2026+)'
    );
  }, [setPageTitle]);

  const parseNumber = (value: string): number => {
    if (!value) return 0;
    return parseFloat(value.replace(/,/g, '')) || 0;
  };

  const gains = parseNumber(realizedGains);
  const taxableAmount = Math.max(0, gains - 10000);
  const taxDue = taxableAmount * 0.1;
  const effectiveRate = gains > 0 ? (taxDue / gains) * 100 : 0;
  const netGains = gains - taxDue;

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('nl-BE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6">
      {/* Toolbar — title is provided by the global header */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-[var(--line)] text-sm text-ink-700 hover:bg-surface-subtle transition-colors"
          title={showInfo ? 'Verberg uitleg' : 'Toon uitleg'}
        >
          <Info
            className={`w-4 h-4 ${showInfo ? 'text-caution-600 dark:text-caution-500' : 'text-ink-400'}`}
          />
          {showInfo ? 'Verberg uitleg' : 'Toon uitleg'}
        </button>
      </div>

      {/* Warning for non-Belgian users */}
      {nationality && nationality !== 'BE' && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-ink-900 dark:text-white mb-1">Niet van toepassing</h4>
              <p className="text-sm text-ink-700 dark:text-ink-300">
                Deze calculator is specifiek voor Belgische belastingplichtigen. Je huidige
                nationaliteit is ingesteld op {nationality}. Deze regels zijn mogelijk niet van
                toepassing op jou.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Educational Info */}
      {showInfo && (
        <div className="bg-caution-50 dark:bg-caution-600/15 border border-caution-500/30 dark:border-caution-500/30 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
                Wat is de meerwaardebelasting?
              </h3>
              <p className="text-sm text-ink-700 dark:text-ink-300 mb-3">
                Vanaf 1 januari 2026 wordt in België een belasting van <strong>10%</strong> geheven
                op gerealiseerde meerwaarden op aandelen. Dit betekent dat wanneer je aandelen
                verkoopt met winst, je hierover belasting moet betalen.
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    <strong>Tarief:</strong> 10% op de gerealiseerde meerwaarde
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    <strong>Vrijstelling:</strong> De eerste €10.000 meerwaarde per jaar is
                    vrijgesteld
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    <strong>Maximum voordeel:</strong> Tot €1.000 belastingbesparing door de
                    vrijstelling
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    <strong>Gerealiseerde meerwaarde:</strong> Alleen winst bij verkoop telt, niet
                    onverkochte posities
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calculator */}
      <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
        <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-4">
          Bereken je belasting
        </h3>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
            Totale gerealiseerde meerwaarde (€)
          </label>
          <input
            type="number"
            value={realizedGains}
            onChange={(e) => setRealizedGains(e.target.value)}
            placeholder="Bijvoorbeeld: 25000"
            className="w-full px-4 py-2 bg-surface-subtle dark:bg-slate-700 border border-ink-200 dark:border-slate-600 rounded-lg text-ink-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-caution-500"
          />
          <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
            De totale winst die je hebt gerealiseerd door aandelen te verkopen in een kalenderjaar
          </p>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="bg-surface dark:bg-trading-dark-900/50 rounded-lg p-4 border border-surface-line dark:border-trading-dark-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-ink-600 dark:text-ink-400">
                Gerealiseerde meerwaarde
              </span>
              <span className="text-lg font-bold text-ink-900 dark:text-white">
                {formatCurrency(gains)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-ink-600 dark:text-ink-400">Vrijstelling</span>
              <span className="text-lg font-semibold text-positive-600 dark:text-positive-500">
                - {formatCurrency(10000)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-ink-200 dark:border-trading-dark-500">
              <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                Belastbaar bedrag
              </span>
              <span className="text-lg font-bold text-ink-900 dark:text-white">
                {formatCurrency(taxableAmount)}
              </span>
            </div>
          </div>

          <div className="bg-caution-50 dark:bg-caution-600/15 rounded-lg p-4 border border-caution-500/30 dark:border-caution-500/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                Verschuldigde belasting (10%)
              </span>
              <span className="text-2xl font-bold text-caution-600 dark:text-caution-500">
                {formatCurrency(taxDue)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-ink-600 dark:text-ink-400">Effectief tarief</span>
              <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                {formatNumber(effectiveRate, 2)}%
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-caution-500/40 dark:border-caution-600/40">
              <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                Netto meerwaarde na belasting
              </span>
              <span className="text-lg font-bold text-positive-600 dark:text-positive-500">
                {formatCurrency(netGains)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
        <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-4">Voorbeelden</h3>
        <div className="space-y-4">
          <div className="p-4 bg-surface dark:bg-trading-dark-900/50 rounded-lg border border-surface-line dark:border-trading-dark-600">
            <p className="text-sm font-medium text-ink-900 dark:text-white mb-2">
              Scenario 1: €5.000 meerwaarde
            </p>
            <p className="text-sm text-ink-700 dark:text-ink-300">
              Belasting: <strong>€0</strong> (onder de vrijstelling van €10.000)
            </p>
          </div>

          <div className="p-4 bg-surface dark:bg-trading-dark-900/50 rounded-lg border border-surface-line dark:border-trading-dark-600">
            <p className="text-sm font-medium text-ink-900 dark:text-white mb-2">
              Scenario 2: €15.000 meerwaarde
            </p>
            <p className="text-sm text-ink-700 dark:text-ink-300">
              Belastbaar bedrag: €5.000 (€15.000 - €10.000)
              <br />
              Belasting: <strong>€500</strong> (10% van €5.000)
              <br />
              Netto meerwaarde: €14.500
            </p>
          </div>

          <div className="p-4 bg-surface dark:bg-trading-dark-900/50 rounded-lg border border-surface-line dark:border-trading-dark-600">
            <p className="text-sm font-medium text-ink-900 dark:text-white mb-2">
              Scenario 3: €50.000 meerwaarde
            </p>
            <p className="text-sm text-ink-700 dark:text-ink-300">
              Belastbaar bedrag: €40.000 (€50.000 - €10.000)
              <br />
              Belasting: <strong>€4.000</strong> (10% van €40.000)
              <br />
              Netto meerwaarde: €46.000
              <br />
              Effectief tarief: 8%
            </p>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-caution-50 dark:bg-caution-600/15 border border-caution-500/30 dark:border-caution-500/30 rounded-lg p-5">
        <h4 className="font-semibold text-ink-900 dark:text-white mb-2 flex items-center gap-2">
          <Info className="w-5 h-5 text-caution-600 dark:text-caution-500" />
          Belangrijke opmerkingen
        </h4>
        <ul className="text-sm text-ink-700 dark:text-ink-300 space-y-2 ml-7">
          <li>
            • Deze belasting is alleen van toepassing op <strong>gerealiseerde</strong> meerwaarden
            (verkochte posities)
          </li>
          <li>• Niet-gerealiseerde winsten (aandelen die je nog bezit) worden niet belast</li>
          <li>• De vrijstelling van €10.000 geldt per kalenderjaar</li>
          <li>
            • Deze calculator is informatief - raadpleeg een belastingadviseur voor persoonlijk
            advies
          </li>
          <li>• Verliezen kunnen mogelijk verrekend worden - check de actuele wetgeving</li>
        </ul>
      </div>
    </div>
  );
};
