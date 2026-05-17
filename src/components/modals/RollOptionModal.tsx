import React, { useState, useMemo } from 'react';
import { X, Redo2, HelpCircle, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import type { CallOption, PutOption, CurrencyType } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency } from '../../utils/numberFormat';
import { calculateOptionRealizedPnL } from '../../utils/pnlCalculations';
import { FridayDatePicker } from '../common/FridayDatePicker';

interface RollOptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rollData: {
    // Close existing position
    closePremium: number;
    closeDate: string;
    // New position
    newContracts: number;
    newStrike: number;
    newExpiration: string;
    newPremium: number;
    notes?: string;
  }) => void;
  position: CallOption | PutOption;
  currency: CurrencyType;
}

export const RollOptionModal: React.FC<RollOptionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  position,
  currency,
}) => {
  const currencySymbol = getCurrencySymbol(currency);
  const contractMultiplier = 100;

  // Form state
  const [closePremium, setClosePremium] = useState<string>('');
  const [rollDate, setRollDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newStrike, setNewStrike] = useState<string>(position.strike.toString());
  const [newExpiration, setNewExpiration] = useState<string>('');
  const [newPremium, setNewPremium] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Calculate roll details
  const rollCalculation = useMemo(() => {
    const closePrice = parseFloat(closePremium) || 0;
    const openPrice = parseFloat(newPremium) || 0;
    const contracts = position.contracts;

    // For sold options (short): we need to buy back to close (debit), then sell new (credit)
    // For bought options (long): we need to sell to close (credit), then buy new (debit)

    let closeValue = 0;
    let openValue = 0;
    let netCredit = 0;

    if (position.action === 'sell') {
      // SHORT option
      // Close: buy back at closePremium (debit = negative)
      closeValue = -closePrice * position.contracts * contractMultiplier;
      // Open: sell new at newPremium (credit = positive)
      openValue = openPrice * contracts * contractMultiplier;
      netCredit = openValue + closeValue; // If positive = credit, negative = debit
    } else {
      // LONG option
      // Close: sell at closePremium (credit = positive)
      closeValue = closePrice * position.contracts * contractMultiplier;
      // Open: buy new at newPremium (debit = negative)
      openValue = -openPrice * contracts * contractMultiplier;
      netCredit = closeValue + openValue; // If positive = credit, negative = debit
    }

    // Calculate P&L on closed position using utility function
    const realizedPnL = calculateOptionRealizedPnL({
      action: position.action,
      costBasis: position.costBasis,
      closePremium: closePrice,
      contracts: position.contracts,
      contractMultiplier,
    });

    return {
      closeValue,
      openValue,
      netCredit,
      realizedPnL,
      isCredit: netCredit > 0,
      isDebit: netCredit < 0,
    };
  }, [closePremium, newPremium, position]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!closePremium || !newExpiration || !newPremium) {
      return;
    }

    onConfirm({
      closePremium: parseFloat(closePremium),
      closeDate: rollDate,
      newContracts: position.contracts,
      newStrike: parseFloat(newStrike) || position.strike,
      newExpiration,
      newPremium: parseFloat(newPremium),
      notes: notes || undefined,
    });
  };

  if (!isOpen) return null;

  const optionType = position.type === 'call' ? 'Call' : 'Put';
  const actionType = position.action === 'buy' ? 'Long' : 'Short';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
              <Redo2 className="w-5 h-5 text-primary-700 dark:text-primary-300" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Roll Optie
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {position.ticker} {actionType} {optionType} ${position.strike}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Wat is rollen?"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Help Section */}
        {showHelp && (
          <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-200 dark:border-primary-800">
            <h3 className="font-semibold text-primary-900 dark:text-blue-100 mb-2">Wat is een optie roll?</h3>
            <p className="text-sm text-primary-700 dark:text-primary-200 mb-2">
              Een roll is het gelijktijdig <strong>sluiten</strong> van je huidige optie positie en het <strong>openen</strong> van een nieuwe positie.
              Dit lijkt misschien een nieuwe term, maar het is eigenlijk gewoon sluiten en openen in één beweging.
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-primary-700 dark:text-primary-200">
                  <strong>Rollen in de tijd:</strong> Verplaats naar een latere expiratie om meer tijd te kopen (bijv. van november naar december).
                </p>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-primary-700 dark:text-primary-200">
                  <strong>Rollen voor premie:</strong> Open een nieuwe positie met dezelfde of andere strike voor extra premie (kan voor credit of debit).
                </p>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-primary-700 dark:text-primary-200">
                  <strong>Rollen up/down:</strong> Verander de strike prijs om je positie aan te passen aan de markt.
                </p>
              </div>
            </div>
            <p className="text-xs text-primary-700 dark:text-primary-300 mt-3 italic">
              Tip: Een credit roll betekent dat je geld ontvangt, een debit roll betekent dat je betaalt.
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Current Position Info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Huidige Positie</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Strike:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">${position.strike}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Expiratie:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {new Date(position.expiration).toLocaleDateString('nl-NL')}
                </span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Contracts:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">{position.contracts}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Premie:</span>
                <span className="ml-2 font-medium text-gray-900 dark:text-white">
                  {formatCurrency(position.premium, currencySymbol)}
                </span>
              </div>
            </div>
          </div>

          {/* Close Position Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 bg-negative-50 dark:bg-negative-700/25 text-negative-600 dark:text-negative-500 rounded-full text-xs font-bold">1</span>
              Sluit huidige positie
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sluit Premie (per contract)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                  <input
                    type="number"
                    value={closePremium}
                    onChange={(e) => setClosePremium(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Roll datum
                </label>
                <input
                  type="date"
                  value={rollDate}
                  onChange={(e) => setRollDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* New Position Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <span className="flex items-center justify-center w-5 h-5 bg-positive-50 dark:bg-positive-700/25 text-positive-600 dark:text-positive-500 rounded-full text-xs font-bold">2</span>
              Open nieuwe positie
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Contracts
                </label>
                <div className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white">
                  {position.contracts}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Strike prijs
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={newStrike}
                    onChange={(e) => setNewStrike(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    step="0.5"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nieuwe Expiratie
                </label>
                <FridayDatePicker
                  value={newExpiration}
                  onChange={(date) => setNewExpiration(date)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nieuwe Premie (per contract)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                  <input
                    type="number"
                    value={newPremium}
                    onChange={(e) => setNewPremium(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
              </div>
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
              placeholder="Reden voor roll, marktomstandigheden, etc."
            />
          </div>

          {/* Calculation Summary */}
          <div className={`p-4 rounded-lg ${
            rollCalculation.isCredit
              ? 'bg-positive-50 dark:bg-positive-700/15 border border-positive-500/20 dark:border-positive-700/30'
              : rollCalculation.isDebit
                ? 'bg-negative-50 dark:bg-negative-700/15 border border-negative-500/20 dark:border-negative-700/30'
                : 'bg-gray-50 dark:bg-gray-700/50'
          }`}>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Berekening</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Sluiten ({position.action === 'sell' ? 'terugkopen' : 'verkopen'}):
                </span>
                <span className={`font-medium ${rollCalculation.closeValue >= 0 ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'}`}>
                  {rollCalculation.closeValue >= 0 ? '+' : ''}{formatCurrency(rollCalculation.closeValue, currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Openen ({position.action === 'sell' ? 'verkopen' : 'kopen'}):
                </span>
                <span className={`font-medium ${rollCalculation.openValue >= 0 ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'}`}>
                  {rollCalculation.openValue >= 0 ? '+' : ''}{formatCurrency(rollCalculation.openValue, currencySymbol)}
                </span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    Netto {rollCalculation.isCredit ? 'Credit' : rollCalculation.isDebit ? 'Debit' : 'Resultaat'}:
                  </span>
                  <span className={`text-lg font-bold ${
                    rollCalculation.isCredit
                      ? 'text-positive-600 dark:text-positive-500'
                      : rollCalculation.isDebit
                        ? 'text-negative-600 dark:text-negative-500'
                        : 'text-gray-900 dark:text-white'
                  }`}>
                    {rollCalculation.netCredit >= 0 ? '+' : ''}{formatCurrency(rollCalculation.netCredit, currencySymbol)}
                  </span>
                </div>
              </div>
            </div>
          </div>

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
              disabled={!closePremium || !newExpiration || !newPremium}
              className="px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Redo2 className="w-4 h-4" />
              Roll Uitvoeren
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
