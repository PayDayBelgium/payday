import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { FridayDatePicker } from '../../components/common/FridayDatePicker';
import { TickerSelector } from '../../components/widgets/TickerSelector';
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
  const navigate = useNavigate();
  const { t } = useTranslation();
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

  // Set page title
  useEffect(() => {
    setPageTitle("Poor Man's Covered Call simulator", "Calculate potential returns for your Poor Man's Covered Call strategy");
  }, [setPageTitle]);

  // Auto-calculate on input change
  useEffect(() => {
    calculateResults();
  }, [inputs]);

  const handleInputChange = (field: keyof PMCCInputs, value: string | number) => {
    setInputs(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const calculateResults = () => {
    const {
      ticker, underlyingPrice, startDate, leapStrike, leapDebit,
      leapExpiration, shortStrike, expectedPremium, premiumFrequency
    } = inputs;

    // Check if all required fields are filled
    if (!ticker || !underlyingPrice || !startDate || !leapStrike ||
        !leapDebit || !leapExpiration || !shortStrike || !expectedPremium) {
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
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              Stock
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                  placeholder="Zoek ticker..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Current Price ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.underlyingPrice || ''}
                    onChange={(e) => handleInputChange('underlyingPrice', parseFloat(e.target.value) || 0)}
                    placeholder="150,00"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Strategy Start Date
                  </label>
                  <input
                    type="date"
                    value={inputs.startDate}
                    onChange={(e) => handleInputChange('startDate', e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-1.5 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* LEAP Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              LEAP (Long Call)
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Strike Price ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.leapStrike || ''}
                    onChange={(e) => handleInputChange('leapStrike', parseFloat(e.target.value) || 0)}
                    placeholder="100,00"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Premium per Share ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.leapDebit || ''}
                    onChange={(e) => handleInputChange('leapDebit', parseFloat(e.target.value) || 0)}
                    placeholder="25,00"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  LEAP Expiration Date
                </label>
                <FridayDatePicker
                  value={inputs.leapExpiration}
                  onChange={(date) => handleInputChange('leapExpiration', date)}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-1.5 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Short Call Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
              Covered Call (Short Call)
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Strike Price ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.shortStrike || ''}
                    onChange={(e) => handleInputChange('shortStrike', parseFloat(e.target.value) || 0)}
                    placeholder="160,00"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Premium per Share ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.expectedPremium || ''}
                    onChange={(e) => handleInputChange('expectedPremium', parseFloat(e.target.value) || 0)}
                    placeholder="0,50"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-1.5 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Premium Frequency
                </label>
                <select
                  value={inputs.premiumFrequency}
                  onChange={(e) => handleInputChange('premiumFrequency', e.target.value as 'monthly' | 'weekly')}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-1.5 text-sm"
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
          <div className="bg-primary-50 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            {results ? (
              <div className="space-y-4">
                {/* Header Section */}
                <div>
                  <div className="flex items-baseline gap-2 mb-3">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {inputs.ticker || '...'}
                    </h3>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {formatCurrency(inputs.underlyingPrice)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Initial Investment</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">
                        {formatCurrency(results.initialInvestment)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">LEAP Break-Even</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">
                        {formatCurrency(results.leapBreakEven)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Calculated Periods</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">
                        {results.periods} {inputs.premiumFrequency === 'weekly' ? 'weeks' : 'months'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Premium Paid (LEAP)</p>
                      <p className="text-base font-bold text-gray-900 dark:text-white">
                        {formatCurrency(results.extrinsicValue)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <hr className="border-gray-200 dark:border-gray-700" />

                {/* P&L Section */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      LEAP Residual Value
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {formatCurrency(results.residualValue)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Premium Collected
                    </span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      +{formatCurrency(results.premiumCollected)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        Net Profit / Loss
                      </span>
                      <span className={`text-xl font-bold ${results.netPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(results.netPnL)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                      Assuming stock price unchanged
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        ROI
                      </span>
                      <span className={`text-xl font-bold ${results.roi >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatPercentage(results.roi)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 -mx-4 -mb-4 px-4 py-3 rounded-b-lg">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 icon-text-primary" />
                        <span className="text-sm font-bold text-gray-900 dark:text-white">
                          Annualized ROI
                        </span>
                      </div>
                      <span className={`text-2xl font-bold ${results.annualizedROI >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatPercentage(results.annualizedROI)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
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
                <Calculator className="w-16 h-16 text-blue-300 dark:text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Fill in all fields to see results
                </p>
              </div>
            )}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 p-3 rounded-md flex items-start gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-700 dark:text-yellow-400">{warning}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Selection Dialog */}
      {showPortfolioDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Select Portfolio
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Choose the portfolio where you want to create this LEAP position for <strong>{inputs.ticker}</strong>
            </p>

            {portfolios.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">No portfolios configured yet.</p>
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
                    className="w-full flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  >
                    {portfolio.logo && (
                      <img src={portfolio.logo} alt={portfolio.name} className="w-8 h-8 rounded" />
                    )}
                    <span className="font-medium text-gray-900 dark:text-white">{portfolio.name}</span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setShowPortfolioDialog(false)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
