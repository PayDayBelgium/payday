import React, { useMemo, useState, useRef } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/currency';
import { formatNumber } from '../../utils/numberFormat';
import type { CurrencyType } from '../../types';

interface PnLPoint {
  price: number;
  pnl: number;
}

interface PnLCurveProps {
  type: 'stock' | 'call-buy' | 'call-sell' | 'put-buy' | 'put-sell' | 'call-spread' | 'put-spread';

  // Stock parameters
  purchasePrice?: number;
  shares?: number;

  // Option parameters
  strike?: number;
  premium?: number;
  contracts?: number;

  // Spread parameters
  longStrike?: number;
  shortStrike?: number;
  longPremium?: number;
  shortPremium?: number;

  // Current market price for indicator line
  actualCurrentPrice?: number;

  currency: CurrencyType;
  className?: string;
}

export const PnLCurve: React.FC<PnLCurveProps> = ({
  type,
  purchasePrice,
  shares,
  strike,
  premium,
  contracts,
  longStrike,
  shortStrike,
  longPremium,
  shortPremium,
  actualCurrentPrice,
  currency,
  className = '',
}) => {
  const currencySymbol = getCurrencySymbol(currency);
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverPoint, setHoverPoint] = useState<{
    x: number;
    y: number;
    price: number;
    pnl: number;
  } | null>(null);

  // Calculate P&L curve data points
  const { points, breakEven, maxProfit, maxLoss, currentPrice } = useMemo(() => {
    const contractMultiplier = 100;
    const points: PnLPoint[] = [];
    let breakEven: number | number[] | null = null;
    let maxProfit: number | null = null;
    let maxLoss: number | null = null;
    // Only set currentPrice if we actually have the current market price
    let currentPrice = actualCurrentPrice || 0;

    switch (type) {
      case 'stock': {
        if (!purchasePrice || !shares) break;
        // For stocks, we can use purchasePrice as current if not provided
        if (!currentPrice) currentPrice = purchasePrice;

        // Stock: linear P&L
        const minPrice = purchasePrice * 0.5;
        const maxPrice = purchasePrice * 1.5;
        const step = (maxPrice - minPrice) / 100;

        for (let price = minPrice; price <= maxPrice; price += step) {
          const pnl = (price - purchasePrice) * shares;
          points.push({ price, pnl });
        }

        breakEven = purchasePrice;
        maxProfit = Infinity;
        maxLoss = -purchasePrice * shares;
        break;
      }

      case 'call-buy': {
        if (!strike || !premium || !contracts) break;
        // Don't set currentPrice to strike - only use actual market price

        const minPrice = strike * 0.7;
        const maxPrice = strike * 1.3;
        const step = (maxPrice - minPrice) / 100;

        const totalPremium = premium * contracts * contractMultiplier;

        for (let price = minPrice; price <= maxPrice; price += step) {
          const intrinsicValue = Math.max(0, price - strike) * contracts * contractMultiplier;
          const pnl = intrinsicValue - totalPremium;
          points.push({ price, pnl });
        }

        breakEven = strike + premium;
        maxProfit = Infinity;
        maxLoss = -totalPremium;
        break;
      }

      case 'call-sell': {
        if (!strike || !premium || !contracts) break;
        // Don't set currentPrice to strike - only use actual market price

        const minPrice = strike * 0.7;
        const maxPrice = strike * 1.3;
        const step = (maxPrice - minPrice) / 100;

        const totalPremium = premium * contracts * contractMultiplier;

        for (let price = minPrice; price <= maxPrice; price += step) {
          const intrinsicValue = Math.max(0, price - strike) * contracts * contractMultiplier;
          const pnl = totalPremium - intrinsicValue;
          points.push({ price, pnl });
        }

        breakEven = strike + premium;
        maxProfit = totalPremium;
        maxLoss = -Infinity;
        break;
      }

      case 'put-buy': {
        if (!strike || !premium || !contracts) break;
        // Don't set currentPrice to strike - only use actual market price

        const minPrice = strike * 0.7;
        const maxPrice = strike * 1.3;
        const step = (maxPrice - minPrice) / 100;

        const totalPremium = premium * contracts * contractMultiplier;

        for (let price = minPrice; price <= maxPrice; price += step) {
          const intrinsicValue = Math.max(0, strike - price) * contracts * contractMultiplier;
          const pnl = intrinsicValue - totalPremium;
          points.push({ price, pnl });
        }

        breakEven = strike - premium;
        maxProfit = (strike - premium) * contracts * contractMultiplier;
        maxLoss = -totalPremium;
        break;
      }

      case 'put-sell': {
        if (!strike || !premium || !contracts) break;
        // Don't set currentPrice to strike - only use actual market price

        const minPrice = strike * 0.7;
        const maxPrice = strike * 1.3;
        const step = (maxPrice - minPrice) / 100;

        const totalPremium = premium * contracts * contractMultiplier;

        for (let price = minPrice; price <= maxPrice; price += step) {
          const intrinsicValue = Math.max(0, strike - price) * contracts * contractMultiplier;
          const pnl = totalPremium - intrinsicValue;
          points.push({ price, pnl });
        }

        breakEven = strike - premium;
        maxProfit = totalPremium;
        maxLoss = -(strike * contracts * contractMultiplier - totalPremium);
        break;
      }

      case 'call-spread': {
        if (!longStrike || !shortStrike || !longPremium || !shortPremium || !contracts) break;
        const referenceStrike = (longStrike + shortStrike) / 2;
        // Don't set currentPrice to reference strike - only use actual market price

        const minPrice = referenceStrike * 0.7;
        const maxPrice = referenceStrike * 1.3;
        const step = (maxPrice - minPrice) / 100;

        // Determine if this is a debit or credit spread
        // Debit spread: longStrike < shortStrike (buy lower, sell higher)
        // Credit spread: longStrike > shortStrike (sell lower, buy higher)
        const isDebitSpread = longStrike < shortStrike;
        const spreadWidth = Math.abs(shortStrike - longStrike);

        // Net premium paid (positive for debit) or received (negative for debit, so we negate for credit)
        const netPremiumPaid = (longPremium - shortPremium) * contracts * contractMultiplier;

        for (let price = minPrice; price <= maxPrice; price += step) {
          const longValue = Math.max(0, price - longStrike) * contracts * contractMultiplier;
          const shortValue = Math.max(0, price - shortStrike) * contracts * contractMultiplier;
          const pnl = longValue - shortValue - netPremiumPaid;
          points.push({ price, pnl });
        }

        if (isDebitSpread) {
          // Call Debit Spread (Bull Call Spread)
          // Break-even = long strike + net debit per share
          breakEven = longStrike + (longPremium - shortPremium);
          // Max profit = spread width - net debit
          maxProfit = (spreadWidth - (longPremium - shortPremium)) * contracts * contractMultiplier;
          // Max loss = net debit paid
          maxLoss = -netPremiumPaid;
        } else {
          // Call Credit Spread (Bear Call Spread)
          // Break-even = short strike + net credit per share
          breakEven = shortStrike + (shortPremium - longPremium);
          // Max profit = net credit received
          maxProfit = -netPremiumPaid; // netPremiumPaid is negative for credit spread
          // Max loss = spread width - net credit
          maxLoss = -(spreadWidth - (shortPremium - longPremium)) * contracts * contractMultiplier;
        }
        break;
      }

      case 'put-spread': {
        if (!longStrike || !shortStrike || !longPremium || !shortPremium || !contracts) break;
        const referenceStrike = (longStrike + shortStrike) / 2;
        // Don't set currentPrice to reference strike - only use actual market price

        const minPrice = referenceStrike * 0.7;
        const maxPrice = referenceStrike * 1.3;
        const step = (maxPrice - minPrice) / 100;

        const netCredit = (shortPremium - longPremium) * contracts * contractMultiplier;

        for (let price = minPrice; price <= maxPrice; price += step) {
          const longValue = Math.max(0, longStrike - price) * contracts * contractMultiplier;
          const shortValue = Math.max(0, shortStrike - price) * contracts * contractMultiplier;
          const pnl = netCredit + longValue - shortValue;
          points.push({ price, pnl });
        }

        breakEven = shortStrike - (shortPremium - longPremium);
        maxProfit = netCredit;
        maxLoss =
          -(Math.abs(shortStrike - longStrike) - (shortPremium - longPremium)) *
          contracts *
          contractMultiplier;
        break;
      }
    }

    return { points, breakEven, maxProfit, maxLoss, currentPrice };
  }, [
    type,
    purchasePrice,
    shares,
    strike,
    premium,
    contracts,
    longStrike,
    shortStrike,
    longPremium,
    shortPremium,
    actualCurrentPrice,
  ]);

  if (points.length === 0) {
    return (
      <div
        className={`p-8 text-center bg-surface dark:bg-trading-dark-900 rounded-lg ${className}`}
      >
        <p className="text-ink-500 dark:text-ink-400">Vul alle velden in om de P&L curve te zien</p>
      </div>
    );
  }

  // Calculate chart dimensions and scaling
  const minPrice = Math.min(...points.map((p) => p.price));
  const maxPrice = Math.max(...points.map((p) => p.price));
  const minPnL = Math.min(...points.map((p) => p.pnl), 0);
  const maxPnL = Math.max(...points.map((p) => p.pnl), 0);

  const chartWidth = 600;
  const chartHeight = 300;
  const padding = 40;

  const xScale = (price: number) => {
    return padding + ((price - minPrice) / (maxPrice - minPrice)) * (chartWidth - 2 * padding);
  };

  const yScale = (pnl: number) => {
    return (
      chartHeight - padding - ((pnl - minPnL) / (maxPnL - minPnL)) * (chartHeight - 2 * padding)
    );
  };

  // Create SVG path for the curve
  const curvePath = points
    .map((point, i) => {
      const x = xScale(point.price);
      const y = yScale(point.pnl);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Zero line (break-even)
  const zeroY = yScale(0);

  // Handle mouse move for interactivity
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();

    // Convert screen coordinates to SVG coordinates
    const scaleX = chartWidth / rect.width;
    const x = (e.clientX - rect.left) * scaleX;

    // Find closest point on the curve
    const priceAtMouse =
      minPrice + ((x - padding) / (chartWidth - 2 * padding)) * (maxPrice - minPrice);

    // Find closest data point
    let closestPoint = points[0];
    let minDistance = Math.abs(points[0].price - priceAtMouse);

    points.forEach((point) => {
      const distance = Math.abs(point.price - priceAtMouse);
      if (distance < minDistance) {
        minDistance = distance;
        closestPoint = point;
      }
    });

    setHoverPoint({
      x: xScale(closestPoint.price),
      y: yScale(closestPoint.pnl),
      price: closestPoint.price,
      pnl: closestPoint.pnl,
    });
  };

  const handleMouseLeave = () => {
    setHoverPoint(null);
  };

  return (
    <div
      className={`bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 p-4 ${className}`}
    >
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
          Profit & Loss curve
        </h3>
        <div className="flex items-center gap-4 text-sm">
          {breakEven !== null && !Array.isArray(breakEven) && (
            <div className="flex items-center gap-1">
              <span className="text-ink-600 dark:text-ink-400">Break-even:</span>
              <span className="font-semibold text-ink-900 dark:text-white">
                {currencySymbol}
                {formatNumber(breakEven, 2)}
              </span>
            </div>
          )}
          {maxProfit !== null && maxProfit !== Infinity && (
            <div className="flex items-center gap-1">
              <TrendingUp className="w-4 h-4 text-positive-600 dark:text-positive-500" />
              <span className="text-ink-600 dark:text-ink-400">Max:</span>
              <span className="font-semibold text-positive-600 dark:text-positive-500">
                +{currencySymbol}
                {formatNumber(maxProfit, 2)}
              </span>
            </div>
          )}
          {maxLoss !== null && maxLoss !== -Infinity && (
            <div className="flex items-center gap-1">
              <TrendingDown className="w-4 h-4 text-negative-600 dark:text-negative-500" />
              <span className="text-ink-600 dark:text-ink-400">Max:</span>
              <span className="font-semibold text-negative-600 dark:text-negative-500">
                -{currencySymbol}
                {formatNumber(Math.abs(maxLoss), 2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          ref={svgRef}
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-ink-200 dark:text-ink-700"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect width={chartWidth} height={chartHeight} fill="url(#grid)" />

          {/* Zero line (break-even horizontal) */}
          <line
            x1={padding}
            y1={zeroY}
            x2={chartWidth - padding}
            y2={zeroY}
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="5,5"
            className="text-ink-400 dark:text-ink-600"
          />

          {/* Profit area fill */}
          <path
            d={`
              M ${padding} ${zeroY}
              ${points
                .filter((p) => p.pnl >= 0)
                .map((p) => `L ${xScale(p.price)} ${yScale(p.pnl)}`)
                .join(' ')}
              L ${xScale(points[points.length - 1].price)} ${zeroY}
              Z
            `}
            fill="rgba(34, 197, 94, 0.1)"
            className="dark:opacity-20"
          />

          {/* Loss area fill */}
          <path
            d={`
              M ${padding} ${zeroY}
              ${points
                .filter((p) => p.pnl < 0)
                .map((p) => `L ${xScale(p.price)} ${yScale(p.pnl)}`)
                .join(' ')}
              L ${xScale(points[points.length - 1].price)} ${zeroY}
              Z
            `}
            fill="rgba(239, 68, 68, 0.1)"
            className="dark:opacity-20"
          />

          {/* Main curve */}
          <path
            d={curvePath}
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary-700 dark:text-primary-300"
          />

          {/* Current price indicator */}
          {currentPrice > 0 && (
            <>
              <line
                x1={xScale(currentPrice)}
                y1={padding}
                x2={xScale(currentPrice)}
                y2={chartHeight - padding}
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="3,3"
                className="text-ink-500 dark:text-ink-300"
              />
              <text
                x={xScale(currentPrice)}
                y={padding - 10}
                textAnchor="middle"
                className="text-xs font-semibold fill-purple-600 dark:fill-purple-400"
              >
                Current
              </text>
            </>
          )}

          {/* Break-even indicator */}
          {breakEven !== null && !Array.isArray(breakEven) && (
            <>
              <line
                x1={xScale(breakEven)}
                y1={padding}
                x2={xScale(breakEven)}
                y2={chartHeight - padding}
                stroke="currentColor"
                strokeWidth="2"
                strokeDasharray="5,2"
                className="text-caution-500 dark:text-caution-500"
              />
              <circle
                cx={xScale(breakEven)}
                cy={zeroY}
                r="4"
                fill="currentColor"
                className="text-caution-500 dark:text-caution-500"
              />
            </>
          )}

          {/* Axes labels */}
          <text
            x={chartWidth / 2}
            y={chartHeight - 5}
            textAnchor="middle"
            className="text-xs fill-gray-600 dark:fill-gray-400"
          >
            Aandelenprijs ({currencySymbol})
          </text>
          <text
            x={15}
            y={chartHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, 15, ${chartHeight / 2})`}
            className="text-xs fill-gray-600 dark:fill-gray-400"
          >
            Winst/Verlies ({currencySymbol})
          </text>

          {/* Price labels */}
          <text
            x={padding}
            y={chartHeight - padding + 20}
            textAnchor="middle"
            className="text-xs fill-gray-600 dark:fill-gray-400"
          >
            {currencySymbol}
            {formatNumber(minPrice, 0)}
          </text>
          <text
            x={chartWidth - padding}
            y={chartHeight - padding + 20}
            textAnchor="middle"
            className="text-xs fill-gray-600 dark:fill-gray-400"
          >
            {currencySymbol}
            {formatNumber(maxPrice, 0)}
          </text>

          {/* P&L labels */}
          <text
            x={padding - 5}
            y={yScale(maxPnL)}
            textAnchor="end"
            className="text-xs fill-green-600 dark:fill-green-400"
          >
            +{currencySymbol}
            {formatNumber(maxPnL, 0)}
          </text>
          <text
            x={padding - 5}
            y={yScale(minPnL)}
            textAnchor="end"
            className="text-xs fill-red-600 dark:fill-red-400"
          >
            {currencySymbol}
            {formatNumber(minPnL, 0)}
          </text>
          <text
            x={padding - 5}
            y={zeroY + 4}
            textAnchor="end"
            className="text-xs fill-gray-600 dark:fill-gray-400"
          >
            {currencySymbol}0
          </text>

          {/* Hover indicator */}
          {hoverPoint && (
            <g>
              {/* Vertical crosshair */}
              <line
                x1={hoverPoint.x}
                y1={padding}
                x2={hoverPoint.x}
                y2={chartHeight - padding}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="3,3"
                className="text-primary-600 dark:text-primary-300"
                opacity="0.5"
              />
              {/* Horizontal crosshair */}
              <line
                x1={padding}
                y1={hoverPoint.y}
                x2={chartWidth - padding}
                y2={hoverPoint.y}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray="3,3"
                className="text-primary-600 dark:text-primary-300"
                opacity="0.5"
              />
              {/* Hover point circle */}
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r="6"
                fill="white"
                stroke="currentColor"
                strokeWidth="2"
                className="text-primary-700 dark:text-primary-300"
              />
              {/* Tooltip */}
              <g>
                <rect
                  x={hoverPoint.x + 10}
                  y={hoverPoint.y - 35}
                  width="140"
                  height="30"
                  rx="4"
                  fill="currentColor"
                  className="text-ink-900 dark:text-ink-100"
                  opacity="0.95"
                />
                <text
                  x={hoverPoint.x + 15}
                  y={hoverPoint.y - 22}
                  className="text-xs font-semibold fill-white dark:fill-gray-900"
                >
                  Prijs: {currencySymbol}
                  {formatNumber(hoverPoint.price, 2)}
                </text>
                <text
                  x={hoverPoint.x + 15}
                  y={hoverPoint.y - 10}
                  className={`text-xs font-semibold ${
                    hoverPoint.pnl >= 0
                      ? 'fill-green-400 dark:fill-green-300'
                      : 'fill-red-400 dark:fill-red-300'
                  }`}
                >
                  P&L: {hoverPoint.pnl >= 0 ? '+' : ''}
                  {currencySymbol}
                  {formatNumber(hoverPoint.pnl, 2)}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs">
        {currentPrice > 0 && (
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-0.5 bg-ink-600 dark:bg-purple-400"
              style={{ borderTop: '2px dashed' }}
            />
            <span className="text-ink-600 dark:text-ink-400">Huidige Prijs</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-0.5 bg-caution-500 dark:bg-caution-500"
            style={{ borderTop: '2px dashed' }}
          />
          <span className="text-ink-600 dark:text-ink-400">Break-even</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-0.5 bg-ink-300 dark:bg-trading-dark-600"
            style={{ borderTop: '2px dashed' }}
          />
          <span className="text-ink-600 dark:text-ink-400">Zero Line</span>
        </div>
      </div>
    </div>
  );
};
