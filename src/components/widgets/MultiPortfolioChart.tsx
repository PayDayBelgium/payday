import React, { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { DailyPortfolioData, CurrencyType } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency, formatCompactNumber } from '../../utils/numberFormat';
import { TrendingUp } from 'lucide-react';

interface MultiPortfolioChartProps {
  data: DailyPortfolioData[];
  portfolios: Array<{ name: string; currency: CurrencyType; color?: string }>;
  className?: string;
}

// Color palette for different portfolios
const PORTFOLIO_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#14b8a6', // teal
];

export const MultiPortfolioChart: React.FC<MultiPortfolioChartProps> = ({
  data,
  portfolios,
  className = '',
}) => {
  // Track visibility of each portfolio's series
  const [visiblePortfolios, setVisiblePortfolios] = useState<Set<string>>(
    new Set(portfolios.map(b => b.name))
  );

  // Toggle portfolio visibility
  const togglePortfolio = (portfolioName: string) => {
    setVisiblePortfolios(prev => {
      const newSet = new Set(prev);
      if (newSet.has(portfolioName)) {
        newSet.delete(portfolioName);
      } else {
        newSet.add(portfolioName);
      }
      return newSet;
    });
  };

  // Prepare chart data - group by date and create separate values for each portfolio
  const chartData = useMemo(() => {
    // Get all unique dates
    const dates = [...new Set(data.map(d => d.date))].sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime()
    );

    return dates.map(date => {
      const dataPoint: any = {
        date: new Date(date).toLocaleDateString('nl-NL', {
          day: '2-digit',
          month: 'short',
        }),
        fullDate: date,
      };

      // Add value for each portfolio
      portfolios.forEach(portfolio => {
        const portfolioData = data.find(d => d.date === date && d.portfolio === portfolio.name);
        dataPoint[portfolio.name] = portfolioData?.totalValue || null;
      });

      return dataPoint;
    });
  }, [data, portfolios]);

  // Get currency symbol (use first portfolio's currency or default to EUR)
  const currencySymbol = portfolios.length > 0
    ? getCurrencySymbol(portfolios[0].currency)
    : '€';

  if (chartData.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Portfolio Vergelijking
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Vergelijk de ontwikkeling van je verschillende portfolios
          </p>
        </div>

        {/* Empty State */}
        <div className="p-12 text-center">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nog geen historische data
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Voeg transacties toe aan je portfolios om ze te vergelijken
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Portfolio Vergelijking
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {chartData.length} {chartData.length === 1 ? 'datapunt' : 'datapunten'}
        </p>
      </div>

      {/* Chart */}
      <div className="p-6 flex-1 min-h-0" style={{ minHeight: '250px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
            <XAxis
              dataKey="date"
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis
              className="text-xs text-gray-600 dark:text-gray-400"
              tick={{ fill: 'currentColor' }}
              tickFormatter={(value) => formatCompactNumber(value, currencySymbol)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '2px solid #e5e7eb',
                borderRadius: '0.5rem',
                color: '#000000',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              }}
              formatter={(value: number, name: string) => [formatCurrency(value, currencySymbol), name]}
              labelStyle={{ color: '#000000', fontWeight: '600' }}
              itemStyle={{ color: '#000000' }}
            />
            {portfolios.map((portfolio, index) => {
              const color = portfolio.color || PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length];
              const isVisible = visiblePortfolios.has(portfolio.name);

              return (
                <Line
                  key={portfolio.name}
                  type="monotone"
                  dataKey={portfolio.name}
                  name={portfolio.name}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ fill: color, r: 4 }}
                  activeDot={{ r: 6 }}
                  hide={!isVisible}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Interactive Legend Controls */}
      <div className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0" style={{ minHeight: '52px' }}>
        <div className="flex flex-wrap gap-2">
          {portfolios.map((portfolio, index) => {
            const color = portfolio.color || PORTFOLIO_COLORS[index % PORTFOLIO_COLORS.length];
            const isVisible = visiblePortfolios.has(portfolio.name);

            return (
              <button
                key={portfolio.name}
                onClick={() => togglePortfolio(portfolio.name)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  isVisible
                    ? 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50'
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: isVisible ? color : '#9ca3af' }}
                />
                <span className={`text-sm font-medium ${
                  isVisible
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {portfolio.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
