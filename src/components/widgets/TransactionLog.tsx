import React, { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Edit3,
  ShoppingCart,
  DollarSign,
  Gift,
  Receipt,
  Calendar,
  RefreshCw,
} from 'lucide-react';
import type { PortfolioTransaction, CurrencyType } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency } from '../../utils/numberFormat';

interface TransactionLogProps {
  transactions: PortfolioTransaction[];
  currency: CurrencyType;
  className?: string;
}

const getTransactionIcon = (type: PortfolioTransaction['type']) => {
  switch (type) {
    case 'deposit':
      return <TrendingUp className="w-5 h-5" />;
    case 'withdrawal':
      return <TrendingDown className="w-5 h-5" />;
    case 'adjustment':
      return <Edit3 className="w-5 h-5" />;
    case 'position_buy':
    case 'position_sell':
      return <ShoppingCart className="w-5 h-5" />;
    case 'premium_collected':
    case 'premium_paid':
      return <DollarSign className="w-5 h-5" />;
    case 'dividend':
      return <Gift className="w-5 h-5" />;
    case 'fee':
      return <Receipt className="w-5 h-5" />;
    case 'option_roll':
      return <RefreshCw className="w-5 h-5" />;
    default:
      return <Calendar className="w-5 h-5" />;
  }
};

const getTransactionColor = (type: PortfolioTransaction['type']) => {
  switch (type) {
    case 'deposit':
    case 'premium_collected':
    case 'dividend':
      return 'text-positive-600 dark:text-positive-500 bg-positive-50 dark:bg-positive-700/25';
    case 'withdrawal':
    case 'premium_paid':
    case 'fee':
      return 'text-negative-600 dark:text-negative-500 bg-negative-50 dark:bg-negative-700/25';
    case 'adjustment':
      return 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30';
    case 'position_buy':
      return 'text-ink-600 dark:text-ink-300 bg-surface-muted dark:bg-trading-dark-600';
    case 'position_sell':
      return 'text-caution-600 dark:text-caution-500 bg-caution-50 dark:bg-caution-600/25';
    case 'option_roll':
      return 'text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-900/30';
    default:
      return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/30';
  }
};

const getTransactionLabel = (type: PortfolioTransaction['type']) => {
  switch (type) {
    case 'deposit':
      return 'Deposit';
    case 'withdrawal':
      return 'Opname';
    case 'adjustment':
      return 'Aanpassing';
    case 'position_buy':
      return 'Aankoop';
    case 'position_sell':
      return 'Verkoop';
    case 'premium_collected':
      return 'Premie+';
    case 'premium_paid':
      return 'Premie-';
    case 'dividend':
      return 'Dividend';
    case 'fee':
      return 'Kosten';
    case 'option_roll':
      return 'Roll';
    default:
      return type;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('nl-NL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export const TransactionLog: React.FC<TransactionLogProps> = ({
  transactions,
  currency,
  className = '',
}) => {
  const currencySymbol = getCurrencySymbol(currency);

  // Sort transactions by date (newest first), then by createdAt for same-day transactions
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateCompare !== 0) return dateCompare;
      // For same date, sort by createdAt (newest first)
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return 0;
    });
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center ${className}`}
      >
        <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
        <p className="text-gray-600 dark:text-gray-400">Nog geen transacties</p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
          Transacties worden hier getoond zodra je deposits, withdrawals of trades maakt
        </p>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      {/* Transaction List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
        {sortedTransactions.map((transaction) => {
          const isPositive = transaction.amount >= 0;
          const color = getTransactionColor(transaction.type);

          return (
            <div
              key={transaction.id}
              className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-2 rounded-lg ${color}`}>
                  {getTransactionIcon(transaction.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Type & Description */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${color}`}>
                          {getTransactionLabel(transaction.type)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(transaction.date)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {transaction.description}
                      </p>
                      {transaction.notes && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {transaction.notes}
                        </p>
                      )}
                    </div>

                    {/* Amount */}
                    <div className="text-right flex-shrink-0">
                      <p
                        className={`text-lg font-bold ${
                          isPositive
                            ? 'text-positive-600 dark:text-positive-500'
                            : 'text-negative-600 dark:text-negative-500'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatCurrency(Math.abs(transaction.amount), currencySymbol)}
                      </p>
                      {transaction.newValue !== undefined && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Nieuwe waarde: {formatCurrency(transaction.newValue, currencySymbol)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
