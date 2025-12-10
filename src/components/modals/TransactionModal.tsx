import React, { useState, useEffect } from 'react';
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
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdrawal' | 'adjustment'>('deposit');
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
      alert('Bedrag moet groter zijn dan 0');
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Portfolio Transactie
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Transaction Type Selection */}
          <div>
            <label className="block mb-3 text-sm font-medium text-gray-900 dark:text-white">
              Type Transactie
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setTransactionType('deposit')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  transactionType === 'deposit'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <TrendingUp className="w-6 h-6" />
                <span className="text-sm font-medium">Storting</span>
              </button>

              <button
                type="button"
                onClick={() => setTransactionType('withdrawal')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  transactionType === 'withdrawal'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <TrendingDown className="w-6 h-6" />
                <span className="text-sm font-medium">Opname</span>
              </button>

              <button
                type="button"
                onClick={() => setTransactionType('adjustment')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  transactionType === 'adjustment'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                <Edit3 className="w-6 h-6" />
                <span className="text-sm font-medium">Aanpassing</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              {transactionType === 'adjustment' ? 'Nieuwe Portfolio Waarde' : 'Bedrag'} ({currencySymbol})
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <DollarSign className="w-5 h-5 text-gray-400" />
              </div>
              <NumberInput
                value={amount}
                onChange={setAmount}
                min={0}
                placeholder="0"
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full pl-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>
            {transactionType === 'adjustment' && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Vul de nieuwe totale waarde van de portefeuille in
              </p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              datum
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
              Beschrijving (optioneel)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Bijv.: Maandelijkse storting, Koersaanpassing, etc."
            />
          </div>

          {/* Preview */}
          {amount > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                Preview
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-400">Huidige waarde:</span>
                  <span className="font-medium text-blue-900 dark:text-blue-300">
                    {formatCurrency(portfolio.currentValue, currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700 dark:text-blue-400">
                    {transactionType === 'deposit' && 'Storting:'}
                    {transactionType === 'withdrawal' && 'Opname:'}
                    {transactionType === 'adjustment' && 'Aanpassing:'}
                  </span>
                  <span className={`font-medium ${
                    (transactionType === 'deposit') || (transactionType === 'adjustment' && amount > portfolio.currentValue)
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {transactionType === 'adjustment'
                      ? (amount > portfolio.currentValue ? '+' : '') + formatCurrency(amount - portfolio.currentValue, currencySymbol)
                      : (transactionType === 'withdrawal' ? '-' : '+') + formatCurrency(Math.abs(amount), currencySymbol)
                    }
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-300 dark:border-blue-700">
                  <span className="font-semibold text-blue-900 dark:text-blue-200">Nieuwe waarde:</span>
                  <span className="font-bold text-blue-900 dark:text-blue-200">
                    {formatCurrency(
                      transactionType === 'adjustment'
                        ? amount
                        : portfolio.currentValue + (transactionType === 'withdrawal' ? -Math.abs(amount) : Math.abs(amount)),
                      currencySymbol
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Opslaan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
