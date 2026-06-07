import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calculator, TrendingUp, AlertTriangle, ArrowRight, Plus, X, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { FridayDatePicker } from '../../components/common/FridayDatePicker';
import { TickerSelector } from '../../components/widgets/TickerSelector';
import { PortalTooltip } from '../../components/common/PortalTooltip';
import { addTicker } from '../../store/commands/tickerCommands';
import { formatNumber } from '../../utils/numberFormat';
import type { Ticker } from '../../types';

interface PMCCInputs {
  // Stock
  ticker: string;
  underlyingPrice: number;
  startDate: string;

  // LEAP
  leapStrike: number;
  leapDebit: number;
  leapExpiration: string;

  // Short Call
  shortStrike: number;
  expectedPremium: number;
  premiumFrequency: 'monthly' | 'weekly';
}

interface PMCCResults {
  initialInvestment: number;
  leapBreakEven: number;
  periods: number;
  totalDays: number;
  extrinsicValue: number;
  residualValue: number;
  premiumCollected: number;
  netPnL: number;
  roi: number;
  annualizedROI: number;
}

const MULTIPLIER = 100; // Standard option contract size

export const PMCCCalculator: React.FC = () => {
  const { t } = useTranslation();

  // Tooltip explanations for PMCC calculations
  const TOOLTIPS = {
    initialInvestment: t('toolsPages.pmcc.tooltipInitialInvestment'),
    leapBreakEven: t('toolsPages.pmcc.tooltipLeapBreakEven'),
    periods: t('toolsPages.pmcc.tooltipPeriods'),
    extrinsicValue: t('toolsPages.pmcc.tooltipExtrinsicValue'),
    residualValue: t('toolsPages.pmcc.tooltipResidualValue'),
    premiumCollected: t('toolsPages.pmcc.tooltipPremiumCollected'),
    netPnL: t('toolsPages.pmcc.tooltipNetPnL'),
    roi: t('toolsPages.pmcc.tooltipRoi'),
    annualizedROI: t('toolsPages.pmcc.tooltipAnnualizedRoi'),
  };

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { setPageTitle } = usePageTitle();
  const { pushNavigation } = useNavigation();
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);
  const [inputs, setInputs] = useState<PMCCInputs>({
    ticker: '',
    underlyingPrice: 0,
    startDate: new Date().toISOString().split('T')[0],
    leapStrike: 0,
    leapDebit: 0,
    leapExpiration: '',
    shortStrike: 0,
    expectedPremium: 0,
    premiumFrequency: 'weekly',
  });

  const [results, setResults] = useState<PMCCResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showPortfolioDialog, setShowPortfolioDialog] = useState(false);

  // New ticker creation state
  const [isCreatingTicker, setIsCreatingTicker] = useState(false);
  const [newTickerData, setNewTickerData] = useState({
    symbol: '',
    name: '',
    type: 'stock' as 'stock' | 'etf',
    optionsAvailable: true,
    miniContractsAvailable: false,
  });

  // Set page title
  useEffect(() => {
    setPageTitle(
      "Poor Man's Covered Call simulator",
      "Calculate potential returns for your Poor Man's Covered Call strategy"
    );
  }, [setPageTitle]);

  // Auto-calculate on input change
  useEffect(() => {
    calculateResults();
  }, [inputs]);

  const handleInputChange = (field: keyof PMCCInputs, value: string | number) => {
    setInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle creating a new ticker
  const handleCreateTicker = () => {
    if (!newTickerData.symbol || !newTickerData.name) return;

    const ticker: Ticker = {
      ...newTickerData,
      symbol: newTickerData.symbol.toUpperCase(),
      lastUsed: new Date().toISOString(),
      currentPrice: inputs.underlyingPrice || 0,
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

  // Handle opening the create ticker form
  const handleOpenCreateTicker = (symbol: string) => {
    setNewTickerData((prev) => ({
      ...prev,
      symbol: symbol.toUpperCase(),
    }));
    setIsCreatingTicker(true);
  };

  const calculateResults = () => {
    const {
      ticker,
      underlyingPrice,
      startDate,
      leapStrike,
      leapDebit,
      leapExpiration,
      shortStrike,
      expectedPremium,
      premiumFrequency,
    } = inputs;

    // Check if all required fields are filled
    if (
      !ticker ||
      !underlyingPrice ||
      !startDate ||
      !leapStrike ||
      !leapDebit ||
      !leapExpiration ||
      !shortStrike ||
      !expectedPremium
    ) {
      setResults(null);
      return;
    }

    const newWarnings: string[] = [];

    // Calculate initial investment
    const initialInvestment = leapDebit * MULTIPLIER;

    // Calculate LEAP break-even
    const leapBreakEven = leapStrike + leapDebit;

    // Calculate periods
    const startDateObj = new Date(startDate);
    const leapExpirationObj = new Date(leapExpiration);
    const timeDiff = leapExpirationObj.getTime() - startDateObj.getTime();
    const totalDays = Math.max(0, timeDiff / (1000 * 3600 * 24));
    const daysPerPeriod = premiumFrequency === 'monthly' ? 30.44 : 7;
    const periods = Math.floor(totalDays / daysPerPeriod);

    // Calculate extrinsic value (time value paid)
    const intrinsicValue = Math.max(0, underlyingPrice - leapStrike);
    const extrinsicValuePerShare = leapDebit - intrinsicValue;
    const extrinsicValue = extrinsicValuePerShare * MULTIPLIER;

    // Calculate LEAP residual value (assuming price stays same)
    const residualValue = Math.max(0, underlyingPrice - leapStrike) * MULTIPLIER;

    // Calculate premium collected
    const premiumCollected = expectedPremium * MULTIPLIER * periods;

    // Calculate net P&L
    const netPnL = residualValue + premiumCollected - initialInvestment;

    // Calculate ROI
    const roi = (netPnL / initialInvestment) * 100;

    // Calculate annualized ROI
    const annualizedROI = totalDays > 0 ? (roi / totalDays) * 365 : 0;

    // Warnings
    if (shortStrike < leapBreakEven) {
      newWarnings.push('Short call strike is below LEAP break-even, increasing risk.');
    }

    if (leapBreakEven > underlyingPrice * 1.1) {
      newWarnings.push('LEAP break-even is more than 10% above current price.');
    }

    setWarnings(newWarnings);
    setResults({
      initialInvestment,
      leapBreakEven,
      periods,
      totalDays,
      extrinsicValue,
      residualValue,
      premiumCollected,
      netPnL,
      roi,
      annualizedROI,
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${formatNumber(value, 2)}%`;
  };

  const handleCreatePMCC = (portfolioName: string) => {
    // Store calculator data in localStorage for the PMCC page to pick up
    const pmccData = {
      ticker: inputs.ticker,
      underlyingPrice: inputs.underlyingPrice,
      leapStrike: inputs.leapStrike,
      leapDebit: inputs.leapDebit,
      leapExpiration: inputs.leapExpiration,
      quantity: 1,
    };
    localStorage.setItem('pmcc-calculator-data', JSON.stringify(pmccData));

    // Register navigation and navigate to the PMCC strategy page for the selected portfolio
    pushNavigation(`/portfolio/${portfolioName}/pmcc`, 'PMCC Strategy');
    navigate(`/portfolio/${portfolioName}/pmcc`);
    setShowPortfolioDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left Column: Inputs */}
        <div className="space-y-4">
          {/* Stock Section */}
          <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-4">
            <h2 className="text-base font-semibold text-ink-900 dark:text-white mb-3 pb-2 border-b border-surface-line dark:border-trading-dark-600">
              Stock
            </h2>
            <div className="space-y-3">
              {!isCreatingTicker ? (
                <div>
                  <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                    Ticker
                  </label>
                  <TickerSelector
                    value={inputs.ticker}
                    onChange={(ticker: Ticker) => {
                      handleInputChange('ticker', ticker.symbol);
                      if (ticker.currentPrice) {
                        handleInputChange('underlyingPrice', ticker.currentPrice);
                      }
                    }}
                    onCreateNew={handleOpenCreateTicker}
                    placeholder={t('toolsPages.searchTicker')}
                  />
                </div>
              ) : (
                <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-lg border border-primary-200 dark:border-primary-800">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-primary-900 dark:text-primary-300 flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      {t('toolsPages.pmcc.addNewTicker')}
                    </h4>
                    <button
                      onClick={() => {
                        setIsCreatingTicker(false);
                        setNewTickerData({
                          symbol: '',
                          name: '',
                          type: 'stock',
                          optionsAvailable: true,
                          miniContractsAvailable: false,
                        });
                      }}
                      className="p-1 hover:bg-primary-200 dark:hover:bg-primary-800 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-primary-700 dark:text-primary-300" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                          {t('toolsPages.pmcc.tickerSymbolRequired')}
                        </label>
                        <input
                          type="text"
                          value={newTickerData.symbol}
                          onChange={(e) =>
                            setNewTickerData({
                              ...newTickerData,
                              symbol: e.target.value.toUpperCase(),
                            })
                          }
                          placeholder="AAPL"
                          className="w-full rounded-md border-ink-200 dark:border-trading-dark-500 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-1.5 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                          {t('toolsPages.pmcc.type')}
                        </label>
                        <select
                          value={newTickerData.type}
                          onChange={(e) =>
                            setNewTickerData({
                              ...newTickerData,
                              type: e.target.value as 'stock' | 'etf',
                            })
                          }
                          className="w-full rounded-md border-ink-200 dark:border-trading-dark-500 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-1.5 text-sm"
                        >
                          <option value="stock">{t('toolsPages.stock')}</option>
                          <option value="etf">{t('toolsPages.etf')}</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                        {t('toolsPages.pmcc.companyNameRequired')}
                      </label>
                      <input
                        type="text"
                        value={newTickerData.name}
                        onChange={(e) =>
                          setNewTickerData({
                            ...newTickerData,
                            name: e.target.value,
                          })
                        }
                        placeholder="Apple Inc."
                        className="w-full rounded-md border-ink-200 dark:border-trading-dark-500 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-1.5 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newTickerData.optionsAvailable}
                          onChange={(e) =>
                            setNewTickerData({
                              ...newTickerData,
                              optionsAvailable: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-primary-700 bg-surface-subtle border-ink-200 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-ink-700 dark:text-ink-300">
                          {t('toolsPages.optionsAvailable')}
                        </span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newTickerData.miniContractsAvailable}
                          onChange={(e) =>
                            setNewTickerData({
                              ...newTickerData,
                              miniContractsAvailable: e.target.checked,
                            })
                          }
                          className="w-4 h-4 text-primary-700 bg-surface-subtle border-ink-200 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm text-ink-700 dark:text-ink-300 flex items-center gap-2">
                          {t('toolsPages.pmcc.miniContractsAvailable')}
                          <div className="group relative">
                            <Info className="w-4 h-4 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 cursor-help" />
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-white dark:bg-trading-dark-800 text-ink-700 dark:text-ink-300 text-xs rounded-lg shadow-lg border border-surface-line dark:border-trading-dark-500 z-50">
                              {t('toolsPages.pmcc.miniContractsTooltip')}
                            </div>
                          </div>
                        </span>
                      </label>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleCreateTicker}
                        disabled={!newTickerData.symbol || !newTickerData.name}
                        className="flex-1 px-4 py-2 bg-primary-700 hover:bg-primary-800 disabled:bg-ink-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors text-sm"
                      >
                        {t('toolsPages.pmcc.addTicker')}
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingTicker(false);
                          setNewTickerData({
                            symbol: '',
                            name: '',
                            type: 'stock',
                            optionsAvailable: true,
                            miniContractsAvailable: false,
                          });
                        }}
                        className="px-4 py-2 bg-surface-muted dark:bg-trading-dark-700 hover:bg-ink-200 dark:hover:bg-trading-dark-600 text-ink-700 dark:text-ink-200 rounded-lg font-medium transition-colors text-sm"
                      >
                        {t('toolsPages.cancel')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                    Current Price ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.underlyingPrice || ''}
                    onChange={(e) =>
                      handleInputChange('underlyingPrice', parseFloat(e.target.value) || 0)
                    }
                    placeholder="150,00"
                    className="w-full rounded-md border-ink-200 dark:border-trading-dark-500 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                    Strategy Start Date
                  </label>
                  <input
                    type="date"
                    value={inputs.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full rounded-md border-ink-200 dark:border-trading-dark-500 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* LEAP Section */}
          <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-4">
            <h2 className="text-base font-semibold text-ink-900 dark:text-white mb-3 pb-2 border-b border-surface-line dark:border-trading-dark-600">
              LEAP (Long Call)
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                    Strike Price ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.leapStrike || ''}
                    onChange={(e) =>
                      handleInputChange('leapStrike', parseFloat(e.target.value) || 0)
                    }
                    placeholder="100,00"
                    className="w-full rounded-md border-ink-200 dark:border-trading-dark-500 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                    Premium per Share ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.leapDebit || ''}
                    onChange={(e) =>
                      handleInputChange('leapDebit', parseFloat(e.target.value) || 0)
                    }
                    placeholder="25,00"
                    className="w-full rounded-md border-ink-200 dark:border-trading-dark-500 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                  LEAP Expiration Date
                </label>
                <FridayDatePicker
                  value={inputs.leapExpiration}
                  onChange={(date) => handleInputChange('leapExpiration', date)}
                  className="w-full rounded-md border-ink-200 dark:border-trading-dark-500 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-1.5 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Short Call Section */}
          <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-4">
            <h2 className="text-base font-semibold text-ink-900 dark:text-white mb-3 pb-2 border-b border-surface-line dark:border-trading-dark-600">
              Covered Call (Short Call)
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                    Strike Price ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.shortStrike || ''}
                    onChange={(e) =>
                      handleInputChange('shortStrike', parseFloat(e.target.value) || 0)
                    }
                    placeholder="160,00"
                    className="w-full rounded-md border-ink-200 dark:border-trading-dark-500 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                    Premium per Share ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.expectedPremium || ''}
                    onChange={(e) =>
                      handleInputChange('expectedPremium', parseFloat(e.target.value) || 0)
                    }
                    placeholder="0,50"
                    className="w-full rounded-md border-ink-200 dark:border-trading-dark-500 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                  Premium Frequency
                </label>
                <select
                  value={inputs.premiumFrequency}
                  onChange={(e) =>
                    handleInputChange('premiumFrequency', e.target.value as 'monthly' | 'weekly')
                  }
                  className="w-full rounded-md border-ink-200 dark:border-trading-dark-500 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-1.5 text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="space-y-4">
          {/* Live Results Card */}
          <div className="bg-primary-50 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-4">
            {results ? (
              <div className="space-y-4">
                {/* Header Section */}
                <div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <h3 className="text-2xl font-bold text-ink-900 dark:text-white">
                      {inputs.ticker || '...'}
                    </h3>
                    <span className="text-sm text-ink-600 dark:text-ink-400">
                      {formatCurrency(inputs.underlyingPrice)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-ink-700 dark:text-ink-300 flex items-center gap-1">
                        Initial Investment
                        <PortalTooltip
                          content={
                            <pre className="whitespace-pre-wrap text-xs max-w-xs">
                              {TOOLTIPS.initialInvestment}
                            </pre>
                          }
                        >
                          <Info className="w-3 h-3 text-ink-400 hover:text-primary-500 cursor-help" />
                        </PortalTooltip>
                      </p>
                      <p className="text-base font-bold text-ink-900 dark:text-white">
                        {formatCurrency(results.initialInvestment)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-ink-700 dark:text-ink-300 flex items-center gap-1">
                        LEAP Break-Even
                        <PortalTooltip
                          content={
                            <pre className="whitespace-pre-wrap text-xs max-w-xs">
                              {TOOLTIPS.leapBreakEven}
                            </pre>
                          }
                        >
                          <Info className="w-3 h-3 text-ink-400 hover:text-primary-500 cursor-help" />
                        </PortalTooltip>
                      </p>
                      <p className="text-base font-bold text-ink-900 dark:text-white">
                        {formatCurrency(results.leapBreakEven)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-ink-700 dark:text-ink-300 flex items-center gap-1">
                        Calculated Periods
                        <PortalTooltip
                          content={
                            <pre className="whitespace-pre-wrap text-xs max-w-xs">
                              {TOOLTIPS.periods}
                            </pre>
                          }
                        >
                          <Info className="w-3 h-3 text-ink-400 hover:text-primary-500 cursor-help" />
                        </PortalTooltip>
                      </p>
                      <p className="text-base font-bold text-ink-900 dark:text-white">
                        {results.periods}{' '}
                        {inputs.premiumFrequency === 'weekly' ? 'weeks' : 'months'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-ink-700 dark:text-ink-300 flex items-center gap-1">
                        Premium Paid (LEAP)
                        <PortalTooltip
                          content={
                            <pre className="whitespace-pre-wrap text-xs max-w-xs">
                              {TOOLTIPS.extrinsicValue}
                            </pre>
                          }
                        >
                          <Info className="w-3 h-3 text-ink-400 hover:text-primary-500 cursor-help" />
                        </PortalTooltip>
                      </p>
                      <p className="text-base font-bold text-ink-900 dark:text-white">
                        {formatCurrency(results.extrinsicValue)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <hr className="border-surface-line dark:border-trading-dark-600" />

                {/* P&L Section */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-ink-700 dark:text-ink-300 flex items-center gap-1">
                      LEAP Residual Value
                      <PortalTooltip
                        content={
                          <pre className="whitespace-pre-wrap text-xs max-w-xs">
                            {TOOLTIPS.residualValue}
                          </pre>
                        }
                      >
                        <Info className="w-3 h-3 text-ink-400 hover:text-primary-500 cursor-help" />
                      </PortalTooltip>
                    </span>
                    <span className="text-sm font-semibold text-ink-900 dark:text-ink-100">
                      {formatCurrency(results.residualValue)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-ink-700 dark:text-ink-300 flex items-center gap-1">
                      Premium Collected
                      <PortalTooltip
                        content={
                          <pre className="whitespace-pre-wrap text-xs max-w-xs">
                            {TOOLTIPS.premiumCollected}
                          </pre>
                        }
                      >
                        <Info className="w-3 h-3 text-ink-400 hover:text-primary-500 cursor-help" />
                      </PortalTooltip>
                    </span>
                    <span className="text-sm font-semibold text-positive-600 dark:text-positive-500">
                      +{formatCurrency(results.premiumCollected)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-surface-line dark:border-trading-dark-600">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-bold text-ink-900 dark:text-ink-100 flex items-center gap-1">
                        Net Profit / Loss
                        <PortalTooltip
                          content={
                            <pre className="whitespace-pre-wrap text-xs max-w-xs">
                              {TOOLTIPS.netPnL}
                            </pre>
                          }
                        >
                          <Info className="w-3 h-3 text-ink-400 hover:text-primary-500 cursor-help" />
                        </PortalTooltip>
                      </span>
                      <span
                        className={`text-xl font-bold ${results.netPnL >= 0 ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'}`}
                      >
                        {formatCurrency(results.netPnL)}
                      </span>
                    </div>
                    <p className="text-xs text-ink-500 dark:text-ink-400 text-right">
                      Assuming stock price unchanged
                    </p>
                  </div>

                  <div className="pt-2 border-t border-surface-line dark:border-trading-dark-600">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-bold text-ink-900 dark:text-ink-100 flex items-center gap-1">
                        ROI
                        <PortalTooltip
                          content={
                            <pre className="whitespace-pre-wrap text-xs max-w-xs">
                              {TOOLTIPS.roi}
                            </pre>
                          }
                        >
                          <Info className="w-3 h-3 text-ink-400 hover:text-primary-500 cursor-help" />
                        </PortalTooltip>
                      </span>
                      <span
                        className={`text-xl font-bold ${results.roi >= 0 ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'}`}
                      >
                        {formatPercentage(results.roi)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-surface-line dark:border-trading-dark-600 bg-surface-subtle dark:bg-trading-dark-800 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 icon-text-primary" />
                        <span className="text-sm font-bold text-ink-900 dark:text-white">
                          Annualized ROI
                        </span>
                        <PortalTooltip
                          content={
                            <pre className="whitespace-pre-wrap text-xs max-w-xs">
                              {TOOLTIPS.annualizedROI}
                            </pre>
                          }
                        >
                          <Info className="w-3 h-3 text-ink-400 hover:text-primary-500 cursor-help" />
                        </PortalTooltip>
                      </div>
                      <span
                        className={`text-2xl font-bold ${results.annualizedROI >= 0 ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'}`}
                      >
                        {formatPercentage(results.annualizedROI)}
                      </span>
                    </div>
                    <p className="text-xs text-ink-500 dark:text-ink-400 text-right">
                      Based on {Math.round(results.totalDays)} days
                    </p>
                  </div>
                </div>

                {/* Create PMCC Button */}
                <div className="pt-4">
                  <button
                    onClick={() => setShowPortfolioDialog(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 btn-primary text-white rounded-lg font-medium transition-colors"
                  >
                    <ArrowRight className="w-5 h-5" />
                    Create LEAP Position
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calculator className="w-16 h-16 text-primary-400 dark:text-primary-700 mx-auto mb-4" />
                <p className="text-ink-600 dark:text-ink-400">Fill in all fields to see results</p>
              </div>
            )}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className="bg-caution-50 dark:bg-caution-600/15 border-l-4 border-caution-500 dark:border-caution-600 p-3 rounded-md flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-caution-600 dark:text-caution-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-caution-600 dark:text-caution-500">{warning}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Selection Dialog */}
      {showPortfolioDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-4">
              Select Portfolio
            </h3>
            <p className="text-sm text-ink-600 dark:text-ink-400 mb-4">
              Choose the portfolio where you want to create this LEAP position for{' '}
              <strong>{inputs.ticker}</strong>
            </p>

            {portfolios.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-ink-600 dark:text-ink-400 mb-4">No portfolios configured yet.</p>
                <button
                  onClick={() => {
                    setShowPortfolioDialog(false);
                    navigate('/settings/portfolios');
                  }}
                  className="px-4 py-2 btn-primary text-white rounded-lg font-medium"
                >
                  Add Portfolio
                </button>
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                {portfolios.map((portfolio) => (
                  <button
                    key={portfolio.name}
                    onClick={() => handleCreatePMCC(portfolio.name)}
                    className="w-full flex items-center gap-3 p-3 border border-surface-line dark:border-trading-dark-600 rounded-lg hover:bg-surface dark:hover:bg-trading-dark-700 transition-colors text-left"
                  >
                    {portfolio.logo && (
                      <img src={portfolio.logo} alt={portfolio.name} className="w-8 h-8 rounded" />
                    )}
                    <span className="font-medium text-ink-900 dark:text-white">
                      {portfolio.name}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowPortfolioDialog(false)}
              className="w-full px-4 py-2 border border-ink-200 dark:border-trading-dark-500 text-ink-700 dark:text-ink-300 rounded-lg hover:bg-surface dark:hover:bg-trading-dark-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
