import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { Info, ArrowRight } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { formatNumber } from '../../utils/numberFormat';

export const CapitalGainsTaxCalculator: React.FC = () => {
  const { t } = useTranslation();
  const { setPageTitle } = usePageTitle();
  const nationality = useAppSelector((state) => state.auth.nationality);
  const [realizedGains, setRealizedGains] = useState<string>('');
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    setPageTitle(t('toolsPages.cgt.pageTitle'), t('toolsPages.cgt.pageSubtitle'));
  }, [setPageTitle, t]);

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
          title={showInfo ? t('toolsPages.cgt.hideExplanation') : t('toolsPages.cgt.showExplanation')}
        >
          <Info
            className={`w-4 h-4 ${showInfo ? 'text-caution-600 dark:text-caution-500' : 'text-ink-400'}`}
          />
          {showInfo ? t('toolsPages.cgt.hideExplanation') : t('toolsPages.cgt.showExplanation')}
        </button>
      </div>

      {/* Warning for non-Belgian users */}
      {nationality && nationality !== 'BE' && (
        <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-ink-900 dark:text-white mb-1">
                {t('toolsPages.cgt.notApplicable')}
              </h4>
              <p className="text-sm text-ink-700 dark:text-ink-300">
                {t('toolsPages.cgt.notApplicableBody', { nationality })}
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
                {t('toolsPages.cgt.whatIsTax')}
              </h3>
              <p
                className="text-sm text-ink-700 dark:text-ink-300 mb-3"
                dangerouslySetInnerHTML={{ __html: t('toolsPages.cgt.whatIsTaxBody') }}
              />
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    <strong>{t('toolsPages.cgt.rateLabel')}</strong>
                    {t('toolsPages.cgt.rateValue')}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    <strong>{t('toolsPages.cgt.exemptionLabel')}</strong>
                    {t('toolsPages.cgt.exemptionValue')}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    <strong>{t('toolsPages.cgt.maxBenefitLabel')}</strong>
                    {t('toolsPages.cgt.maxBenefitValue')}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-ink-700 dark:text-ink-300">
                    <strong>{t('toolsPages.cgt.realizedGainLabel')}</strong>
                    {t('toolsPages.cgt.realizedGainValue')}
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
          {t('toolsPages.cgt.calcTitle')}
        </h3>

        {/* Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
            {t('toolsPages.cgt.inputLabel')}
          </label>
          <input
            type="number"
            value={realizedGains}
            onChange={(e) => setRealizedGains(e.target.value)}
            placeholder={t('toolsPages.cgt.inputPlaceholder')}
            className="w-full px-4 py-2 bg-surface-subtle dark:bg-slate-700 border border-ink-200 dark:border-slate-600 rounded-lg text-ink-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-caution-500"
          />
          <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
            {t('toolsPages.cgt.inputHelp')}
          </p>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="bg-surface dark:bg-trading-dark-900/50 rounded-lg p-4 border border-surface-line dark:border-trading-dark-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-ink-600 dark:text-ink-400">
                {t('toolsPages.cgt.realizedGain')}
              </span>
              <span className="text-lg font-bold text-ink-900 dark:text-white">
                {formatCurrency(gains)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-ink-600 dark:text-ink-400">
                {t('toolsPages.cgt.exemption')}
              </span>
              <span className="text-lg font-semibold text-positive-600 dark:text-positive-500">
                - {formatCurrency(10000)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-ink-200 dark:border-trading-dark-500">
              <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                {t('toolsPages.cgt.taxableAmount')}
              </span>
              <span className="text-lg font-bold text-ink-900 dark:text-white">
                {formatCurrency(taxableAmount)}
              </span>
            </div>
          </div>

          <div className="bg-caution-50 dark:bg-caution-600/15 rounded-lg p-4 border border-caution-500/30 dark:border-caution-500/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                {t('toolsPages.cgt.taxDue')}
              </span>
              <span className="text-2xl font-bold text-caution-600 dark:text-caution-500">
                {formatCurrency(taxDue)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-ink-600 dark:text-ink-400">
                {t('toolsPages.cgt.effectiveRate')}
              </span>
              <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                {formatNumber(effectiveRate, 2)}%
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-caution-500/40 dark:border-caution-600/40">
              <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                {t('toolsPages.cgt.netGain')}
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
        <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-4">
          {t('toolsPages.cgt.examples')}
        </h3>
        <div className="space-y-4">
          <div className="p-4 bg-surface dark:bg-trading-dark-900/50 rounded-lg border border-surface-line dark:border-trading-dark-600">
            <p className="text-sm font-medium text-ink-900 dark:text-white mb-2">
              {t('toolsPages.cgt.scenario1Title')}
            </p>
            <p
              className="text-sm text-ink-700 dark:text-ink-300"
              dangerouslySetInnerHTML={{ __html: t('toolsPages.cgt.scenario1Body') }}
            />
          </div>

          <div className="p-4 bg-surface dark:bg-trading-dark-900/50 rounded-lg border border-surface-line dark:border-trading-dark-600">
            <p className="text-sm font-medium text-ink-900 dark:text-white mb-2">
              {t('toolsPages.cgt.scenario2Title')}
            </p>
            <p
              className="text-sm text-ink-700 dark:text-ink-300"
              dangerouslySetInnerHTML={{ __html: t('toolsPages.cgt.scenario2Body') }}
            />
          </div>

          <div className="p-4 bg-surface dark:bg-trading-dark-900/50 rounded-lg border border-surface-line dark:border-trading-dark-600">
            <p className="text-sm font-medium text-ink-900 dark:text-white mb-2">
              {t('toolsPages.cgt.scenario3Title')}
            </p>
            <p
              className="text-sm text-ink-700 dark:text-ink-300"
              dangerouslySetInnerHTML={{ __html: t('toolsPages.cgt.scenario3Body') }}
            />
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-caution-50 dark:bg-caution-600/15 border border-caution-500/30 dark:border-caution-500/30 rounded-lg p-5">
        <h4 className="font-semibold text-ink-900 dark:text-white mb-2 flex items-center gap-2">
          <Info className="w-5 h-5 text-caution-600 dark:text-caution-500" />
          {t('toolsPages.cgt.importantNotes')}
        </h4>
        <ul className="text-sm text-ink-700 dark:text-ink-300 space-y-2 ml-7">
          <li dangerouslySetInnerHTML={{ __html: t('toolsPages.cgt.note1') }} />
          <li>{t('toolsPages.cgt.note2')}</li>
          <li>{t('toolsPages.cgt.note3')}</li>
          <li>{t('toolsPages.cgt.note4')}</li>
          <li>{t('toolsPages.cgt.note5')}</li>
        </ul>
      </div>
    </div>
  );
};
