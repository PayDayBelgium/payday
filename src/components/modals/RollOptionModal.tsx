import React, { useState, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Redo2, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import type { CallOption, PutOption, CurrencyType } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { formatCurrency } from '../../utils/numberFormat';
import { calculateOptionRealizedPnL } from '../../utils/pnlCalculations';
import { getTodayDateString } from '../../utils/dateHelpers';
import { FridayDatePicker } from '../common/FridayDatePicker';
import { RollModalShell } from './RollModalShell';
import { RollCalculationSummary } from './RollCalculationSummary';

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
  const { t } = useTranslation();
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
  const actionType = position.action === 'buy' ? t('modalsA.long') : t('modalsA.short');

  return (
    <RollModalShell
      onClose={onClose}
      title={t('modalsA.rollOption')}
      subtitle={
        <>
          {position.ticker} {actionType} {optionType} ${position.strike}
        </>
      }
      iconWrapperClassName="bg-primary-50 dark:bg-primary-900/30"
      iconClassName="text-primary-700 dark:text-primary-300"
      maxWidthClassName="max-w-2xl"
      showHelpToggle
      onToggleHelp={() => setShowHelp(!showHelp)}
      helpToggleTitle={t('modalsA.whatIsRolling')}
    >
      {/* Help Section */}
      {showHelp && (
        <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-200 dark:border-primary-800">
          <h3 className="font-semibold text-primary-900 dark:text-blue-100 mb-2">
            {t('modalsA.whatIsOptionRoll')}
          </h3>
          <p className="text-sm text-primary-700 dark:text-primary-200 mb-2">
            <Trans i18nKey="modalsA.rollIntro" components={[<strong />, <strong />]} />
          </p>
          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-2">
              <Calendar className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-primary-700 dark:text-primary-200">
                <strong>{t('modalsA.rollInTime')}</strong> {t('modalsA.rollInTimeDesc')}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <DollarSign className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-primary-700 dark:text-primary-200">
                <strong>{t('modalsA.rollForPremium')}</strong> {t('modalsA.rollForPremiumDesc')}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <TrendingUp className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-primary-700 dark:text-primary-200">
                <strong>{t('modalsA.rollUpDown')}</strong> {t('modalsA.rollUpDownDesc')}
              </p>
            </div>
          </div>
          <p className="text-xs text-primary-700 dark:text-primary-300 mt-3 italic">
            {t('modalsA.rollTip')}
          </p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Current Position Info */}
        <div className="p-4 bg-surface dark:bg-trading-dark-700/50 rounded-lg">
          <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-300 mb-2">
            {t('modalsA.currentPosition')}
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-ink-500 dark:text-ink-400">{t('modalsA.strikeLabel')}</span>
              <span className="ml-2 font-medium text-ink-900 dark:text-white">
                ${position.strike}
              </span>
            </div>
            <div>
              <span className="text-ink-500 dark:text-ink-400">{t('modalsA.expiration')}</span>
              <span className="ml-2 font-medium text-ink-900 dark:text-white">
                {new Date(position.expiration).toLocaleDateString('nl-NL')}
              </span>
            </div>
            <div>
              <span className="text-ink-500 dark:text-ink-400">{t('modalsA.contractsLabel')}</span>
              <span className="ml-2 font-medium text-ink-900 dark:text-white">
                {position.contracts}
              </span>
            </div>
            <div>
              <span className="text-ink-500 dark:text-ink-400">{t('modalsA.premiumLabel')}</span>
              <span className="ml-2 font-medium text-ink-900 dark:text-white">
                {formatCurrency(position.premium, currencySymbol)}
              </span>
            </div>
          </div>
        </div>

        {/* Close Position Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-300 flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 bg-negative-50 dark:bg-negative-700/25 text-negative-600 dark:text-negative-500 rounded-full text-xs font-bold">
              1
            </span>
            {t('modalsA.closeCurrentPosition')}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                {t('modalsA.closePremiumPerContract')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  value={closePremium}
                  onChange={(e) => setClosePremium(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  placeholder="0.00"
                  step="0.01"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                {t('modalsA.rollDate')}
              </label>
              <input
                type="date"
                value={rollDate}
                onChange={(e) => setRollDate(e.target.value)}
                className="w-full px-4 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
          </div>
        </div>

        {/* New Position Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-300 flex items-center gap-2">
            <span className="flex items-center justify-center w-5 h-5 bg-positive-50 dark:bg-positive-700/25 text-positive-600 dark:text-positive-500 rounded-full text-xs font-bold">
              2
            </span>
            {t('modalsA.openNewPosition')}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                {t('modalsA.contracts')}
              </label>
              <div className="w-full px-4 py-2 border border-surface-line dark:border-trading-dark-500 rounded-lg bg-surface-subtle dark:bg-trading-dark-600 text-ink-900 dark:text-white">
                {position.contracts}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                {t('modalsA.strikePrice')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">$</span>
                <input
                  type="number"
                  value={newStrike}
                  onChange={(e) => setNewStrike(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  step="0.5"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                {t('modalsA.newExpiration')}
              </label>
              <FridayDatePicker
                value={newExpiration}
                onChange={(date) => setNewExpiration(date)}
                min={getTodayDateString()}
                className="w-full px-4 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-1">
                {t('modalsA.newPremiumPerContract')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  value={newPremium}
                  onChange={(e) => setNewPremium(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500"
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
            {t('modalsA.notesOptional')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-ink-200 dark:border-trading-dark-500 rounded-lg bg-white dark:bg-trading-dark-700 text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500"
            rows={2}
            placeholder={t('modalsA.rollNotesPlaceholder')}
          />
        </div>

        {/* Calculation Summary */}
        <RollCalculationSummary
          closeLabel={
            position.action === 'sell' ? t('modalsA.closeBuyback') : t('modalsA.closeSell')
          }
          closeValue={rollCalculation.closeValue}
          openLabel={position.action === 'sell' ? t('modalsA.openSell') : t('modalsA.openBuy')}
          openValue={rollCalculation.openValue}
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
            {t('modalsA.cancel')}
          </button>
          <button
            type="submit"
            disabled={!closePremium || !newExpiration || !newPremium}
            className="px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Redo2 className="w-4 h-4" />
            {t('modalsA.executeRoll')}
          </button>
        </div>
      </form>
    </RollModalShell>
  );
};
