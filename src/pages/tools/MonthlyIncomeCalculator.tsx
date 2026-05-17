import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, Trash2, TrendingUp, Info } from 'lucide-react';
import { TickerSelector } from '../../components/widgets/TickerSelector';
import { usePageTitle } from '../../contexts/PageTitleContext';
import type { PortfolioName, Ticker } from '../../types';

interface Position {
  id: string;
  ticker: string;
  portfolio: PortfolioName;
  type: 'leap' | 'stock';
  quantity: number; // Number of contracts or shares/100
  strike?: number; // Only for LEAPs
  expiration?: string; // Only for LEAPs
  // Option premiums at different deltas
  delta10Premium: number;
  delta15Premium: number;
  delta20Premium: number;
}

interface PortfolioSettings {
  portfolio: PortfolioName;
  pricePerContract: number;
}

const DEFAULT_PORTFOLIO_SETTINGS: PortfolioSettings[] = [
  { portfolio: 'Lynx', pricePerContract: 1.0 },
  { portfolio: 'FreeStoxx', pricePerContract: 0.5 },
  { portfolio: 'DeGiro', pricePerContract: 0.75 },
  { portfolio: 'SAXO', pricePerContract: 1.25 },
];

export const MonthlyIncomeCalculator: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  const [positions, setPositions] = useState<Position[]>([]);
  const [portfolioSettings, setPortfolioSettings] = useState<PortfolioSettings[]>(DEFAULT_PORTFOLIO_SETTINGS);
  const [selectedDelta, setSelectedDelta] = useState<10 | 15 | 20>(15);

  useEffect(() => {
    setPageTitle('Monthly Income Calculator', 'Calculate potential monthly income from covered calls');
  }, [setPageTitle]);

  // Add new position
  const addPosition = () => {
    const newPosition: Position = {
      id: Date.now().toString(),
      ticker: '',
      portfolio: 'Lynx',
      type: 'leap',
      quantity: 1,
      strike: 0,
      expiration: '',
      delta10Premium: 0,
      delta15Premium: 0,
      delta20Premium: 0,
    };
    setPositions([...positions, newPosition]);
  };

  // Update position
  const updatePosition = (id: string, field: keyof Position, value: any) => {
    setPositions(positions.map(pos =>
      pos.id === id ? { ...pos, [field]: value } : pos
    ));
  };

  // Delete position
  const deletePosition = (id: string) => {
    setPositions(positions.filter(pos => pos.id !== id));
  };

  // Update portfolio settings
  const updatePortfolioSetting = (portfolio: PortfolioName, pricePerContract: number) => {
    setPortfolioSettings(portfolioSettings.map(setting =>
      setting.portfolio === portfolio ? { ...setting, pricePerContract } : setting
    ));
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalGrossIncome = 0;
    let totalFees = 0;
    let totalNetIncome = 0;

    const portfolioTotals: Record<PortfolioName, { gross: number; fees: number; net: number }> = {
      Lynx: { gross: 0, fees: 0, net: 0 },
      FreeStoxx: { gross: 0, fees: 0, net: 0 },
      DeGiro: { gross: 0, fees: 0, net: 0 },
      SAXO: { gross: 0, fees: 0, net: 0 },
    };

    positions.forEach(pos => {
      const premium = selectedDelta === 10 ? pos.delta10Premium :
                      selectedDelta === 15 ? pos.delta15Premium :
                      pos.delta20Premium;

      const grossIncome = premium * pos.quantity * 100; // Premium * contracts * multiplier
      const portfolioSetting = portfolioSettings.find(s => s.portfolio === pos.portfolio);
      const fees = (portfolioSetting?.pricePerContract || 0) * pos.quantity;
      const netIncome = grossIncome - fees;

      totalGrossIncome += grossIncome;
      totalFees += fees;
      totalNetIncome += netIncome;

      portfolioTotals[pos.portfolio].gross += grossIncome;
      portfolioTotals[pos.portfolio].fees += fees;
      portfolioTotals[pos.portfolio].net += netIncome;
    });

    return { totalGrossIncome, totalFees, totalNetIncome, portfolioTotals };
  };

  const { totalGrossIncome, totalFees, totalNetIncome, portfolioTotals } = calculateTotals();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const portfolioColors: Record<PortfolioName, string> = {
    Lynx: 'bg-positive-50 dark:bg-positive-700/25 border-positive-500',
    FreeStoxx: 'bg-caution-50 dark:bg-caution-600/25 border-caution-500',
    DeGiro: 'bg-primary-50 dark:bg-primary-900/30 border-primary-500',
    SAXO: 'bg-negative-50 dark:bg-negative-700/25 border-negative-500',
  };

  return (
    <div className="space-y-6">
      {/* Toolbar — page title is provided by the global header */}
      <div className="flex items-center justify-end gap-2">
        <label className="text-sm font-medium text-ink-700 dark:text-ink-300">
          Target Delta:
        </label>
        <select
          value={selectedDelta}
          onChange={(e) => setSelectedDelta(Number(e.target.value) as 10 | 15 | 20)}
          className="rounded-md border-ink-200 dark:border-trading-dark-600 dark:bg-trading-dark-700 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 p-2"
        >
          <option value={10}>10% (Conservative)</option>
          <option value={15}>15% (Balanced)</option>
          <option value={20}>20% (Aggressive)</option>
        </select>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Content - Positions */}
        <div className="xl:col-span-2 space-y-6">
          {/* Positions Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Your Positions
                </h2>
                <button
                  onClick={addPosition}
                  className="flex items-center gap-2 px-4 py-2 bg-positive-600 hover:bg-positive-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Position
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ticker</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Portfolio</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Qty</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Strike</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Exp</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">10Δ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">15Δ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">20Δ</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Income</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {positions.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                        No positions added yet. Click "Add Position" to get started.
                      </td>
                    </tr>
                  ) : (
                    positions.map((pos) => {
                      const premium = selectedDelta === 10 ? pos.delta10Premium :
                                    selectedDelta === 15 ? pos.delta15Premium :
                                    pos.delta20Premium;
                      const grossIncome = premium * pos.quantity * 100;
                      const fees = (portfolioSettings.find(s => s.portfolio === pos.portfolio)?.pricePerContract || 0) * pos.quantity;
                      const netIncome = grossIncome - fees;

                      return (
                        <tr key={pos.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3">
                            <div className="w-32">
                              <TickerSelector
                                value={pos.ticker}
                                onChange={(ticker: Ticker) => updatePosition(pos.id, 'ticker', ticker.symbol)}
                                placeholder="Ticker..."
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={pos.portfolio}
                              onChange={(e) => updatePosition(pos.id, 'portfolio', e.target.value)}
                              className="w-24 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-1"
                            >
                              <option value="Lynx">Lynx</option>
                              <option value="FreeStoxx">FreeStoxx</option>
                              <option value="DeGiro">DeGiro</option>
                              <option value="SAXO">SAXO</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              value={pos.type}
                              onChange={(e) => updatePosition(pos.id, 'type', e.target.value)}
                              className="w-20 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-1"
                            >
                              <option value="leap">LEAP</option>
                              <option value="stock">Stock</option>
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={pos.quantity}
                              onChange={(e) => updatePosition(pos.id, 'quantity', Number(e.target.value))}
                              className="w-16 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-1"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              value={pos.strike || ''}
                              onChange={(e) => updatePosition(pos.id, 'strike', Number(e.target.value))}
                              placeholder={pos.type === 'leap' ? '100' : 'N/A'}
                              disabled={pos.type === 'stock'}
                              className="w-20 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-1 disabled:opacity-50"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="date"
                              value={pos.expiration || ''}
                              onChange={(e) => updatePosition(pos.id, 'expiration', e.target.value)}
                              disabled={pos.type === 'stock'}
                              className="w-32 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-1 disabled:opacity-50"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              value={pos.delta10Premium || ''}
                              onChange={(e) => updatePosition(pos.id, 'delta10Premium', Number(e.target.value))}
                              placeholder="1,20"
                              className="w-20 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-1"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              value={pos.delta15Premium || ''}
                              onChange={(e) => updatePosition(pos.id, 'delta15Premium', Number(e.target.value))}
                              placeholder="1,44"
                              className="w-20 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-1"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              step="0.01"
                              value={pos.delta20Premium || ''}
                              onChange={(e) => updatePosition(pos.id, 'delta20Premium', Number(e.target.value))}
                              placeholder="1,80"
                              className="w-20 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm p-1"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm font-semibold text-positive-600 dark:text-positive-500">
                              {formatCurrency(netIncome)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => deletePosition(pos.id)}
                              className="text-negative-600 hover:text-negative-700 dark:text-negative-500 dark:hover:text-negative-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Portfolio Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Portfolio Settings
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {portfolioSettings.map((setting) => (
                <div key={setting.portfolio} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {setting.portfolio}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">$/contract:</span>
                    <input
                      type="number"
                      step="0.01"
                      value={setting.pricePerContract}
                      onChange={(e) => updatePortfolioSetting(setting.portfolio, Number(e.target.value))}
                      className="w-20 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white text-sm p-1"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar - Results */}
        <div className="space-y-6">
          {/* Total Summary */}
          <div className="bg-gradient-to-br from-positive-50 to-positive-50 dark:from-positive-700/15 dark:to-emerald-900/20 rounded-lg shadow-sm border border-positive-500/20 dark:border-positive-700/30 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-positive-600 dark:text-positive-500" />
              <h3 className="text-lg font-semibold text-positive-700 dark:text-green-100">
                Monthly Summary
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-positive-700 dark:text-positive-500 mb-1">Gross Income</p>
                <p className="text-2xl font-bold text-positive-700 dark:text-green-100">
                  {formatCurrency(totalGrossIncome)}
                </p>
              </div>

              <div>
                <p className="text-sm text-positive-700 dark:text-positive-500 mb-1">Total Fees</p>
                <p className="text-lg font-semibold text-negative-600 dark:text-negative-500">
                  -{formatCurrency(totalFees)}
                </p>
              </div>

              <hr className="border-positive-500/20 dark:border-positive-700" />

              <div>
                <p className="text-sm text-positive-700 dark:text-positive-500 mb-1">Net Monthly Income</p>
                <p className="text-3xl font-bold text-positive-600 dark:text-positive-500">
                  {formatCurrency(totalNetIncome)}
                </p>
              </div>

              <div>
                <p className="text-sm text-positive-700 dark:text-positive-500 mb-1">Annual Income</p>
                <p className="text-xl font-bold text-positive-700 dark:text-positive-500">
                  {formatCurrency(totalNetIncome * 12)}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-start gap-2">
              <Info className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-primary-700 dark:text-primary-300">
                Assumes you sell covered calls monthly at {selectedDelta}% delta.
                Actual results may vary based on market conditions.
              </p>
            </div>
          </div>

          {/* Portfolio Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Breakdown by Portfolio
            </h3>
            <div className="space-y-3">
              {(Object.keys(portfolioTotals) as PortfolioName[]).map((portfolio) => {
                const total = portfolioTotals[portfolio];
                if (total.net === 0) return null;

                return (
                  <div
                    key={portfolio}
                    className={`p-3 rounded-lg border-l-4 ${portfolioColors[portfolio]}`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {portfolio}
                      </span>
                      <span className="text-sm font-bold text-positive-600 dark:text-positive-500">
                        {formatCurrency(total.net)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>Gross: {formatCurrency(total.gross)}</span>
                      <span>Fees: {formatCurrency(total.fees)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
