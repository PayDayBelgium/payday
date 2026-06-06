import React, { useState, useMemo } from 'react';
import { Redo2, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import type { CallOption, PutOption, CurrencyType } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency } from '../../utils/numberFormat';
import { FridayDatePicker } from '../common/FridayDatePicker';
import { RollModalShell } from './RollModalShell';
import { RollCalculationSummary } from './RollCalculationSummary';

interface LegRollData {
  closePremium: number;
  newStrike: number;
  newExpiration: string;
  newPremium: number;
}

interface SpreadRollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (rollData: {
    rollDate: string;
    longLeg: LegRollData;
    shortLeg: LegRollData;
    notes?: string;
  }) => void;
  longLeg: CallOption | PutOption;
  shortLeg: CallOption | PutOption;
  currency: CurrencyType;
}

export const SpreadRollModal: React.FC<SpreadRollModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  longLeg,
  shortLeg,
  currency,
}) => {
  const currencySymbol = getCurrencySymbol(currency);
  const contractMultiplier = 100;

  // Form state
  const [rollDate, setRollDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [showHelp, setShowHelp] = useState<boolean>(false);

  // Long leg state
  const [longClosePremium, setLongClosePremium] = useState<string>('');
  const [longNewStrike, setLongNewStrike] = useState<string>(longLeg.strike.toString());
  const [longNewExpiration, setLongNewExpiration] = useState<string>('');
  const [longNewPremium, setLongNewPremium] = useState<string>('');

  // Short leg state
  const [shortClosePremium, setShortClosePremium] = useState<string>('');
  const [shortNewStrike, setShortNewStrike] = useState<string>(shortLeg.strike.toString());
  const [shortNewExpiration, setShortNewExpiration] = useState<string>('');
  const [shortNewPremium, setShortNewPremium] = useState<string>('');

  // Calculate roll details
  const rollCalculation = useMemo(() => {
    const longClosePrice = parseFloat(longClosePremium) || 0;
    const longOpenPrice = parseFloat(longNewPremium) || 0;
    const shortClosePrice = parseFloat(shortClosePremium) || 0;
    const shortOpenPrice = parseFloat(shortNewPremium) || 0;

    // Long leg: sell to close (credit), buy to open (debit)
    const longCloseValue = longClosePrice * longLeg.contracts * contractMultiplier;
    const longOpenValue = -longOpenPrice * longLeg.contracts * contractMultiplier;

    // Short leg: buy to close (debit), sell to open (credit)
    const shortCloseValue = -shortClosePrice * shortLeg.contracts * contractMultiplier;
    const shortOpenValue = shortOpenPrice * shortLeg.contracts * contractMultiplier;

    // Calculate P&L on closed positions
    const longRealizedPnL = longCloseValue - longLeg.costBasis;
    const shortRealizedPnL = -shortCloseValue - shortLeg.costBasis; // shortLeg.costBasis is negative

    const totalCloseValue = longCloseValue + shortCloseValue;
    const totalOpenValue = longOpenValue + shortOpenValue;
    const netCredit = totalCloseValue + totalOpenValue;
    const totalRealizedPnL = longRealizedPnL + shortRealizedPnL;

    return {
      longCloseValue,
      longOpenValue,
      shortCloseValue,
      shortOpenValue,
      totalCloseValue,
      totalOpenValue,
      netCredit,
      totalRealizedPnL,
      isCredit: netCredit > 0,
      isDebit: netCredit < 0,
    };
  }, [longClosePremium, longNewPremium, shortClosePremium, shortNewPremium, longLeg, shortLeg]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !longClosePremium ||
      !longNewExpiration ||
      !longNewPremium ||
      !shortClosePremium ||
      !shortNewExpiration ||
      !shortNewPremium
    ) {
      return;
    }

    onConfirm({
      rollDate,
      longLeg: {
        closePremium: parseFloat(longClosePremium),
        newStrike: parseFloat(longNewStrike) || longLeg.strike,
        newExpiration: longNewExpiration,
        newPremium: parseFloat(longNewPremium),
      },
      shortLeg: {
        closePremium: parseFloat(shortClosePremium),
        newStrike: parseFloat(shortNewStrike) || shortLeg.strike,
        newExpiration: shortNewExpiration,
        newPremium: parseFloat(shortNewPremium),
      },
      notes: notes || undefined,
    });
  };

  if (!isOpen) return null;

  const optionType = longLeg.type === 'call' ? 'Call' : 'Put';
  const spreadType = shortLeg.premium > longLeg.premium ? 'Credit' : 'Debit';

  return (
    <RollModalShell
      onClose={onClose}
      title="Roll Spread"
      subtitle={
        <>
          {longLeg.ticker} {optionType} {spreadType} Spread $
          {Math.min(longLeg.strike, shortLeg.strike)}/$
          {Math.max(longLeg.strike, shortLeg.strike)}
        </>
      }
      iconWrapperClassName="bg-surface-muted dark:bg-trading-dark-600"
      iconClassName="text-ink-600 dark:text-ink-300"
      maxWidthClassName="max-w-4xl"
      showHelpToggle
      onToggleHelp={() => setShowHelp(!showHelp)}
      helpToggleTitle="Wat is een spread roll?"
    >
      {/* Help Section */}
        {showHelp && (
          <div className="p-4 bg-surface-subtle dark:bg-trading-dark-700 border-b border-ink-200 dark:border-trading-dark-600">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              Wat is een spread roll?
            </h3>
            <p className="text-sm text-ink-800 dark:text-purple-200 mb-2">
              Bij een spread roll sluit je beide legs van je spread en opent je tegelijkertijd een
              nieuwe spread. Dit doe je typisch om meer tijd te kopen of om je strikes aan te passen
              aan de markt.
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-ink-600 dark:text-ink-300 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-ink-800 dark:text-purple-200">
                  <strong>Roll naar latere expiratie:</strong> Verplaats beide legs naar een latere
                  datum om je positie te beheren.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <DollarSign className="w-4 h-4 text-ink-600 dark:text-ink-300 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-ink-800 dark:text-purple-200">
                  <strong>Dezelfde breedte:</strong> Houd meestal dezelfde spread breedte aan voor
                  consistente risk/reward.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-ink-600 dark:text-ink-300 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-ink-800 dark:text-purple-200">
                  <strong>Strike aanpassing:</strong> Pas de strikes aan als de onderliggende
                  aandeel significant is bewogen.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Roll Date */}
          <div className="max-w-xs">
            <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
              Roll datum
            </label>
            <input
              type="date"
              value={rollDate}
              onChange={(e) => setRollDate(e.target.value)}
              className="w-full px-4 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              required
            />
          </div>

          {/* Two Column Layout for Legs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Long Leg */}
            <div className="space-y-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <h3 className="text-sm font-semibold text-primary-700 dark:text-primary-300 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-primary-50 dark:bg-primary-900/40 rounded text-xs">
                  LONG
                </span>
                ${longLeg.strike} {optionType}
              </h3>

              {/* Current Position Info */}
              <div className="grid grid-cols-2 gap-2 text-xs p-2 bg-primary-50/50 dark:bg-primary-900/30 rounded">
                <div>
                  <span className="text-primary-700 dark:text-primary-300">Premie:</span>
                  <span className="ml-1 font-medium text-primary-900 dark:text-blue-100">
                    {formatCurrency(longLeg.premium, currencySymbol)}
                  </span>
                </div>
                <div>
                  <span className="text-primary-700 dark:text-primary-300">Exp:</span>
                  <span className="ml-1 font-medium text-primary-900 dark:text-blue-100">
                    {new Date(longLeg.expiration).toLocaleDateString('nl-NL', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Close */}
              <div>
                <label className="block text-xs font-medium text-primary-700 dark:text-primary-300 mb-1">
                  Sluit Premie
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    value={longClosePremium}
                    onChange={(e) => setLongClosePremium(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 text-sm border border-primary-300 dark:border-primary-600 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              {/* New Position */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-primary-700 dark:text-primary-300 mb-1">
                    Nieuwe Strike
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      value={longNewStrike}
                      onChange={(e) => setLongNewStrike(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 text-sm border border-primary-300 dark:border-primary-600 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                      step="0.5"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-primary-700 dark:text-primary-300 mb-1">
                    Nieuwe Exp
                  </label>
                  <FridayDatePicker
                    value={longNewExpiration}
                    onChange={(date) => setLongNewExpiration(date)}
                    className="w-full px-3 py-2 text-sm border border-primary-300 dark:border-primary-600 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-primary-700 dark:text-primary-300 mb-1">
                  Nieuwe Premie
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    value={longNewPremium}
                    onChange={(e) => setLongNewPremium(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 text-sm border border-primary-300 dark:border-primary-600 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Short Leg */}
            <div className="space-y-4 p-4 bg-caution-50 dark:bg-caution-600/15 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
              <h3 className="text-sm font-semibold text-caution-600 dark:text-caution-500 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-caution-50 dark:bg-caution-600/35 rounded text-xs">
                  SHORT
                </span>
                ${shortLeg.strike} {optionType}
              </h3>

              {/* Current Position Info */}
              <div className="grid grid-cols-2 gap-2 text-xs p-2 bg-caution-50/50 dark:bg-caution-600/25 rounded">
                <div>
                  <span className="text-caution-600 dark:text-caution-500">Premie:</span>
                  <span className="ml-1 font-medium text-orange-900 dark:text-orange-100">
                    {formatCurrency(shortLeg.premium, currencySymbol)}
                  </span>
                </div>
                <div>
                  <span className="text-caution-600 dark:text-caution-500">Exp:</span>
                  <span className="ml-1 font-medium text-orange-900 dark:text-orange-100">
                    {new Date(shortLeg.expiration).toLocaleDateString('nl-NL', {
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Close */}
              <div>
                <label className="block text-xs font-medium text-caution-600 dark:text-caution-500 mb-1">
                  Sluit Premie
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    value={shortClosePremium}
                    onChange={(e) => setShortClosePremium(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 text-sm border border-caution-500/40 dark:border-caution-600 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-caution-500"
                    placeholder="0.00"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              {/* New Position */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-caution-600 dark:text-caution-500 mb-1">
                    Nieuwe Strike
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      value={shortNewStrike}
                      onChange={(e) => setShortNewStrike(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 text-sm border border-caution-500/40 dark:border-caution-600 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-caution-500"
                      step="0.5"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-caution-600 dark:text-caution-500 mb-1">
                    Nieuwe Exp
                  </label>
                  <FridayDatePicker
                    value={shortNewExpiration}
                    onChange={(date) => setShortNewExpiration(date)}
                    className="w-full px-3 py-2 text-sm border border-caution-500/40 dark:border-caution-600 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-caution-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-caution-600 dark:text-caution-500 mb-1">
                  Nieuwe Premie
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500 text-sm">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    value={shortNewPremium}
                    onChange={(e) => setShortNewPremium(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 text-sm border border-caution-500/40 dark:border-caution-600 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-caution-500"
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
            <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
              Notities (optioneel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-4 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-purple-500"
              rows={2}
              placeholder="Reden voor roll, marktomstandigheden, etc."
            />
          </div>

          {/* Calculation Summary */}
          <RollCalculationSummary
            closeLabel="Sluiten spread:"
            closeValue={rollCalculation.totalCloseValue}
            openLabel="Openen nieuwe spread:"
            openValue={rollCalculation.totalOpenValue}
            netCredit={rollCalculation.netCredit}
            isCredit={rollCalculation.isCredit}
            isDebit={rollCalculation.isDebit}
            currencySymbol={currencySymbol}
          />

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-line dark:border-trading-dark-600">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-ink-700 dark:text-ink-300 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 rounded-lg transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={
                !longClosePremium ||
                !longNewExpiration ||
                !longNewPremium ||
                !shortClosePremium ||
                !shortNewExpiration ||
                !shortNewPremium
              }
              className="px-4 py-2 bg-ink-700 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Redo2 className="w-4 h-4" />
              Roll Spread
            </button>
          </div>
        </form>
    </RollModalShell>
  );
};
