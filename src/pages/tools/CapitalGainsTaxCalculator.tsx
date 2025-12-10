import React, { useState, useEffect } from 'react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { Calculator, Info, ArrowRight } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { formatNumber } from '../../utils/numberFormat';

export const CapitalGainsTaxCalculator: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  const nationality = useAppSelector((state) => state.auth.nationality);
  const [realizedGains, setRealizedGains] = useState<string>('');
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    setPageTitle('Meerwaardebelasting simulator', 'Belgische belasting op meerwaarden aandelen (2026+)');
  }, [setPageTitle]);

  const parseNumber = (value: string): number => {
    if (!value) return 0;
    return parseFloat(value.replace(/,/g, '')) || 0;
  };

  const gains = parseNumber(realizedGains);
  const taxableAmount = Math.max(0, gains - 10000);
  const taxDue = taxableAmount * 0.10;
  const effectiveRate = gains > 0 ? (taxDue / gains) * 100 : 0;
  const netGains = gains - taxDue;

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('nl-BE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-500/10 rounded-lg">
            <Calculator className="w-8 h-8 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Meerwaardebelasting simulator
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Belgische belasting op gerealiseerde meerwaarden (vanaf 1 jan 2026)
            </p>
          </div>
          {/* Info Toggle Button */}
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-full transition-colors"
            title={showInfo ? "Verberg uitleg" : "Toon uitleg"}
          >
            <Info className={`w-5 h-5 ${showInfo ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500'}`} />
          </button>
        </div>
      </div>

      {/* Warning for non-Belgian users */}
      {nationality && nationality !== 'BE' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                Niet van toepassing
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Deze calculator is specifiek voor Belgische belastingplichtigen.
                Je huidige nationaliteit is ingesteld op {nationality}.
                Deze regels zijn mogelijk niet van toepassing op jou.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Educational Info */}
      {showInfo && (
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Wat is de meerwaardebelasting?
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Vanaf 1 januari 2026 wordt in België een belasting van <strong>10%</strong> geheven op
                gerealiseerde meerwaarden op aandelen. Dit betekent dat wanneer je aandelen verkoopt met winst,
                je hierover belasting moet betalen.
              </p>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Tarief:</strong> 10% op de gerealiseerde meerwaarde
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Vrijstelling:</strong> De eerste €10.000 meerwaarde per jaar is vrijgesteld
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Maximum voordeel:</strong> Tot €1.000 belastingbesparing door de vrijstelling
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Gerealiseerde meerwaarde:</strong> Alleen winst bij verkoop telt, niet onverkochte posities
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calculator */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Bereken je belasting
        </h3>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Totale gerealiseerde meerwaarde (€)
          </label>
          <input
            type="number"
            value={realizedGains}
            onChange={(e) => setRealizedGains(e.target.value)}
            placeholder="Bijvoorbeeld: 25000"
            className="w-full px-4 py-2 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            De totale winst die je hebt gerealiseerd door aandelen te verkopen in een kalenderjaar
          </p>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Gerealiseerde meerwaarde</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(gains)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Vrijstelling</span>
              <span className="text-lg font-semibold text-green-600 dark:text-green-400">- {formatCurrency(10000)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-gray-300 dark:border-gray-600">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Belastbaar bedrag</span>
              <span className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(taxableAmount)}</span>
            </div>
          </div>

          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-500/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Verschuldigde belasting (10%)
              </span>
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {formatCurrency(taxDue)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Effectief tarief</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {formatNumber(effectiveRate, 2)}%
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-orange-300 dark:border-orange-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Netto meerwaarde na belasting</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(netGains)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Examples */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Voorbeelden
        </h3>
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Scenario 1: €5.000 meerwaarde
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Belasting: <strong>€0</strong> (onder de vrijstelling van €10.000)
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Scenario 2: €15.000 meerwaarde
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Belastbaar bedrag: €5.000 (€15.000 - €10.000)<br />
              Belasting: <strong>€500</strong> (10% van €5.000)<br />
              Netto meerwaarde: €14.500
            </p>
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Scenario 3: €50.000 meerwaarde
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Belastbaar bedrag: €40.000 (€50.000 - €10.000)<br />
              Belasting: <strong>€4.000</strong> (10% van €40.000)<br />
              Netto meerwaarde: €46.000<br />
              Effectief tarief: 8%
            </p>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg p-5">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          Belangrijke opmerkingen
        </h4>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2 ml-7">
          <li>• Deze belasting is alleen van toepassing op <strong>gerealiseerde</strong> meerwaarden (verkochte posities)</li>
          <li>• Niet-gerealiseerde winsten (aandelen die je nog bezit) worden niet belast</li>
          <li>• De vrijstelling van €10.000 geldt per kalenderjaar</li>
          <li>• Deze calculator is informatief - raadpleeg een belastingadviseur voor persoonlijk advies</li>
          <li>• Verliezen kunnen mogelijk verrekend worden - check de actuele wetgeving</li>
        </ul>
      </div>
    </div>
  );
};
