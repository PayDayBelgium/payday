import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, TrendingUp, Info, DollarSign, Percent, Target } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { FridayDatePicker } from '../../components/common/FridayDatePicker';
import { TickerSelector } from '../../components/widgets/TickerSelector';
import { addTicker } from '../../store/commands/tickerCommands';
import { PortalTooltip } from '../../components/common/PortalTooltip';
import { formatNumber } from '../../utils/numberFormat';
import type { Ticker } from '../../types';

interface CCInputs {
  ticker: string;
  stockPrice: number;
  shares: number;
  strikePrice: number;
  premium: number;
  expirationDate: string;
  costBasis: number; // What you paid for the stock
}

interface CCResults {
  // Basic calculations
  totalPremium: number;
  premiumPerShare: number;
  contracts: number;
  daysToExpiration: number;

  // Price movement
  distanceToStrike: number;
  distanceToStrikePercent: number;
  breakEvenDown: number;
  breakEvenDownPercent: number;

  // Returns if called away
  stockGainIfCalled: number;
  totalProfitIfCalled: number;
  returnIfCalled: number;
  annualizedReturnIfCalled: number;

  // Returns if not called
  premiumReturn: number;
  annualizedPremiumReturn: number;

  // Cost basis adjusted
  newCostBasis: number;
  costBasisReduction: number;
}

const MULTIPLIER = 100;

export const CoveredCallSimulator: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { setPageTitle } = usePageTitle();

  // Tooltip explanations for each calculation
  const TOOLTIPS = {
    totalPremium: t('toolsPages.cc.tooltipTotalPremium'),
    premiumReturn: t('toolsPages.cc.tooltipPremiumReturn'),
    annualizedPremiumReturn: t('toolsPages.cc.tooltipAnnualizedPremiumReturn'),
    distanceToStrike: t('toolsPages.cc.tooltipDistanceToStrike'),
    breakEvenDown: t('toolsPages.cc.tooltipBreakEven'),
    returnIfCalled: t('toolsPages.cc.tooltipReturnIfCalled'),
    newCostBasis: t('toolsPages.cc.tooltipNewCostBasis'),
    contracts: t('toolsPages.cc.tooltipContracts'),
  };

  const [inputs, setInputs] = useState<CCInputs>({
    ticker: '',
    stockPrice: 0,
    shares: 100,
    strikePrice: 0,
    premium: 0,
    expirationDate: '',
    costBasis: 0,
  });

  const [results, setResults] = useState<CCResults | null>(null);

  // New ticker creation state
  const [isCreatingTicker, setIsCreatingTicker] = useState(false);
  const [newTickerData, setNewTickerData] = useState({
    symbol: '',
    name: '',
    type: 'stock' as 'stock' | 'etf',
    optionsAvailable: true,
    miniContractsAvailable: false,
  });

  useEffect(() => {
    setPageTitle(t('toolsPages.cc.pageTitle'), t('toolsPages.cc.pageSubtitle'));
  }, [setPageTitle, t]);

  useEffect(() => {
    calculateResults();
  }, [inputs]);

  const handleInputChange = (field: keyof CCInputs, value: string | number) => {
    setInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateTicker = () => {
    if (!newTickerData.symbol || !newTickerData.name) return;

    const ticker: Ticker = {
      ...newTickerData,
      symbol: newTickerData.symbol.toUpperCase(),
      lastUsed: new Date().toISOString(),
      currentPrice: inputs.stockPrice || 0,
    };

    dispatch(addTicker(ticker, new Date().toISOString()));
    handleInputChange('ticker', ticker.symbol);
    setIsCreatingTicker(false);
    setNewTickerData({
      symbol: '',
      name: '',
      type: 'stock',
      optionsAvailable: true,
      miniContractsAvailable: false,
    });
  };

  const handleOpenCreateTicker = (symbol: string) => {
    setNewTickerData((prev) => ({
      ...prev,
      symbol: symbol.toUpperCase(),
    }));
    setIsCreatingTicker(true);
  };

  const calculateResults = () => {
    const { stockPrice, shares, strikePrice, premium, expirationDate, costBasis } = inputs;

    if (!stockPrice || !shares || !strikePrice || !premium || !expirationDate) {
      setResults(null);
      return;
    }

    const effectiveCostBasis = costBasis || stockPrice;
    const contracts = Math.floor(shares / MULTIPLIER);

    if (contracts < 1) {
      setResults(null);
      return;
    }

    // Calculate days to expiration
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysToExpiration = Math.ceil(
      (expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysToExpiration <= 0) {
      setResults(null);
      return;
    }

    // Basic calculations
    const totalPremium = premium * contracts * MULTIPLIER;
    const premiumPerShare = premium;
    const totalInvested = effectiveCostBasis * shares;

    // Distance to strike
    const distanceToStrike = strikePrice - stockPrice;
    const distanceToStrikePercent = (distanceToStrike / stockPrice) * 100;

    // Break-even calculations
    const breakEvenDown = stockPrice - premiumPerShare;
    const breakEvenDownPercent = (premiumPerShare / stockPrice) * 100;

    // Returns if called away
    const stockGainIfCalled = (strikePrice - effectiveCostBasis) * shares;
    const totalProfitIfCalled = stockGainIfCalled + totalPremium;
    const returnIfCalled = (totalProfitIfCalled / totalInvested) * 100;
    const annualizedReturnIfCalled = returnIfCalled * (365 / daysToExpiration);

    // Returns if not called (premium only)
    const premiumReturn = (totalPremium / totalInvested) * 100;
    const annualizedPremiumReturn = premiumReturn * (365 / daysToExpiration);

    // Cost basis adjustment
    const newCostBasis = effectiveCostBasis - premiumPerShare;
    const costBasisReduction = premiumPerShare;

    setResults({
      totalPremium,
      premiumPerShare,
      contracts,
      daysToExpiration,
      distanceToStrike,
      distanceToStrikePercent,
      breakEvenDown,
      breakEvenDownPercent,
      stockGainIfCalled,
      totalProfitIfCalled,
      returnIfCalled,
      annualizedReturnIfCalled,
      premiumReturn,
      annualizedPremiumReturn,
      newCostBasis,
      costBasisReduction,
    });
  };

  // Helper component for result rows with tooltips
  const ResultRow: React.FC<{
    label: string;
    value: string | React.ReactNode;
    tooltip?: string;
    highlight?: 'green' | 'red' | 'blue' | 'none';
  }> = ({ label, value, tooltip, highlight = 'none' }) => {
    const highlightClasses = {
      green: 'text-positive-600 dark:text-positive-500',
      red: 'text-negative-600 dark:text-negative-500',
      blue: 'text-primary-700 dark:text-primary-300',
      none: 'text-ink-900 dark:text-white',
    };

    return (
      <div className="flex justify-between items-center py-2 border-b border-surface-subtle dark:border-trading-dark-600 last:border-0">
        <span className="text-ink-600 dark:text-ink-400 flex items-center gap-1">
          {label}
          {tooltip && (
            <PortalTooltip
              content={<pre className="whitespace-pre-wrap text-xs max-w-xs">{tooltip}</pre>}
            >
              <Info className="w-3.5 h-3.5 text-ink-400 hover:text-primary-500 cursor-help" />
            </PortalTooltip>
          )}
        </span>
        <span className={`font-semibold ${highlightClasses[highlight]}`}>{value}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Explanatory note — title is provided by the global header */}
      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
        <p
          className="text-sm text-primary-700 dark:text-primary-200"
          dangerouslySetInnerHTML={{ __html: t('toolsPages.cc.whatIsCoveredCall') }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-white dark:bg-trading-dark-800 rounded-xl border border-surface-line dark:border-trading-dark-600 p-6">
          <h2 className="text-lg font-semibold text-ink-900 dark:text-white mb-4">
            {t('toolsPages.cc.inputParameters')}
          </h2>

          <div className="space-y-4">
            {/* Ticker Selection */}
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                {t('toolsPages.cc.stock')}
              </label>
              {isCreatingTicker ? (
                <div className="space-y-3 p-4 bg-surface dark:bg-trading-dark-700/50 rounded-lg">
                  <input
                    type="text"
                    value={newTickerData.symbol}
                    onChange={(e) =>
                      setNewTickerData((prev) => ({
                        ...prev,
                        symbol: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder={t('toolsPages.cc.tickerPlaceholder')}
                    className="w-full px-3 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={newTickerData.name}
                    onChange={(e) =>
                      setNewTickerData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder={t('toolsPages.company')}
                    className="w-full px-3 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateTicker}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      {t('toolsPages.add')}
                    </button>
                    <button
                      onClick={() => setIsCreatingTicker(false)}
                      className="px-4 py-2 bg-surface-muted dark:bg-trading-dark-600 text-ink-700 dark:text-ink-300 rounded-lg"
                    >
                      {t('toolsPages.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <TickerSelector
                  value={inputs.ticker}
                  onChange={(ticker) => handleInputChange('ticker', ticker.symbol)}
                  onCreateNew={handleOpenCreateTicker}
                />
              )}
            </div>

            {/* Stock Price */}
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                {t('toolsPages.cc.currentStockPrice')}
              </label>
              <input
                type="number"
                step="0.01"
                value={inputs.stockPrice || ''}
                onChange={(e) => handleInputChange('stockPrice', parseFloat(e.target.value) || 0)}
                placeholder="175.00"
                className="w-full px-3 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white"
              />
            </div>

            {/* Number of Shares */}
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                {t('toolsPages.cc.numberOfShares')}
              </label>
              <input
                type="number"
                step="100"
                value={inputs.shares || ''}
                onChange={(e) => handleInputChange('shares', parseInt(e.target.value) || 0)}
                placeholder="100"
                className="w-full px-3 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white"
              />
              <p className="text-xs text-ink-500 mt-1">
                {inputs.shares
                  ? t('toolsPages.cc.contractsCount', { count: Math.floor(inputs.shares / 100) })
                  : t('toolsPages.cc.minSharesHint')}
              </p>
            </div>

            {/* Cost Basis */}
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                {t('toolsPages.cc.costBasisPerShare')}
                <PortalTooltip content={t('toolsPages.cc.costBasisTooltip')}>
                  <Info className="w-3.5 h-3.5 inline ml-1 text-ink-400" />
                </PortalTooltip>
              </label>
              <input
                type="number"
                step="0.01"
                value={inputs.costBasis || ''}
                onChange={(e) => handleInputChange('costBasis', parseFloat(e.target.value) || 0)}
                placeholder={
                  inputs.stockPrice ? inputs.stockPrice.toString() : t('toolsPages.cc.optional')
                }
                className="w-full px-3 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white"
              />
            </div>

            <hr className="border-surface-line dark:border-trading-dark-600" />

            {/* Strike Price */}
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                {t('toolsPages.cc.strikePrice')}
              </label>
              <input
                type="number"
                step="1"
                value={inputs.strikePrice || ''}
                onChange={(e) => handleInputChange('strikePrice', parseFloat(e.target.value) || 0)}
                placeholder="180.00"
                className="w-full px-3 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white"
              />
              {inputs.stockPrice > 0 && inputs.strikePrice > 0 && (
                <p
                  className={`text-xs mt-1 ${inputs.strikePrice >= inputs.stockPrice ? 'text-positive-600' : 'text-caution-600'}`}
                >
                  {inputs.strikePrice >= inputs.stockPrice
                    ? t('toolsPages.cc.aboveCurrent', {
                        percent: (
                          ((inputs.strikePrice - inputs.stockPrice) / inputs.stockPrice) *
                          100
                        ).toFixed(1),
                      })
                    : t('toolsPages.cc.belowCurrent', {
                        percent: (
                          ((inputs.stockPrice - inputs.strikePrice) / inputs.stockPrice) *
                          100
                        ).toFixed(1),
                      })}
                </p>
              )}
            </div>

            {/* Premium */}
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                {t('toolsPages.cc.premiumPerContract')}
              </label>
              <input
                type="number"
                step="0.01"
                value={inputs.premium || ''}
                onChange={(e) => handleInputChange('premium', parseFloat(e.target.value) || 0)}
                placeholder="2.50"
                className="w-full px-3 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white"
              />
            </div>

            {/* Expiration Date */}
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                {t('toolsPages.cc.expirationDate')}
              </label>
              <FridayDatePicker
                value={inputs.expirationDate}
                onChange={(date) => handleInputChange('expirationDate', date)}
              />
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {results ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-positive-50 dark:bg-positive-700/15 rounded-xl p-4 border border-positive-500/20 dark:border-positive-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-positive-600 dark:text-positive-500" />
                    <span className="text-sm text-positive-700 dark:text-positive-500">
                      {t('toolsPages.cc.premiumIncome')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-positive-700 dark:text-positive-500">
                    ${formatNumber(results.totalPremium)}
                  </p>
                  <p className="text-xs text-positive-600 dark:text-positive-500 mt-1">
                    {t('toolsPages.cc.contractsCount', { count: results.contracts })}
                  </p>
                </div>

                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 border border-primary-200 dark:border-primary-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="w-5 h-5 text-primary-700 dark:text-primary-300" />
                    <span className="text-sm text-primary-700 dark:text-primary-300">
                      {t('toolsPages.cc.return')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                    {results.premiumReturn.toFixed(2)}%
                  </p>
                  <p className="text-xs text-primary-700 dark:text-primary-300 mt-1">
                    {t('toolsPages.cc.annualized', {
                      percent: results.annualizedPremiumReturn.toFixed(1),
                    })}
                  </p>
                </div>
              </div>

              {/* Premium Details */}
              <div className="bg-white dark:bg-trading-dark-800 rounded-xl border border-surface-line dark:border-trading-dark-600 p-4">
                <h3 className="font-semibold text-ink-900 dark:text-white mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary-500" />
                  {t('toolsPages.cc.premiumDetails')}
                </h3>
                <ResultRow
                  label={t('toolsPages.cc.totalPremium')}
                  value={`$${formatNumber(results.totalPremium)}`}
                  tooltip={TOOLTIPS.totalPremium}
                  highlight="green"
                />
                <ResultRow
                  label={t('toolsPages.cc.premiumPerShare')}
                  value={`$${results.premiumPerShare.toFixed(2)}`}
                />
                <ResultRow
                  label={t('toolsPages.cc.numberOfContracts')}
                  value={results.contracts.toString()}
                  tooltip={TOOLTIPS.contracts}
                />
                <ResultRow
                  label={t('toolsPages.cc.daysToExpiration')}
                  value={t('toolsPages.cc.daysValue', { count: results.daysToExpiration })}
                />
              </div>

              {/* Strike Analysis */}
              <div className="bg-white dark:bg-trading-dark-800 rounded-xl border border-surface-line dark:border-trading-dark-600 p-4">
                <h3 className="font-semibold text-ink-900 dark:text-white mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary-500" />
                  {t('toolsPages.cc.strikeAnalysis')}
                </h3>
                <ResultRow
                  label={t('toolsPages.cc.priceMustRise')}
                  value={`$${results.distanceToStrike.toFixed(2)} (${results.distanceToStrikePercent.toFixed(1)}%)`}
                  tooltip={TOOLTIPS.distanceToStrike}
                  highlight={results.distanceToStrike >= 0 ? 'blue' : 'red'}
                />
                <ResultRow
                  label={t('toolsPages.cc.breakEvenDown')}
                  value={`$${results.breakEvenDown.toFixed(2)}`}
                  tooltip={TOOLTIPS.breakEvenDown}
                />
                <ResultRow
                  label={t('toolsPages.cc.protectionByPremium')}
                  value={`${results.breakEvenDownPercent.toFixed(2)}%`}
                  highlight="green"
                />
              </div>

              {/* If Called Away */}
              <div className="bg-white dark:bg-trading-dark-800 rounded-xl border border-surface-line dark:border-trading-dark-600 p-4">
                <h3 className="font-semibold text-ink-900 dark:text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                  {t('toolsPages.cc.ifCalledAway')}
                </h3>
                <ResultRow
                  label={t('toolsPages.cc.stockGain')}
                  value={`$${formatNumber(results.stockGainIfCalled)}`}
                  highlight={results.stockGainIfCalled >= 0 ? 'green' : 'red'}
                />
                <ResultRow
                  label={t('toolsPages.cc.totalProfitPlusPremium')}
                  value={`$${formatNumber(results.totalProfitIfCalled)}`}
                  highlight={results.totalProfitIfCalled >= 0 ? 'green' : 'red'}
                />
                <ResultRow
                  label={t('toolsPages.cc.returnIfCalled')}
                  value={`${results.returnIfCalled.toFixed(2)}%`}
                  tooltip={TOOLTIPS.returnIfCalled}
                  highlight={results.returnIfCalled >= 0 ? 'green' : 'red'}
                />
                <ResultRow
                  label={t('toolsPages.cc.annualizedReturn')}
                  value={`${results.annualizedReturnIfCalled.toFixed(1)}%`}
                  highlight="blue"
                />
              </div>

              {/* Cost Basis Impact */}
              <div className="bg-white dark:bg-trading-dark-800 rounded-xl border border-surface-line dark:border-trading-dark-600 p-4">
                <h3 className="font-semibold text-ink-900 dark:text-white mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary-500" />
                  {t('toolsPages.cc.costBasisImpact')}
                </h3>
                <ResultRow
                  label={t('toolsPages.cc.newEffectiveCostBasis')}
                  value={`$${results.newCostBasis.toFixed(2)}`}
                  tooltip={TOOLTIPS.newCostBasis}
                />
                <ResultRow
                  label={t('toolsPages.cc.costBasisReduction')}
                  value={`-$${results.costBasisReduction.toFixed(2)} ${t('toolsPages.cc.perShare')}`}
                  highlight="green"
                />
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-trading-dark-800 rounded-xl border border-surface-line dark:border-trading-dark-600 p-8 text-center">
              <Calculator className="w-12 h-12 text-ink-400 mx-auto mb-4" />
              <p className="text-ink-500 dark:text-ink-400">{t('toolsPages.cc.fillAllFields')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoveredCallSimulator;
