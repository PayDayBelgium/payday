import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, ArrowRightLeft, Info, BarChart3, RefreshCw } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { addPosition } from '../../store/slices/positionsSlice';
import { selectPositions } from '../../store/slices/positionsSlice';
import { addTransaction } from '../../store/slices/portfoliosSlice';
import { ensureTicker, selectAllTickers } from '../../store/slices/tickersSlice';
import { selectActiveWheels, updateWheelPremium } from '../../store/slices/wheelsSlice';
import { WizardModal, type WizardStep } from './WizardModal';
import { TickerSelector } from '../widgets/TickerSelector';
import { PnLCurve } from '../widgets/PnLCurve';
import { FridayDatePicker } from '../common/FridayDatePicker';
import { parseLocalizedNumber, formatNumber, getDecimalSeparator } from '../../utils/numberFormat';
import type { CallOption, Ticker, PortfolioName, CurrencyType, Position } from '../../types';
import { groupHoldings, type Holding } from '../../utils/holdings';
import type { RootState } from '../../store';
import {
  type OptionAction,
  type OptionLegData,
  validateNumberInput,
  calculateDTE,
  calculateCallBreakEven,
  calculateSpreadCollateral,
  calculateCashReserved,
  calculateCallValues,
  validateCallSpread,
  getCallPnLType,
  calculateCallSpreadSummary,
  generateCallOptionId,
  generateSpreadId,
  generateTransactionId,
  DEFAULT_NEW_TICKER_DATA,
} from './optionWizardUtils';

interface CallOptionWizardProps {
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
  initialWheelId?: string;
}

export const CallOptionWizard: React.FC<CallOptionWizardProps> = ({
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
  const allPositions = useAppSelector(selectPositions);
  const activeWheels = useAppSelector((state: RootState) => selectActiveWheels(state));
  const allWheels = useAppSelector((state: RootState) => state.wheels.wheels);
  const allTickers = useAppSelector(selectAllTickers);

  // Get the initial wheel if provided
  const initialWheel = useMemo(() => {
    if (!initialWheelId) return null;
    return allWheels.find((w) => w.id === initialWheelId) || null;
  }, [initialWheelId, allWheels]);

  // Step 1: Action selection
  const [action, setAction] = useState<OptionAction>(initialAction || 'buy');

  // Wheel linking state
  const [selectedWheelId, setSelectedWheelId] = useState<string | null>(null);

  // Controlled step index for pre-filling
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // For covered calls: selected underlying position (stock or LEAP)
  const [selectedUnderlying, setSelectedUnderlying] = useState<Position | null>(null);

  // Step 2: Ticker selection
  const [selectedTicker, setSelectedTicker] = useState<Ticker | null>(null);
  const [isCreatingTicker, setIsCreatingTicker] = useState(false);
  const [newTickerData, setNewTickerData] = useState({
    symbol: '',
    name: '',
    type: 'stock' as 'stock' | 'etf',
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

  // Text representations for locale-based number formatting
  const [longLegStrikeText, setLongLegStrikeText] = useState('');
  const [longLegPremiumText, setLongLegPremiumText] = useState('');
  const [shortLegStrikeText, setShortLegStrikeText] = useState('');
  const [shortLegPremiumText, setShortLegPremiumText] = useState('');

  // Refs for autofocus
  const strikeInputRef = useRef<HTMLInputElement>(null);

  // Effect to focus strike input when moving to details step
  useEffect(() => {
    // Details step is always at index 2 (action -> ticker -> details)
    if (currentStepIndex === 2 && strikeInputRef.current) {
      // Small delay to ensure the step has rendered
      setTimeout(() => {
        strikeInputRef.current?.focus();
      }, 100);
    }
  }, [currentStepIndex]);

  // Calculate eligible underlyings for covered calls
  const eligibleUnderlyings = useMemo(() => {
    const portfolioPositions = allPositions.filter(
      (p) => p.portfolio === portfolio.name && p.status === 'open'
    );

    // Stocks/ETFs aggregated per ticker, with >= 1 free (uncovered) contract
    const eligibleStocks: Holding[] = groupHoldings(portfolioPositions, portfolio.name).filter(
      (h) => h.canWriteCoveredCall
    );

    // LEAPs: long calls with expiry > 3 months (90 days)
    const today = new Date();
    const threeMonthsFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const eligibleLeaps = portfolioPositions.filter((p) => {
      if (p.type !== 'call') return false;
      const call = p as CallOption;
      if (call.action !== 'buy') return false;
      const expiry = new Date(call.expiration);
      return expiry > threeMonthsFromNow;
    });

    return { stocks: eligibleStocks, leaps: eligibleLeaps };
  }, [allPositions, portfolio.name]);

  // Check if covered call option should be available
  const hasCoveredCallEligible =
    eligibleUnderlyings.stocks.length > 0 || eligibleUnderlyings.leaps.length > 0;

  // Use shared utility for cost/value calculations
  const calculateValues = () => calculateCallValues(action, longLeg, shortLeg);

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

  // Find matching wheels for sell calls (wheels in 'stock' phase)
  const matchingWheels = useMemo(() => {
    if (!selectedTicker || action !== 'sell') return [];
    return activeWheels.filter(
      (w) =>
        w.ticker.toUpperCase() === selectedTicker.symbol.toUpperCase() &&
        w.portfolio === portfolio.name &&
        w.phase === 'stock' // Only match wheels in stock phase
    );
  }, [selectedTicker, activeWheels, portfolio.name, action]);

  // Check if contracts should be locked to wheel's targetContracts
  const wheelLockedContracts = useMemo(() => {
    if (!selectedWheelId) return null;
    const wheel = allWheels.find((w) => w.id === selectedWheelId);
    return wheel?.targetContracts || null;
  }, [selectedWheelId, allWheels]);

  // Get current ticker price from ticker store
  const currentTickerPrice = useMemo(() => {
    if (!selectedTicker) return null;
    const tickerData = allTickers.find(
      (t) => t.symbol.toUpperCase() === selectedTicker.symbol.toUpperCase()
    );
    return tickerData?.currentPrice || null;
  }, [selectedTicker, allTickers]);

  // For covered calls: max contracts is capped at the holding's freeContracts
  const maxCoveredCallContracts = useMemo(() => {
    if (action !== 'covered-call' || !selectedTicker) return Infinity;
    const holding = eligibleUnderlyings.stocks.find(
      (h) => h.ticker.toUpperCase() === selectedTicker.symbol.toUpperCase()
    );
    return holding ? holding.freeContracts : Infinity;
  }, [action, selectedTicker, eligibleUnderlyings.stocks]);

  const handleComplete = () => {
    if (!selectedTicker) return;

    const { costBasis, currentValue, cashReserved } = calculateValues();
    const dte = calculateDTE(isSpread ? longLeg.expiration : longLeg.expiration);

    if (isSpread) {
      // Create spread position (to be implemented with SpreadPosition type)
      // For now, we'll create two separate call options linked together
      const spreadId = `spread-${Date.now()}`;
      const spreadType = action === 'credit-spread' ? 'Credit' : 'Debit';

      // For Credit Spread: Short leg = lower strike, Long leg = higher strike
      // For Debit Spread: Long leg = lower strike, Short leg = higher strike
      const longPosition: CallOption = {
        id: `${spreadId}-long`,
        portfolio: portfolio.name,
        ticker: selectedTicker.symbol,
        name: selectedTicker.name,
        type: 'call',
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
        breakEven: calculateCallBreakEven(longLeg.strike, longLeg.premium),
        notes: notes ? `${notes}\nSpread ID: ${spreadId}` : `Spread ID: ${spreadId}`,
      };

      const shortPosition: CallOption = {
        id: `${spreadId}-short`,
        portfolio: portfolio.name,
        ticker: selectedTicker.symbol,
        name: selectedTicker.name,
        type: 'call',
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
        breakEven: calculateCallBreakEven(shortLeg.strike, shortLeg.premium),
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

      // Log transaction for net debit/credit
      const netAmount = costBasis;
      // Portfolio value doesn't change - the spread position value offsets the cash change
      const transaction = {
        id: `txn-${Date.now()}`,
        portfolio: portfolio.name,
        date: purchaseDate,
        type: netAmount < 0 ? ('premium_collected' as const) : ('premium_paid' as const),
        amount: netAmount < 0 ? Math.abs(netAmount) : -netAmount, // Positive for credit (cash in), negative for debit (cash out)
        description: `Call ${spreadType} Spread: ${selectedTicker.symbol} $${longLeg.strike}/$${shortLeg.strike} ${longLeg.expiration}`,
        relatedPositionId: spreadId,
        previousValue: portfolio.currentValue,
        newValue: portfolio.currentValue, // Portfolio value stays the same
        createdAt: new Date().toISOString(),
        notes: `${longLeg.contracts} contracts${action === 'credit-spread' ? ` - Collateral: $${formatNumber(cashReserved, 2)}` : ''}`,
      };

      dispatch(addTransaction(transaction));
    } else {
      // Single option position
      const shouldLinkToWheel = action === 'sell' && selectedWheelId;

      const newPosition: CallOption = {
        id: `call-${Date.now()}`,
        portfolio: portfolio.name,
        ticker: selectedTicker.symbol,
        name: selectedTicker.name,
        type: 'call',
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
        wheelId: shouldLinkToWheel ? selectedWheelId : undefined,
        dte,
        breakEven: calculateCallBreakEven(longLeg.strike, longLeg.premium),
        notes,
      };

      // Update wheel premium if linked
      if (shouldLinkToWheel && selectedWheelId) {
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
      // Portfolio value doesn't change - the position value offsets the cash change
      // For buy: cash -$X, position +$X = net 0
      // For sell: cash +$X, position -$X (liability) = net 0
      const transactionType = action === 'buy' ? 'premium_paid' : 'premium_collected';
      const transaction = {
        id: `txn-${Date.now()}`,
        portfolio: portfolio.name,
        date: purchaseDate,
        type: transactionType as 'premium_paid' | 'premium_collected',
        amount: action === 'buy' ? -costBasis : Math.abs(costBasis), // Negative for buy (cash out), positive for sell (cash in)
        description: `${action === 'buy' ? 'Buy' : 'Sell'} Call: ${selectedTicker.symbol} $${longLeg.strike} ${longLeg.expiration}`,
        relatedPositionId: newPosition.id,
        previousValue: portfolio.currentValue,
        newValue: portfolio.currentValue, // Portfolio value stays the same
        createdAt: new Date().toISOString(),
        notes: `${longLeg.contracts} contracts @ $${longLeg.premium}${action === 'sell' ? ` • Collateral: $${formatNumber(cashReserved, 2)}` : ''}`,
      };

      dispatch(addTransaction(transaction));
    }

    // Reset form and close
    onClose();
    resetForm();
  };

  const resetForm = () => {
    setAction(initialAction || 'buy');
    setSelectedTicker(initialTicker || null);
    setSelectedUnderlying(null);
    setIsCreatingTicker(false);
    setLongLeg({ strike: 0, expiration: '', premium: 0, contracts: 1 });
    setShortLeg({ strike: 0, expiration: '', premium: 0, contracts: 1 });
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    // Reset text states
    setLongLegStrikeText('');
    setLongLegPremiumText('');
    setShortLegStrikeText('');
    setShortLegPremiumText('');
    // Reset wheel linking - use initialWheelId if provided
    setSelectedWheelId(initialWheelId || null);
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
      if (initialWheelId) {
        setSelectedWheelId(initialWheelId);
        // Also set the contracts to match the wheel's targetContracts
        if (initialWheel) {
          setLongLeg((prev) => ({ ...prev, contracts: initialWheel.targetContracts }));
        }
      }
    }
  }, [isOpen, initialAction, initialTicker, initialStep, initialWheelId, initialWheel]);

  // Effect to sync contracts when wheel selection changes
  React.useEffect(() => {
    if (wheelLockedContracts !== null) {
      setLongLeg((prev) => ({ ...prev, contracts: wheelLockedContracts }));
    }
  }, [wheelLockedContracts]);

  // Check if current action is a spread type
  const isSpread = action === 'credit-spread' || action === 'debit-spread';

  const steps: WizardStep[] = useMemo(
    () => [
      {
        id: 'action',
        title: t('callWizard.actionStep.title'),
        description: t('callWizard.actionStep.description'),
        isValid: true,
        component: (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <button
                onClick={() => setAction('buy')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  action === 'buy'
                    ? 'border-primary-700 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                }`}
              >
                <TrendingUp className="w-6 h-6 mx-auto mb-1.5 text-primary-700 dark:text-primary-300" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                  {t('callWizard.actionStep.buyCall')}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('callWizard.actionStep.buyCallDesc')}
                </p>
              </button>

              <button
                onClick={() => setAction('sell')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  action === 'sell'
                    ? 'border-caution-600 bg-caution-50 dark:bg-caution-600/15'
                    : 'border-gray-200 dark:border-gray-700 hover:border-caution-500/40'
                }`}
              >
                <TrendingDown className="w-6 h-6 mx-auto mb-1.5 text-caution-600 dark:text-caution-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                  {t('callWizard.actionStep.sellCall')}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('callWizard.actionStep.sellCallDesc')}
                </p>
              </button>

              <button
                onClick={() => setAction('credit-spread')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  action === 'credit-spread'
                    ? 'border-ink-700 bg-surface-subtle dark:bg-trading-dark-700'
                    : 'border-gray-200 dark:border-gray-700 hover:border-ink-300'
                }`}
              >
                <ArrowRightLeft className="w-6 h-6 mx-auto mb-1.5 text-ink-600 dark:text-ink-300" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                  {t('callWizard.actionStep.creditSpread')}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('callWizard.actionStep.creditSpreadDesc')}
                </p>
              </button>

              <button
                onClick={() => setAction('debit-spread')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  action === 'debit-spread'
                    ? 'border-positive-600 bg-positive-50 dark:bg-positive-700/15'
                    : 'border-gray-200 dark:border-gray-700 hover:border-positive-500/30'
                }`}
              >
                <ArrowRightLeft className="w-6 h-6 mx-auto mb-1.5 text-positive-600 dark:text-positive-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                  {t('callWizard.actionStep.debitSpread')}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('callWizard.actionStep.debitSpreadDesc')}
                </p>
              </button>
            </div>

            <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <h4 className="text-sm font-semibold text-primary-900 dark:text-primary-300 mb-1.5">
                {action === 'buy' && t('callWizard.actionStep.buyCall')}
                {action === 'sell' && t('callWizard.actionStep.sellCall')}
                {action === 'credit-spread' && t('callWizard.actionStep.creditSpread')}
                {action === 'debit-spread' && t('callWizard.actionStep.debitSpread')}
              </h4>
              <p className="text-xs text-primary-700 dark:text-primary-300 mb-2">
                {action === 'buy' && (
                  <>
                    <strong>{t('callWizard.actionStep.buyCallInfo.when')}</strong>{' '}
                    {t('callWizard.actionStep.buyCallInfo.whenText')}
                    <br />
                    <br />
                    <strong>{t('callWizard.actionStep.buyCallInfo.how')}</strong>{' '}
                    {t('callWizard.actionStep.buyCallInfo.howText')}
                    <br />
                    <br />
                    <strong>{t('callWizard.actionStep.buyCallInfo.risk')}</strong>{' '}
                    {t('callWizard.actionStep.buyCallInfo.riskText')}
                  </>
                )}
                {action === 'sell' && (
                  <>
                    <strong>{t('callWizard.actionStep.sellCallInfo.when')}</strong>{' '}
                    {t('callWizard.actionStep.sellCallInfo.whenText')}
                    <br />
                    <br />
                    <strong>{t('callWizard.actionStep.sellCallInfo.how')}</strong>{' '}
                    {t('callWizard.actionStep.sellCallInfo.howText')}
                    <br />
                    <br />
                    <strong>{t('callWizard.actionStep.sellCallInfo.risk')}</strong>{' '}
                    {t('callWizard.actionStep.sellCallInfo.riskText')}
                  </>
                )}
                {action === 'credit-spread' && (
                  <>
                    <strong>{t('callWizard.actionStep.creditSpreadInfo.when')}</strong>{' '}
                    {t('callWizard.actionStep.creditSpreadInfo.whenText')}
                    <br />
                    <br />
                    <strong>{t('callWizard.actionStep.creditSpreadInfo.how')}</strong>{' '}
                    {t('callWizard.actionStep.creditSpreadInfo.howText')}
                    <br />
                    <br />
                    <strong>{t('callWizard.actionStep.creditSpreadInfo.risk')}</strong>{' '}
                    {t('callWizard.actionStep.creditSpreadInfo.riskText')}
                  </>
                )}
                {action === 'debit-spread' && (
                  <>
                    <strong>{t('callWizard.actionStep.debitSpreadInfo.when')}</strong>{' '}
                    {t('callWizard.actionStep.debitSpreadInfo.whenText')}
                    <br />
                    <br />
                    <strong>{t('callWizard.actionStep.debitSpreadInfo.how')}</strong>{' '}
                    {t('callWizard.actionStep.debitSpreadInfo.howText')}
                    <br />
                    <br />
                    <strong>{t('callWizard.actionStep.debitSpreadInfo.risk')}</strong>{' '}
                    {t('callWizard.actionStep.debitSpreadInfo.riskText')}
                  </>
                )}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'ticker',
        title: t('callWizard.tickerStep.title'),
        description: t('callWizard.tickerStep.description'),
        isValid: !!selectedTicker && !isCreatingTicker,
        component: (
          <div className="space-y-4">
            {!isCreatingTicker ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('callWizard.tickerStep.tickerSymbol')}
                  </label>
                  <TickerSelector
                    value={selectedTicker?.symbol || ''}
                    onChange={(ticker) => setSelectedTicker(ticker)}
                    onCreateNew={(symbol) => {
                      setNewTickerData({ ...newTickerData, symbol });
                      setIsCreatingTicker(true);
                    }}
                    placeholder={t('callWizard.tickerStep.searchPlaceholder')}
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
                            {t('callWizard.tickerStep.optionsAvailable')}
                            {selectedTicker.miniContractsAvailable &&
                              ` • ${t('callWizard.tickerStep.miniContracts')}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                  <h4 className="font-semibold text-primary-900 dark:text-primary-300 mb-2">
                    {t('callWizard.tickerStep.newTicker')} {newTickerData.symbol}
                  </h4>
                  <p className="text-sm text-primary-700 dark:text-primary-300">
                    {t('callWizard.tickerStep.newTickerDesc')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('callWizard.tickerStep.companyName')}
                  </label>
                  <input
                    type="text"
                    value={newTickerData.name}
                    onChange={(e) => setNewTickerData({ ...newTickerData, name: e.target.value })}
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder={t('callWizard.tickerStep.companyPlaceholder')}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('callWizard.tickerStep.type')}
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setNewTickerData({ ...newTickerData, type: 'stock' })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        newTickerData.type === 'stock'
                          ? 'border-primary-700 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <p className="font-medium text-gray-900 dark:text-white">
                        {t('callWizard.tickerStep.stock')}
                      </p>
                    </button>
                    <button
                      onClick={() => setNewTickerData({ ...newTickerData, type: 'etf' })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        newTickerData.type === 'etf'
                          ? 'border-positive-600 bg-positive-50 dark:bg-positive-700/15'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <p className="font-medium text-gray-900 dark:text-white">
                        {t('callWizard.tickerStep.etf')}
                      </p>
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newTickerData.optionsAvailable}
                      onChange={(e) =>
                        setNewTickerData({
                          ...newTickerData,
                          optionsAvailable: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-primary-700 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {t('callWizard.tickerStep.optionsAvailableCheck')}
                    </span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newTickerData.miniContractsAvailable}
                      onChange={(e) =>
                        setNewTickerData({
                          ...newTickerData,
                          miniContractsAvailable: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-primary-700 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      {t('callWizard.tickerStep.miniContractsCheck')}
                      <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
                          {t('callWizard.tickerStep.miniContractsTooltip')}
                        </div>
                      </div>
                    </span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCreateTicker}
                    disabled={!newTickerData.name}
                    className="flex-1 px-4 py-2 bg-primary-700 hover:bg-primary-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    {t('callWizard.tickerStep.addTicker')}
                  </button>
                  <button
                    onClick={() => {
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
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                  >
                    {t('callWizard.tickerStep.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'details',
        title: t('callWizard.detailsStep.title'),
        description: isSpread
          ? t('callWizard.detailsStep.descriptionSpread')
          : t('callWizard.detailsStep.descriptionSingle'),
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
              ? shortLeg.strike < longLeg.strike && shortLeg.premium > longLeg.premium // Credit: short lower, premium validates net credit
              : longLeg.strike < shortLeg.strike && longLeg.premium > shortLeg.premium) // Debit: long lower, premium validates net debit
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
                          {t('callWizard.detailsStep.shortLegCredit')}
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('callWizard.detailsStep.strikePrice')}
                            </label>
                            <input
                              ref={strikeInputRef}
                              type="text"
                              value={shortLegStrikeText}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (validateNumberInput(value)) {
                                  setShortLegStrikeText(value);
                                  setShortLeg({ ...shortLeg, strike: parseLocalizedNumber(value) });
                                }
                              }}
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`150${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('callWizard.detailsStep.premiumPerShare')}
                            </label>
                            <input
                              type="text"
                              value={shortLegPremiumText}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (validateNumberInput(value)) {
                                  setShortLegPremiumText(value);
                                  setShortLeg({
                                    ...shortLeg,
                                    premium: parseLocalizedNumber(value),
                                  });
                                }
                              }}
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`5${getDecimalSeparator()}50`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Long Leg second for credit spread */}
                      <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                        <h4 className="font-semibold text-primary-900 dark:text-primary-300 mb-3 text-sm">
                          {t('callWizard.detailsStep.longLegCredit')}
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('callWizard.detailsStep.strikePrice')}
                            </label>
                            <input
                              type="text"
                              value={longLegStrikeText}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (validateNumberInput(value)) {
                                  setLongLegStrikeText(value);
                                  setLongLeg({ ...longLeg, strike: parseLocalizedNumber(value) });
                                }
                              }}
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`160${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('callWizard.detailsStep.premiumPerShare')}
                            </label>
                            <input
                              type="text"
                              value={longLegPremiumText}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (validateNumberInput(value)) {
                                  setLongLegPremiumText(value);
                                  setLongLeg({ ...longLeg, premium: parseLocalizedNumber(value) });
                                }
                              }}
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`2${getDecimalSeparator()}50`}
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
                          {t('callWizard.detailsStep.longLegDebit')}
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('callWizard.detailsStep.strikePrice')}
                            </label>
                            <input
                              ref={strikeInputRef}
                              type="text"
                              value={longLegStrikeText}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (validateNumberInput(value)) {
                                  setLongLegStrikeText(value);
                                  setLongLeg({ ...longLeg, strike: parseLocalizedNumber(value) });
                                }
                              }}
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`150${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('callWizard.detailsStep.premiumPerShare')}
                            </label>
                            <input
                              type="text"
                              value={longLegPremiumText}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (validateNumberInput(value)) {
                                  setLongLegPremiumText(value);
                                  setLongLeg({ ...longLeg, premium: parseLocalizedNumber(value) });
                                }
                              }}
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`5${getDecimalSeparator()}50`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Short Leg second for debit spread */}
                      <div className="p-3 bg-caution-50 dark:bg-caution-600/15 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
                        <h4 className="font-semibold text-orange-900 dark:text-caution-500 mb-3 text-sm">
                          {t('callWizard.detailsStep.shortLegDebit')}
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('callWizard.detailsStep.strikePrice')}
                            </label>
                            <input
                              type="text"
                              value={shortLegStrikeText}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (validateNumberInput(value)) {
                                  setShortLegStrikeText(value);
                                  setShortLeg({ ...shortLeg, strike: parseLocalizedNumber(value) });
                                }
                              }}
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`160${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              {t('callWizard.detailsStep.premiumPerShare')}
                            </label>
                            <input
                              type="text"
                              value={shortLegPremiumText}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (validateNumberInput(value)) {
                                  setShortLegPremiumText(value);
                                  setShortLeg({
                                    ...shortLeg,
                                    premium: parseLocalizedNumber(value),
                                  });
                                }
                              }}
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`2${getDecimalSeparator()}50`}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Shared Settings */}
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">
                    {t('callWizard.detailsStep.spreadSettings')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('callWizard.detailsStep.expirationDate')}
                      </label>
                      <FridayDatePicker
                        value={longLeg.expiration}
                        onChange={(date) => {
                          setLongLeg({ ...longLeg, expiration: date });
                          setShortLeg({ ...shortLeg, expiration: date });
                        }}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      {longLeg.expiration && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('callWizard.detailsStep.dte')} {calculateDTE(longLeg.expiration)}{' '}
                          {t('callWizard.detailsStep.days')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('callWizard.detailsStep.numberOfContracts')}
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
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="1"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        = {longLeg.contracts * 100} {t('callWizard.detailsStep.shares')}
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
                      <h4 className="text-sm font-semibold text-purple-900 dark:text-ink-300 mb-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        {t('callWizard.detailsStep.spreadOverview')}
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {action === 'credit-spread'
                              ? t('callWizard.detailsStep.netCredit')
                              : t('callWizard.detailsStep.netDebit')}
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
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {t('callWizard.detailsStep.maxProfit')}
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
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {t('callWizard.detailsStep.maxLoss')}
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
                          <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
                            {action === 'credit-spread'
                              ? `($${formatNumber(Math.abs(shortLeg.strike - longLeg.strike), 2)} × 100 × ${longLeg.contracts}) - $${formatNumber((shortLeg.premium - longLeg.premium) * longLeg.contracts * 100, 2)}`
                              : t('callWizard.detailsStep.netDebitPaid')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {t('callWizard.detailsStep.spreadWidth')}
                          </p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            ${formatNumber(Math.abs(shortLeg.strike - longLeg.strike), 2)}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
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
                        {t('callWizard.detailsStep.currentPrice')} {selectedTicker?.symbol}
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('callWizard.detailsStep.strikePrice')}
                    </label>
                    <input
                      ref={strikeInputRef}
                      type="text"
                      value={longLegStrikeText}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (validateNumberInput(value)) {
                          setLongLegStrikeText(value);
                          setLongLeg({ ...longLeg, strike: parseLocalizedNumber(value) });
                        }
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder={`150${getDecimalSeparator()}00`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('callWizard.detailsStep.premiumPerShare')}
                    </label>
                    <input
                      type="text"
                      value={longLegPremiumText}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (validateNumberInput(value)) {
                          setLongLegPremiumText(value);
                          setLongLeg({ ...longLeg, premium: parseLocalizedNumber(value) });
                        }
                      }}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder={`5${getDecimalSeparator()}50`}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {t('callWizard.detailsStep.total')} $
                      {formatNumber(longLeg.premium * longLeg.contracts * 100, 2)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('callWizard.detailsStep.expirationDate')}
                    </label>
                    <FridayDatePicker
                      value={longLeg.expiration}
                      onChange={(date) => setLongLeg({ ...longLeg, expiration: date })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    {longLeg.expiration && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {t('callWizard.detailsStep.dte')} {calculateDTE(longLeg.expiration)}{' '}
                        {t('callWizard.detailsStep.days')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('callWizard.detailsStep.numberOfContracts')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={
                        Number.isFinite(maxCoveredCallContracts)
                          ? maxCoveredCallContracts
                          : undefined
                      }
                      value={longLeg.contracts || ''}
                      onChange={(e) => {
                        const requested = parseInt(e.target.value, 10) || 1;
                        const contracts =
                          Number.isFinite(maxCoveredCallContracts) && maxCoveredCallContracts > 0
                            ? Math.min(requested, maxCoveredCallContracts)
                            : requested;
                        setLongLeg({ ...longLeg, contracts });
                      }}
                      disabled={wheelLockedContracts !== null}
                      className={`bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                        wheelLockedContracts !== null ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      placeholder="1"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      = {longLeg.contracts * 100} {t('callWizard.detailsStep.shares')}
                      {wheelLockedContracts !== null && (
                        <span className="text-caution-600 dark:text-caution-500 ml-1">
                          {t('callWizard.detailsStep.determinedByWheel')}
                        </span>
                      )}
                    </p>
                    {action === 'covered-call' && Number.isFinite(maxCoveredCallContracts) && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Max {maxCoveredCallContracts} vrij contract
                        {maxCoveredCallContracts === 1 ? '' : 'en'} beschikbaar
                      </p>
                    )}
                  </div>
                </div>

                {/* Break-even & Max Winst/Verlies Display */}
                {longLeg.strike > 0 && longLeg.premium > 0 && (
                  <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {t('callWizard.detailsStep.breakEvenPrice')}
                        </p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          $
                          {formatNumber(calculateCallBreakEven(longLeg.strike, longLeg.premium), 2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {action === 'buy'
                            ? t('callWizard.detailsStep.maxLoss')
                            : t('callWizard.detailsStep.maxProfit')}
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('callWizard.detailsStep.purchaseDate')}
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('callWizard.detailsStep.notes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t('callWizard.detailsStep.notesPlaceholder')}
              />
            </div>

            {/* Wheel Linking for Covered Calls / Sell Calls */}
            {(action === 'covered-call' || action === 'sell') && matchingWheels.length > 0 && (
              <div className="p-4 bg-caution-50 dark:bg-caution-600/15 rounded-lg border border-caution-500/30 dark:border-caution-600/40">
                <div className="flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 dark:text-caution-500 mb-2">
                      {t('callWizard.detailsStep.wheelFound')}
                    </h4>
                    <p className="text-sm text-caution-600 dark:text-caution-500 mb-3">
                      {matchingWheels.length === 1
                        ? t('callWizard.detailsStep.wheelFoundDesc', {
                            count: matchingWheels.length,
                            ticker: selectedTicker?.symbol,
                          })
                        : t('callWizard.detailsStep.wheelFoundDescPlural', {
                            count: matchingWheels.length,
                            ticker: selectedTicker?.symbol,
                          })}{' '}
                      {t('callWizard.detailsStep.linkToWheel')}
                    </p>
                    <div className="space-y-2">
                      {matchingWheels.map((wheel) => (
                        <label
                          key={wheel.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedWheelId === wheel.id
                              ? 'border-caution-500 bg-caution-50 dark:bg-amber-900/40'
                              : 'border-gray-200 dark:border-gray-700 hover:border-caution-500/40'
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
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              Wheel - {wheel.ticker}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {t('callWizard.detailsStep.wheelInfo', {
                                contracts: wheel.targetContracts,
                                cycles: wheel.cycles,
                                premium: formatNumber(wheel.totalPremiumCollected, 2),
                              })}
                            </p>
                          </div>
                        </label>
                      ))}
                      <label
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedWheelId === null
                            ? 'border-gray-500 bg-gray-100 dark:bg-gray-700'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="wheel-link"
                          checked={selectedWheelId === null}
                          onChange={() => setSelectedWheelId(null)}
                          className="w-4 h-4 text-gray-600"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {t('callWizard.detailsStep.dontLink')}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {action === 'covered-call' && selectedUnderlying
                              ? t('callWizard.detailsStep.dontLinkDescUnderlying')
                              : t('callWizard.detailsStep.dontLinkDescStandalone')}
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* P&L Curve */}
            {action === 'spread'
              ? // Spread P&L Curve
                longLeg.strike > 0 &&
                shortLeg.strike > 0 &&
                longLeg.premium > 0 &&
                shortLeg.premium > 0 &&
                longLeg.contracts > 0 && (
                  <PnLCurve
                    type="call-spread"
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
                    type={action === 'buy' ? 'call-buy' : 'call-sell'}
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
      selectedUnderlying,
      isCreatingTicker,
      newTickerData,
      longLeg,
      shortLeg,
      purchaseDate,
      notes,
      eligibleUnderlyings,
      hasCoveredCallEligible,
      matchingWheels,
      selectedWheelId,
      wheelLockedContracts,
      maxCoveredCallContracts,
    ]
  );

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        resetForm();
      }}
      title={t('callWizard.title')}
      steps={steps}
      onComplete={handleComplete}
      completeButtonLabel={t('callWizard.completeButton')}
      currentStepIndex={currentStepIndex}
      onStepChange={setCurrentStepIndex}
    />
  );
};
