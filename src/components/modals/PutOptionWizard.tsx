import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, ArrowRightLeft, BarChart3, RefreshCw } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useSelector } from 'react-redux';
import { addPosition } from '../../store/slices/positionsSlice';
import { addTransaction } from '../../store/slices/portfoliosSlice';
import { ensureTicker, selectAllTickers } from '../../store/slices/tickersSlice';
import { selectActiveWheels, updateWheelPremium } from '../../store/slices/wheelsSlice';
import { selectUnlockedLevels, isFeatureAvailable } from '../../store/slices/userProgressSlice';
import { getOptionActionFeature } from '../../utils/optionFeatureAccess';
import { WizardModal, type WizardStep } from './WizardModal';
import { TickerSelector } from '../widgets/TickerSelector';
import { PnLCurve } from '../widgets/PnLCurve';
import { FridayDatePicker } from '../common/FridayDatePicker';
import { LocalizedNumberInput } from '../common/LocalizedNumberInput';
import { NewTickerForm } from './NewTickerForm';
import { formatNumber, getDecimalSeparator } from '../../utils/numberFormat';
import type { PutOption, Ticker, PortfolioName, CurrencyType } from '../../types';
import type { RootState } from '../../store';
import {
  type OptionAction,
  type OptionLegData,
  type NewTickerData,
  calculateDTE,
  calculatePutBreakEven,
  calculatePutValues,
} from './optionWizardUtils';

interface PutOptionWizardProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: {
    name: PortfolioName;
    currency: CurrencyType;
    currentValue: number;
  };
  // Pre-fill options for quick creation
  initialAction?: OptionAction;
  initialTicker?: Ticker;
  initialStep?: number;
  // Auto-link to specific wheel when opened from campaign
  initialWheelId?: string;
}

export const PutOptionWizard: React.FC<PutOptionWizardProps> = ({
  isOpen,
  onClose,
  portfolio,
  initialAction,
  initialTicker,
  initialStep,
  initialWheelId,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  // Get active wheels for potential linking
  const activeWheels = useSelector((state: RootState) => selectActiveWheels(state));

  // Get all tickers to find current price
  const allTickers = useSelector(selectAllTickers);
  const unlockedLevels = useSelector(selectUnlockedLevels);

  // Level-gating: an option action may only be created once the corresponding
  // strategy is unlocked knowledge-wise. Locked actions are hidden in the
  // wizard and defensively blocked on completion.
  const canUseAction = (a: OptionAction): boolean =>
    isFeatureAvailable(getOptionActionFeature('put', a), unlockedLevels);

  // Step 1: Action selection
  const [action, setAction] = useState<OptionAction>(initialAction || 'buy');

  // Wheel linking state
  const [selectedWheelId, setSelectedWheelId] = useState<string | null>(null);
  const [, setShowWheelLinking] = useState(false);

  // Controlled step index for pre-filling
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Step 2: Ticker selection
  const [selectedTicker, setSelectedTicker] = useState<Ticker | null>(null);
  const [isCreatingTicker, setIsCreatingTicker] = useState(false);
  const [newTickerData, setNewTickerData] = useState<NewTickerData>({
    symbol: '',
    name: '',
    type: 'stock',
    optionsAvailable: true,
    miniContractsAvailable: false,
    hasDividend: false,
  });

  // Step 3: Option details
  const [longLeg, setLongLeg] = useState<OptionLegData>({
    strike: 0,
    expiration: '',
    premium: 0,
    contracts: 1,
  });

  const [shortLeg, setShortLeg] = useState<OptionLegData>({
    strike: 0,
    expiration: '',
    premium: 0,
    contracts: 1,
  });

  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Refs for autofocus
  const strikeInputRef = useRef<HTMLInputElement>(null);

  // Effect to focus strike input when moving to details step
  useEffect(() => {
    // Details step is always at index 2 for PutOptionWizard (action -> ticker -> details)
    if (currentStepIndex === 2 && strikeInputRef.current) {
      // Small delay to ensure the step has rendered
      setTimeout(() => {
        strikeInputRef.current?.focus();
      }, 100);
    }
  }, [currentStepIndex]);

  // Use shared utility for cost/value calculations
  const calculateValues = () => calculatePutValues(action, longLeg, shortLeg);

  const handleCreateTicker = () => {
    if (!newTickerData.symbol || !newTickerData.name) return;

    const ticker: Ticker = {
      ...newTickerData,
      symbol: newTickerData.symbol.toUpperCase(),
      lastUsed: new Date().toISOString(),
      currentPrice: 10, // Default price for new tickers
    };

    dispatch(ensureTicker(ticker));
    setSelectedTicker(ticker);
    setIsCreatingTicker(false);
    setNewTickerData({
      symbol: '',
      name: '',
      type: 'stock',
      optionsAvailable: true,
      miniContractsAvailable: false,
      hasDividend: false,
    });
  };

  // Find matching wheels for the selected ticker and portfolio
  const matchingWheels = useMemo(() => {
    if (!selectedTicker || action !== 'sell') return [];
    return activeWheels.filter(
      (w) =>
        w.ticker.toUpperCase() === selectedTicker.symbol.toUpperCase() &&
        w.portfolio === portfolio.name &&
        w.phase === 'csp' // Only match wheels in CSP phase
    );
  }, [selectedTicker, activeWheels, portfolio.name, action]);

  // Get current price for the selected ticker
  const currentTickerPrice = useMemo(() => {
    if (!selectedTicker) return null;
    const tickerData = allTickers.find(
      (t) => t.symbol.toUpperCase() === selectedTicker.symbol.toUpperCase()
    );
    return tickerData?.currentPrice || null;
  }, [selectedTicker, allTickers]);

  const handleComplete = () => {
    if (!selectedTicker) return;
    // Safety net: block creation of a not-yet-unlocked option action.
    if (!canUseAction(action)) return;

    const { costBasis, currentValue, cashReserved } = calculateValues();
    const dte = calculateDTE(isSpread ? longLeg.expiration : longLeg.expiration);

    if (isSpread) {
      // Create spread position (to be implemented with SpreadPosition type)
      // For now, we'll create two separate put options linked together
      const spreadId = `spread-${Date.now()}`;
      const spreadType = action === 'credit-spread' ? 'Credit' : 'Debit';

      // For Credit Spread: Short leg = higher strike, Long leg = lower strike
      // For Debit Spread: Long leg = higher strike, Short leg = lower strike
      const longPosition: PutOption = {
        id: `${spreadId}-long`,
        portfolio: portfolio.name,
        ticker: selectedTicker.symbol,
        name: selectedTicker.name,
        type: 'put',
        action: 'buy',
        status: 'open',
        openDate: purchaseDate,
        strike: longLeg.strike,
        expiration: longLeg.expiration,
        contracts: longLeg.contracts,
        premium: longLeg.premium,
        costBasis: longLeg.premium * longLeg.contracts * 100,
        currentValue: longLeg.premium * longLeg.contracts * 100,
        dte,
        breakEven: calculatePutBreakEven(longLeg.strike, longLeg.premium),
        notes: notes ? `${notes}\nSpread ID: ${spreadId}` : `Spread ID: ${spreadId}`,
      };

      const shortPosition: PutOption = {
        id: `${spreadId}-short`,
        portfolio: portfolio.name,
        ticker: selectedTicker.symbol,
        name: selectedTicker.name,
        type: 'put',
        action: 'sell',
        status: 'open',
        openDate: purchaseDate,
        strike: shortLeg.strike,
        expiration: shortLeg.expiration,
        contracts: shortLeg.contracts,
        premium: shortLeg.premium,
        costBasis: -(shortLeg.premium * shortLeg.contracts * 100),
        currentValue: -(shortLeg.premium * shortLeg.contracts * 100),
        cashReserved: action === 'credit-spread' ? cashReserved : 0, // Only credit spreads need collateral
        dte,
        breakEven: calculatePutBreakEven(shortLeg.strike, shortLeg.premium),
        notes: notes ? `${notes}\nSpread ID: ${spreadId}` : `Spread ID: ${spreadId}`,
      };

      // Ensure ticker exists in central store
      dispatch(
        ensureTicker({
          symbol: selectedTicker.symbol,
          name: selectedTicker.name,
          type: 'stock',
          optionsAvailable: selectedTicker.optionsAvailable,
          miniContractsAvailable: selectedTicker.miniContractsAvailable,
        })
      );

      dispatch(addPosition(longPosition));
      dispatch(addPosition(shortPosition));

      // Log transaction for net credit/debit
      const netAmount = costBasis;
      // Portfolio value doesn't change - the spread position value offsets the cash change

      const transaction = {
        id: `txn-${Date.now()}`,
        portfolio: portfolio.name,
        date: purchaseDate,
        type: netAmount < 0 ? ('premium_collected' as const) : ('premium_paid' as const),
        amount: netAmount < 0 ? Math.abs(netAmount) : -netAmount, // Positive for credit (cash in), negative for debit (cash out)
        description: `Put ${spreadType} Spread: ${selectedTicker.symbol} $${longLeg.strike}/$${shortLeg.strike} ${longLeg.expiration}`,
        relatedPositionId: spreadId,
        previousValue: portfolio.currentValue,
        newValue: portfolio.currentValue, // Portfolio value stays the same
        createdAt: new Date().toISOString(),
        notes: `${longLeg.contracts} contracts${action === 'credit-spread' ? ` - Collateral: $${formatNumber(cashReserved, 2)}` : ''}`,
      };

      dispatch(addTransaction(transaction));

      // Portfolio value doesn't change when opening spread positions
      // The spread position value offsets the cash change
    } else {
      // Single option position
      const newPosition: PutOption = {
        id: `put-${Date.now()}`,
        portfolio: portfolio.name,
        ticker: selectedTicker.symbol,
        name: selectedTicker.name,
        type: 'put',
        action: action as 'buy' | 'sell',
        status: 'open',
        openDate: purchaseDate,
        strike: longLeg.strike,
        expiration: longLeg.expiration,
        contracts: longLeg.contracts,
        premium: longLeg.premium,
        costBasis,
        currentValue,
        cashReserved: action === 'sell' ? cashReserved : undefined,
        dte,
        breakEven: calculatePutBreakEven(longLeg.strike, longLeg.premium, action === 'buy'),
        notes,
        // Link to Wheel if selected (only for sell/CSP)
        wheelId: action === 'sell' && selectedWheelId ? selectedWheelId : undefined,
      };

      // Update wheel premium if linked
      if (action === 'sell' && selectedWheelId) {
        const premiumCollected = longLeg.premium * longLeg.contracts * 100;
        dispatch(
          updateWheelPremium({
            id: selectedWheelId,
            premiumCollected,
            realizedPnL: 0, // P&L will be realized when the option closes
          })
        );
      }

      // Ensure ticker exists in central store
      dispatch(
        ensureTicker({
          symbol: selectedTicker.symbol,
          name: selectedTicker.name,
          type: 'stock',
          optionsAvailable: selectedTicker.optionsAvailable,
          miniContractsAvailable: selectedTicker.miniContractsAvailable,
        })
      );

      dispatch(addPosition(newPosition));

      // Log transaction
      // When buying/selling options, the portfolio value doesn't change
      // Cash decreases/increases, but the position value compensates
      // For buy: cash -$20, position +$20 = net 0
      // For sell: cash +$20, position -$20 (liability) = net 0

      const transaction = {
        id: `txn-${Date.now()}`,
        portfolio: portfolio.name,
        date: purchaseDate,
        type: action === 'buy' ? ('premium_paid' as const) : ('premium_collected' as const),
        amount: action === 'buy' ? -costBasis : Math.abs(costBasis), // Negative for buy (cash out), positive for sell (cash in)
        description: `${action === 'buy' ? 'Buy' : 'Sell'} Put${action === 'sell' ? ' (CSP)' : ''}: ${selectedTicker.symbol} $${longLeg.strike} ${longLeg.expiration}`,
        relatedPositionId: newPosition.id,
        previousValue: portfolio.currentValue,
        newValue: portfolio.currentValue, // Portfolio value stays the same
        createdAt: new Date().toISOString(),
        notes: `${longLeg.contracts} contracts @ $${longLeg.premium}${action === 'sell' ? ` • Cash reserved: $${formatNumber(cashReserved, 2)}` : ''}`,
      };

      dispatch(addTransaction(transaction));

      // Portfolio value doesn't change when opening option positions
      // The position value offsets the cash change
      // No need to update portfolio value here
    }

    // Reset form and close
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setAction(initialAction || 'buy');
    setSelectedTicker(initialTicker || null);
    setIsCreatingTicker(false);
    setLongLeg({ strike: 0, expiration: '', premium: 0, contracts: 1 });
    setShortLeg({ strike: 0, expiration: '', premium: 0, contracts: 1 });
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    // Reset wheel linking
    setSelectedWheelId(null);
    setShowWheelLinking(false);
    // Reset to initial step if provided, otherwise 0
    setCurrentStepIndex(initialStep || 0);
  };

  // Effect to initialize values when wizard opens with initial values
  React.useEffect(() => {
    if (isOpen) {
      if (initialAction) {
        setAction(initialAction);
      }
      if (initialTicker) {
        setSelectedTicker(initialTicker);
      }
      if (initialStep !== undefined) {
        setCurrentStepIndex(initialStep);
      }
      // Auto-select wheel if initialWheelId is provided
      if (initialWheelId) {
        setSelectedWheelId(initialWheelId);
      }
    }
  }, [isOpen, initialAction, initialTicker, initialStep, initialWheelId]);

  // Check if current action is a spread type
  const isSpread = action === 'credit-spread' || action === 'debit-spread';

  const steps: WizardStep[] = useMemo(
    () => [
      {
        id: 'action',
        title: t('putWizard.actionStep.title'),
        description: t('putWizard.actionStep.description'),
        isValid: true,
        component: (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {canUseAction('buy') && (
                <button
                  onClick={() => setAction('buy')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    action === 'buy'
                      ? 'border-negative-600 bg-negative-50 dark:bg-negative-700/15'
                      : 'border-surface-line dark:border-trading-dark-600 hover:border-negative-500/30'
                  }`}
                >
                  <TrendingDown className="w-6 h-6 mx-auto mb-1.5 text-negative-600 dark:text-negative-500" />
                  <h3 className="text-sm font-semibold text-ink-900 dark:text-white mb-0.5">
                    {t('putWizard.actionStep.buyPut')}
                  </h3>
                  <p className="text-xs text-ink-600 dark:text-ink-400">
                    {t('putWizard.actionStep.buyPutDesc')}
                  </p>
                </button>
              )}

              {canUseAction('sell') && (
                <button
                  onClick={() => setAction('sell')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    action === 'sell'
                      ? 'border-positive-600 bg-positive-50 dark:bg-positive-700/15'
                      : 'border-surface-line dark:border-trading-dark-600 hover:border-positive-500/30'
                  }`}
                >
                  <TrendingUp className="w-6 h-6 mx-auto mb-1.5 text-positive-600 dark:text-positive-500" />
                  <h3 className="text-sm font-semibold text-ink-900 dark:text-white mb-0.5">
                    {t('putWizard.actionStep.sellPut')}
                  </h3>
                  <p className="text-xs text-ink-600 dark:text-ink-400">
                    {t('putWizard.actionStep.sellPutDesc')}
                  </p>
                </button>
              )}

              {canUseAction('credit-spread') && (
                <button
                  onClick={() => setAction('credit-spread')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    action === 'credit-spread'
                      ? 'border-ink-700 bg-surface-subtle dark:bg-trading-dark-700'
                      : 'border-surface-line dark:border-trading-dark-600 hover:border-ink-300'
                  }`}
                >
                  <ArrowRightLeft className="w-6 h-6 mx-auto mb-1.5 text-ink-600 dark:text-ink-300" />
                  <h3 className="text-sm font-semibold text-ink-900 dark:text-white mb-0.5">
                    {t('putWizard.actionStep.creditSpread')}
                  </h3>
                  <p className="text-xs text-ink-600 dark:text-ink-400">
                    {t('putWizard.actionStep.creditSpreadDesc')}
                  </p>
                </button>
              )}

              {canUseAction('debit-spread') && (
                <button
                  onClick={() => setAction('debit-spread')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    action === 'debit-spread'
                      ? 'border-primary-700 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-surface-line dark:border-trading-dark-600 hover:border-primary-300'
                  }`}
                >
                  <ArrowRightLeft className="w-6 h-6 mx-auto mb-1.5 text-primary-700 dark:text-primary-300" />
                  <h3 className="text-sm font-semibold text-ink-900 dark:text-white mb-0.5">
                    {t('putWizard.actionStep.debitSpread')}
                  </h3>
                  <p className="text-xs text-ink-600 dark:text-ink-400">
                    {t('putWizard.actionStep.debitSpreadDesc')}
                  </p>
                </button>
              )}
            </div>

            <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <h4 className="text-sm font-semibold text-primary-900 dark:text-primary-300 mb-1.5">
                {action === 'buy' && t('putWizard.actionStep.buyPut')}
                {action === 'sell' && t('putWizard.actionStep.sellPut')}
                {action === 'credit-spread' && t('putWizard.actionStep.creditSpread')}
                {action === 'debit-spread' && t('putWizard.actionStep.debitSpread')}
              </h4>
              <p className="text-xs text-primary-700 dark:text-primary-300 mb-2">
                {action === 'buy' && (
                  <>
                    <strong>{t('putWizard.actionStep.buyPutInfo.when')}</strong>{' '}
                    {t('putWizard.actionStep.buyPutInfo.whenText')}
                    <br />
                    <br />
                    <strong>{t('putWizard.actionStep.buyPutInfo.how')}</strong>{' '}
                    {t('putWizard.actionStep.buyPutInfo.howText')}
                    <br />
                    <br />
                    <strong>{t('putWizard.actionStep.buyPutInfo.risk')}</strong>{' '}
                    {t('putWizard.actionStep.buyPutInfo.riskText')}
                  </>
                )}
                {action === 'sell' && (
                  <>
                    <strong>{t('putWizard.actionStep.sellPutInfo.when')}</strong>{' '}
                    {t('putWizard.actionStep.sellPutInfo.whenText')}
                    <br />
                    <br />
                    <strong>{t('putWizard.actionStep.sellPutInfo.how')}</strong>{' '}
                    {t('putWizard.actionStep.sellPutInfo.howText')}
                    <br />
                    <br />
                    <strong>{t('putWizard.actionStep.sellPutInfo.risk')}</strong>{' '}
                    {t('putWizard.actionStep.sellPutInfo.riskText')}
                  </>
                )}
                {action === 'credit-spread' && (
                  <>
                    <strong>{t('putWizard.actionStep.creditSpreadInfo.when')}</strong>{' '}
                    {t('putWizard.actionStep.creditSpreadInfo.whenText')}
                    <br />
                    <br />
                    <strong>{t('putWizard.actionStep.creditSpreadInfo.how')}</strong>{' '}
                    {t('putWizard.actionStep.creditSpreadInfo.howText')}
                    <br />
                    <br />
                    <strong>{t('putWizard.actionStep.creditSpreadInfo.risk')}</strong>{' '}
                    {t('putWizard.actionStep.creditSpreadInfo.riskText')}
                  </>
                )}
                {action === 'debit-spread' && (
                  <>
                    <strong>{t('putWizard.actionStep.debitSpreadInfo.when')}</strong>{' '}
                    {t('putWizard.actionStep.debitSpreadInfo.whenText')}
                    <br />
                    <br />
                    <strong>{t('putWizard.actionStep.debitSpreadInfo.how')}</strong>{' '}
                    {t('putWizard.actionStep.debitSpreadInfo.howText')}
                    <br />
                    <br />
                    <strong>{t('putWizard.actionStep.debitSpreadInfo.risk')}</strong>{' '}
                    {t('putWizard.actionStep.debitSpreadInfo.riskText')}
                  </>
                )}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'ticker',
        title: t('putWizard.tickerStep.title'),
        description: t('putWizard.tickerStep.description'),
        isValid: !!selectedTicker && !isCreatingTicker,
        component: (
          <div className="space-y-4">
            {!isCreatingTicker ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                    {t('putWizard.tickerStep.tickerSymbol')}
                  </label>
                  <TickerSelector
                    value={selectedTicker?.symbol || ''}
                    onChange={(ticker) => setSelectedTicker(ticker)}
                    onCreateNew={(symbol) => {
                      setNewTickerData({ ...newTickerData, symbol });
                      setIsCreatingTicker(true);
                    }}
                    placeholder={t('putWizard.tickerStep.searchPlaceholder')}
                    autoFocus
                  />
                </div>

                {selectedTicker && (
                  <div className="p-4 bg-positive-50 dark:bg-positive-700/15 rounded-lg border border-positive-500/20 dark:border-positive-700/30">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-positive-50 dark:bg-positive-700/25 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-positive-600 dark:text-positive-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-positive-700 dark:text-positive-500">
                          {selectedTicker.symbol}
                        </h4>
                        <p className="text-sm text-positive-700 dark:text-positive-500">
                          {selectedTicker.name}
                        </p>
                        {selectedTicker.optionsAvailable && (
                          <p className="text-xs text-positive-600 dark:text-positive-500">
                            {t('putWizard.tickerStep.optionsAvailable')}
                            {selectedTicker.miniContractsAvailable &&
                              ` • ${t('putWizard.tickerStep.miniContracts')}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <NewTickerForm
                data={newTickerData}
                onChange={setNewTickerData}
                onSave={handleCreateTicker}
                onCancel={() => {
                  setIsCreatingTicker(false);
                  setNewTickerData({
                    symbol: '',
                    name: '',
                    type: 'stock',
                    optionsAvailable: true,
                    miniContractsAvailable: false,
                    hasDividend: false,
                  });
                }}
                labels={{
                  newTickerHeading: t('putWizard.tickerStep.newTicker'),
                  newTickerDesc: t('putWizard.tickerStep.newTickerDesc'),
                  companyName: t('putWizard.tickerStep.companyName'),
                  companyPlaceholder: t('modalsB.putWizard.companyPlaceholder'),
                  type: t('modalsB.putWizard.type'),
                  stock: t('modalsB.putWizard.stock'),
                  etf: t('modalsB.putWizard.etf'),
                  optionsAvailableCheck: t('modalsB.putWizard.optionsAvailableCheck'),
                  miniContractsCheck: t('modalsB.putWizard.miniContractsCheck'),
                  miniContractsTooltip: t('modalsB.putWizard.miniContractsTooltip'),
                  addTicker: t('modalsB.putWizard.addTicker'),
                  cancel: t('modalsB.putWizard.cancel'),
                }}
              />
            )}
          </div>
        ),
      },
      {
        id: 'details',
        title: t('modalsB.putWizard.detailsTitle'),
        description: isSpread
          ? t('modalsB.putWizard.detailsDescSpread')
          : t('modalsB.putWizard.detailsDescSingle'),
        isValid: isSpread
          ? longLeg.strike > 0 &&
            longLeg.expiration !== '' &&
            longLeg.premium > 0 &&
            longLeg.contracts > 0 &&
            shortLeg.strike > 0 &&
            shortLeg.expiration !== '' &&
            shortLeg.premium > 0 &&
            shortLeg.contracts > 0 &&
            (action === 'credit-spread'
              ? shortLeg.strike > longLeg.strike && shortLeg.premium > longLeg.premium // Credit: short higher, premium validates net credit
              : longLeg.strike > shortLeg.strike && longLeg.premium > shortLeg.premium) // Debit: long higher, premium validates net debit
          : longLeg.strike > 0 &&
            longLeg.expiration !== '' &&
            longLeg.premium > 0 &&
            longLeg.contracts > 0,
        component: (
          <div className="space-y-6">
            {isSpread ? (
              <>
                {/* Spread Legs - Compact Side by Side */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {action === 'credit-spread' ? (
                    <>
                      {/* Short Leg first for credit spread */}
                      <div className="p-3 bg-caution-50 dark:bg-caution-600/15 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
                        <h4 className="font-semibold text-orange-900 dark:text-caution-500 mb-3 text-sm">
                          {t('modalsB.putWizard.shortLegCredit')}
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('modalsB.putWizard.strikePrice')}
                            </label>
                            <LocalizedNumberInput
                              ref={strikeInputRef}
                              value={shortLeg.strike}
                              onChange={(strike) => setShortLeg({ ...shortLeg, strike })}
                              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                              placeholder={`140${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('modalsB.putWizard.premiumPerShare')}
                            </label>
                            <LocalizedNumberInput
                              value={shortLeg.premium}
                              onChange={(premium) => setShortLeg({ ...shortLeg, premium })}
                              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                              placeholder={`2${getDecimalSeparator()}50`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Long Leg second for credit spread */}
                      <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                        <h4 className="font-semibold text-primary-900 dark:text-primary-300 mb-3 text-sm">
                          {t('modalsB.putWizard.longLegCredit')}
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('modalsB.putWizard.strikePrice')}
                            </label>
                            <LocalizedNumberInput
                              value={longLeg.strike}
                              onChange={(strike) => setLongLeg({ ...longLeg, strike })}
                              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                              placeholder={`30${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('modalsB.putWizard.premiumPerShare')}
                            </label>
                            <LocalizedNumberInput
                              value={longLeg.premium}
                              onChange={(premium) => setLongLeg({ ...longLeg, premium })}
                              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                              placeholder={`0${getDecimalSeparator()}20`}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Long Leg first for debit spread */}
                      <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                        <h4 className="font-semibold text-primary-900 dark:text-primary-300 mb-3 text-sm">
                          {t('modalsB.putWizard.longLegDebit')}
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('modalsB.putWizard.strikePrice')}
                            </label>
                            <LocalizedNumberInput
                              ref={strikeInputRef}
                              value={longLeg.strike}
                              onChange={(strike) => setLongLeg({ ...longLeg, strike })}
                              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                              placeholder={`140${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('modalsB.putWizard.premiumPerShare')}
                            </label>
                            <LocalizedNumberInput
                              value={longLeg.premium}
                              onChange={(premium) => setLongLeg({ ...longLeg, premium })}
                              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                              placeholder={`2${getDecimalSeparator()}50`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Short Leg second for debit spread */}
                      <div className="p-3 bg-caution-50 dark:bg-caution-600/15 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
                        <h4 className="font-semibold text-orange-900 dark:text-caution-500 mb-3 text-sm">
                          {t('modalsB.putWizard.shortLegDebit')}
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('modalsB.putWizard.strikePrice')}
                            </label>
                            <LocalizedNumberInput
                              value={shortLeg.strike}
                              onChange={(strike) => setShortLeg({ ...shortLeg, strike })}
                              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                              placeholder={`30${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('modalsB.putWizard.premiumPerShare')}
                            </label>
                            <LocalizedNumberInput
                              value={shortLeg.premium}
                              onChange={(premium) => setShortLeg({ ...shortLeg, premium })}
                              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                              placeholder={`0${getDecimalSeparator()}20`}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Shared Settings */}
                <div className="p-3 bg-surface dark:bg-trading-dark-700 rounded-lg border border-surface-line dark:border-trading-dark-500">
                  <h4 className="font-semibold text-ink-900 dark:text-white mb-3 text-sm">
                    {t('modalsB.putWizard.spreadSettings')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                        {t('modalsB.putWizard.expirationDate')}
                      </label>
                      <FridayDatePicker
                        value={longLeg.expiration}
                        onChange={(date) => {
                          setLongLeg({ ...longLeg, expiration: date });
                          setShortLeg({ ...shortLeg, expiration: date });
                        }}
                        className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                      />
                      {longLeg.expiration && (
                        <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                          {t('modalsB.putWizard.dte', { days: calculateDTE(longLeg.expiration) })}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                        {t('modalsB.putWizard.numberOfContracts')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={longLeg.contracts || ''}
                        onChange={(e) => {
                          const contracts = parseInt(e.target.value) || 1;
                          setLongLeg({ ...longLeg, contracts });
                          setShortLeg({ ...shortLeg, contracts });
                        }}
                        className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                        placeholder="1"
                      />
                      <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                        {t('modalsB.putWizard.equalsShares', { shares: longLeg.contracts * 100 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Spread Summary */}
                {longLeg.strike > 0 &&
                  shortLeg.strike > 0 &&
                  longLeg.premium > 0 &&
                  shortLeg.premium > 0 && (
                    <div className="p-3 bg-surface-subtle dark:bg-trading-dark-700 rounded-lg border border-ink-200 dark:border-trading-dark-600">
                      <h4 className="font-semibold text-purple-900 dark:text-ink-300 mb-3 text-sm flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        {t('modalsB.putWizard.spreadOverview')}
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-ink-600 dark:text-ink-400">
                            {action === 'credit-spread'
                              ? t('modalsB.putWizard.netCredit')
                              : t('modalsB.putWizard.netDebit')}
                          </p>
                          <p
                            className={`font-semibold ${action === 'credit-spread' ? 'text-positive-600 dark:text-positive-500' : 'text-negative-600 dark:text-negative-500'}`}
                          >
                            {action === 'credit-spread' ? '+' : '-'}$
                            {formatNumber(
                              Math.abs(
                                (shortLeg.premium - longLeg.premium) * longLeg.contracts * 100
                              ),
                              2
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-600 dark:text-ink-400">
                            {t('modalsB.putWizard.maxProfit')}
                          </p>
                          <p className="font-semibold text-positive-600 dark:text-positive-500">
                            $
                            {action === 'credit-spread'
                              ? formatNumber(
                                  (shortLeg.premium - longLeg.premium) * longLeg.contracts * 100,
                                  2
                                )
                              : formatNumber(
                                  (Math.abs(shortLeg.strike - longLeg.strike) -
                                    (longLeg.premium - shortLeg.premium)) *
                                    longLeg.contracts *
                                    100,
                                  2
                                )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-600 dark:text-ink-400">
                            {t('modalsB.putWizard.maxLoss')}
                          </p>
                          <p className="font-semibold text-negative-600 dark:text-negative-500">
                            -$
                            {action === 'credit-spread'
                              ? formatNumber(
                                  (Math.abs(shortLeg.strike - longLeg.strike) -
                                    (shortLeg.premium - longLeg.premium)) *
                                    longLeg.contracts *
                                    100,
                                  2
                                )
                              : formatNumber(
                                  (longLeg.premium - shortLeg.premium) * longLeg.contracts * 100,
                                  2
                                )}
                          </p>
                          <p className="text-[10px] text-ink-500 dark:text-ink-500 mt-0.5">
                            {action === 'credit-spread'
                              ? `($${formatNumber(Math.abs(shortLeg.strike - longLeg.strike), 2)} × 100 × ${longLeg.contracts}) - $${formatNumber((shortLeg.premium - longLeg.premium) * longLeg.contracts * 100, 2)}`
                              : t('modalsB.putWizard.netDebitPaid')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-600 dark:text-ink-400">
                            {t('modalsB.putWizard.spreadWidth')}
                          </p>
                          <p className="font-semibold text-ink-900 dark:text-white">
                            ${formatNumber(Math.abs(shortLeg.strike - longLeg.strike), 2)}
                          </p>
                          <p className="text-[10px] text-ink-500 dark:text-ink-500 mt-0.5">
                            Max: $
                            {formatNumber(
                              Math.abs(shortLeg.strike - longLeg.strike) * 100 * longLeg.contracts,
                              2
                            )}{' '}
                            ({longLeg.contracts}×100)
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
              </>
            ) : (
              <>
                {/* Current Stock price Indicator */}
                {currentTickerPrice && (
                  <div className="mb-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                        {t('modalsB.putWizard.currentPrice', { ticker: selectedTicker?.symbol })}
                      </span>
                      <span className="text-lg font-bold text-primary-900 dark:text-blue-100">
                        ${formatNumber(currentTickerPrice, 2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Single Option Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                      {t('modalsB.putWizard.strikePrice')}
                    </label>
                    <LocalizedNumberInput
                      ref={strikeInputRef}
                      value={longLeg.strike}
                      onChange={(strike) => setLongLeg({ ...longLeg, strike })}
                      className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                      placeholder={`150${getDecimalSeparator()}00`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                      {t('modalsB.putWizard.premiumPerShare')}
                    </label>
                    <LocalizedNumberInput
                      value={longLeg.premium}
                      onChange={(premium) => setLongLeg({ ...longLeg, premium })}
                      className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                      placeholder={`5${getDecimalSeparator()}50`}
                    />
                    <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                      {t('modalsB.putWizard.total', {
                        total: `$${formatNumber(longLeg.premium * longLeg.contracts * 100, 2)}`,
                      })}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                      {t('modalsB.putWizard.expirationDate')}
                    </label>
                    <FridayDatePicker
                      value={longLeg.expiration}
                      onChange={(date) => setLongLeg({ ...longLeg, expiration: date })}
                      className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                    />
                    {longLeg.expiration && (
                      <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                        {t('modalsB.putWizard.dte', { days: calculateDTE(longLeg.expiration) })}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                      {t('modalsB.putWizard.numberOfContracts')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={longLeg.contracts || ''}
                      onChange={(e) =>
                        setLongLeg({ ...longLeg, contracts: parseInt(e.target.value) || 1 })
                      }
                      className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                      placeholder="1"
                    />
                    <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                      {t('modalsB.putWizard.equalsShares', { shares: longLeg.contracts * 100 })}
                    </p>
                  </div>
                </div>

                {/* Break-even & Max Display */}
                {longLeg.strike > 0 && longLeg.premium > 0 && (
                  <div
                    className={`p-4 rounded-lg border ${
                      action === 'sell'
                        ? 'bg-positive-50 dark:bg-positive-700/15 border-positive-500/20 dark:border-positive-700/30'
                        : 'bg-negative-50 dark:bg-negative-700/15 border-negative-500/20 dark:border-negative-700/30'
                    }`}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-ink-600 dark:text-ink-400">
                          {t('modalsB.putWizard.breakEvenPrice')}
                        </p>
                        <p className="text-lg font-semibold text-ink-900 dark:text-white">
                          ${formatNumber(calculatePutBreakEven(longLeg.strike, longLeg.premium), 2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-ink-600 dark:text-ink-400">
                          {action === 'buy'
                            ? t('modalsB.putWizard.maxLoss')
                            : t('modalsB.putWizard.maxProfit')}
                        </p>
                        <p
                          className={`text-lg font-semibold ${
                            action === 'buy'
                              ? 'text-negative-600 dark:text-negative-500'
                              : 'text-positive-600 dark:text-positive-500'
                          }`}
                        >
                          {action === 'buy' ? '-' : '+'}$
                          {formatNumber(longLeg.premium * longLeg.contracts * 100, 2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Common Fields */}
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                {t('modalsB.putWizard.purchaseDate')}
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                {t('modalsB.putWizard.notes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                placeholder={t('modalsB.putWizard.notesPlaceholder')}
              />
            </div>

            {/* Wheel Linking for CSP */}
            {action === 'sell' && matchingWheels.length > 0 && (
              <div className="p-4 bg-caution-50 dark:bg-caution-600/15 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
                <div className="flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 dark:text-caution-500 mb-2">
                      {t('modalsB.putWizard.wheelFound')}
                    </h4>
                    <p className="text-sm text-caution-600 dark:text-caution-500 mb-3">
                      {matchingWheels.length === 1
                        ? t('modalsB.putWizard.wheelFoundSingle', {
                            ticker: selectedTicker?.symbol,
                          })
                        : t('modalsB.putWizard.wheelFoundPlural', {
                            count: matchingWheels.length,
                            ticker: selectedTicker?.symbol,
                          })}
                    </p>
                    <div className="space-y-2">
                      {matchingWheels.map((wheel) => (
                        <label
                          key={wheel.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedWheelId === wheel.id
                              ? 'border-caution-500 bg-caution-50 dark:bg-amber-900/40'
                              : 'border-surface-line dark:border-trading-dark-600 hover:border-caution-500/40'
                          }`}
                        >
                          <input
                            type="radio"
                            name="wheel-link"
                            checked={selectedWheelId === wheel.id}
                            onChange={() => setSelectedWheelId(wheel.id)}
                            className="w-4 h-4 text-caution-600"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-ink-900 dark:text-white text-sm">
                              Wheel - {wheel.ticker}
                            </p>
                            <p className="text-xs text-ink-600 dark:text-ink-400">
                              {t('modalsB.putWizard.wheelInfo', {
                                contracts: wheel.targetContracts,
                                cycles: wheel.cycles,
                                premium: `$${formatNumber(wheel.totalPremiumCollected, 2)}`,
                              })}
                            </p>
                          </div>
                        </label>
                      ))}
                      <label
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedWheelId === null
                            ? 'border-ink-400 bg-surface-subtle dark:bg-trading-dark-700'
                            : 'border-surface-line dark:border-trading-dark-600 hover:border-ink-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="wheel-link"
                          checked={selectedWheelId === null}
                          onChange={() => setSelectedWheelId(null)}
                          className="w-4 h-4 text-ink-600"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-ink-900 dark:text-white text-sm">
                            {t('modalsB.putWizard.dontLink')}
                          </p>
                          <p className="text-xs text-ink-600 dark:text-ink-400">
                            {t('modalsB.putWizard.dontLinkDesc')}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* P&L Curve */}
            {isSpread
              ? // Spread P&L Curve
                longLeg.strike > 0 &&
                shortLeg.strike > 0 &&
                longLeg.premium > 0 &&
                shortLeg.premium > 0 &&
                longLeg.contracts > 0 && (
                  <PnLCurve
                    type="put-spread"
                    longStrike={longLeg.strike}
                    shortStrike={shortLeg.strike}
                    longPremium={longLeg.premium}
                    shortPremium={shortLeg.premium}
                    contracts={longLeg.contracts}
                    currency={portfolio.currency}
                  />
                )
              : // Single Option P&L Curve
                longLeg.strike > 0 &&
                longLeg.premium > 0 &&
                longLeg.contracts > 0 && (
                  <PnLCurve
                    type={action === 'buy' ? 'put-buy' : 'put-sell'}
                    strike={longLeg.strike}
                    premium={longLeg.premium}
                    contracts={longLeg.contracts}
                    currency={portfolio.currency}
                  />
                )}
          </div>
        ),
      },
    ],
    [
      action,
      selectedTicker,
      isCreatingTicker,
      newTickerData,
      longLeg,
      shortLeg,
      purchaseDate,
      notes,
      matchingWheels,
      selectedWheelId,
      unlockedLevels,
    ]
  );

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        resetForm();
      }}
      title={t('putWizard.title')}
      steps={steps}
      onComplete={handleComplete}
      completeButtonLabel={t('putWizard.completeButton')}
      currentStepIndex={currentStepIndex}
      onStepChange={setCurrentStepIndex}
    />
  );
};
