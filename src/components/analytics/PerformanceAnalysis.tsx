import React, { useMemo, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Percent,
  Trophy,
  AlertTriangle,
  Calendar,
  Activity,
  Target,
  Coins,
  Receipt,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
} from 'recharts';
import { useAppSelector } from '../../hooks/useAppSelector';
import type { Trade } from '../../types';

type PeriodPreset = 'week' | 'month' | 'quarter' | 'year' | 'ytd' | 'all' | 'custom';
type DisplayMode = 'nominal' | 'percent';

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'week', label: '7 dagen' },
  { id: 'month', label: '30 dagen' },
  { id: 'quarter', label: '3 maanden' },
  { id: 'year', label: '12 maanden' },
  { id: 'ytd', label: 'YTD' },
  { id: 'all', label: 'Alles' },
  { id: 'custom', label: 'Custom' },
];

const toIso = (d: Date) => d.toISOString().split('T')[0];

const startOfPreset = (preset: Exclude<PeriodPreset, 'custom'>): Date => {
  const now = new Date();
  switch (preset) {
    case 'week':
      return new Date(now.getTime() - 7 * 86400_000);
    case 'month':
      return new Date(now.getTime() - 30 * 86400_000);
    case 'quarter':
      return new Date(now.getTime() - 90 * 86400_000);
    case 'year':
      return new Date(now.getTime() - 365 * 86400_000);
    case 'ytd':
      return new Date(now.getFullYear(), 0, 1);
    case 'all':
      return new Date(2000, 0, 1);
  }
};

const formatCurrency = (v: number) => {
  const sign = v < 0 ? '-' : '';
  return `${sign}€${Math.abs(v).toLocaleString('nl-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatPercent = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;

const formatCompact = (v: number) => {
  const sign = v < 0 ? '-' : '';
  const abs = Math.abs(v);
  if (abs >= 1_000_000) return `${sign}€${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}€${(abs / 1_000).toFixed(1)}k`;
  return `${sign}€${abs.toFixed(0)}`;
};

interface KPI {
  label: string;
  value: string;
  hint?: string;
  tone?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
}

export const PerformanceAnalysis: React.FC = () => {
  const trades = useAppSelector((state) => state.trades.trades) as Trade[];
  const [preset, setPreset] = useState<PeriodPreset>('month');
  const [customFrom, setCustomFrom] = useState<string>(
    toIso(new Date(Date.now() - 30 * 86400_000))
  );
  const [customTo, setCustomTo] = useState<string>(toIso(new Date()));
  const [display, setDisplay] = useState<DisplayMode>('nominal');

  const { fromDate, toDate, label } = useMemo(() => {
    if (preset === 'custom') {
      return {
        fromDate: new Date(customFrom),
        toDate: new Date(customTo + 'T23:59:59'),
        label: `${customFrom} → ${customTo}`,
      };
    }
    return {
      fromDate: startOfPreset(preset),
      toDate: new Date(),
      label: PRESETS.find((p) => p.id === preset)!.label,
    };
  }, [preset, customFrom, customTo]);

  // Trades closed in the period
  const periodTrades = useMemo(() => {
    return trades.filter((t) => {
      const closed = new Date(t.closeDate);
      return closed >= fromDate && closed <= toDate;
    });
  }, [trades, fromDate, toDate]);

  // Trades closed in the previous, same-length period — for delta comparison
  const previousTrades = useMemo(() => {
    const length = toDate.getTime() - fromDate.getTime();
    const prevTo = new Date(fromDate.getTime() - 1);
    const prevFrom = new Date(fromDate.getTime() - length);
    return trades.filter((t) => {
      const closed = new Date(t.closeDate);
      return closed >= prevFrom && closed <= prevTo;
    });
  }, [trades, fromDate, toDate]);

  // Aggregations
  const stats = useMemo(() => {
    const totalPnL = periodTrades.reduce((s, t) => s + t.realizedPnL, 0);
    const totalCost = periodTrades.reduce((s, t) => s + Math.abs(t.entryPrice * t.quantity), 0);
    const wins = periodTrades.filter((t) => t.realizedPnL > 0);
    const losses = periodTrades.filter((t) => t.realizedPnL < 0);
    const breakevens = periodTrades.filter((t) => t.realizedPnL === 0);

    const grossProfit = wins.reduce((s, t) => s + t.realizedPnL, 0);
    const grossLoss = losses.reduce((s, t) => s + t.realizedPnL, 0);
    const totalFees = periodTrades.reduce((s, t) => s + (t.commission || 0) + (t.fees || 0), 0);

    const winRate = periodTrades.length > 0 ? (wins.length / periodTrades.length) * 100 : 0;
    const avgPnL = periodTrades.length > 0 ? totalPnL / periodTrades.length : 0;
    const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
    const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;
    const profitFactor =
      grossLoss !== 0 ? Math.abs(grossProfit / grossLoss) : grossProfit > 0 ? Infinity : 0;

    const best = periodTrades.reduce<Trade | null>(
      (b, t) => (!b || t.realizedPnL > b.realizedPnL ? t : b),
      null
    );
    const worst = periodTrades.reduce<Trade | null>(
      (w, t) => (!w || t.realizedPnL < w.realizedPnL ? t : w),
      null
    );

    const totalContracts = periodTrades.reduce((s, t) => s + Math.abs(t.quantity), 0);

    const pnlPercent = totalCost > 0 ? (totalPnL / totalCost) * 100 : 0;
    const previousPnL = previousTrades.reduce((s, t) => s + t.realizedPnL, 0);
    const deltaPnL = totalPnL - previousPnL;

    return {
      totalPnL,
      totalCost,
      totalFees,
      pnlPercent,
      deltaPnL,
      wins: wins.length,
      losses: losses.length,
      breakevens: breakevens.length,
      grossProfit,
      grossLoss,
      winRate,
      avgPnL,
      avgWin,
      avgLoss,
      profitFactor,
      best,
      worst,
      totalContracts,
    };
  }, [periodTrades, previousTrades]);

  // Cumulative P&L data points for the chart — sorted by closeDate
  const chartData = useMemo(() => {
    const sorted = [...periodTrades].sort(
      (a, b) => new Date(a.closeDate).getTime() - new Date(b.closeDate).getTime()
    );
    let running = 0;
    return sorted.map((t) => {
      running += t.realizedPnL;
      return {
        date: t.closeDate.slice(0, 10),
        value:
          display === 'nominal'
            ? running
            : stats.totalCost > 0
              ? (running / stats.totalCost) * 100
              : 0,
        pnl: t.realizedPnL,
      };
    });
  }, [periodTrades, display, stats.totalCost]);

  // P&L by strategy
  const strategyData = useMemo(() => {
    const map = new Map<string, { strategy: string; pnl: number; trades: number }>();
    periodTrades.forEach((t) => {
      const k = t.strategy || 'Unknown';
      const e = map.get(k) || { strategy: k, pnl: 0, trades: 0 };
      e.pnl += t.realizedPnL;
      e.trades += 1;
      map.set(k, e);
    });
    return Array.from(map.values()).sort((a, b) => b.pnl - a.pnl);
  }, [periodTrades]);

  const fmt = (v: number) =>
    display === 'nominal'
      ? formatCurrency(v)
      : formatPercent(stats.totalCost > 0 ? (v / stats.totalCost) * 100 : 0);

  const kpis: KPI[] = [
    {
      label: 'Netto P&L',
      value:
        display === 'nominal' ? formatCurrency(stats.totalPnL) : formatPercent(stats.pnlPercent),
      hint:
        stats.deltaPnL >= 0
          ? `+${formatCompact(stats.deltaPnL)} vs vorige periode`
          : `${formatCompact(stats.deltaPnL)} vs vorige periode`,
      tone: stats.totalPnL >= 0 ? 'positive' : 'negative',
      icon:
        stats.totalPnL >= 0 ? (
          <TrendingUp className="w-4 h-4" />
        ) : (
          <TrendingDown className="w-4 h-4" />
        ),
    },
    {
      label: 'Win rate',
      value: `${stats.winRate.toFixed(1)}%`,
      hint: `${stats.wins} wins · ${stats.losses} losses${stats.breakevens ? ` · ${stats.breakevens} break-even` : ''}`,
      tone: stats.winRate >= 50 ? 'positive' : stats.winRate >= 35 ? 'neutral' : 'negative',
      icon: <Target className="w-4 h-4" />,
    },
    {
      label: 'Profit factor',
      value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2),
      hint:
        stats.profitFactor >= 2
          ? 'Sterk'
          : stats.profitFactor >= 1
            ? 'Boven break-even'
            : 'Onder break-even',
      tone:
        stats.profitFactor >= 1.5 ? 'positive' : stats.profitFactor >= 1 ? 'neutral' : 'negative',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      label: 'Contracten',
      value: stats.totalContracts.toLocaleString('nl-BE'),
      hint: `${periodTrades.length} afgesloten trades`,
      tone: 'neutral',
      icon: <Coins className="w-4 h-4" />,
    },
    {
      label: 'Bruto winst',
      value:
        display === 'nominal'
          ? formatCurrency(stats.grossProfit)
          : formatPercent(stats.totalCost > 0 ? (stats.grossProfit / stats.totalCost) * 100 : 0),
      hint: stats.wins > 0 ? `Gem. ${formatCompact(stats.avgWin)} per win` : 'Geen winnende trades',
      tone: 'positive',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      label: 'Bruto verlies',
      value:
        display === 'nominal'
          ? formatCurrency(stats.grossLoss)
          : formatPercent(stats.totalCost > 0 ? (stats.grossLoss / stats.totalCost) * 100 : 0),
      hint:
        stats.losses > 0
          ? `Gem. ${formatCompact(stats.avgLoss)} per loss`
          : 'Geen verliezende trades',
      tone: 'negative',
      icon: <TrendingDown className="w-4 h-4" />,
    },
    {
      label: 'Gem. P&L / trade',
      value:
        display === 'nominal'
          ? formatCurrency(stats.avgPnL)
          : formatPercent(
              periodTrades.length > 0 && stats.totalCost > 0
                ? (stats.avgPnL / (stats.totalCost / periodTrades.length)) * 100
                : 0
            ),
      hint: `Over ${periodTrades.length} trade(s)`,
      tone: stats.avgPnL >= 0 ? 'positive' : 'negative',
      icon: <Percent className="w-4 h-4" />,
    },
    {
      label: 'Fees & commissies',
      value: formatCurrency(stats.totalFees),
      hint:
        stats.totalPnL !== 0
          ? `${((stats.totalFees / Math.abs(stats.totalPnL)) * 100).toFixed(1)}% van P&L`
          : '—',
      tone: 'neutral',
      icon: <Receipt className="w-4 h-4" />,
    },
  ];

  const hasData = periodTrades.length > 0;

  return (
    <div className="space-y-6">
      {/* Toolbar — period + display toggle */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-md border border-[var(--line)] bg-white dark:bg-trading-dark-800">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                preset === p.id
                  ? 'bg-primary-700 text-white'
                  : 'text-ink-700 dark:text-ink-300 hover:bg-surface-subtle dark:hover:bg-trading-dark-700'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-ink-400" />
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2 py-1.5 text-xs rounded-md border border-[var(--line)] bg-white dark:bg-trading-dark-800 text-ink-700 dark:text-ink-200"
              />
              <span className="text-ink-400 text-xs">→</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2 py-1.5 text-xs rounded-md border border-[var(--line)] bg-white dark:bg-trading-dark-800 text-ink-700 dark:text-ink-200"
              />
            </div>
          )}
          <div className="flex items-center gap-1 p-1 rounded-md border border-[var(--line)] bg-white dark:bg-trading-dark-800">
            <button
              onClick={() => setDisplay('nominal')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                display === 'nominal'
                  ? 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900'
                  : 'text-ink-700 dark:text-ink-300'
              }`}
            >
              € Nominaal
            </button>
            <button
              onClick={() => setDisplay('percent')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                display === 'percent'
                  ? 'bg-ink-900 text-white dark:bg-ink-100 dark:text-ink-900'
                  : 'text-ink-700 dark:text-ink-300'
              }`}
            >
              % Procent
            </button>
          </div>
        </div>
      </div>

      {/* Period indicator */}
      <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
        <Calendar className="w-3.5 h-3.5" />
        <span>{label}</span>
        <span className="text-ink-300">·</span>
        <span>
          {toIso(fromDate)} → {toIso(toDate)}
        </span>
      </div>

      {!hasData ? (
        <div className="surface-card p-12 text-center">
          <Activity className="w-12 h-12 mx-auto mb-3 text-ink-300" strokeWidth={1.5} />
          <h3 className="text-base font-semibold text-ink-900 dark:text-white mb-1">
            Geen trades in deze periode
          </h3>
          <p className="text-sm text-ink-500 dark:text-ink-400 max-w-md mx-auto">
            Sluit een positie om hier je prestaties te zien verschijnen. Probeer ook een ruimere
            periode te selecteren.
          </p>
        </div>
      ) : (
        <>
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[var(--line)] rounded-md overflow-hidden">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-white dark:bg-trading-dark-800 p-4">
                <div className="flex items-center gap-2 text-ink-500 dark:text-ink-400 mb-2">
                  <span
                    className={
                      kpi.tone === 'positive'
                        ? 'text-positive-600 dark:text-positive-500'
                        : kpi.tone === 'negative'
                          ? 'text-negative-600 dark:text-negative-500'
                          : 'text-ink-500 dark:text-ink-400'
                    }
                  >
                    {kpi.icon}
                  </span>
                  <p className="text-[11px] uppercase tracking-[0.08em] font-semibold">
                    {kpi.label}
                  </p>
                </div>
                <p
                  className={`text-xl font-semibold tabular-nums tracking-tight ${
                    kpi.tone === 'positive'
                      ? 'text-positive-700 dark:text-positive-500'
                      : kpi.tone === 'negative'
                        ? 'text-negative-700 dark:text-negative-500'
                        : 'text-ink-900 dark:text-white'
                  }`}
                >
                  {kpi.value}
                </p>
                {kpi.hint && (
                  <p className="text-[11px] text-ink-500 dark:text-ink-400 mt-1 leading-snug">
                    {kpi.hint}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
            {/* Cumulative P&L */}
            <div className="surface-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="eyebrow mb-1">Verloop</p>
                  <h3 className="text-base font-semibold text-ink-900 dark:text-white tracking-tight">
                    Cumulatieve {display === 'nominal' ? 'P&L' : 'rendement'}
                  </h3>
                </div>
                <div className="text-right">
                  <p
                    className={`text-base font-semibold tabular-nums ${
                      stats.totalPnL >= 0
                        ? 'text-positive-700 dark:text-positive-500'
                        : 'text-negative-700 dark:text-negative-500'
                    }`}
                  >
                    {display === 'nominal'
                      ? formatCurrency(stats.totalPnL)
                      : formatPercent(stats.pnlPercent)}
                  </p>
                  <p className="text-[11px] text-ink-500 dark:text-ink-400">
                    {periodTrades.length} trade(s)
                  </p>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pnl-pos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0F9D58" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#0F9D58" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="pnl-neg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D14343" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#D14343" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#E9EDF3" strokeDasharray="2 4" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#8A99B0' }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={32}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#8A99B0' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) =>
                        display === 'nominal' ? formatCompact(v) : `${v.toFixed(1)}%`
                      }
                      width={56}
                    />
                    <Tooltip
                      contentStyle={{ border: '1px solid #DCE4EE', borderRadius: 6, fontSize: 12 }}
                      formatter={(value: number) => [
                        display === 'nominal' ? formatCurrency(value) : `${value.toFixed(2)}%`,
                        'Cumulatief',
                      ]}
                    />
                    <ReferenceLine y={0} stroke="#B4BFCF" strokeDasharray="3 3" />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={stats.totalPnL >= 0 ? '#0F9D58' : '#D14343'}
                      strokeWidth={1.75}
                      fill={`url(#${stats.totalPnL >= 0 ? 'pnl-pos' : 'pnl-neg'})`}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Win/loss distribution */}
            <div className="surface-card p-5">
              <p className="eyebrow mb-1">Verdeling</p>
              <h3 className="text-base font-semibold text-ink-900 dark:text-white tracking-tight mb-4">
                Wins vs. losses
              </h3>

              {/* Stacked bar */}
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink-500 dark:text-ink-400">Winnaars</span>
                    <span className="font-semibold tabular-nums text-positive-700 dark:text-positive-500">
                      {stats.wins}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-surface-subtle overflow-hidden">
                    <div
                      className="h-full bg-positive-600 rounded-full"
                      style={{
                        width: `${periodTrades.length > 0 ? (stats.wins / periodTrades.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-ink-500 dark:text-ink-400">Verliezers</span>
                    <span className="font-semibold tabular-nums text-negative-700 dark:text-negative-500">
                      {stats.losses}
                    </span>
                  </div>
                  <div className="h-2.5 rounded-full bg-surface-subtle overflow-hidden">
                    <div
                      className="h-full bg-negative-600 rounded-full"
                      style={{
                        width: `${periodTrades.length > 0 ? (stats.losses / periodTrades.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
                {stats.breakevens > 0 && (
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-ink-500 dark:text-ink-400">Break-even</span>
                      <span className="font-semibold tabular-nums text-ink-700 dark:text-ink-300">
                        {stats.breakevens}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-surface-subtle overflow-hidden">
                      <div
                        className="h-full bg-ink-400 rounded-full"
                        style={{ width: `${(stats.breakevens / periodTrades.length) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-[var(--line)] pt-4 mt-5 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-ink-500 dark:text-ink-400">Gem. winst per win</span>
                  <span className="font-semibold tabular-nums text-positive-700 dark:text-positive-500">
                    {formatCurrency(stats.avgWin)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-500 dark:text-ink-400">Gem. verlies per loss</span>
                  <span className="font-semibold tabular-nums text-negative-700 dark:text-negative-500">
                    {formatCurrency(stats.avgLoss)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-ink-500 dark:text-ink-400">Win/loss ratio</span>
                  <span className="font-semibold tabular-nums text-ink-900 dark:text-white">
                    {stats.avgLoss !== 0 ? Math.abs(stats.avgWin / stats.avgLoss).toFixed(2) : '∞'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Best / worst trades + strategy breakdown */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Best/worst */}
            <div className="surface-card p-5">
              <p className="eyebrow mb-3">Hoogtepunten</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-[var(--line)] rounded-md overflow-hidden">
                {stats.best && (
                  <div className="bg-white dark:bg-trading-dark-800 p-4">
                    <div className="flex items-center gap-2 text-positive-600 dark:text-positive-500 mb-2">
                      <Trophy className="w-4 h-4" />
                      <p className="text-[11px] uppercase tracking-[0.08em] font-semibold">
                        Beste trade
                      </p>
                    </div>
                    <p className="text-xl font-semibold tabular-nums text-positive-700 dark:text-positive-500">
                      {formatCurrency(stats.best.realizedPnL)}
                    </p>
                    <p className="text-xs text-ink-700 dark:text-ink-300 mt-1.5 font-medium">
                      {stats.best.ticker}
                    </p>
                    <p className="text-[11px] text-ink-500 dark:text-ink-400">
                      {stats.best.strategy} · {stats.best.closeDate.slice(0, 10)}
                    </p>
                  </div>
                )}
                {stats.worst && stats.worst !== stats.best && (
                  <div className="bg-white dark:bg-trading-dark-800 p-4">
                    <div className="flex items-center gap-2 text-negative-600 dark:text-negative-500 mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <p className="text-[11px] uppercase tracking-[0.08em] font-semibold">
                        Slechtste trade
                      </p>
                    </div>
                    <p className="text-xl font-semibold tabular-nums text-negative-700 dark:text-negative-500">
                      {formatCurrency(stats.worst.realizedPnL)}
                    </p>
                    <p className="text-xs text-ink-700 dark:text-ink-300 mt-1.5 font-medium">
                      {stats.worst.ticker}
                    </p>
                    <p className="text-[11px] text-ink-500 dark:text-ink-400">
                      {stats.worst.strategy} · {stats.worst.closeDate.slice(0, 10)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Strategy breakdown */}
            <div className="surface-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="eyebrow mb-1">Per strategie</p>
                  <h3 className="text-sm font-semibold text-ink-900 dark:text-white tracking-tight">
                    P&L verdeeld over strategieën
                  </h3>
                </div>
              </div>
              {strategyData.length > 0 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={strategyData}
                      layout="vertical"
                      margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#E9EDF3" strokeDasharray="2 4" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: '#8A99B0' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={formatCompact}
                      />
                      <YAxis
                        dataKey="strategy"
                        type="category"
                        tick={{ fontSize: 11, fill: '#5A6B82' }}
                        axisLine={false}
                        tickLine={false}
                        width={110}
                      />
                      <Tooltip
                        contentStyle={{
                          border: '1px solid #DCE4EE',
                          borderRadius: 6,
                          fontSize: 12,
                        }}
                        formatter={(v: number) => [formatCurrency(v), 'P&L']}
                      />
                      <ReferenceLine x={0} stroke="#B4BFCF" />
                      <Bar dataKey="pnl" radius={[0, 3, 3, 0]}>
                        {strategyData.map((s, idx) => (
                          <Cell key={idx} fill={s.pnl >= 0 ? '#0F9D58' : '#D14343'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-ink-500 dark:text-ink-400">Geen strategie-data.</p>
              )}
            </div>
          </div>

          {/* Recent trades table */}
          <div className="surface-card overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between">
              <div>
                <p className="eyebrow mb-1">Afgesloten trades</p>
                <h3 className="text-sm font-semibold text-ink-900 dark:text-white tracking-tight">
                  {periodTrades.length} trade(s) in {label.toLowerCase()}
                </h3>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface-subtle dark:bg-trading-dark-700/40 text-[11px] uppercase tracking-[0.08em] text-ink-500 dark:text-ink-400">
                  <tr>
                    <th className="text-left px-5 py-2.5 font-semibold">Datum</th>
                    <th className="text-left px-5 py-2.5 font-semibold">Ticker</th>
                    <th className="text-left px-5 py-2.5 font-semibold">Strategie</th>
                    <th className="text-right px-5 py-2.5 font-semibold">Aantal</th>
                    <th className="text-right px-5 py-2.5 font-semibold">Entry</th>
                    <th className="text-right px-5 py-2.5 font-semibold">Exit</th>
                    <th className="text-right px-5 py-2.5 font-semibold">Fees</th>
                    <th className="text-right px-5 py-2.5 font-semibold">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {[...periodTrades]
                    .sort(
                      (a, b) => new Date(b.closeDate).getTime() - new Date(a.closeDate).getTime()
                    )
                    .slice(0, 25)
                    .map((t) => (
                      <tr
                        key={t.id}
                        className="border-t border-[var(--line)] hover:bg-surface-subtle/50"
                      >
                        <td className="px-5 py-2.5 text-ink-700 dark:text-ink-300 tabular-nums">
                          {t.closeDate.slice(0, 10)}
                        </td>
                        <td className="px-5 py-2.5 font-semibold text-ink-900 dark:text-white">
                          {t.ticker}
                        </td>
                        <td className="px-5 py-2.5 text-ink-500 dark:text-ink-400">{t.strategy}</td>
                        <td className="px-5 py-2.5 text-right text-ink-700 dark:text-ink-300 tabular-nums">
                          {t.quantity}
                        </td>
                        <td className="px-5 py-2.5 text-right text-ink-700 dark:text-ink-300 tabular-nums">
                          {formatCurrency(t.entryPrice)}
                        </td>
                        <td className="px-5 py-2.5 text-right text-ink-700 dark:text-ink-300 tabular-nums">
                          {formatCurrency(t.exitPrice)}
                        </td>
                        <td className="px-5 py-2.5 text-right text-ink-500 dark:text-ink-400 tabular-nums">
                          {formatCurrency((t.commission || 0) + (t.fees || 0))}
                        </td>
                        <td
                          className={`px-5 py-2.5 text-right tabular-nums font-semibold ${
                            t.realizedPnL > 0
                              ? 'text-positive-700 dark:text-positive-500'
                              : t.realizedPnL < 0
                                ? 'text-negative-700 dark:text-negative-500'
                                : 'text-ink-700 dark:text-ink-300'
                          }`}
                        >
                          {formatCurrency(t.realizedPnL)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {periodTrades.length > 25 && (
                <div className="px-5 py-2.5 text-[11px] text-ink-500 dark:text-ink-400 border-t border-[var(--line)]">
                  Top 25 weergegeven · {periodTrades.length - 25} extra trade(s) in deze periode
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
