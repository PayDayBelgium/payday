import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DailyPortfolioData, CurrencyType } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency, formatNumber, formatCompactNumber } from '../../utils/numberFormat';
import { TrendingUp, BarChart3, Table, Copy, Check } from 'lucide-react';

interface PortfolioValueChartProps {
  data: DailyPortfolioData[];
  currency: CurrencyType;
  portfolioName?: string;
  className?: string;
  title?: string;
  subtitle?: string;
  footer?: string;
}

type ViewMode = 'chart' | 'table';

export const PortfolioValueChart: React.FC<PortfolioValueChartProps> = ({
  data,
  currency,
  className = '',
  title,
  subtitle,
  footer,
}) => {
  const currencySymbol = getCurrencySymbol(currency);
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [copied, setCopied] = useState(false);

  // Sort data by date and prepare for chart
  const chartData = useMemo(() => {
    return [...data]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((d) => ({
        date: new Date(d.date).toLocaleDateString('nl-NL', {
          day: '2-digit',
          month: 'short',
        }),
        fullDate: d.date,
        totalValue: d.totalValue,
        cash: d.cash,
        dailyPnL: d.dailyPnL,
      }));
  }, [data]);

  // Copy table data to clipboard for Excel
  const handleCopyToClipboard = async () => {
    if (chartData.length === 0) return;

    // Create tab-separated values (TSV) for Excel compatibility
    const headers = ['Datum', 'Portfolio waarde', 'Cash', 'Dagelijkse P&L'];
    const rows = chartData.map((row) => [
      row.fullDate,
      formatNumber(row.totalValue, 2),
      formatNumber(row.cash, 2),
      formatNumber(row.dailyPnL, 2),
    ]);

    const tsv = [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');

    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  if (chartData.length === 0) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col ${className}`}
      >
        {/* Empty State */}
        <div className="p-12 text-center flex-1 flex flex-col items-center justify-center">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Nog geen historische data
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
            Voeg een transactie toe (deposit, withdrawal, of aanpassing) om automatisch je portfolio
            waarde te tracken over tijd
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col ${className}`}
    >
      {/* Header */}
      <div
        className={`px-6 ${title ? 'py-4' : 'py-3'} border-b border-gray-200 dark:border-gray-700 flex-shrink-0`}
      >
        <div className="flex items-center justify-between">
          {title && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
              {subtitle && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>
              )}
            </div>
          )}
          <div className={`flex items-center gap-2 ${!title ? 'ml-auto' : ''}`}>
            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setViewMode('chart')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'chart'
                    ? 'bg-white dark:bg-gray-600 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="Grafiek weergave"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-gray-600 text-primary-700 dark:text-primary-300 shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
                title="Tabel weergave"
              >
                <Table className="w-4 h-4" />
              </button>
            </div>
            {/* Copy to Clipboard */}
            <button
              onClick={handleCopyToClipboard}
              className={`p-2 rounded-lg transition-colors ${
                copied
                  ? 'bg-positive-50 dark:bg-positive-700/25 text-positive-600 dark:text-positive-500'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
              title={copied ? 'Gekopieerd!' : 'Kopieer naar clipboard (Excel)'}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Chart View */}
      {viewMode === 'chart' && (
        <div className="p-6 flex-1 min-h-0" style={{ minHeight: '250px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-gray-200 dark:stroke-gray-700"
              />
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
                  boxShadow:
                    '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                }}
                formatter={(value: number) => [formatCurrency(value, currencySymbol), 'Waarde']}
                labelStyle={{ color: '#000000', fontWeight: '600' }}
                itemStyle={{ color: '#000000' }}
              />
              <Line
                type="monotone"
                dataKey="totalValue"
                name="Portfolio waarde"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto flex-1">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  datum
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Portfolio Waarde
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cash
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Dagelijkse P&L
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {chartData.map((row) => (
                <tr key={row.fullDate} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {new Date(row.fullDate).toLocaleDateString('nl-NL', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-white">
                    {formatCurrency(row.totalValue, currencySymbol)}
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-sm text-right text-gray-600 dark:text-gray-400">
                    {formatCurrency(row.cash, currencySymbol)}
                  </td>
                  <td
                    className={`px-6 py-3 whitespace-nowrap text-sm text-right font-medium ${
                      row.dailyPnL >= 0
                        ? 'text-positive-600 dark:text-positive-500'
                        : 'text-negative-600 dark:text-negative-500'
                    }`}
                  >
                    {row.dailyPnL >= 0 ? '+' : ''}
                    {formatCurrency(row.dailyPnL, currencySymbol)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div
        className="px-6 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0"
        style={{ minHeight: '52px' }}
      >
        {footer && <p className="text-sm text-gray-600 dark:text-gray-400">{footer}</p>}
      </div>
    </div>
  );
};
