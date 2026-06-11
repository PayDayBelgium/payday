import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { formatNumberInput, parseNumberInput } from '../../utils/inputFormat';
import type { Position, CallOption, PutOption, CurrencyType } from '../../types';
import { PnLCurve } from '../widgets/PnLCurve';

interface SpreadDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedLegs: Position[]) => void;
  legs: Position[];
  currency: CurrencyType;
  currentStockPrice?: number; // Optional: current stock price for P&L curve
}

export const SpreadDetailModal: React.FC<SpreadDetailModalProps> = ({
  isOpen,
  onClose,
  onSave,
  legs,
  currency,
  currentStockPrice: propCurrentStockPrice,
}) => {
  const { t } = useTranslation();
  const currencySymbol = getCurrencySymbol(currency);
  const [activeTab, setActiveTab] = useState<'overview' | 'pnl'>('overview');

  // State for both legs
  const longLeg = legs.find((leg) => (leg as CallOption | PutOption).action === 'buy') as
    | CallOption
    | PutOption
    | undefined;
  const shortLeg = legs.find((leg) => (leg as CallOption | PutOption).action === 'sell') as
    | CallOption
    | PutOption
    | undefined;

  const [longCurrentPremium, setLongCurrentPremium] = useState('');
  const [shortCurrentPremium, setShortCurrentPremium] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && longLeg && shortLeg) {
      // Set initial values
      const longPremium = Math.abs(longLeg.currentValue / (longLeg.contracts * 100));
      const shortPremium = Math.abs(shortLeg.currentValue / (shortLeg.contracts * 100));
      setLongCurrentPremium(formatNumberInput(longPremium, 2));
      setShortCurrentPremium(formatNumberInput(shortPremium, 2));

      // Use notes from the first leg (they should be the same)
      setNotes(longLeg.notes || '');
    }
  }, [isOpen, longLeg, shortLeg]);

  if (!isOpen || !longLeg || !shortLeg) return null;

  const isCredit = shortLeg.premium > longLeg.premium;
  const spreadType = isCredit ? 'credit' : 'debit';
  const ticker = longLeg.ticker;
  const contracts = longLeg.contracts;

  // Calculate spread metrics
  const spreadWidth = Math.abs(shortLeg.strike - longLeg.strike);
  const netPremium = (shortLeg.premium - longLeg.premium) * contracts * 100;
  const totalCostBasis = longLeg.costBasis + shortLeg.costBasis;
  const totalCurrentValue = longLeg.currentValue + shortLeg.currentValue;
  const totalPnL = totalCurrentValue - totalCostBasis;
  const isProfitable = totalPnL >= 0;

  const maxProfit = isCredit
    ? netPremium
    : (spreadWidth - Math.abs(netPremium / (contracts * 100))) * contracts * 100;

  const maxLoss = isCredit
    ? (spreadWidth - Math.abs(netPremium / (contracts * 100))) * contracts * 100
    : Math.abs(netPremium);

  const collateral = isCredit ? spreadWidth * contracts * 100 : 0;

  // Calculate DTE
  const calculateDTE = (): number => {
    if (!longLeg.expiration) return 0;
    const today = new Date();
    const expiry = new Date(longLeg.expiration);
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const daysToExpiration = calculateDTE();

  // Use provided stock price or calculate approximation
  const currentStockPrice = propCurrentStockPrice || shortLeg.strike;

  const handleSave = () => {
    // Update both legs
    const updatedLegs: Position[] = [];

    // Update long leg
    const parsedLongPrice = parseNumberInput(longCurrentPremium);
    if (parsedLongPrice > 0) {
      const updatedLong = {
        ...longLeg,
        currentValue: parsedLongPrice * longLeg.contracts * 100,
        notes,
      };
      updatedLegs.push(updatedLong);
    } else {
      updatedLegs.push({ ...longLeg, notes });
    }

    // Update short leg
    const parsedShortPrice = parseNumberInput(shortCurrentPremium);
    if (parsedShortPrice > 0) {
      const updatedShort = {
        ...shortLeg,
        currentValue: -(parsedShortPrice * shortLeg.contracts * 100),
        notes,
      };
      updatedLegs.push(updatedShort);
    } else {
      updatedLegs.push({ ...shortLeg, notes });
    }

    onSave(updatedLegs);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-trading-dark-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-trading-dark-800 border-b border-surface-line dark:border-trading-dark-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-ink-900 dark:text-white flex items-center gap-2">
              <span className="px-2 py-1 text-xs font-semibold rounded bg-surface-muted dark:bg-trading-dark-600 text-ink-700 dark:text-ink-300">
                {longLeg.type.toUpperCase()} {t('modalsA.spreadSuffix')}
              </span>
              <span
                className={`px-2 py-1 text-xs font-semibold rounded ${
                  spreadType === 'credit'
                    ? 'bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500'
                    : 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                }`}
              >
                {spreadType === 'credit' ? t('modalsA.creditUpper') : t('modalsA.debitUpper')}
              </span>
            </h2>
            <p className="text-sm text-ink-600 dark:text-ink-400 mt-1">
              {contracts}x {ticker} ${Math.min(longLeg.strike, shortLeg.strike)}-$
              {Math.max(longLeg.strike, shortLeg.strike)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-surface-line dark:border-trading-dark-600">
          <div className="flex px-6">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-ink-700 text-ink-600 dark:text-ink-300'
                  : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300'
              }`}
            >
              {t('modalsA.overview')}
            </button>
            <button
              onClick={() => setActiveTab('pnl')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'pnl'
                  ? 'border-ink-700 text-ink-600 dark:text-ink-300'
                  : 'border-transparent text-ink-500 dark:text-ink-400 hover:text-ink-700 dark:hover:text-ink-300'
              }`}
            >
              {t('modalsA.pnlCurve')}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 min-h-[600px]">
          {activeTab === 'overview' ? (
            <div className="space-y-6">
              {/* Spread Summary */}
              <div
                className={`p-4 rounded-lg border-2 ${
                  isProfitable
                    ? 'bg-positive-50 dark:bg-positive-700/15 border-positive-500/20 dark:border-positive-700/30'
                    : 'bg-negative-50 dark:bg-negative-700/15 border-negative-500/20 dark:border-negative-700/30'
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  {isProfitable ? (
                    <TrendingUp className="w-8 h-8 text-positive-600 dark:text-positive-500" />
                  ) : (
                    <TrendingDown className="w-8 h-8 text-negative-600 dark:text-negative-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink-700 dark:text-ink-300">
                      {t('modalsA.totalProfitLoss')}
                    </p>
                    <p
                      className={`text-2xl font-bold ${
                        isProfitable
                          ? 'text-positive-600 dark:text-positive-500'
                          : 'text-negative-600 dark:text-negative-500'
                      }`}
                    >
                      {isProfitable ? '+' : ''}
                      {formatCurrency(totalPnL, currencySymbol)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-500 dark:text-ink-400">
                      {t('modalsA.returnPercent')}
                    </p>
                    <p
                      className={`text-lg font-semibold ${
                        isProfitable
                          ? 'text-positive-600 dark:text-positive-500'
                          : 'text-negative-600 dark:text-negative-500'
                      }`}
                    >
                      {isProfitable ? '+' : ''}
                      {formatNumber((totalPnL / Math.abs(totalCostBasis)) * 100)}%
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-6 text-sm">
                  <div className="flex flex-col">
                    <p className="text-ink-500 dark:text-ink-400 mb-1">{t('modalsA.netPremium')}</p>
                    <p
                      className={`font-semibold text-base ${
                        isCredit
                          ? 'text-positive-600 dark:text-positive-500'
                          : 'text-primary-700 dark:text-primary-300'
                      }`}
                    >
                      {isCredit ? '+' : '-'}
                      {formatCurrency(Math.abs(netPremium), currencySymbol)}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-ink-500 dark:text-ink-400 mb-1">{t('modalsA.maxProfit')}</p>
                    <p className="font-semibold text-base text-positive-600 dark:text-positive-500">
                      +{formatCurrency(maxProfit, currencySymbol)}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-ink-500 dark:text-ink-400 mb-1">{t('modalsA.maxLoss')}</p>
                    <p className="font-semibold text-base text-negative-600 dark:text-negative-500">
                      -{formatCurrency(maxLoss, currencySymbol)}
                    </p>
                  </div>
                  <div className="flex flex-col">
                    <p className="text-ink-500 dark:text-ink-400 mb-1">
                      {t('modalsA.spreadWidth')}
                    </p>
                    <p className="font-semibold text-base text-ink-900 dark:text-white">
                      ${formatNumber(spreadWidth, 2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Spread Details */}
              <div className="grid grid-cols-2 gap-4">
                {/* Long Leg */}
                <div className="p-4 border-2 border-primary-200 dark:border-primary-800 rounded-lg bg-primary-50/50 dark:bg-primary-900/15">
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowUpCircle className="w-5 h-5 text-primary-700 dark:text-primary-300" />
                    <h3 className="font-semibold text-ink-900 dark:text-white">
                      {t('modalsA.longLegBuy')}
                    </h3>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-ink-500 dark:text-ink-400">{t('modalsA.strike')}</p>
                      <p className="font-semibold text-ink-900 dark:text-white">
                        {formatCurrency(longLeg.strike, currencySymbol)}
                      </p>
                    </div>
                    <div>
                      <p className="text-ink-500 dark:text-ink-400">
                        {t('modalsA.fillPremiumPerShare')}
                      </p>
                      <p className="font-semibold text-ink-900 dark:text-white">
                        {formatCurrency(longLeg.premium, currencySymbol)}
                      </p>
                    </div>
                    <div>
                      <p className="text-ink-500 dark:text-ink-400 mb-1">
                        {t('modalsA.currentPremiumPerShare')}
                      </p>
                      <input
                        type="text"
                        value={longCurrentPremium}
                        onChange={(e) => setLongCurrentPremium(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-trading-dark-700 border border-ink-200 dark:border-trading-dark-500 rounded text-sm"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <p className="text-ink-500 dark:text-ink-400">{t('modalsA.totalCost')}</p>
                      <p className="font-semibold text-ink-900 dark:text-white">
                        {formatCurrency(longLeg.premium * contracts * 100, currencySymbol)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Short Leg */}
                <div className="p-4 border-2 border-caution-500/30 dark:border-caution-600/40 rounded-lg bg-caution-50/50 dark:bg-caution-600/10">
                  <div className="flex items-center gap-2 mb-3">
                    <ArrowDownCircle className="w-5 h-5 text-caution-600 dark:text-caution-500" />
                    <h3 className="font-semibold text-ink-900 dark:text-white">
                      {t('modalsA.shortLegSell')}
                    </h3>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-ink-500 dark:text-ink-400">{t('modalsA.strike')}</p>
                      <p className="font-semibold text-ink-900 dark:text-white">
                        {formatCurrency(shortLeg.strike, currencySymbol)}
                      </p>
                    </div>
                    <div>
                      <p className="text-ink-500 dark:text-ink-400">
                        {t('modalsA.fillPremiumPerShare')}
                      </p>
                      <p className="font-semibold text-ink-900 dark:text-white">
                        {formatCurrency(shortLeg.premium, currencySymbol)}
                      </p>
                    </div>
                    <div>
                      <p className="text-ink-500 dark:text-ink-400 mb-1">
                        {t('modalsA.currentPremiumPerShare')}
                      </p>
                      <input
                        type="text"
                        value={shortCurrentPremium}
                        onChange={(e) => setShortCurrentPremium(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-trading-dark-700 border border-ink-200 dark:border-trading-dark-500 rounded text-sm"
                        placeholder="0,00"
                      />
                    </div>
                    <div>
                      <p className="text-ink-500 dark:text-ink-400">
                        {t('modalsA.totalProceedsLabel')}
                      </p>
                      <p className="font-semibold text-ink-900 dark:text-white">
                        {formatCurrency(shortLeg.premium * contracts * 100, currencySymbol)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-surface dark:bg-trading-dark-700/50 rounded-lg">
                  <p className="text-ink-500 dark:text-ink-400">{t('modalsA.expirationPlain')}</p>
                  <p className="font-semibold text-ink-900 dark:text-white">
                    {longLeg.expiration
                      ? new Date(longLeg.expiration).toLocaleDateString('nl-NL')
                      : t('modalsA.na')}
                  </p>
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                    {t('modalsA.days', { days: daysToExpiration })}
                  </p>
                </div>
                <div className="p-3 bg-surface dark:bg-trading-dark-700/50 rounded-lg">
                  <p className="text-ink-500 dark:text-ink-400">
                    {t('modalsA.contractsLabelPlain')}
                  </p>
                  <p className="font-semibold text-ink-900 dark:text-white">{contracts}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                    {t('modalsA.sharesPlain', { shares: contracts * 100 })}
                  </p>
                </div>
                {collateral > 0 && (
                  <div className="p-3 bg-surface dark:bg-trading-dark-700/50 rounded-lg">
                    <p className="text-ink-500 dark:text-ink-400">{t('modalsA.collateral')}</p>
                    <p className="font-semibold text-caution-600 dark:text-caution-500">
                      {formatCurrency(collateral, currencySymbol)}
                    </p>
                    <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                      {t('modalsA.required')}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                  {t('modalsA.notes')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-surface dark:bg-trading-dark-700 border border-ink-200 dark:border-trading-dark-500 rounded text-sm"
                  placeholder={t('modalsA.spreadNotesPlaceholder')}
                />
              </div>
            </div>
          ) : (
            <div className="h-96">
              <PnLCurve
                type={longLeg.type === 'call' ? 'call-spread' : 'put-spread'}
                longStrike={longLeg.strike}
                shortStrike={shortLeg.strike}
                longPremium={longLeg.premium}
                shortPremium={shortLeg.premium}
                contracts={contracts}
                actualCurrentPrice={currentStockPrice}
                currency={currency}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-trading-dark-800 border-t border-surface-line dark:border-trading-dark-600 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-muted dark:bg-trading-dark-700 hover:bg-ink-200 dark:hover:bg-trading-dark-600 text-ink-700 dark:text-ink-200 rounded-lg font-medium transition-colors"
          >
            {t('modalsA.cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-ink-700 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {t('modalsA.save')}
          </button>
        </div>
      </div>
    </div>
  );
};
