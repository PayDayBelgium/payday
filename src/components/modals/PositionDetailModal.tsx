import React, { useState, useEffect } from 'react';
import { X, Save, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, Calendar, DollarSign, FileText, BarChart3, Building2 } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { formatNumberInput, parseNumberInput, validateNumberInput } from '../../utils/inputFormat';
import type { Position, CallOption, PutOption, CurrencyType } from '../../types';
import { PnLCurve } from '../widgets/PnLCurve';

interface PositionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPosition: Position) => void;
  position: Position;
  currency: CurrencyType;
}

export const PositionDetailModal: React.FC<PositionDetailModalProps> = ({
  isOpen,
  onClose,
  onSave,
  position,
  currency,
}) => {
  const currencySymbol = getCurrencySymbol(currency);
  const [notes, setNotes] = useState(position.notes || '');
  const [currentPrice, setCurrentPrice] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'pnl'>('overview');

  useEffect(() => {
    if (isOpen) {
      setNotes(position.notes || '');
      // For options, set the current premium price
      if ((position.type === 'call' || position.type === 'put') && 'premium' in position) {
        const option = position as CallOption | PutOption;
        const currentPremium = Math.abs(option.currentValue / (option.contracts * 100));
        setCurrentPrice(formatNumberInput(currentPremium, 2));
      } else if ((position.type === 'stock' || position.type === 'etf') && 'currentPrice' in position) {
        // For stocks/ETFs, set the current stock price
        const stock = position as any;
        setCurrentPrice(formatNumberInput(stock.currentPrice, 2));
      }
    }
  }, [isOpen, position]);

  if (!isOpen) return null;

  const isOption = position.type === 'call' || position.type === 'put';
  const option = isOption ? (position as CallOption | PutOption) : null;
  const isCall = option?.type === 'call';
  const isBuy = option?.action === 'buy';

  const handleSave = () => {
    const updatedPosition = {
      ...position,
      notes,
    };

    // If it's an option and current price was updated, update currentValue
    if (option && currentPrice) {
      const parsedPrice = parseNumberInput(currentPrice);
      if (parsedPrice > 0) {
        (updatedPosition as CallOption | PutOption).currentValue =
          option.action === 'buy'
            ? parsedPrice * option.contracts * 100
            : -(parsedPrice * option.contracts * 100);
      }
    } else if ((position.type === 'stock' || position.type === 'etf') && currentPrice) {
      // If it's a stock/ETF and current price was updated, update currentPrice and currentValue
      const parsedPrice = parseNumberInput(currentPrice);
      if (parsedPrice > 0) {
        const stock = updatedPosition as any;
        stock.currentPrice = parsedPrice;
        stock.currentValue = parsedPrice * stock.shares;
      }
    }

    onSave(updatedPosition);
    onClose();
  };

  // Calculate DTE
  const calculateDTE = (): number => {
    if (!option?.expiration) return 0;
    const today = new Date();
    const expiry = new Date(option.expiration);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysToExpiration = calculateDTE();

  // Calculate metrics for options
  const currentPremium = option ? Math.abs(option.currentValue / (option.contracts * 100)) : 0;
  const fillPremium = option?.premium || 0;
  const premiumDifference = currentPremium - fillPremium;
  const totalFillValue = option ? fillPremium * option.contracts * 100 : 0;
  const totalCurrentValue = option ? Math.abs(option.currentValue) : 0;
  const totalDifference = totalCurrentValue - totalFillValue;

  const nominalProfit = option ? option.currentValue - option.costBasis : 0;
  const profitPercent = option && option.costBasis !== 0 ? (nominalProfit / Math.abs(option.costBasis)) * 100 : 0;
  const isProfitable = nominalProfit >= 0;

  const getPositionTitle = (): string => {
    if (option) {
      const action = option.action === 'buy' ? 'Long' : 'Short';
      const type = option.type === 'call' ? 'Call' : 'Put';
      return `${option.contracts}x ${option.ticker} ${action} ${type}`;
    } else if (position.type === 'stock' || position.type === 'etf') {
      const stock = position as any;
      return `${stock.shares}x ${position.ticker}`;
    }
    return position.ticker;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Icon for options */}
            {option && (
              <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${
                isCall
                  ? 'bg-positive-50 dark:bg-positive-700/25 text-positive-600 dark:text-positive-500'
                  : 'bg-surface-muted dark:bg-trading-dark-600 text-ink-600 dark:text-ink-300'
              }`}>
                {isCall ? (
                  <ArrowUpCircle className="w-5 h-5" />
                ) : (
                  <ArrowDownCircle className="w-5 h-5" />
                )}
              </div>
            )}
            {/* Icon for stocks/ETFs */}
            {(position.type === 'stock' || position.type === 'etf') && (
              <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${
                position.type === 'stock'
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-surface-muted dark:bg-trading-dark-600 text-ink-600 dark:text-ink-300'
              }`}>
                {position.type === 'stock' ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <Building2 className="w-5 h-5" />
                )}
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {getPositionTitle()}
              </h2>
              {option?.name && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{option.name}</p>
              )}
              {(position.type === 'stock' || position.type === 'etf') && 'name' in position && position.name && (
                <p className="text-sm text-gray-600 dark:text-gray-400">{(position as any).name}</p>
              )}
            </div>
            {option && (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                  isCall
                    ? 'bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500'
                    : 'bg-surface-muted dark:bg-trading-dark-600 text-ink-700 dark:text-ink-300'
                }`}>
                  {isCall ? 'CALL' : 'PUT'}
                </span>
                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                  isBuy
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'bg-caution-50 dark:bg-caution-600/25 text-caution-600 dark:text-caution-500'
                }`}>
                  {isBuy ? 'LONG' : 'SHORT'}
                </span>
              </div>
            )}
            {(position.type === 'stock' || position.type === 'etf') && (
              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                position.type === 'stock'
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'bg-surface-muted dark:bg-trading-dark-600 text-ink-700 dark:text-ink-300'
              }`}>
                {position.type === 'stock' ? 'AANDEEL' : 'ETF'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Tab Headers */}
        {option && (
          <div className="flex bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 border-primary-700 dark:border-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border-transparent'
              }`}
            >
              <FileText className="w-4 h-4" />
              Overzicht
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pnl')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'pnl'
                  ? 'bg-white dark:bg-gray-700 text-primary-700 dark:text-primary-300 border-primary-700 dark:border-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 border-transparent'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              P&L Diagram
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 space-y-6 min-h-[600px]">
          {/* Tab Content - Overview */}
          {activeTab === 'overview' && (
            <>
              {/* Option Details */}
              {option && (
                <>
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-2">
                        <DollarSign className="w-4 h-4" />
                        Strike prijs
                      </div>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(option.strike, currencySymbol)}
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-2">
                        <Calendar className="w-4 h-4" />
                        Expiratie
                      </div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        {option.expiration ? new Date(option.expiration).toLocaleDateString('nl-NL') : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {daysToExpiration > 0 ? `${daysToExpiration} dagen` : 'Verlopen'}
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                      <div className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                        Winst/Verlies
                      </div>
                      <p className={`text-xl font-bold ${
                        isProfitable
                          ? 'text-positive-600 dark:text-positive-500'
                          : 'text-negative-600 dark:text-negative-500'
                      }`}>
                        {isProfitable ? '+' : ''}{formatCurrency(nominalProfit, currencySymbol)}
                      </p>
                      <p className={`text-sm font-medium ${
                        isProfitable
                          ? 'text-positive-600 dark:text-positive-500'
                          : 'text-negative-600 dark:text-negative-500'
                      }`}>
                        {isProfitable ? '+' : ''}{formatNumber(profitPercent)}%
                      </p>
                    </div>
                  </div>

              {/* Premium Details */}
              <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-2 border border-primary-200 dark:border-primary-800">
                <h3 className="font-semibold text-primary-900 dark:text-primary-300 mb-2">
                  Premium Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <p className="text-sm text-primary-700 dark:text-primary-300 mb-2">Fill Premie</p>
                    <p className="text-2xl font-bold text-primary-900 dark:text-primary-300">
                      {formatCurrency(fillPremium, currencySymbol)}
                    </p>
                    <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                      Totaal: {formatCurrency(totalFillValue, currencySymbol)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-primary-700 dark:text-primary-300 mb-2">Huidige Premie</p>
                    <input
                      type="text"
                      value={currentPrice}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (validateNumberInput(value)) {
                          setCurrentPrice(value);
                        }
                      }}
                      className="w-20 px-2 py-0.5 text-lg font-bold bg-white dark:bg-gray-700 border border-primary-300 dark:border-primary-700 rounded text-primary-900 dark:text-primary-300"
                      placeholder="0,00"
                    />
                    <p className="text-sm text-primary-700 dark:text-primary-300 mt-1">
                      Totaal: {formatCurrency(totalCurrentValue, currencySymbol)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-primary-700 dark:text-primary-300 mb-2">Verschil</p>
                    <p className={`text-2xl font-bold ${
                      // For short positions, negative is good (green)
                      // For long positions, positive is good (green)
                      (isBuy && premiumDifference >= 0) || (!isBuy && premiumDifference < 0)
                        ? 'text-positive-600 dark:text-positive-500'
                        : 'text-negative-600 dark:text-negative-500'
                    }`}>
                      {/* Always show absolute value without +/- sign */}
                      {formatCurrency(Math.abs(premiumDifference), currencySymbol)}
                    </p>
                    <p className={`text-sm font-medium mt-1 ${
                      (isBuy && totalDifference >= 0) || (!isBuy && totalDifference < 0)
                        ? 'text-positive-600 dark:text-positive-500'
                        : 'text-negative-600 dark:text-negative-500'
                    }`}>
                      Totaal: {formatCurrency(Math.abs(totalDifference), currencySymbol)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Collateral Info */}
              {option.cashReserved && option.cashReserved > 0 && (
                <div className="bg-caution-50 dark:bg-caution-600/15 rounded-lg p-2 border border-caution-500/30 dark:border-caution-600/40">
                  <h4 className="font-semibold text-orange-900 dark:text-caution-500 mb-2">
                    Onderpand (Cash Gereserveerd)
                  </h4>
                  <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
                    {formatCurrency(option.cashReserved, currencySymbol)}
                  </p>
                  <p className="text-sm text-caution-600 dark:text-caution-500 mt-1">
                    Deze cash moet beschikbaar zijn voor mogelijke assignment
                  </p>
                </div>
              )}
            </>
          )}

          {/* Stock/ETF Details */}
          {!isOption && (position.type === 'stock' || position.type === 'etf') && (() => {
            const stock = position as any;
            const profitLoss = stock.currentValue - stock.costBasis;
            const profitLossPercentage = stock.costBasis > 0 ? (profitLoss / stock.costBasis) * 100 : 0;
            const isProfitable = profitLoss >= 0;
            const pricePerShare = currentPrice ? parseNumberInput(currentPrice) : stock.currentPrice;
            const totalValue = pricePerShare * stock.shares;
            const pnl = totalValue - stock.costBasis;
            const pnlPercent = stock.costBasis > 0 ? (pnl / stock.costBasis) * 100 : 0;

            return (
              <>
                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                      Aantal Aandelen
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {stock.shares}
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                      Aankoopprijs
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(stock.purchasePrice, currencySymbol)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      per aandeel
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                      Kostenbasis
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(stock.costBasis, currencySymbol)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      totaal
                    </p>
                  </div>
                </div>

                {/* Current Price Section */}
                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 border border-primary-200 dark:border-primary-800">
                  <h3 className="font-semibold text-primary-900 dark:text-primary-300 mb-3">
                    Huidige Waarde
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-primary-700 dark:text-primary-300 mb-2">Prijs per Aandeel</p>
                      <input
                        type="text"
                        value={currentPrice}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (validateNumberInput(value)) {
                            setCurrentPrice(value);
                          }
                        }}
                        className="w-28 px-3 py-2 text-lg font-bold bg-white dark:bg-gray-700 border border-primary-300 dark:border-primary-700 rounded text-primary-900 dark:text-primary-300"
                        placeholder="0,00"
                      />
                    </div>

                    <div>
                      <p className="text-sm text-primary-700 dark:text-primary-300 mb-2">Totale Waarde</p>
                      <p className="text-2xl font-bold text-primary-900 dark:text-primary-300">
                        {formatCurrency(totalValue, currencySymbol)}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-primary-700 dark:text-primary-300 mb-2">Winst/Verlies</p>
                      <p className={`text-2xl font-bold ${
                        pnl >= 0
                          ? 'text-positive-600 dark:text-positive-500'
                          : 'text-negative-600 dark:text-negative-500'
                      }`}>
                        {pnl >= 0 ? '+' : ''}{formatCurrency(pnl, currencySymbol)}
                      </p>
                      <p className={`text-sm font-medium mt-1 ${
                        pnl >= 0
                          ? 'text-positive-600 dark:text-positive-500'
                          : 'text-negative-600 dark:text-negative-500'
                      }`}>
                        {pnl >= 0 ? '+' : ''}{formatNumber(pnlPercent)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Opties Beschikbaar</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {stock.optionsSupported ? 'Ja' : 'Nee'}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-gray-600 dark:text-gray-400 mb-1">Mini Contracts</p>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {stock.miniContractsSupported ? 'Ja (10 shares)' : 'Nee'}
                    </p>
                  </div>
                </div>
              </>
            );
          })()}

              {/* Notes Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notities / Commentaar
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Voeg notities toe over deze positie, strategie, doelen, etc..."
                />
              </div>
            </>
          )}

          {/* Tab Content - P&L Diagram */}
          {activeTab === 'pnl' && option && (
            <PnLCurve
              type={
                option.type === 'call'
                  ? (isBuy ? 'call-buy' : 'call-sell')
                  : (isBuy ? 'put-buy' : 'put-sell')
              }
              strike={option.strike}
              premium={option.premium}
              contracts={option.contracts}
              actualCurrentPrice={currentPrice ? parseNumberInput(currentPrice) * option.strike : undefined}
              currency={currency}
            />
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Position Dates - Left side */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <p className="text-gray-600 dark:text-gray-400">Geopend op</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {new Date(position.openDate).toLocaleDateString('nl-NL')}
                </p>
              </div>
              {position.status === 'closed' && position.closeDate && (
                <div className="flex items-center gap-2">
                  <p className="text-gray-600 dark:text-gray-400">Gesloten op</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {new Date(position.closeDate).toLocaleDateString('nl-NL')}
                  </p>
                </div>
              )}
            </div>

            {/* Buttons - Right side */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                Opslaan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
