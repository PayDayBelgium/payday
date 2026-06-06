import React from 'react';
import {
  CheckCircle,
  DollarSign,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getCurrencySymbol } from '../../utils/currency';
import { formatNumber } from '../../utils/numberFormat';
import type { CurrencyType } from '../../types';

interface ConfirmationTicketProps {
  type: 'stock' | 'etf' | 'call' | 'put' | 'spread-call' | 'spread-put';
  action?: 'buy' | 'sell';
  ticker: string;
  tickerName?: string;

  // Stock/ETF specific
  shares?: number;
  purchasePrice?: number;

  // Option specific
  strike?: number;
  expiration?: string;
  premium?: number;
  contracts?: number;
  dte?: number;
  breakEven?: number;

  // Spread specific
  longStrike?: number;
  shortStrike?: number;
  longPremium?: number;
  shortPremium?: number;

  // Calculations
  costBasis: number;
  maxProfit?: number;
  maxLoss?: number;
  cashReserved?: number;

  // Metadata
  currency: CurrencyType;
  date: string;
  notes?: string;

  className?: string;
}

export const ConfirmationTicket: React.FC<ConfirmationTicketProps> = ({
  type,
  action,
  ticker,
  tickerName,
  shares,
  purchasePrice,
  strike,
  expiration,
  premium,
  contracts,
  dte,
  breakEven,
  longStrike,
  shortStrike,
  longPremium,
  shortPremium,
  costBasis,
  maxProfit,
  maxLoss,
  cashReserved,
  currency,
  date,
  notes,
  className = '',
}) => {
  const { t } = useTranslation();
  const currencySymbol = getCurrencySymbol(currency);

  const isDebit = costBasis > 0;
  const isCredit = costBasis < 0;

  const getTypeLabel = () => {
    switch (type) {
      case 'stock':
        return t('widgetsB.typeStock');
      case 'etf':
        return t('widgetsB.typeEtf');
      case 'call':
        return action === 'buy' ? t('widgetsB.buyCall') : t('widgetsB.sellCall');
      case 'put':
        return action === 'buy' ? t('widgetsB.buyPut') : t('widgetsB.sellPutCsp');
      case 'spread-call':
        return t('widgetsB.callSpread');
      case 'spread-put':
        return t('widgetsB.putSpread');
      default:
        return t('widgetsB.position');
    }
  };

  const getTypeColor = () => {
    switch (type) {
      case 'stock':
      case 'etf':
        return 'blue';
      case 'call':
        return 'purple';
      case 'put':
        return 'red';
      case 'spread-call':
      case 'spread-put':
        return 'indigo';
      default:
        return 'gray';
    }
  };

  const color = getTypeColor();

  return (
    <div
      className={`bg-white dark:bg-trading-dark-800 rounded-lg border-2 border-${color}-200 dark:border-${color}-800 shadow-lg ${className}`}
    >
      {/* Header */}
      <div
        className={`bg-${color}-50 dark:bg-${color}-900/20 px-6 py-4 border-b border-${color}-200 dark:border-${color}-800`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <CheckCircle className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
              <div>
                <h3 className={`text-lg font-bold text-${color}-900 dark:text-${color}-300`}>
                  {ticker}
                </h3>
                {tickerName && (
                  <p className={`text-sm text-${color}-700 dark:text-${color}-400`}>{tickerName}</p>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold bg-${color}-100 dark:bg-${color}-900/30 text-${color}-800 dark:text-${color}-300`}
            >
              {getTypeLabel()}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-6 space-y-6">
        {/* Stock/ETF Details */}
        {(type === 'stock' || type === 'etf') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-ink-500 dark:text-ink-400 mb-1">
                {t('widgetsB.numberOfShares')}
              </p>
              <p className="text-lg font-semibold text-ink-900 dark:text-white">
                {shares?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-ink-500 dark:text-ink-400 mb-1">
                {t('widgetsB.pricePerShare')}
              </p>
              <p className="text-lg font-semibold text-ink-900 dark:text-white">
                {currencySymbol}
                {purchasePrice !== undefined ? formatNumber(purchasePrice, 2) : ''}
              </p>
            </div>
          </div>
        )}

        {/* Single Option Details */}
        {(type === 'call' || type === 'put') && !longStrike && !shortStrike && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-ink-500 dark:text-ink-400 mb-1">
                {t('widgetsB.strikePrice')}
              </p>
              <p className="text-lg font-semibold text-ink-900 dark:text-white">
                {currencySymbol}
                {strike !== undefined ? formatNumber(strike, 2) : ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-ink-500 dark:text-ink-400 mb-1">{t('widgetsB.premium')}</p>
              <p className="text-lg font-semibold text-ink-900 dark:text-white">
                {currencySymbol}
                {premium !== undefined ? formatNumber(premium, 2) : ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-ink-500 dark:text-ink-400 mb-1">
                {t('widgetsB.expiration')}
              </p>
              <p className="text-lg font-semibold text-ink-900 dark:text-white">
                {expiration ? new Date(expiration).toLocaleDateString('nl-NL') : '-'}
              </p>
              {dte !== undefined && (
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                  {t('widgetsB.daysToExpiration', { days: dte })}
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-ink-500 dark:text-ink-400 mb-1">
                {t('widgetsB.contracts')}
              </p>
              <p className="text-lg font-semibold text-ink-900 dark:text-white">{contracts}</p>
              <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                {t('widgetsB.equalsShares', { shares: (contracts || 0) * 100 })}
              </p>
            </div>
          </div>
        )}

        {/* Spread Details */}
        {(type === 'spread-call' || type === 'spread-put') && longStrike && shortStrike && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <div className="col-span-2">
                <p className="text-sm font-semibold text-primary-900 dark:text-primary-300 mb-2">
                  {t('widgetsB.longLeg', {
                    strike: type === 'spread-call' ? t('widgetsB.lower') : t('widgetsB.higher'),
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-600 dark:text-ink-400">{t('widgetsB.strike')}</p>
                <p className="text-base font-semibold text-ink-900 dark:text-white">
                  {currencySymbol}
                  {formatNumber(longStrike, 2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-600 dark:text-ink-400">{t('widgetsB.premium')}</p>
                <p className="text-base font-semibold text-ink-900 dark:text-white">
                  {currencySymbol}
                  {longPremium !== undefined ? formatNumber(longPremium, 2) : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-caution-50 dark:bg-caution-600/15 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
              <div className="col-span-2">
                <p className="text-sm font-semibold text-orange-900 dark:text-caution-500 mb-2">
                  {t('widgetsB.shortLeg', {
                    strike: type === 'spread-call' ? t('widgetsB.higher') : t('widgetsB.lower'),
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-600 dark:text-ink-400">{t('widgetsB.strike')}</p>
                <p className="text-base font-semibold text-ink-900 dark:text-white">
                  {currencySymbol}
                  {formatNumber(shortStrike, 2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-600 dark:text-ink-400">{t('widgetsB.premium')}</p>
                <p className="text-base font-semibold text-ink-900 dark:text-white">
                  {currencySymbol}
                  {shortPremium !== undefined ? formatNumber(shortPremium, 2) : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-ink-500 dark:text-ink-400 mb-1">
                  {t('widgetsB.expiration')}
                </p>
                <p className="text-lg font-semibold text-ink-900 dark:text-white">
                  {expiration ? new Date(expiration).toLocaleDateString('nl-NL') : '-'}
                </p>
                {dte !== undefined && (
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                    {t('widgetsB.daysToExpiration', { days: dte })}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-ink-500 dark:text-ink-400 mb-1">
                  {t('widgetsB.contracts')}
                </p>
                <p className="text-lg font-semibold text-ink-900 dark:text-white">{contracts}</p>
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                  {t('widgetsB.equalsSharesPerLeg', { shares: (contracts || 0) * 100 })}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="border-t border-surface-line dark:border-trading-dark-600 pt-4">
          <h4 className="text-sm font-semibold text-ink-700 dark:text-ink-300 mb-3">
            {t('widgetsB.financialSummary')}
          </h4>

          <div className="space-y-3">
            {/* Cost Basis / Net Credit/Debit */}
            <div className="flex items-center justify-between p-3 bg-surface dark:bg-trading-dark-900 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-ink-600 dark:text-ink-400" />
                <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                  {isDebit
                    ? t('widgetsB.netDebit')
                    : isCredit
                      ? t('widgetsB.netCredit')
                      : t('widgetsB.totalCost')}
                </span>
              </div>
              <span
                className={`text-lg font-bold ${
                  isDebit
                    ? 'text-negative-600 dark:text-negative-500'
                    : isCredit
                      ? 'text-positive-600 dark:text-positive-500'
                      : 'text-ink-900 dark:text-white'
                }`}
              >
                {isCredit ? '+' : ''}
                {currencySymbol}
                {formatNumber(Math.abs(costBasis), 2)}
              </span>
            </div>

            {/* Break-even */}
            {breakEven !== undefined && (
              <div className="flex items-center justify-between p-3 bg-surface dark:bg-trading-dark-900 rounded-lg">
                <span className="text-sm font-medium text-ink-700 dark:text-ink-300">
                  {t('widgetsB.breakEvenPrice')}
                </span>
                <span className="text-lg font-bold text-ink-900 dark:text-white">
                  {currencySymbol}
                  {formatNumber(breakEven, 2)}
                </span>
              </div>
            )}

            {/* Max Profit */}
            {maxProfit !== undefined && (
              <div className="flex items-center justify-between p-3 bg-positive-50 dark:bg-positive-700/15 rounded-lg border border-positive-500/20 dark:border-positive-700/30">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-positive-600 dark:text-positive-500" />
                  <span className="text-sm font-medium text-positive-700 dark:text-positive-500">
                    {t('widgetsB.maxProfit')}
                  </span>
                </div>
                <span className="text-lg font-bold text-positive-600 dark:text-positive-500">
                  {maxProfit === Infinity ? '∞' : `+${currencySymbol}${formatNumber(maxProfit, 2)}`}
                </span>
              </div>
            )}

            {/* Max Loss */}
            {maxLoss !== undefined && (
              <div className="flex items-center justify-between p-3 bg-negative-50 dark:bg-negative-700/15 rounded-lg border border-negative-500/20 dark:border-negative-700/30">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-negative-600 dark:text-negative-500" />
                  <span className="text-sm font-medium text-negative-700 dark:text-negative-500">
                    {t('widgetsB.maxLoss')}
                  </span>
                </div>
                <span className="text-lg font-bold text-negative-600 dark:text-negative-500">
                  {maxLoss === Infinity ? '∞' : `-${currencySymbol}${formatNumber(maxLoss, 2)}`}
                </span>
              </div>
            )}

            {/* Cash Reserved */}
            {cashReserved !== undefined && cashReserved > 0 && (
              <div className="flex items-center justify-between p-3 bg-caution-50 dark:bg-caution-600/15 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-caution-600 dark:text-caution-500" />
                  <span className="text-sm font-medium text-caution-600 dark:text-caution-500">
                    {t('widgetsB.cashReserved')}
                  </span>
                </div>
                <span className="text-lg font-bold text-caution-600 dark:text-caution-500">
                  {currencySymbol}
                  {formatNumber(cashReserved, 2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-ink-600 dark:text-ink-400">
          <Calendar className="w-4 h-4" />
          <span>
            {t('widgetsB.dateLabel', { date: new Date(date).toLocaleDateString('nl-NL') })}
          </span>
        </div>

        {/* Notes */}
        {notes && (
          <div className="p-3 bg-surface dark:bg-trading-dark-900 rounded-lg">
            <p className="text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
              {t('widgetsB.notes')}
            </p>
            <p className="text-sm text-ink-600 dark:text-ink-400">{notes}</p>
          </div>
        )}
      </div>

      {/* Footer Warning */}
      <div className="px-6 py-4 bg-surface dark:bg-trading-dark-900 border-t border-surface-line dark:border-trading-dark-600">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-caution-600 dark:text-caution-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-ink-600 dark:text-ink-400">{t('widgetsB.ticketWarning')}</p>
        </div>
      </div>
    </div>
  );
};
