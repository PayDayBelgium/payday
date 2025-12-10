import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { FridayDatePicker } from '../../components/common/FridayDatePicker';
import { TickerSelector } from '../../components/widgets/TickerSelector';
import { formatNumber } from '../../utils/numberFormat';
import type { Ticker } from '../../types';

interface KaChingInputs {
  // Stock
  ticker: string;
  underlyingPrice: number;

  // Protective Put (Long Put)
  protectivePutStrike: number;
  protectivePutPremium: number;
  protectivePutPurchaseDate: string;
  protectivePutExpiration: string;

  // Weekly Short Puts
  weeklyPutStrike: number;
  weeklyPutPremium: number;
}

interface KaChingResults {
  initialInvestment: number;
  totalWeeks: number;
  totalDays: number;
  weeklyPremiumCollected: number;
  totalPremiumCollected: number;
  netCost: number;
  netPnL: number;
  roi: number;
  annualizedROI: number;
  breakevenWeeks: number;
  weeksAfterBreakeven: number;
}

export const KaChingCalculator: React.FC = () => {
  const [inputs, setInputs] = useState<KaChingInputs>({
    ticker: '',
    underlyingPrice: 0,
    protectivePutStrike: 0,
    protectivePutPremium: 0,
    protectivePutPurchaseDate: new Date().toISOString().split('T')[0],
    protectivePutExpiration: '',
    weeklyPutStrike: 0,
    weeklyPutPremium: 0,
  });

  const [results, setResults] = useState<KaChingResults | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Auto-calculate on input change
  useEffect(() => {
    calculateResults();
  }, [inputs]);

  const handleInputChange = (field: keyof KaChingInputs, value: string | number) => {
    setInputs(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const calculateResults = () => {
    const {
      ticker, underlyingPrice, protectivePutStrike, protectivePutPremium,
      protectivePutPurchaseDate, protectivePutExpiration,
      weeklyPutStrike, weeklyPutPremium
    } = inputs;

    // Check if all required fields are filled
    if (!ticker || !underlyingPrice || !protectivePutStrike || !protectivePutPremium ||
        !protectivePutPurchaseDate || !protectivePutExpiration ||
        !weeklyPutStrike || !weeklyPutPremium) {
      setResults(null);
      return;
    }

    const newWarnings: string[] = [];
    const MULTIPLIER = 100; // Standard option contract size

    // Calculate initial investment (protective put cost)
    const initialInvestment = protectivePutPremium * MULTIPLIER;

    // Calculate total weeks between purchase and expiration
    const purchaseDate = new Date(protectivePutPurchaseDate);
    const expirationDate = new Date(protectivePutExpiration);
    const timeDiff = expirationDate.getTime() - purchaseDate.getTime();
    const totalDays = Math.max(0, timeDiff / (1000 * 3600 * 24));
    const totalWeeks = Math.floor(totalDays / 7);

    // Calculate weekly premium collected
    const weeklyPremiumCollected = weeklyPutPremium * MULTIPLIER;

    // Calculate total premium collected over all weeks
    const totalPremiumCollected = weeklyPremiumCollected * totalWeeks;

    // Calculate net cost (protective put cost - collected premiums)
    const netCost = initialInvestment - totalPremiumCollected;

    // Calculate net P&L (negative net cost means profit)
    const netPnL = totalPremiumCollected - initialInvestment;

    // Calculate ROI
    const roi = initialInvestment > 0 ? (netPnL / initialInvestment) * 100 : 0;

    // Calculate annualized ROI
    const annualizedROI = totalDays > 0 ? (roi / totalDays) * 365 : 0;

    // Calculate break-even weeks (weeks needed to recover protective put cost)
    const breakevenWeeks = weeklyPutPremium > 0
      ? Math.ceil(protectivePutPremium / weeklyPutPremium)
      : 0;

    // Calculate weeks after break-even (pure profit weeks)
    const weeksAfterBreakeven = Math.max(0, totalWeeks - breakevenWeeks);

    // Warnings
    if (weeklyPutStrike > protectivePutStrike) {
      newWarnings.push('Weekly put strike is above protective put strike. This increases assignment risk.');
    }

    if (protectivePutStrike > underlyingPrice) {
      newWarnings.push('Protective put is In-The-Money. Consider if this is intentional.');
    }

    if (totalWeeks < 6) {
      newWarnings.push('Less than 6 weeks available. Consider using a longer-dated protective put.');
    }

    if (breakevenWeeks > totalWeeks) {
      newWarnings.push(`You need ${breakevenWeeks} weeks to break even, but only have ${totalWeeks} weeks available.`);
    }

    if (weeklyPutPremium < 0.05) {
      newWarnings.push('Weekly premium is very low. Consider adjusting strike or timing.');
    }

    setWarnings(newWarnings);
    setResults({
      initialInvestment,
      totalWeeks,
      totalDays,
      weeklyPremiumCollected,
      totalPremiumCollected,
      netCost,
      netPnL,
      roi,
      annualizedROI,
      breakevenWeeks,
      weeksAfterBreakeven,
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-500/10 rounded-lg">
          <DollarSign className="w-8 h-8 text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            KaChing Strategy Calculator
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Calculate returns from selling weekly puts against a protective put
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Inputs */}
        <div className="space-y-6">
          {/* Stock Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Stock
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Current Price ($)
                </label>
                <input
                  type="number"
                  value={inputs.underlyingPrice || ''}
                  onChange={(e) => handleInputChange('underlyingPrice', parseFloat(e.target.value) || 0)}
                  placeholder="450,00"
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                />
              </div>
            </div>
          </div>

          {/* Protective Put Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Protective Put (Long Put)
              </h2>
              <div className="group relative">
                <div className="w-5 h-5 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center cursor-help">
                  <span className="text-white text-xs font-bold">i</span>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                  This is your insurance - a longer-dated put (6-12 weeks) that protects your position.
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Strike Price ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.protectivePutStrike || ''}
                    onChange={(e) => handleInputChange('protectivePutStrike', parseFloat(e.target.value) || 0)}
                    placeholder="440,00"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Premium per Share ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.protectivePutPremium || ''}
                    onChange={(e) => handleInputChange('protectivePutPremium', parseFloat(e.target.value) || 0)}
                    placeholder="5,00"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Purchase Date
                  </label>
                  <input
                    type="date"
                    value={inputs.protectivePutPurchaseDate}
                    onChange={(e) => handleInputChange('protectivePutPurchaseDate', e.target.value)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Expiration Date
                  </label>
                  <FridayDatePicker
                    value={inputs.protectivePutExpiration}
                    onChange={(date) => handleInputChange('protectivePutExpiration', date)}
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Short Puts Section */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Weekly Short Puts
              </h2>
              <div className="group relative">
                <div className="w-5 h-5 rounded-full bg-gray-400 dark:bg-gray-600 flex items-center justify-center cursor-help">
                  <span className="text-white text-xs font-bold">i</span>
                </div>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-10">
                  These are the weekly puts you sell to collect premium. Strike should be at or slightly below your protective put.
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Strike Price ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.weeklyPutStrike || ''}
                    onChange={(e) => handleInputChange('weeklyPutStrike', parseFloat(e.target.value) || 0)}
                    placeholder="438,00"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Premium per Share ($)
                  </label>
                  <input
                    type="number"
                    value={inputs.weeklyPutPremium || ''}
                    onChange={(e) => handleInputChange('weeklyPutPremium', parseFloat(e.target.value) || 0)}
                    placeholder="0,75"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Results */}
        <div className="space-y-6">
          {/* Live Results Card */}
          <div className="bg-primary-50 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {results ? (
              <div className="space-y-6">
                {/* Header Section */}
                <div>
                  <div className="flex items-baseline gap-2 mb-4">
                    <h3 className="text-3xl font-bold text-gray-900 dark:text-white">
                      {inputs.ticker || '...'}
                    </h3>
                    <span className="text-lg text-gray-600 dark:text-gray-400">
                      {formatCurrency(inputs.underlyingPrice)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Initial Investment</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(results.initialInvestment)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Weeks</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {results.totalWeeks} weeks
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Weekly Premium</p>
                      <p className="text-xl font-bold text-green-600 dark:text-green-400">
                        {formatCurrency(results.weeklyPremiumCollected)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Break-Even</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {results.breakevenWeeks} weeks
                      </p>
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <hr className="border-gray-200 dark:border-gray-700" />

                {/* P&L Section */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Protective Put Cost
                    </span>
                    <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                      -{formatCurrency(results.initialInvestment)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total Premium Collected
                    </span>
                    <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                      +{formatCurrency(results.totalPremiumCollected)}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                        Net Cost
                      </span>
                      <span className={`text-xl font-bold ${results.netCost <= 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                        {formatCurrency(Math.abs(results.netCost))}
                        {results.netCost <= 0 && ' profit'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                      {results.netCost > 0
                        ? 'Remaining cost after premium collection'
                        : 'Strategy has paid for itself and is profitable'}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                        Net Profit / Loss
                      </span>
                      <span className={`text-2xl font-bold ${results.netPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(results.netPnL)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-baseline">
                      <span className="text-base font-bold text-gray-900 dark:text-gray-100">
                        ROI
                      </span>
                      <span className={`text-2xl font-bold ${results.roi >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatPercentage(results.roi)}
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-baseline">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-base font-bold text-gray-900 dark:text-gray-100">
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

                  {/* Bonus: Profit Weeks Info */}
                  {results.weeksAfterBreakeven > 0 && (
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                        <Calendar className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                            {results.weeksAfterBreakeven} weeks of pure profit!
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-400">
                            After break-even at week {results.breakevenWeeks}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-purple-300 dark:text-purple-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  Fill in all fields to see results
                </p>
              </div>
            )}
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="space-y-3">
              {warnings.map((warning, index) => (
                <div
                  key={index}
                  className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 p-4 rounded-md flex items-start gap-3"
                >
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-yellow-800 dark:text-yellow-300">Warning</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-400">{warning}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
