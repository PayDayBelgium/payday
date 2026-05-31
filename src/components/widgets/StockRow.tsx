import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TrendingUp, Building2, Target } from 'lucide-react';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import type { StockPosition, CurrencyType, Ticker } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { PositionActionButtons } from './PositionActionButtons';

interface StockRowProps {
  position: StockPosition;
  ticker?: Ticker;
  currency: CurrencyType;
  // Action handlers - all optional to allow hiding buttons
  onClose?: (position: StockPosition) => void;
  onView?: (position: StockPosition) => void;
  onWriteCoveredCall?: (position: StockPosition) => void;
  // Display options
  showActions?: boolean;
  showOpportunityBadge?: boolean;
  coveredCallContracts?: number;
  className?: string;
  // External opportunities from central evaluator
  hasOpportunity?: boolean;
  opportunityMessage?: string;
  /** Covered-call eligibility for the whole ticker group; overrides per-lot calc when provided. */
  canWriteCoveredCallsOverride?: boolean;
}

export const StockRow: React.FC<StockRowProps> = ({
  position,
  ticker,
  currency,
  onClose,
  onView,
  onWriteCoveredCall,
  showActions = true,
  showOpportunityBadge = true,
  coveredCallContracts = 0,
  className = '',
  hasOpportunity = false,
  opportunityMessage = '',
  canWriteCoveredCallsOverride,
}) => {
  const currencySymbol = getCurrencySymbol(currency);

  // Get current price from ticker or position
  const currentPrice = ticker?.currentPrice || position.currentPrice || 0;
  const purchasePricePerShare = position.shares > 0 ? position.costBasis / position.shares : 0;

  // Calculate current value and P&L based on live ticker price
  const liveCurrentValue = currentPrice > 0 ? position.shares * currentPrice : position.currentValue;
  const profitLoss = liveCurrentValue - position.costBasis;
  const profitLossPercentage = position.costBasis > 0 ? (profitLoss / position.costBasis) * 100 : 0;

  // Check for Covered Call opportunity - use external opportunity if provided, otherwise calculate locally
  const minShares = position.miniContractsSupported ? 10 : 100;
  const canWriteCoveredCalls =
    canWriteCoveredCallsOverride ?? (position.shares >= minShares);
  const contractsNeeded = Math.floor(position.shares / (position.miniContractsSupported ? 10 : 100));
  const hasUncoveredShares = canWriteCoveredCalls && coveredCallContracts < contractsNeeded;

  // Use external opportunity from central evaluator if available
  const showOpportunity = hasOpportunity || (showOpportunityBadge && hasUncoveredShares);
  const tooltipMessage = opportunityMessage || `Opportunity: Verkoop ${contractsNeeded - coveredCallContracts} covered call(s) voor extra inkomen`;

  // Tooltip state for portal-based rendering
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showTooltip && iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    }
  }, [showTooltip]);

  const handleClick = () => {
    if (onView) {
      onView(position);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`px-6 py-3 hover:bg-white dark:hover:bg-gray-700/30 transition-colors border-b border-gray-200 dark:border-gray-700 cursor-pointer border-l-4 border-l-gray-300 dark:border-l-gray-600 ${className}`}
    >
      <div className="grid grid-cols-[32px_minmax(140px,1fr)_80px_70px_70px_70px_85px_85px_90px_70px_16px_130px] gap-2 items-start">
        {/* Icon */}
        <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
          position.type === 'stock'
            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
            : 'bg-surface-muted dark:bg-trading-dark-600 text-ink-600 dark:text-ink-300'
        }`}>
          {position.type === 'stock' ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <Building2 className="w-4 h-4" />
          )}
        </div>

        {/* Ticker with badges */}
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-sm font-bold text-gray-900 dark:text-white">
              {position.shares}x {position.ticker}
            </h4>
            <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
              LONG
            </span>
            <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
              position.type === 'stock'
                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                : 'bg-surface-muted dark:bg-trading-dark-600 text-ink-700 dark:text-ink-300'
            }`}>
              {position.type === 'stock' ? 'AANDEEL' : 'ETF'}
            </span>
            {showOpportunity && (
              <>
                <div
                  ref={iconRef}
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                  <Target
                    className="w-3.5 h-3.5 text-positive-600 dark:text-positive-500 cursor-help"
                  />
                </div>
                {showTooltip && createPortal(
                  <div
                    className="fixed w-64 p-3 bg-white dark:bg-gray-800 border-2 border-positive-500/20 dark:border-positive-700/30 rounded-lg shadow-xl z-[9999]"
                    style={{ top: tooltipPosition.top, left: tooltipPosition.left }}
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                  >
                    <div className="absolute -top-1.5 left-3 w-3 h-3 bg-white dark:bg-gray-800 border-l border-t border-positive-500/20 dark:border-positive-700/30 transform rotate-45"></div>
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-positive-600 dark:text-positive-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white mb-1">Opportunity</p>
                        <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line">{tooltipMessage}</p>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
              </>
            )}
          </div>
          {position.name && (
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{position.name}</p>
          )}
        </div>

        {/* Empty cells for columns that don't apply to stocks */}
        <div><p className="text-sm text-gray-400 dark:text-gray-600">-</p></div> {/* Expiratie */}
        <div><p className="text-sm text-gray-400 dark:text-gray-600">-</p></div> {/* Strike */}

        {/* Stock prijs */}
        <div>
          {currentPrice ? (
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {formatCurrency(currentPrice, currencySymbol)}
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-600">-</p>
          )}
        </div>

        {/* Verschil */}
        <div>
          {currentPrice ? (
            <p className={`text-sm font-medium ${
              currentPrice < purchasePricePerShare
                ? 'text-negative-600 dark:text-negative-500'
                : 'text-gray-900 dark:text-white'
            }`}>
              {currentPrice > purchasePricePerShare ? '+' : ''}{formatCurrency(currentPrice - purchasePricePerShare, currencySymbol)}
            </p>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-600">-</p>
          )}
        </div>

        {/* Open (Kostprijs) */}
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {formatCurrency(purchasePricePerShare, currencySymbol)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatCurrency(position.costBasis, currencySymbol)}
          </p>
        </div>

        {/* Huidige */}
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {currentPrice ? formatCurrency(currentPrice, currencySymbol) : formatCurrency(purchasePricePerShare, currencySymbol)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatCurrency(liveCurrentValue, currencySymbol)}
          </p>
        </div>

        {/* Winst/Verlies */}
        <div>
          <p className={`text-sm font-medium ${
            profitLoss > 0
              ? 'text-positive-600 dark:text-positive-500'
              : profitLoss < 0
              ? 'text-negative-600 dark:text-negative-500'
              : 'text-gray-900 dark:text-white'
          }`}>
            {profitLoss > 0 ? '+' : ''}{formatCurrency(profitLoss, currencySymbol)}
          </p>
          <p className={`text-xs ${
            profitLossPercentage > 0
              ? 'text-positive-600 dark:text-positive-500'
              : profitLossPercentage < 0
              ? 'text-negative-600 dark:text-negative-500'
              : 'text-gray-500 dark:text-gray-400'
          }`}>
            {profitLossPercentage > 0 ? '+' : ''}{formatNumber(profitLossPercentage)}%
          </p>
        </div>

        {/* Onderpand - empty for stocks */}
        <div>
          <p className="text-sm text-gray-400 dark:text-gray-600">-</p>
        </div>

        {/* Spacer */}
        <div></div>

        {/* Actions */}
        {showActions ? (
          <PositionActionButtons
            onClose={onClose ? () => onClose(position) : undefined}
          />
        ) : (
          <div></div>
        )}
      </div>
    </div>
  );
};
