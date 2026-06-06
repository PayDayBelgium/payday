import React from 'react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/numberFormat';

interface RollCalculationSummaryProps {
  /** Label for the "close" line (e.g. "Sluiten (terugkopen):" or "Sluiten spread:"). */
  closeLabel: string;
  /** Value of the close (positive = credit, negative = debit). */
  closeValue: number;
  /** Label for the "open" line. */
  openLabel: string;
  /** Value of the open (positive = credit, negative = debit). */
  openValue: number;
  /** Net result (credit > 0, debit < 0). */
  netCredit: number;
  /** Whether the net result is a credit. */
  isCredit: boolean;
  /** Whether the net result is a debit. */
  isDebit: boolean;
  /** Currency symbol for the amounts. */
  currencySymbol: string;
}

/**
 * Reusable credit/debit "Berekening" summary for the roll modals.
 * Shows the close and open values plus the net credit/debit with
 * matching color logic.
 */
export const RollCalculationSummary: React.FC<RollCalculationSummaryProps> = ({
  closeLabel,
  closeValue,
  openLabel,
  openValue,
  netCredit,
  isCredit,
  isDebit,
  currencySymbol,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={`p-4 rounded-lg ${
        isCredit
          ? 'bg-positive-50 dark:bg-positive-700/15 border border-positive-500/20 dark:border-positive-700/30'
          : isDebit
            ? 'bg-negative-50 dark:bg-negative-700/15 border border-negative-500/20 dark:border-negative-700/30'
            : 'bg-surface dark:bg-trading-dark-700/50'
      }`}
    >
      <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-300 mb-3">
        {t('modalsA.calculation')}
      </h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-ink-600 dark:text-ink-400">{closeLabel}</span>
          <span
            className={`font-medium ${closeValue >= 0 ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'}`}
          >
            {closeValue >= 0 ? '+' : ''}
            {formatCurrency(closeValue, currencySymbol)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-ink-600 dark:text-ink-400">{openLabel}</span>
          <span
            className={`font-medium ${openValue >= 0 ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'}`}
          >
            {openValue >= 0 ? '+' : ''}
            {formatCurrency(openValue, currencySymbol)}
          </span>
        </div>
        <div className="border-t border-surface-line dark:border-trading-dark-500 pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-ink-700 dark:text-ink-300">
              Netto{' '}
              {isCredit
                ? t('modalsA.netCredit')
                : isDebit
                  ? t('modalsA.netDebit')
                  : t('modalsA.netResult')}
              :
            </span>
            <span
              className={`text-lg font-bold ${
                isCredit
                  ? 'text-positive-600 dark:text-positive-500'
                  : isDebit
                    ? 'text-negative-600 dark:text-negative-500'
                    : 'text-ink-900 dark:text-white'
              }`}
            >
              {netCredit >= 0 ? '+' : ''}
              {formatCurrency(netCredit, currencySymbol)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
