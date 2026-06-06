import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, DollarSign, TrendingUp, TrendingDown, Edit3 } from 'lucide-react';
import type { PortfolioName, CurrencyType, TransactionType } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency } from '../../utils/numberFormat';
import { NumberInput } from '../common/NumberInput';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (transaction: {
    type: TransactionType;
    amount: number;
    description: string;
    date: string;
    notes?: string;
  }) => void;
  portfolio: {
    name: PortfolioName;
    currency: CurrencyType;
    currentValue: number;
  };
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  portfolio,
}) => {
  const { t } = useTranslation();
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal' | 'adjustment'>(
    'deposit'
  );
  const [amount, setAmount] = useState<number>(0);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setTransactionType('deposit');
      setAmount(0);
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0 && transactionType !== 'adjustment') {
      alert(t('modalsB.transaction.validationAmount'));
      return;
    }

    // For adjustment, amount is the new total value, so calculate the difference
    let finalAmount = amount;
    if (transactionType === 'adjustment') {
      finalAmount = amount - portfolio.currentValue;
    } else if (transactionType === 'withdrawal') {
      finalAmount = -Math.abs(amount);
    } else {
      finalAmount = Math.abs(amount);
    }

    onSubmit({
      type: transactionType,
      amount: finalAmount,
      description: description.trim(),
      date,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  const currencySymbol = getCurrencySymbol(portfolio.currency);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-trading-dark-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-trading-dark-800 border-b border-surface-line dark:border-trading-dark-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-ink-900 dark:text-white">
            {t('modalsB.transaction.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Transaction Type Selection */}
          <div>
            <label className="block mb-3 text-sm font-medium text-ink-900 dark:text-white">
              {t('modalsB.transaction.transactionType')}
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTransactionType('deposit')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  transactionType === 'deposit'
                    ? 'border-positive-500 bg-positive-50 dark:bg-positive-700/15 text-positive-700 dark:text-positive-500'
                    : 'border-ink-200 dark:border-trading-dark-500 hover:border-ink-300 dark:hover:border-ink-400'
                }`}
              >
                <TrendingUp className="w-6 h-6" />
                <span className="text-sm font-medium">{t('modalsB.transaction.deposit')}</span>
              </button>

              <button
                type="button"
                onClick={() => setTransactionType('withdrawal')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  transactionType === 'withdrawal'
                    ? 'border-negative-500 bg-negative-50 dark:bg-negative-700/15 text-negative-700 dark:text-negative-500'
                    : 'border-ink-200 dark:border-trading-dark-500 hover:border-ink-300 dark:hover:border-ink-400'
                }`}
              >
                <TrendingDown className="w-6 h-6" />
                <span className="text-sm font-medium">{t('modalsB.transaction.withdrawal')}</span>
              </button>

              <button
                type="button"
                onClick={() => setTransactionType('adjustment')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  transactionType === 'adjustment'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'border-ink-200 dark:border-trading-dark-500 hover:border-ink-300 dark:hover:border-ink-400'
                }`}
              >
                <Edit3 className="w-6 h-6" />
                <span className="text-sm font-medium">{t('modalsB.transaction.adjustment')}</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block mb-2 text-sm font-medium text-ink-900 dark:text-white">
              {transactionType === 'adjustment'
                ? t('modalsB.transaction.newPortfolioValue')
                : t('modalsB.transaction.amount')}{' '}
              ({currencySymbol})
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="w-5 h-5 text-ink-400" />
              </div>
              <NumberInput
                value={amount}
                onChange={setAmount}
                min={0}
                placeholder="0"
                className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                required
              />
            </div>
            {transactionType === 'adjustment' && (
              <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                {t('modalsB.transaction.adjustmentHint')}
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block mb-2 text-sm font-medium text-ink-900 dark:text-white">
              {t('modalsB.transaction.date')}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block mb-2 text-sm font-medium text-ink-900 dark:text-white">
              {t('modalsB.transaction.descriptionOptional')}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
              placeholder={t('modalsB.transaction.descriptionPlaceholder')}
            />
          </div>

          {/* Preview */}
          {amount > 0 && (
            <div className="bg-primary-50 dark:bg-primary-900/20 rounded-lg p-4 border border-primary-200 dark:border-primary-800">
              <p className="text-sm font-medium text-primary-900 dark:text-primary-300 mb-2">
                {t('modalsB.transaction.preview')}
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-primary-700 dark:text-primary-300">
                    {t('modalsB.transaction.currentValue')}
                  </span>
                  <span className="font-medium text-primary-900 dark:text-primary-300">
                    {formatCurrency(portfolio.currentValue, currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-primary-700 dark:text-primary-300">
                    {transactionType === 'deposit' && t('modalsB.transaction.depositLabel')}
                    {transactionType === 'withdrawal' && t('modalsB.transaction.withdrawalLabel')}
                    {transactionType === 'adjustment' && t('modalsB.transaction.adjustmentLabel')}
                  </span>
                  <span
                    className={`font-medium ${
                      transactionType === 'deposit' ||
                      (transactionType === 'adjustment' && amount > portfolio.currentValue)
                        ? 'text-positive-600 dark:text-positive-500'
                        : 'text-negative-600 dark:text-negative-500'
                    }`}
                  >
                    {transactionType === 'adjustment'
                      ? (amount > portfolio.currentValue ? '+' : '') +
                        formatCurrency(amount - portfolio.currentValue, currencySymbol)
                      : (transactionType === 'withdrawal' ? '-' : '+') +
                        formatCurrency(Math.abs(amount), currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-primary-300 dark:border-primary-700">
                  <span className="font-semibold text-primary-900 dark:text-primary-200">
                    {t('modalsB.transaction.newValue')}
                  </span>
                  <span className="font-bold text-primary-900 dark:text-primary-200">
                    {formatCurrency(
                      transactionType === 'adjustment'
                        ? amount
                        : portfolio.currentValue +
                            (transactionType === 'withdrawal'
                              ? -Math.abs(amount)
                              : Math.abs(amount)),
                      currencySymbol
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-surface-line dark:border-trading-dark-600">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-surface-muted dark:bg-trading-dark-700 hover:bg-ink-200 dark:hover:bg-trading-dark-600 text-ink-700 dark:text-ink-200 rounded-lg font-medium transition-colors"
            >
              {t('modalsB.transaction.cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors"
            >
              {t('modalsB.transaction.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
