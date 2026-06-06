import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Plus,
  Trash2,
  RotateCcw,
  Target,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { TickerSelector } from '../../components/widgets/TickerSelector';
import type { Ticker } from '../../types';

// Types
type OptionType = 'call' | 'put';
type OptionAction = 'buy' | 'sell';

interface OptionLeg {
  id: string;
  type: OptionType;
  action: OptionAction;
  strike: number;
  premium: number;
  contracts: number;
  expiration?: string; // Optional expiration date for diagonal spreads
}

interface ChartDataPoint {
  price: number;
  pnl: number;
  pnlPositive: number | null; // P&L when >= 0
  pnlNegative: number | null; // P&L when < 0
  [key: string]: number | null; // For individual leg P&L lines
}

// Constants
const MULTIPLIER = 100;

// Utility functions
const generateId = () => `leg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const calculateOptionPnL = (leg: OptionLeg, stockPrice: number): number => {
  const { type, action, strike, premium, contracts } = leg;
  const multiplier = MULTIPLIER * contracts;

  let intrinsicValue = 0;
  if (type === 'call') {
    intrinsicValue = Math.max(0, stockPrice - strike);
  } else {
    intrinsicValue = Math.max(0, strike - stockPrice);
  }

  if (action === 'buy') {
    // Long position: pay premium, receive intrinsic value at expiration
    return (intrinsicValue - premium) * multiplier;
  } else {
    // Short position: receive premium, pay intrinsic value at expiration
    return (premium - intrinsicValue) * multiplier;
  }
};

const calculateTotalPnL = (legs: OptionLeg[], stockPrice: number): number => {
  return legs.reduce((total, leg) => total + calculateOptionPnL(leg, stockPrice), 0);
};

// Color palette for legs
const LEG_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export const PnLSimulator: React.FC = () => {
  const { setPageTitle } = usePageTitle();

  // State
  const [selectedTicker, setSelectedTicker] = useState<Ticker | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number>(100);
  const [legs, setLegs] = useState<OptionLeg[]>([]);
  const [showIndividualLegs, setShowIndividualLegs] = useState(false);

  // Price range for chart (percentage around current price)
  const [priceRangePercent, setPriceRangePercent] = useState(30);

  // New leg form state
  const [newLeg, setNewLeg] = useState<Omit<OptionLeg, 'id'>>({
    type: 'call',
    action: 'sell',
    strike: 0,
    premium: 0,
    contracts: 1,
    expiration: '',
  });

  // Set page title
  useEffect(() => {
    setPageTitle('P&L Strategy Simulator');
  }, [setPageTitle]);

  // Update strike when ticker/price changes
  useEffect(() => {
    if (currentPrice > 0 && newLeg.strike === 0) {
      setNewLeg((prev) => ({ ...prev, strike: Math.round(currentPrice) }));
    }
  }, [currentPrice]);

  // Handle ticker selection
  const handleTickerSelect = useCallback((ticker: Ticker) => {
    setSelectedTicker(ticker);
    if (ticker.currentPrice) {
      setCurrentPrice(ticker.currentPrice);
    }
  }, []);

  // Add new leg
  const addLeg = useCallback(() => {
    if (newLeg.strike <= 0 || newLeg.premium <= 0) return;

    const leg: OptionLeg = {
      ...newLeg,
      id: generateId(),
    };

    setLegs((prev) => [...prev, leg]);

    // Reset form with smart defaults
    setNewLeg((prev) => ({
      ...prev,
      strike: Math.round(currentPrice),
      premium: 0,
    }));
  }, [newLeg, currentPrice]);

  // Remove leg
  const removeLeg = useCallback((id: string) => {
    setLegs((prev) => prev.filter((leg) => leg.id !== id));
  }, []);

  // Clear all legs
  const clearAllLegs = useCallback(() => {
    setLegs([]);
  }, []);

  // Generate chart data
  const chartData = useMemo((): ChartDataPoint[] => {
    if (currentPrice <= 0) return [];

    const minPrice = currentPrice * (1 - priceRangePercent / 100);
    const maxPrice = currentPrice * (1 + priceRangePercent / 100);
    const step = (maxPrice - minPrice) / 200; // More points for smoother curve

    // Collect all strike prices to ensure we have data points exactly at strikes
    const strikePoints = new Set<number>();
    legs.forEach((leg) => strikePoints.add(leg.strike));

    // Build data with exact prices (no rounding during generation)
    const pricePoints: number[] = [];

    for (let price = minPrice; price <= maxPrice; price += step) {
      pricePoints.push(price);
    }

    // Add exact strike price points
    strikePoints.forEach((strike) => {
      if (strike >= minPrice && strike <= maxPrice) {
        pricePoints.push(strike);
      }
    });

    // Sort and deduplicate
    pricePoints.sort((a, b) => a - b);

    // Generate data points with P&L calculated at exact prices
    const rawData = pricePoints.map((price) => ({
      price,
      pnl: calculateTotalPnL(legs, price),
    }));

    // Find zero-crossing indices (on the exact data)
    const zeroCrossingIndices = new Set<number>();
    for (let i = 1; i < rawData.length; i++) {
      const prev = rawData[i - 1];
      const curr = rawData[i];
      if ((prev.pnl < 0 && curr.pnl > 0) || (prev.pnl > 0 && curr.pnl < 0)) {
        zeroCrossingIndices.add(i - 1); // Point before crossing
        zeroCrossingIndices.add(i); // Point after crossing
      }
    }

    // Build final data with color assignments
    // Points adjacent to zero-crossing get both colors to ensure connection
    const data: ChartDataPoint[] = rawData.map((curr, i) => {
      const isAdjacentToZeroCrossing = zeroCrossingIndices.has(i);

      const point: ChartDataPoint = {
        price: curr.price, // Keep exact price for accurate positioning
        pnl: curr.pnl,
        // If adjacent to zero crossing, include in both lines to bridge the gap
        pnlPositive: curr.pnl >= 0 || isAdjacentToZeroCrossing ? curr.pnl : null,
        pnlNegative: curr.pnl <= 0 || isAdjacentToZeroCrossing ? curr.pnl : null,
      };

      if (showIndividualLegs) {
        legs.forEach((leg, index) => {
          point[`leg${index}`] = calculateOptionPnL(leg, curr.price);
        });
      }

      return point;
    });

    return data;
  }, [currentPrice, priceRangePercent, legs, showIndividualLegs]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    if (legs.length === 0 || currentPrice <= 0) {
      return {
        maxProfit: 0,
        maxLoss: 0,
        maxProfitUnlimited: false,
        maxLossUnlimited: false,
        breakEvenPoints: [] as number[],
        pnlAtCurrentPrice: 0,
        totalPremium: 0,
        totalContracts: 0,
      };
    }

    // Analyze strategy structure to determine theoretical max profit/loss
    // Check if we have uncovered positions that lead to unlimited risk/reward
    let longCallContracts = 0;
    let shortCallContracts = 0;

    legs.forEach((leg) => {
      if (leg.type === 'call' && leg.action === 'buy') {
        longCallContracts += leg.contracts;
      }
      if (leg.type === 'call' && leg.action === 'sell') {
        shortCallContracts += leg.contracts;
      }
    });

    // Unlimited profit: net long calls (more long calls than short calls)
    const maxProfitUnlimited = longCallContracts > shortCallContracts;

    // Unlimited loss: net short calls (more short calls than long calls) - naked calls
    const maxLossUnlimited = shortCallContracts > longCallContracts;

    // Calculate P&L at extreme prices to find bounded max profit/loss
    const pnlAtZero = calculateTotalPnL(legs, 0);
    const pnlAtVeryHigh = calculateTotalPnL(legs, currentPrice * 10); // 10x current price

    // For bounded strategies, find max from chart data
    let maxProfitFromChart = -Infinity;
    let maxLossFromChart = Infinity;

    chartData.forEach((point) => {
      if (point.pnl > maxProfitFromChart) maxProfitFromChart = point.pnl;
      if (point.pnl < maxLossFromChart) maxLossFromChart = point.pnl;
    });

    // Determine actual max profit
    let maxProfit: number;
    if (maxProfitUnlimited) {
      maxProfit = Infinity;
    } else {
      // Max profit is highest of: chart max, P&L at 0, P&L at high price
      maxProfit = Math.max(maxProfitFromChart, pnlAtZero, pnlAtVeryHigh);
    }

    // Determine actual max loss
    let maxLoss: number;
    if (maxLossUnlimited) {
      maxLoss = -Infinity;
    } else {
      // Max loss is lowest of: chart min, P&L at 0 (for short puts)
      // For short puts, max loss occurs when price goes to 0
      maxLoss = Math.min(maxLossFromChart, pnlAtZero);
    }

    // Find break-even points by detecting zero crossings
    const breakEvenPoints: number[] = [];
    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];

      // Check for zero crossing between these two points
      if ((prev.pnl < 0 && curr.pnl > 0) || (prev.pnl > 0 && curr.pnl < 0)) {
        // Linear interpolation to find exact break-even price
        const ratio = Math.abs(prev.pnl) / (Math.abs(prev.pnl) + Math.abs(curr.pnl));
        const breakEven = prev.price + ratio * (curr.price - prev.price);
        breakEvenPoints.push(Math.round(breakEven * 100) / 100);
      }
    }

    // Calculate P&L at current price
    const pnlAtCurrentPrice = calculateTotalPnL(legs, currentPrice);

    // Calculate total premium (net credit/debit)
    let totalPremium = 0;
    legs.forEach((leg) => {
      const legPremium = leg.premium * leg.contracts * MULTIPLIER;
      if (leg.action === 'buy') {
        totalPremium -= legPremium; // Debit
      } else {
        totalPremium += legPremium; // Credit
      }
    });

    // Total contracts
    const totalContracts = legs.reduce((sum, leg) => sum + leg.contracts, 0);

    return {
      maxProfit: maxProfit === -Infinity ? 0 : maxProfit,
      maxLoss: maxLoss === Infinity ? 0 : maxLoss,
      maxProfitUnlimited,
      maxLossUnlimited,
      breakEvenPoints,
      pnlAtCurrentPrice,
      totalPremium,
      totalContracts,
    };
  }, [chartData, legs, currentPrice]);

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Calculate P&L directly from price to ensure accuracy
    const price = parseFloat(label);
    const pnl = calculateTotalPnL(legs, price);

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="font-medium text-gray-900 dark:text-white">
          Prijs: ${formatNumber(label, 2)}
        </p>
        <p
          className={`font-bold ${pnl >= 0 ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'}`}
        >
          P&L: {pnl >= 0 ? '+' : ''}
          {formatCurrency(pnl, '$')}
        </p>
        {showIndividualLegs &&
          legs.map((leg, i) => {
            const legPnl = calculateOptionPnL(leg, price);
            return (
              <p key={i} className="text-xs" style={{ color: LEG_COLORS[i % LEG_COLORS.length] }}>
                {leg.type.toUpperCase()} {leg.strike}: {legPnl >= 0 ? '+' : ''}
                {formatCurrency(legPnl, '$')}
              </p>
            );
          })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header removed - using page title only */}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration */}
        <div className="space-y-6">
          {/* Ticker & Price */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Underlying
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ticker
                </label>
                <TickerSelector
                  value={selectedTicker?.symbol || ''}
                  onChange={handleTickerSelect}
                  placeholder="Zoek ticker..."
                />
              </div>
              {/* Price and Range on same row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Prijs ($)
                  </label>
                  <input
                    type="number"
                    value={currentPrice || ''}
                    onChange={(e) => setCurrentPrice(parseFloat(e.target.value) || 0)}
                    placeholder="100.00"
                    step="0.01"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Bereik: ±{priceRangePercent}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={priceRangePercent}
                    onChange={(e) => setPriceRangePercent(parseInt(e.target.value))}
                    className="w-full h-2 mt-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Add Option Leg */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
              Voeg Optie Toe
            </h2>
            <div className="space-y-4">
              {/* Type Selection */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setNewLeg((prev) => ({ ...prev, type: 'call' }))}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    newLeg.type === 'call'
                      ? 'bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500 border-2 border-positive-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-transparent'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  Call
                </button>
                <button
                  onClick={() => setNewLeg((prev) => ({ ...prev, type: 'put' }))}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    newLeg.type === 'put'
                      ? 'bg-surface-muted dark:bg-trading-dark-600 text-ink-700 dark:text-ink-300 border-2 border-ink-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-transparent'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  Put
                </button>
              </div>

              {/* Action Selection */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setNewLeg((prev) => ({ ...prev, action: 'buy' }))}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    newLeg.action === 'buy'
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-2 border-primary-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-transparent'
                  }`}
                >
                  Long (Kopen)
                </button>
                <button
                  onClick={() => setNewLeg((prev) => ({ ...prev, action: 'sell' }))}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    newLeg.action === 'sell'
                      ? 'bg-caution-50 dark:bg-caution-600/25 text-caution-600 dark:text-caution-500 border-2 border-caution-500'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-transparent'
                  }`}
                >
                  Short (Verkopen)
                </button>
              </div>

              {/* Strike, Premium, Contracts */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Strike ($)
                  </label>
                  <input
                    type="number"
                    value={newLeg.strike || ''}
                    onChange={(e) =>
                      setNewLeg((prev) => ({ ...prev, strike: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="100"
                    step="0.5"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Premium ($)
                  </label>
                  <input
                    type="number"
                    value={newLeg.premium || ''}
                    onChange={(e) =>
                      setNewLeg((prev) => ({ ...prev, premium: parseFloat(e.target.value) || 0 }))
                    }
                    placeholder="2.50"
                    step="0.01"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contracts
                  </label>
                  <input
                    type="number"
                    value={newLeg.contracts}
                    onChange={(e) =>
                      setNewLeg((prev) => ({
                        ...prev,
                        contracts: Math.max(1, parseInt(e.target.value) || 1),
                      }))
                    }
                    min="1"
                    className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 text-sm"
                  />
                </div>
              </div>

              {/* Expiration Date */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Expiratie (optioneel)
                </label>
                <input
                  type="date"
                  value={newLeg.expiration || ''}
                  onChange={(e) => setNewLeg((prev) => ({ ...prev, expiration: e.target.value }))}
                  className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 text-sm"
                />
              </div>

              <button
                onClick={addLeg}
                disabled={newLeg.strike <= 0 || newLeg.premium <= 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Voeg Toe
              </button>
            </div>
          </div>

          {/* Active Legs */}
          {legs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Actieve Posities ({legs.length})
                </h2>
                <button
                  onClick={clearAllLegs}
                  className="flex items-center gap-1 text-sm text-negative-600 hover:text-negative-700 dark:text-negative-500"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset
                </button>
              </div>
              <div className="space-y-2">
                {legs.map((leg, index) => (
                  <div
                    key={leg.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: LEG_COLORS[index % LEG_COLORS.length] }}
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {leg.contracts}x {leg.action === 'buy' ? 'Long' : 'Short'}{' '}
                          {leg.type.toUpperCase()} ${leg.strike}
                          {leg.expiration && (
                            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                              (
                              {new Date(leg.expiration).toLocaleDateString('nl-NL', {
                                day: 'numeric',
                                month: 'short',
                              })}
                              )
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Premium: ${formatNumber(leg.premium, 2)} (
                          {leg.action === 'buy' ? '-' : '+'}
                          {formatCurrency(leg.premium * leg.contracts * MULTIPLIER, '$')})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeLeg(leg.id)}
                      className="p-1 text-gray-400 hover:text-negative-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showIndividualLegs}
                    onChange={(e) => setShowIndividualLegs(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Toon individuele leg P&L
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Chart & Metrics */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metrics Cards - 5 columns including break-even */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-positive-600" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Max Winst
                </span>
              </div>
              <p
                className={`text-lg font-bold ${metrics.maxProfitUnlimited || metrics.maxProfit >= 0 ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'}`}
              >
                {metrics.maxProfitUnlimited
                  ? '∞ Onbeperkt'
                  : formatCurrency(metrics.maxProfit, '$')}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="w-3.5 h-3.5 text-negative-600" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Max Verlies
                </span>
              </div>
              <p
                className={`text-lg font-bold ${metrics.maxLossUnlimited ? 'text-negative-600 dark:text-negative-500' : metrics.maxLoss >= 0 ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'}`}
              >
                {metrics.maxLossUnlimited ? '∞ Onbeperkt' : formatCurrency(metrics.maxLoss, '$')}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Netto Premium
                </span>
              </div>
              <p
                className={`text-lg font-bold ${metrics.totalPremium >= 0 ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'}`}
              >
                {metrics.totalPremium >= 0 ? '+' : ''}
                {formatCurrency(metrics.totalPremium, '$')}
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {metrics.totalPremium >= 0 ? 'Credit' : 'Debit'}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="w-3.5 h-3.5 text-primary-600" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  P&L @ ${formatNumber(currentPrice, 0)}
                </span>
              </div>
              <p
                className={`text-lg font-bold ${metrics.pnlAtCurrentPrice >= 0 ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'}`}
              >
                {metrics.pnlAtCurrentPrice >= 0 ? '+' : ''}
                {formatCurrency(metrics.pnlAtCurrentPrice, '$')}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-3.5 h-3.5 rounded-full bg-caution-500" />
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  Break-even
                </span>
              </div>
              {metrics.breakEvenPoints.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {metrics.breakEvenPoints.map((be, index) => (
                    <span
                      key={index}
                      className="text-lg font-bold text-caution-600 dark:text-caution-500"
                    >
                      ${formatNumber(be, 0)}
                      {index < metrics.breakEvenPoints.length - 1 ? ',' : ''}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-lg font-bold text-gray-400 dark:text-gray-500">-</p>
              )}
            </div>
          </div>

          {/* P&L Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              P&L bij Expiratie
            </h2>
            {legs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-gray-500 dark:text-gray-400">
                <TrendingUp className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Geen posities</p>
                <p className="text-sm">Voeg opties toe om de P&L grafiek te zien</p>
              </div>
            ) : (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="price"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={(value) => `$${Math.round(value)}`}
                      className="text-xs"
                    />
                    <YAxis
                      tickFormatter={(value) => {
                        if (Math.abs(value) >= 1000) return `$${(value / 1000).toFixed(1)}k`;
                        return `$${Math.round(value)}`;
                      }}
                      className="text-xs"
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />

                    {/* Zero line */}
                    <ReferenceLine y={0} stroke="#9CA3AF" strokeDasharray="3 3" />

                    {/* Current price line - label inside chart area */}
                    <ReferenceLine
                      x={currentPrice}
                      stroke="#6366F1"
                      strokeDasharray="5 5"
                      label={{
                        value: `$${Math.round(currentPrice)}`,
                        position: 'insideTopRight',
                        fill: '#6366F1',
                        fontSize: 10,
                        offset: 5,
                      }}
                    />

                    {/* Break-even points with labels */}
                    {metrics.breakEvenPoints.map((be, index) => (
                      <ReferenceLine
                        key={index}
                        x={be}
                        stroke="#F59E0B"
                        strokeDasharray="3 3"
                        label={{
                          value: `BE $${Math.round(be)}`,
                          position: 'insideBottomLeft',
                          fill: '#F59E0B',
                          fontSize: 10,
                          offset: 5,
                        }}
                      />
                    ))}

                    {/* Individual leg lines */}
                    {showIndividualLegs &&
                      legs.map((leg, index) => (
                        <Line
                          key={leg.id}
                          type="monotone"
                          dataKey={`leg${index}`}
                          stroke={LEG_COLORS[index % LEG_COLORS.length]}
                          strokeWidth={1}
                          strokeDasharray="3 3"
                          dot={false}
                          connectNulls={false}
                          name={`${leg.action === 'buy' ? 'Long' : 'Short'} ${leg.type.toUpperCase()} $${leg.strike}`}
                        />
                      ))}

                    {/* Positive P&L line (green) */}
                    <Line
                      type="linear"
                      dataKey="pnlPositive"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={false}
                      connectNulls={false}
                      name="Winst"
                      legendType="none"
                      activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                    />

                    {/* Negative P&L line (red) */}
                    <Line
                      type="linear"
                      dataKey="pnlNegative"
                      stroke="#EF4444"
                      strokeWidth={3}
                      dot={false}
                      connectNulls={false}
                      name="Verlies"
                      legendType="none"
                      activeDot={{ r: 6, strokeWidth: 2, fill: '#fff' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Strategy Presets */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Populaire Strategieën
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => {
                  clearAllLegs();
                  // Covered Call: Short Call above current price
                  setLegs([
                    {
                      id: generateId(),
                      type: 'call',
                      action: 'sell',
                      strike: Math.round(currentPrice * 1.05),
                      premium: 2,
                      contracts: 1,
                    },
                  ]);
                }}
                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <p className="font-medium text-gray-900 dark:text-white">Covered Call</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Short Call @ 105%</p>
              </button>
              <button
                onClick={() => {
                  clearAllLegs();
                  // Bull Call Spread
                  setLegs([
                    {
                      id: generateId(),
                      type: 'call',
                      action: 'buy',
                      strike: Math.round(currentPrice * 0.95),
                      premium: 5,
                      contracts: 1,
                    },
                    {
                      id: generateId(),
                      type: 'call',
                      action: 'sell',
                      strike: Math.round(currentPrice * 1.05),
                      premium: 2,
                      contracts: 1,
                    },
                  ]);
                }}
                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <p className="font-medium text-gray-900 dark:text-white">Bull Call Spread</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">95/105 Call Spread</p>
              </button>
              <button
                onClick={() => {
                  clearAllLegs();
                  // Iron Condor
                  const strike = Math.round(currentPrice);
                  setLegs([
                    {
                      id: generateId(),
                      type: 'put',
                      action: 'buy',
                      strike: strike - 10,
                      premium: 1,
                      contracts: 1,
                    },
                    {
                      id: generateId(),
                      type: 'put',
                      action: 'sell',
                      strike: strike - 5,
                      premium: 2,
                      contracts: 1,
                    },
                    {
                      id: generateId(),
                      type: 'call',
                      action: 'sell',
                      strike: strike + 5,
                      premium: 2,
                      contracts: 1,
                    },
                    {
                      id: generateId(),
                      type: 'call',
                      action: 'buy',
                      strike: strike + 10,
                      premium: 1,
                      contracts: 1,
                    },
                  ]);
                }}
                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <p className="font-medium text-gray-900 dark:text-white">Iron Condor</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">±5/±10 Spread</p>
              </button>
              <button
                onClick={() => {
                  clearAllLegs();
                  // Straddle
                  const strike = Math.round(currentPrice);
                  setLegs([
                    {
                      id: generateId(),
                      type: 'call',
                      action: 'buy',
                      strike,
                      premium: 3,
                      contracts: 1,
                    },
                    {
                      id: generateId(),
                      type: 'put',
                      action: 'buy',
                      strike,
                      premium: 3,
                      contracts: 1,
                    },
                  ]);
                }}
                className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
              >
                <p className="font-medium text-gray-900 dark:text-white">Long Straddle</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">ATM Call + Put</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
