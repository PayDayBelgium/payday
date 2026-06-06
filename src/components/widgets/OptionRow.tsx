import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpCircle, ArrowDownCircle, MessageSquare, Target, AlertCircle } from 'lucide-react';
import type { CallOption, PutOption, Ticker } from '../../types';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { getDaysToExpiration } from '../../utils/dateHelpers';
import { calculateOptionUnrealizedPnL, calculatePnLPercentage } from '../../utils/pnlCalculations';
import { PositionActionButtons } from './PositionActionButtons';
import { PortalTooltip } from '../common/PortalTooltip';
import { POSITION_GRID_COLS, POSITION_GRID_COLS_SUBITEM } from './positionGrid';

export type CollateralType = 'stock' | 'leaps' | 'cash' | 'put' | 'call' | 'none';

export interface OptionRowProps {
  option: CallOption | PutOption;
  currencySymbol: string;
  tickerData?: Ticker;
  stockPrice?: number;
  onRoll?: (option: CallOption | PutOption) => void;
  onClose?: (option: CallOption | PutOption) => void;
  onAssign?: (option: CallOption | PutOption) => void;
  onClick?: (option: CallOption | PutOption) => void;
  onNavigateToCampaigns?: () => void;
  // Display options
  showActions?: boolean;
  // Alert/opportunity info
  hasAlert?: boolean;
  alertMessage?: string;
  hasOpportunity?: boolean;
  opportunityMessage?: string;
  // Collateral info
  collateralType?: CollateralType;
  collateralValue?: number;
  collateralDescription?: string;
  // LEAPS collateral info
  leapsInfo?: {
    ticker: string;
    expiration: string;
  };
  // Sub-item indentation (for spread legs)
  isSubItem?: boolean;
}

export const OptionRow: React.FC<OptionRowProps> = ({
  option,
  currencySymbol,
  tickerData,
  stockPrice = 0,
  onRoll,
  onClose,
  onAssign,
  onClick,
  onNavigateToCampaigns,
  showActions = true,
  hasAlert = false,
  alertMessage = '',
  hasOpportunity = false,
  opportunityMessage = '',
  collateralType = 'none',
  collateralValue = 0,
  collateralDescription = '',
  leapsInfo,
  isSubItem = false,
}) => {
  const { t } = useTranslation();
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const tooltipRefs = useRef<Map<string, React.RefObject<HTMLDivElement | null>>>(new Map());

  const getTooltipRef = (key: string): React.RefObject<HTMLDivElement | null> => {
    if (!tooltipRefs.current.has(key)) {
      tooltipRefs.current.set(key, React.createRef<HTMLDivElement | null>());
    }
    return tooltipRefs.current.get(key)!;
  };

  const isCall = option.type === 'call';
  const isBuy = option.action === 'buy';
  const daysToExpiration = getDaysToExpiration(option.expiration);
  const isExpired = daysToExpiration < 0;
  const expiresThisWeek = daysToExpiration >= 0 && daysToExpiration <= 7;
  const expiresWithinTwoWeeks = daysToExpiration > 7 && daysToExpiration <= 14;

  // Check if LEAPS (>90 days)
  const isLEAPS = isCall && isBuy && daysToExpiration > 90;

  // Calculate values
  const priceDifference = stockPrice - option.strike;

  // Get effective current value (fallback to costBasis if not set)
  const effectiveCurrentValue = option.currentValue ?? option.costBasis;

  // Calculate unrealized P&L using utility function
  const nominalProfit = calculateOptionUnrealizedPnL({
    action: option.action,
    costBasis: option.costBasis,
    currentValue: effectiveCurrentValue,
  });

  const profitPercent = calculatePnLPercentage(nominalProfit, option.costBasis);

  // Per contract values
  const pricePerContract = Math.abs(effectiveCurrentValue / (option.contracts * 100));
  const totalValue = Math.abs(effectiveCurrentValue);

  // Border color based on expiration or alerts
  const getBorderColor = () => {
    if (isExpired || expiresThisWeek) return 'border-l-red-500';
    if (hasAlert || expiresWithinTwoWeeks) return 'border-l-amber-400';
    return 'border-l-gray-300 dark:border-l-gray-600';
  };

  return (
    <div
      onClick={() => onClick?.(option)}
      className={`px-6 py-3 transition-colors border-b border-surface-line dark:border-trading-dark-600 cursor-pointer relative border-l-4 ${
        isExpired
          ? 'bg-surface-subtle dark:bg-trading-dark-900/50 hover:bg-surface-muted dark:hover:bg-trading-dark-800/50'
          : 'hover:bg-white dark:hover:bg-trading-dark-700/30'
      } ${getBorderColor()}`}
    >
      <div
        className={`grid ${isSubItem ? POSITION_GRID_COLS_SUBITEM : POSITION_GRID_COLS} gap-2 items-start ${
          isExpired ? 'opacity-60' : ''
        }`}
      >
        {/* Spacer for sub-items */}
        {isSubItem && <div></div>}

        {/* Icon */}
        <div
          className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
            isCall
              ? 'bg-positive-50 dark:bg-positive-700/25 text-positive-600 dark:text-positive-500'
              : 'bg-surface-muted dark:bg-trading-dark-600 text-ink-600 dark:text-ink-300'
          }`}
        >
          {isCall ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
        </div>

        {/* Ticker with badges and comment indicator */}
        <div>
          <div className="flex items-center gap-1.5">
            <h4 className="text-sm font-bold text-ink-900 dark:text-white">
              {option.contracts}x {option.ticker}
            </h4>
            <span
              ref={getTooltipRef(`action-${option.id}`)}
              onMouseEnter={() => setShowTooltip(`action-${option.id}`)}
              onMouseLeave={() => setShowTooltip(null)}
              className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded cursor-help ${
                isBuy
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-caution-50 dark:bg-caution-600/25 text-caution-600 dark:text-caution-500'
              }`}
            >
              {isBuy ? t('optionRow.long') : t('optionRow.short')}
              <PortalTooltip
                triggerRef={getTooltipRef(`action-${option.id}`)}
                show={showTooltip === `action-${option.id}`}
              >
                <div className="w-64 p-3 bg-white dark:bg-trading-dark-800 border-2 border-surface-line dark:border-trading-dark-600 rounded-lg shadow-xl">
                  <p className="text-xs text-ink-600 dark:text-ink-300">
                    {isBuy ? t('optionRow.longTooltip') : t('optionRow.shortTooltip')}
                  </p>
                </div>
              </PortalTooltip>
            </span>
            <span
              className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                isCall
                  ? 'bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500'
                  : 'bg-surface-muted dark:bg-trading-dark-600 text-ink-700 dark:text-ink-300'
              }`}
            >
              {isCall ? t('optionRow.call') : t('optionRow.put')}
            </span>
            {isLEAPS && (
              <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded bg-caution-50 dark:bg-caution-600/25 text-caution-600 dark:text-caution-500">
                {t('optionRow.leaps')}
              </span>
            )}
            {hasAlert && (
              <>
                <div
                  ref={getTooltipRef(`alert-${option.id}`)}
                  onMouseEnter={() => setShowTooltip(`alert-${option.id}`)}
                  onMouseLeave={() => setShowTooltip(null)}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-negative-600 dark:text-negative-500 cursor-help" />
                </div>
                <PortalTooltip
                  triggerRef={getTooltipRef(`alert-${option.id}`)}
                  show={showTooltip === `alert-${option.id}`}
                >
                  <div className="w-72 p-3 bg-white dark:bg-trading-dark-800 border-2 border-negative-500/20 dark:border-negative-700/30 rounded-lg shadow-xl">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-negative-600 dark:text-negative-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-ink-900 dark:text-white mb-1">
                          {t('optionRow.alert')}
                        </p>
                        <p className="text-xs text-ink-600 dark:text-ink-300 whitespace-pre-line">
                          {alertMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                </PortalTooltip>
              </>
            )}
            {hasOpportunity && (
              <>
                <div
                  ref={getTooltipRef(`opportunity-${option.id}`)}
                  onMouseEnter={() => setShowTooltip(`opportunity-${option.id}`)}
                  onMouseLeave={() => setShowTooltip(null)}
                >
                  <Target className="w-3.5 h-3.5 text-positive-600 dark:text-positive-500 cursor-help" />
                </div>
                <PortalTooltip
                  triggerRef={getTooltipRef(`opportunity-${option.id}`)}
                  show={showTooltip === `opportunity-${option.id}`}
                >
                  <div className="w-72 p-3 bg-white dark:bg-trading-dark-800 border-2 border-positive-500/20 dark:border-positive-700/30 rounded-lg shadow-xl">
                    <div className="flex items-start gap-2">
                      <Target className="w-4 h-4 text-positive-600 dark:text-positive-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-sm text-ink-900 dark:text-white mb-1">
                          {t('optionRow.opportunity')}
                        </p>
                        <p className="text-xs text-ink-600 dark:text-ink-300 whitespace-pre-line">
                          {opportunityMessage}
                        </p>
                      </div>
                    </div>
                  </div>
                </PortalTooltip>
              </>
            )}
            {(() => {
              // Filter out spread ID from notes for display
              const displayNotes = option.notes?.replace(/\n?Spread ID: spread-\d+/g, '').trim();
              if (!displayNotes) return null;
              return (
                <>
                  <div
                    ref={getTooltipRef(`notes-${option.id}`)}
                    onMouseEnter={() => setShowTooltip(`notes-${option.id}`)}
                    onMouseLeave={() => setShowTooltip(null)}
                  >
                    <MessageSquare className="w-3 h-3 text-primary-600 dark:text-primary-300 cursor-help" />
                  </div>
                  <PortalTooltip
                    triggerRef={getTooltipRef(`notes-${option.id}`)}
                    show={showTooltip === `notes-${option.id}`}
                  >
                    <div className="w-72 p-3 bg-white dark:bg-trading-dark-800 border-2 border-primary-200 dark:border-primary-800 rounded-lg shadow-xl">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-primary-600 dark:text-primary-300 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-sm text-ink-900 dark:text-white mb-1">
                            {t('optionRow.note')}
                          </p>
                          <p className="text-xs text-ink-600 dark:text-ink-300 whitespace-pre-line">
                            {displayNotes}
                          </p>
                        </div>
                      </div>
                    </div>
                  </PortalTooltip>
                </>
              );
            })()}
          </div>
          {tickerData?.name && (
            <p className="text-xs text-ink-500 dark:text-ink-400 truncate">{tickerData.name}</p>
          )}
        </div>

        {/* Expiration */}
        <div>
          <p className="text-sm font-medium text-ink-900 dark:text-white">
            {new Date(option.expiration).toLocaleDateString('nl-NL')}
          </p>
          <p
            className={`text-xs ${
              expiresThisWeek
                ? 'text-negative-600 dark:text-negative-500 font-semibold'
                : expiresWithinTwoWeeks
                  ? 'text-caution-500 dark:text-caution-500 font-semibold'
                  : 'text-ink-500 dark:text-ink-400'
            }`}
          >
            {daysToExpiration > 0
              ? `${daysToExpiration}d`
              : daysToExpiration === 0
                ? t('optionRow.today')
                : t('optionRow.expired')}
          </p>
        </div>

        {/* Strike */}
        <div>
          <p className="text-sm font-semibold text-ink-900 dark:text-white">
            {formatCurrency(option.strike, currencySymbol)}
          </p>
        </div>

        {/* Stock price */}
        <div>
          {stockPrice > 0 ? (
            <p className="text-sm font-medium text-ink-700 dark:text-ink-300">
              {formatCurrency(stockPrice, currencySymbol)}
            </p>
          ) : (
            <p className="text-sm text-ink-400 dark:text-ink-600">-</p>
          )}
        </div>

        {/* Difference (stock price - strike) */}
        <div>
          {stockPrice > 0 ? (
            <p
              className={`text-sm font-semibold ${(() => {
                // Only show red for bad situations, otherwise neutral
                // Short call: positive difference is bad (stock above strike)
                // Short put: negative difference is bad (stock below strike)
                // Long call: negative difference is bad (stock below strike)
                // Long put: positive difference is bad (stock above strike)
                const isBadForPosition = isBuy
                  ? isCall
                    ? priceDifference < 0
                    : priceDifference > 0
                  : isCall
                    ? priceDifference > 0
                    : priceDifference < 0;

                if (isBadForPosition) return 'text-negative-600 dark:text-negative-500';
                return 'text-ink-900 dark:text-white';
              })()}`}
            >
              {priceDifference > 0 ? '+' : ''}
              {formatCurrency(priceDifference, currencySymbol)}
            </p>
          ) : (
            <p className="text-sm text-ink-400 dark:text-ink-600">-</p>
          )}
        </div>

        {/* Purchase value */}
        <div>
          <p className="text-sm font-semibold text-ink-900 dark:text-white">
            {formatCurrency(option.premium, currencySymbol)}
          </p>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {formatCurrency(option.premium * option.contracts * 100, currencySymbol)}
          </p>
        </div>

        {/* Current Value */}
        <div>
          <p className="text-sm font-semibold text-ink-900 dark:text-white">
            {formatCurrency(pricePerContract, currencySymbol)}
          </p>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {formatCurrency(totalValue, currencySymbol)}
          </p>
        </div>

        {/* Profit (nominal and %) */}
        <div>
          <p
            className={`text-sm font-bold ${
              nominalProfit > 0
                ? 'text-positive-600 dark:text-positive-500'
                : nominalProfit < 0
                  ? 'text-negative-600 dark:text-negative-500'
                  : 'text-ink-900 dark:text-white'
            }`}
          >
            {nominalProfit > 0 ? '+' : ''}
            {formatCurrency(nominalProfit, currencySymbol)}
          </p>
          <p
            className={`text-xs font-medium ${
              nominalProfit > 0
                ? 'text-positive-600 dark:text-positive-500'
                : nominalProfit < 0
                  ? 'text-negative-600 dark:text-negative-500'
                  : 'text-ink-900 dark:text-white'
            }`}
          >
            {nominalProfit > 0 ? '+' : ''}
            {formatNumber(profitPercent)}%
          </p>
        </div>

        {/* Collateral */}
        <div>
          {collateralType !== 'none' && collateralValue > 0 ? (
            <>
              <div
                ref={getTooltipRef(`collateral-${option.id}`)}
                onMouseEnter={() => setShowTooltip(`collateral-${option.id}`)}
                onMouseLeave={() => setShowTooltip(null)}
                className="cursor-help"
              >
                <p
                  className={`text-sm font-semibold ${
                    collateralType === 'cash'
                      ? 'text-caution-600 dark:text-caution-500'
                      : collateralType === 'stock'
                        ? 'text-primary-700 dark:text-primary-300'
                        : collateralType === 'put'
                          ? 'text-ink-600 dark:text-ink-300'
                          : collateralType === 'call'
                            ? 'text-positive-600 dark:text-positive-500'
                            : 'text-caution-600 dark:text-caution-500'
                  }`}
                >
                  {collateralType === 'stock'
                    ? t('optionRow.stockCollateral')
                    : collateralType === 'leaps'
                      ? t('optionRow.leapsCollateral')
                      : collateralType === 'put'
                        ? t('optionRow.putCollateral')
                        : collateralType === 'call'
                          ? t('optionRow.callCollateral')
                          : t('optionRow.cashCollateral')}
                </p>
                <p className="text-xs text-ink-500 dark:text-ink-400">
                  {collateralType === 'stock'
                    ? option.ticker
                    : collateralType === 'leaps' && leapsInfo
                      ? `${leapsInfo.ticker} ${getDaysToExpiration(leapsInfo.expiration)}d`
                      : collateralType === 'put' || collateralType === 'call'
                        ? `$${collateralValue}`
                        : formatCurrency(collateralValue, currencySymbol)}
                </p>
              </div>
              <PortalTooltip
                triggerRef={getTooltipRef(`collateral-${option.id}`)}
                show={showTooltip === `collateral-${option.id}`}
              >
                <div className="w-72 p-3 bg-white dark:bg-trading-dark-800 border-2 border-surface-line dark:border-trading-dark-600 rounded-lg shadow-xl">
                  <div className="flex items-start gap-2">
                    <div>
                      <p className="font-semibold text-sm text-ink-900 dark:text-white mb-1">
                        {collateralType === 'stock'
                          ? t('optionRow.stockCollateralDesc')
                          : collateralType === 'leaps'
                            ? t('optionRow.leapsCollateralDesc')
                            : collateralType === 'put'
                              ? t('optionRow.protectivePut')
                              : t('optionRow.cashCollateralDesc')}
                      </p>
                      <p className="text-xs text-ink-600 dark:text-ink-300">
                        {collateralDescription}
                      </p>
                    </div>
                  </div>
                </div>
              </PortalTooltip>
            </>
          ) : (
            <p className="text-sm text-ink-400 dark:text-ink-600">-</p>
          )}
        </div>

        {/* Spacer */}
        <div></div>

        {/* Action buttons */}
        {showActions ? (
          <PositionActionButtons
            onNavigateToCampaigns={onNavigateToCampaigns}
            onRoll={onRoll ? () => onRoll(option) : undefined}
            onEdit={onClick ? () => onClick(option) : undefined}
            onAssign={onAssign && !isBuy ? () => onAssign(option) : undefined}
            onClose={onClose ? () => onClose(option) : undefined}
            campaignTitle={
              isLEAPS ? t('optionRow.viewPmccCampaign') : t('optionRow.viewKachingCampaign')
            }
          />
        ) : (
          <div></div>
        )}
      </div>
    </div>
  );
};
