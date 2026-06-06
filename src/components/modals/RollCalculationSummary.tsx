import React from 'react';
import { formatCurrency } from '../../utils/numberFormat';

interface RollCalculationSummaryProps {
  /** Label voor de "sluiten"-regel (bijv. "Sluiten (terugkopen):" of "Sluiten spread:"). */
  closeLabel: string;
  /** Waarde van het sluiten (positief = credit, negatief = debit). */
  closeValue: number;
  /** Label voor de "openen"-regel. */
  openLabel: string;
  /** Waarde van het openen (positief = credit, negatief = debit). */
  openValue: number;
  /** Netto resultaat (credit > 0, debit < 0). */
  netCredit: number;
  /** Of het netto resultaat een credit is. */
  isCredit: boolean;
  /** Of het netto resultaat een debit is. */
  isDebit: boolean;
  /** Valuta-symbool voor de bedragen. */
  currencySymbol: string;
}

/**
 * Herbruikbare credit/debit "Berekening"-summary voor de roll-modals.
 * Toont de sluit- en open-waarden plus het netto credit/debit met
 * bijhorende kleurlogica.
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
      <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-300 mb-3">Berekening</h3>
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
              Netto {isCredit ? 'Credit' : isDebit ? 'Debit' : 'Resultaat'}:
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
