import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { calculateOptionRealizedPnL, calculateStockRealizedPnL } from '../../utils/pnlCalculations';
import { allocateSpreadClosePremium } from '../../utils/positionHelpers';
import { getSpreadId } from '../../utils/spreadHelpers';
import type { Position, CurrencyType, CallOption, PutOption, StockPosition } from '../../types';

interface ClosePositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (closeData: {
    closePrice?: number;
    closePremium?: number;
    closeDate: string;
    notes?: string;
    quantity?: number; // For partial closes
    realizedPnL: number;
  }) => void;
  position: Position;
  currency: CurrencyType;
  allPositions?: Position[]; // All positions to detect spread legs
  onConfirmSpread?: (
    spreadLegs: Position[],
    closeData: {
      closePremium: number;
      closeDate: string;
      notes?: string;
    }
  ) => void;
}

export const ClosePositionModal: React.FC<ClosePositionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  position,
  currency,
  allPositions = [],
  onConfirmSpread,
}) => {
  const { t } = useTranslation();
  const currencySymbol = getCurrencySymbol(currency);

  const [closePrice, setClosePrice] = useState<string>('');
  const [closePremium, setClosePremium] = useState<string>('');
  const [closeDate, setCloseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState<string>('');
  const [contractsToClose, setContractsToClose] = useState<string>('');

  // Get total shares for stock/ETF positions
  const totalShares =
    (position.type === 'stock' || position.type === 'etf') && 'shares' in position
      ? position.shares
      : 0;

  // Get total contracts for option positions
  const totalContracts =
    (position.type === 'call' || position.type === 'put') && 'contracts' in position
      ? position.contracts
      : 0;

  // Quantity to close (defaults to all)
  const quantityToClose = quantity ? parseInt(quantity) : totalShares;
  const contractsToCloseNum = contractsToClose ? parseInt(contractsToClose) : totalContracts;

  // Auto-fill current price when modal opens
  useEffect(() => {
    if (isOpen) {
      // Reset form first
      setCloseDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setQuantity('');
      setContractsToClose('');

      // Auto-fill current price for stocks/ETFs
      if (position.type === 'stock' || position.type === 'etf') {
        const stockPosition = position as StockPosition;
        if (stockPosition.currentPrice) {
          setClosePrice(stockPosition.currentPrice.toString());
        } else {
          setClosePrice('');
        }
      }

      // Auto-fill current premium for options
      if (position.type === 'call' || position.type === 'put') {
        const option = position as CallOption | PutOption;
        // Calculate current premium per share from currentValue
        // currentValue = premium * contracts * 100
        if (option.currentValue !== undefined) {
          const currentPremiumPerShare = Math.abs(option.currentValue) / (option.contracts * 100);
          setClosePremium(formatNumber(currentPremiumPerShare, 2));
        } else {
          setClosePremium('');
        }
      }
    }
  }, [isOpen, position]);

  if (!isOpen) return null;

  const isStockOrETF = position.type === 'stock' || position.type === 'etf';
  const isOption = position.type === 'call' || position.type === 'put';

  // Check if this position is part of a spread
  const spreadId = getSpreadId(position);
  const spreadLegs = spreadId
    ? allPositions.filter((p) => p.status === 'open' && getSpreadId(p) === spreadId)
    : [];
  const isSpread = spreadLegs.length === 2;

  // Calculate realized P&L
  const calculateRealizedPnL = (): number => {
    const closePriceNum = parseFloat(closePrice) || 0;
    const closePremiumNum = parseFloat(closePremium) || 0;

    if (isSpread && spreadLegs.length === 2) {
      // For spreads the user enters ONE net close premium. Attribute it to a
      // single leg (the other closes at 0) — same allocation the close handler
      // uses — so the preview matches what is actually stored.
      const options = spreadLegs as (CallOption | PutOption)[];
      const longLeg = options.find((o) => o.action === 'buy');
      const shortLeg = options.find((o) => o.action === 'sell');
      if (!longLeg || !shortLeg) return 0;

      const alloc = allocateSpreadClosePremium(longLeg, shortLeg, closePremiumNum);
      return (
        calculateOptionRealizedPnL({
          action: 'buy',
          costBasis: longLeg.costBasis,
          closePremium: alloc.longClosePremium,
          contracts: longLeg.contracts,
        }) +
        calculateOptionRealizedPnL({
          action: 'sell',
          costBasis: shortLeg.costBasis,
          closePremium: alloc.shortClosePremium,
          contracts: shortLeg.contracts,
        })
      );
    } else if (
      isStockOrETF &&
      'shares' in position &&
      'purchasePrice' in position &&
      'costBasis' in position
    ) {
      // Calculate cost basis for the quantity being closed
      const costBasisForQuantity = (position.costBasis / position.shares) * quantityToClose;
      return calculateStockRealizedPnL({
        costBasis: costBasisForQuantity,
        closePrice: closePriceNum,
        shares: quantityToClose,
      });
    } else if (
      isOption &&
      'contracts' in position &&
      'premium' in position &&
      'costBasis' in position
    ) {
      // Calculate cost basis for the contracts being closed
      const costBasisPerContract = position.costBasis / position.contracts;
      const costBasisForQuantity = costBasisPerContract * contractsToCloseNum;

      return calculateOptionRealizedPnL({
        action: position.action,
        costBasis: costBasisForQuantity,
        closePremium: closePremiumNum,
        contracts: contractsToCloseNum,
      });
    }
    return 0;
  };

  const realizedPnL = calculateRealizedPnL();
  const isProfitable = realizedPnL >= 0;

  const handleExpiredWorthless = () => {
    setClosePremium('0');
    setNotes(notes ? `${notes}\n\nExpired worthless` : 'Expired worthless');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isSpread && onConfirmSpread) {
      // Close both legs of the spread
      onConfirmSpread(spreadLegs, {
        closePremium: parseFloat(closePremium),
        closeDate,
        notes,
      });
    } else {
      // Close single position
      onConfirm({
        closePrice: isStockOrETF ? parseFloat(closePrice) : undefined,
        closePremium: isOption ? parseFloat(closePremium) : undefined,
        closeDate,
        notes,
        quantity: isStockOrETF ? quantityToClose : isOption ? contractsToCloseNum : undefined,
        realizedPnL,
      });
    }

    // Reset form
    setClosePrice('');
    setClosePremium('');
    setCloseDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setQuantity('');
    setContractsToClose('');
  };

  const getPositionTitle = (): string => {
    if (isSpread && spreadLegs.length === 2) {
      const option = spreadLegs[0] as CallOption | PutOption;
      const type = option.type === 'call' ? 'Call' : 'Put';
      return t('modalsA.spreadTitle', { ticker: option.ticker, type });
    } else if (position.type === 'stock' || position.type === 'etf') {
      return `${position.ticker} - ${position.type === 'stock' ? t('modalsA.stockType') : t('modalsA.etfType')}`;
    } else if (position.type === 'call' || position.type === 'put') {
      const action =
        (position as { action?: string }).action === 'buy'
          ? t('modalsA.buyAction')
          : t('modalsA.sellAction');
      const type = position.type === 'call' ? 'Call' : 'Put';
      return `${position.ticker} ${action} ${type}`;
    }
    return position.ticker;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-trading-dark-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-trading-dark-800 border-b border-surface-line dark:border-trading-dark-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink-900 dark:text-white">
              {t('modalsA.title')}
            </h2>
            <p className="text-sm text-ink-600 dark:text-ink-400 mt-1">{getPositionTitle()}</p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Close Details */}
          <div className="space-y-4">
            {isStockOrETF && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-ink-700 dark:text-ink-300">
                      {t('modalsA.amountToSell')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setQuantity(totalShares.toString())}
                      className="text-xs px-2 py-1 bg-ink-400 hover:bg-trading-dark-600 text-white rounded transition-colors"
                    >
                      {t('modalsA.max')}
                    </button>
                  </div>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max={totalShares}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                    placeholder={t('modalsA.amountPlaceholderAll', { total: totalShares })}
                  />
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                    {quantity
                      ? t('modalsA.sharesOf', { closing: quantityToClose, total: totalShares })
                      : t('modalsA.leaveEmptyShares', { total: totalShares })}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                    {t('modalsA.salePricePerShare')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={closePrice}
                    onChange={(e) => setClosePrice(e.target.value)}
                    required
                    className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                    placeholder="0,00"
                  />
                </div>
              </>
            )}

            {(isOption || isSpread) && (
              <>
                {/* Number of contracts to close (only for single options, not spreads) */}
                {isOption && !isSpread && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-ink-700 dark:text-ink-300">
                        {t('modalsA.contractsToClose')}
                      </label>
                      <button
                        type="button"
                        onClick={() => setContractsToClose(totalContracts.toString())}
                        className="text-xs px-2 py-1 bg-ink-400 hover:bg-trading-dark-600 text-white rounded transition-colors"
                      >
                        {t('modalsA.max')}
                      </button>
                    </div>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max={totalContracts}
                      value={contractsToClose}
                      onChange={(e) => setContractsToClose(e.target.value)}
                      className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                      placeholder={t('modalsA.contractsPlaceholderAll', { total: totalContracts })}
                    />
                    <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                      {contractsToClose
                        ? t('modalsA.contractsOf', {
                            closing: contractsToCloseNum,
                            total: totalContracts,
                            shares: contractsToCloseNum * 100,
                          })
                        : t('modalsA.leaveEmptyContracts', {
                            total: totalContracts,
                            shares: totalContracts * 100,
                          })}
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-ink-700 dark:text-ink-300">
                      {isSpread
                        ? t('modalsA.closeSpreadPremium')
                        : (position as { action?: string }).action === 'buy'
                          ? t('modalsA.sellPremiumLabel')
                          : t('modalsA.buybackPremiumLabel')}
                    </label>
                    <button
                      type="button"
                      onClick={handleExpiredWorthless}
                      className="text-xs px-2 py-1 bg-ink-400 hover:bg-trading-dark-600 text-white rounded transition-colors"
                    >
                      {t('modalsA.expiredWorthless')}
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={closePremium}
                    onChange={(e) => setClosePremium(e.target.value)}
                    required
                    className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                    placeholder="0,00"
                  />
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                    {isSpread
                      ? t('modalsA.spreadPremiumHelp')
                      : (position as { action?: string }).action === 'buy'
                        ? t('modalsA.sellPremiumHelp')
                        : t('modalsA.buybackPremiumHelp')}
                  </p>
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                {t('modalsA.closeDate')}
              </label>
              <input
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                required
                className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                {t('modalsA.notesOptional')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                placeholder={t('modalsA.closeNotesPlaceholder')}
              />
            </div>
          </div>

          {/* Realized P&L Preview */}
          {((isStockOrETF && closePrice !== '') || (isOption && closePremium !== '')) && (
            <div
              className={`p-4 rounded-lg border-2 ${
                isProfitable
                  ? 'bg-positive-50 dark:bg-positive-700/15 border-positive-500/20 dark:border-positive-700/30'
                  : 'bg-negative-50 dark:bg-negative-700/15 border-negative-500/20 dark:border-negative-700/30'
              }`}
            >
              <div className="flex items-center gap-3">
                {isProfitable ? (
                  <TrendingUp className="w-8 h-8 text-positive-600 dark:text-positive-500" />
                ) : (
                  <TrendingDown className="w-8 h-8 text-negative-600 dark:text-negative-500" />
                )}
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-700 dark:text-ink-300">
                    {t('modalsA.realizedPnL')}
                  </p>
                  <p
                    className={`text-2xl font-bold ${
                      isProfitable
                        ? 'text-positive-600 dark:text-positive-500'
                        : 'text-negative-600 dark:text-negative-500'
                    }`}
                  >
                    {isProfitable ? '+' : ''}
                    {formatCurrency(realizedPnL, currencySymbol)}
                  </p>
                </div>
                {isStockOrETF && 'shares' in position && 'purchasePrice' in position && (
                  <div className="text-right">
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      {t('modalsA.perShare')}
                    </p>
                    <p
                      className={`text-lg font-semibold ${
                        isProfitable
                          ? 'text-positive-600 dark:text-positive-500'
                          : 'text-negative-600 dark:text-negative-500'
                      }`}
                    >
                      {isProfitable ? '+' : ''}
                      {formatCurrency(realizedPnL / quantityToClose, currencySymbol)}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-surface-line dark:border-trading-dark-600">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-ink-500 dark:text-ink-400">{t('modalsA.costBasis')}</p>
                    <p className="font-semibold text-ink-900 dark:text-white">
                      {formatCurrency(
                        isStockOrETF && 'costBasis' in position && 'shares' in position
                          ? (position.costBasis / position.shares) * quantityToClose
                          : isOption && 'costBasis' in position && 'contracts' in position
                            ? Math.abs(
                                (position.costBasis / position.contracts) * contractsToCloseNum
                              )
                            : Math.abs('costBasis' in position ? position.costBasis : 0),
                        currencySymbol
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-500 dark:text-ink-400">{t('modalsA.closeValue')}</p>
                    <p className="font-semibold text-ink-900 dark:text-white">
                      {formatCurrency(
                        isStockOrETF
                          ? parseFloat(closePrice || '0') * quantityToClose
                          : isOption
                            ? parseFloat(closePremium || '0') * contractsToCloseNum * 100
                            : 0,
                        currencySymbol
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-500 dark:text-ink-400">{t('modalsA.returnPercent')}</p>
                    <p
                      className={`font-semibold ${
                        isProfitable
                          ? 'text-positive-600 dark:text-positive-500'
                          : 'text-negative-600 dark:text-negative-500'
                      }`}
                    >
                      {(() => {
                        const costBasisForCalc =
                          isStockOrETF && 'costBasis' in position && 'shares' in position
                            ? (position.costBasis / position.shares) * quantityToClose
                            : isOption && 'costBasis' in position && 'contracts' in position
                              ? Math.abs(
                                  (position.costBasis / position.contracts) * contractsToCloseNum
                                )
                              : Math.abs('costBasis' in position ? position.costBasis : 1);
                        return `${isProfitable ? '+' : ''}${formatNumber((realizedPnL / costBasisForCalc) * 100)}%`;
                      })()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-surface-line dark:border-trading-dark-600">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface-muted dark:bg-trading-dark-700 hover:bg-ink-200 dark:hover:bg-trading-dark-600 text-ink-700 dark:text-ink-200 rounded-lg font-medium transition-colors"
            >
              {t('modalsA.cancel')}
            </button>
            <button
              type="submit"
              disabled={
                (isStockOrETF && (closePrice === '' || parseFloat(closePrice) < 0)) ||
                (isOption && (closePremium === '' || parseFloat(closePremium) < 0))
              }
              className="px-4 py-2 bg-primary-700 hover:bg-primary-800 disabled:bg-ink-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {t('modalsA.closeButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
