import React from 'react';
import { CheckCircle, DollarSign, Calendar, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
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
  const currencySymbol = getCurrencySymbol(currency);

  const isDebit = costBasis > 0;
  const isCredit = costBasis < 0;

  const getTypeLabel = () => {
    switch (type) {
      case 'stock':
        return 'Aandeel';
      case 'etf':
        return 'ETF';
      case 'call':
        return action === 'buy' ? 'Koop Call' : 'Verkoop Call';
      case 'put':
        return action === 'buy' ? 'Koop Put' : 'Verkoop Put (Cash Secured Put)';
      case 'spread-call':
        return 'Call Spread';
      case 'spread-put':
        return 'Put Spread';
      default:
        return 'Position';
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
    <div className={`bg-white dark:bg-gray-800 rounded-lg border-2 border-${color}-200 dark:border-${color}-800 shadow-lg ${className}`}>
      {/* Header */}
      <div className={`bg-${color}-50 dark:bg-${color}-900/20 px-6 py-4 border-b border-${color}-200 dark:border-${color}-800`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <CheckCircle className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
              <div>
                <h3 className={`text-lg font-bold text-${color}-900 dark:text-${color}-300`}>
                  {ticker}
                </h3>
                {tickerName && (
                  <p className={`text-sm text-${color}-700 dark:text-${color}-400`}>
                    {tickerName}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold bg-${color}-100 dark:bg-${color}-900/30 text-${color}-800 dark:text-${color}-300`}>
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Aantal Aandelen</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {shares?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Koopprijs per Aandeel</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {currencySymbol}{purchasePrice !== undefined ? formatNumber(purchasePrice, 2) : ''}
              </p>
            </div>
          </div>
        )}

        {/* Single Option Details */}
        {(type === 'call' || type === 'put') && !longStrike && !shortStrike && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Strike prijs</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {currencySymbol}{strike !== undefined ? formatNumber(strike, 2) : ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Premium</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {currencySymbol}{premium !== undefined ? formatNumber(premium, 2) : ''}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Expiratie</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {expiration ? new Date(expiration).toLocaleDateString('nl-NL') : '-'}
              </p>
              {dte !== undefined && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {dte} dagen tot expiratie
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Contracten</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {contracts}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                = {(contracts || 0) * 100} aandelen
              </p>
            </div>
          </div>
        )}

        {/* Spread Details */}
        {(type === 'spread-call' || type === 'spread-put') && longStrike && shortStrike && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="col-span-2">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  Long Leg ({type === 'spread-call' ? 'Lagere' : 'Hogere'} Strike)
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Strike</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {currencySymbol}{formatNumber(longStrike, 2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Premium</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {currencySymbol}{longPremium !== undefined ? formatNumber(longPremium, 2) : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="col-span-2">
                <p className="text-sm font-semibold text-orange-900 dark:text-orange-300 mb-2">
                  Short Leg ({type === 'spread-call' ? 'Hogere' : 'Lagere'} Strike)
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Strike</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {currencySymbol}{formatNumber(shortStrike, 2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Premium</p>
                <p className="text-base font-semibold text-gray-900 dark:text-white">
                  {currencySymbol}{shortPremium !== undefined ? formatNumber(shortPremium, 2) : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Expiratie</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {expiration ? new Date(expiration).toLocaleDateString('nl-NL') : '-'}
                </p>
                {dte !== undefined && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {dte} dagen tot expiratie
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Contracten</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {contracts}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  = {(contracts || 0) * 100} aandelen per leg
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Financial Summary */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Financiële Samenvatting
          </h4>

          <div className="space-y-3">
            {/* Cost Basis / Net Credit/Debit */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isDebit ? 'Netto Debit' : isCredit ? 'Netto Credit' : 'Totale kost'}
                </span>
              </div>
              <span className={`text-lg font-bold ${
                isDebit
                  ? 'text-red-600 dark:text-red-400'
                  : isCredit
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {isCredit ? '+' : ''}{currencySymbol}{formatNumber(Math.abs(costBasis), 2)}
              </span>
            </div>

            {/* Break-even */}
            {breakEven !== undefined && (
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Break-even prijs
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {currencySymbol}{formatNumber(breakEven, 2)}
                </span>
              </div>
            )}

            {/* Max Profit */}
            {maxProfit !== undefined && (
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">
                    Max Winst
                  </span>
                </div>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {maxProfit === Infinity ? '∞' : `+${currencySymbol}${formatNumber(maxProfit, 2)}`}
                </span>
              </div>
            )}

            {/* Max Loss */}
            {maxLoss !== undefined && (
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                    Max Verlies
                  </span>
                </div>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  {maxLoss === Infinity ? '∞' : `-${currencySymbol}${formatNumber(maxLoss, 2)}`}
                </span>
              </div>
            )}

            {/* Cash Reserved */}
            {cashReserved !== undefined && cashReserved > 0 && (
              <div className="flex items-center justify-between p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                    Cash Gereserveerd
                  </span>
                </div>
                <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {currencySymbol}{formatNumber(cashReserved, 2)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>Datum: {new Date(date).toLocaleDateString('nl-NL')}</span>
        </div>

        {/* Notes */}
        {notes && (
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notities
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {notes}
            </p>
          </div>
        )}
      </div>

      {/* Footer Warning */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Controleer alle details voordat je deze positie opent. Deze actie kan niet ongedaan worden gemaakt.
          </p>
        </div>
      </div>
    </div>
  );
};
