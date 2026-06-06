import React, { useState, useMemo } from 'react';
import { X, ArrowDownLeft, ArrowUpRight, AlertTriangle, Info } from 'lucide-react';
import type { CallOption, PutOption, CurrencyType } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency } from '../../utils/numberFormat';

interface AssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assignmentData: {
    assignmentDate: string;
    assignmentPrice: number; // Price per share at assignment
    notes?: string;
  }) => void;
  position: CallOption | PutOption;
  currency: CurrencyType;
}

export const AssignmentModal: React.FC<AssignmentModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  position,
  currency,
}) => {
  const currencySymbol = getCurrencySymbol(currency);
  const contractMultiplier = 100;

  // Form state
  const [assignmentDate, setAssignmentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [assignmentPrice, setAssignmentPrice] = useState<string>(position.strike.toString());
  const [notes, setNotes] = useState<string>('');

  // Determine what happens based on option type
  const isPut = position.type === 'put';
  const isShort = position.action === 'sell';

  // Calculate assignment details
  const assignmentCalculation = useMemo(() => {
    const shares = position.contracts * contractMultiplier;

    if (isPut) {
      // Short PUT assigned: you BUY shares at strike price
      const totalCost = position.strike * shares;
      const premiumReceived = Math.abs(position.costBasis); // Premium collected from selling the put
      const effectiveCost = totalCost - premiumReceived;
      const effectivePricePerShare = effectiveCost / shares;

      return {
        action: 'BUY',
        shares,
        pricePerShare: position.strike,
        totalCost,
        premiumReceived,
        effectiveCost,
        effectivePricePerShare,
        description: `Je koopt ${shares} aandelen ${position.ticker} tegen $${position.strike} per aandeel`,
      };
    } else {
      // Short CALL assigned: you SELL shares at strike price
      const totalProceeds = position.strike * shares;
      const premiumReceived = Math.abs(position.costBasis); // Premium collected from selling the call
      const totalIncome = totalProceeds + premiumReceived;
      const effectivePricePerShare = totalIncome / shares;

      return {
        action: 'SELL',
        shares,
        pricePerShare: position.strike,
        totalProceeds,
        premiumReceived,
        totalIncome,
        effectivePricePerShare,
        description: `Je verkoopt ${shares} aandelen ${position.ticker} tegen $${position.strike} per aandeel`,
      };
    }
  }, [assignmentPrice, position, isPut]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onConfirm({
      assignmentDate,
      assignmentPrice: parseFloat(assignmentPrice) || position.strike,
      notes: notes || undefined,
    });
  };

  // Guard renders AFTER all hooks so hook order stays stable (rules-of-hooks).
  // Only short options can be assigned.
  if (!isOpen || !isShort) return null;

  const optionType = position.type === 'call' ? 'Call' : 'Put';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                isPut
                  ? 'bg-surface-muted dark:bg-trading-dark-600'
                  : 'bg-positive-50 dark:bg-positive-700/25'
              }`}
            >
              {isPut ? (
                <ArrowDownLeft
                  className={`w-5 h-5 ${
                    isPut
                      ? 'text-ink-600 dark:text-ink-300'
                      : 'text-positive-600 dark:text-positive-500'
                  }`}
                />
              ) : (
                <ArrowUpRight className="w-5 h-5 text-positive-600 dark:text-positive-500" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Assignment</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {position.ticker} Short {optionType} ${position.strike}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info box explaining what happens */}
          <div
            className={`p-4 rounded-lg border ${
              isPut
                ? 'bg-surface-subtle dark:bg-trading-dark-700 border-ink-200 dark:border-trading-dark-600'
                : 'bg-positive-50 dark:bg-positive-700/15 border-positive-500/20 dark:border-positive-700/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <Info
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  isPut
                    ? 'text-ink-600 dark:text-ink-300'
                    : 'text-positive-600 dark:text-positive-500'
                }`}
              />
              <div>
                <p
                  className={`font-medium ${
                    isPut
                      ? 'text-purple-900 dark:text-purple-100'
                      : 'text-positive-700 dark:text-green-100'
                  }`}
                >
                  {assignmentCalculation.description}
                </p>
                <p
                  className={`text-sm mt-1 ${
                    isPut
                      ? 'text-ink-700 dark:text-ink-300'
                      : 'text-positive-700 dark:text-positive-500'
                  }`}
                >
                  De optie wordt gesloten en de aandelen worden{' '}
                  {isPut ? 'toegevoegd aan' : 'verwijderd uit'} je portfolio.
                </p>
              </div>
            </div>
          </div>

          {/* Current Position Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Positie Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Strike:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  ${position.strike}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Contracts:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {position.contracts}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Premie ontvangen:</span>
                <span className="ml-2 font-medium text-positive-600 dark:text-positive-500">
                  +{formatCurrency(Math.abs(position.costBasis), currencySymbol)}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Aandelen:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {position.contracts * contractMultiplier}
                </span>
              </div>
            </div>
          </div>

          {/* Assignment Details */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assignment datum
              </label>
              <input
                type="date"
                value={assignmentDate}
                onChange={(e) => setAssignmentDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Effectieve Prijs per Aandeel
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={assignmentPrice}
                  onChange={(e) => setAssignmentPrice(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  step="0.01"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Normaal gelijk aan de strike prijs (${position.strike})
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notities (optioneel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              rows={2}
              placeholder="Bijv. vroege assignment, ex-dividend, etc."
            />
          </div>

          {/* Calculation Summary */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Berekening
            </h3>
            <div className="space-y-2 text-sm">
              {isPut ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Aankoopkosten ({assignmentCalculation.shares} x ${position.strike}):
                    </span>
                    <span className="font-medium text-negative-600 dark:text-negative-500">
                      -{formatCurrency(assignmentCalculation.totalCost ?? 0, currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Premie ontvangen:</span>
                    <span className="font-medium text-positive-600 dark:text-positive-500">
                      +{formatCurrency(assignmentCalculation.premiumReceived, currencySymbol)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Effectieve kost:
                      </span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {formatCurrency(assignmentCalculation.effectiveCost ?? 0, currencySymbol)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-gray-600 dark:text-gray-400">Per aandeel:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {formatCurrency(
                          assignmentCalculation.effectivePricePerShare,
                          currencySymbol
                        )}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">
                      Verkoopopbrengst ({assignmentCalculation.shares} x ${position.strike}):
                    </span>
                    <span className="font-medium text-positive-600 dark:text-positive-500">
                      +{formatCurrency(assignmentCalculation.totalProceeds ?? 0, currencySymbol)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Premie ontvangen:</span>
                    <span className="font-medium text-positive-600 dark:text-positive-500">
                      +{formatCurrency(assignmentCalculation.premiumReceived, currencySymbol)}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">
                        Totale opbrengst:
                      </span>
                      <span className="text-lg font-bold text-positive-600 dark:text-positive-500">
                        +{formatCurrency(assignmentCalculation.totalIncome ?? 0, currencySymbol)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-gray-600 dark:text-gray-400">Per aandeel:</span>
                      <span className="font-medium text-positive-600 dark:text-positive-500">
                        {formatCurrency(
                          assignmentCalculation.effectivePricePerShare,
                          currencySymbol
                        )}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Warning for wheel */}
          {position.wheelId && (
            <div className="p-4 bg-caution-50 dark:bg-caution-600/15 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">Wheel campagne</p>
                  <p className="text-sm text-caution-600 dark:text-caution-500">
                    {isPut
                      ? 'Na assignment gaat de Wheel naar de Stock fase. Je kunt dan covered calls schrijven.'
                      : 'Na assignment is de Wheel cycle voltooid. Je kunt een nieuwe CSP schrijven om opnieuw te beginnen.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 ${
                isPut ? 'bg-ink-700 hover:bg-purple-700' : 'bg-positive-600 hover:bg-positive-700'
              }`}
            >
              {isPut ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
              Assignment Bevestigen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
