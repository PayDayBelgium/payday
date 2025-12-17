import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, ArrowRightLeft, Info, BarChart3, RefreshCw } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useSelector } from 'react-redux';
import { addPosition } from '../../store/slices/positionsSlice';
import { addTransaction, addTicker } from '../../store/slices/portfoliosSlice';
import { ensureTicker, selectAllTickers } from '../../store/slices/tickersSlice';
import { selectActiveWheels, updateWheelPremium } from '../../store/slices/wheelsSlice';
import { WizardModal, type WizardStep } from './WizardModal';
import { TickerSelector } from '../widgets/TickerSelector';
import { PnLCurve } from '../widgets/PnLCurve';
import { FridayDatePicker } from '../common/FridayDatePicker';
import { parseLocalizedNumber, formatNumber, getDecimalSeparator } from '../../utils/numberFormat';
import type { PutOption, Ticker, PortfolioName, CurrencyType } from '../../types';
import type { RootState } from '../../store';
import {
  type OptionAction,
  type OptionLegData,
  validateNumberInput,
  calculateDTE,
  calculatePutBreakEven,
  calculateSpreadCollateral,
  calculateCashReserved,
  calculatePutValues,
  validatePutSpread,
  getPutPnLType,
  calculatePutSpreadSummary,
  generatePutOptionId,
  generateSpreadId,
  generateTransactionId,
  DEFAULT_NEW_TICKER_DATA,
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

  // Step 1: Action selection
  const [action, setAction] = useState<OptionAction>(initialAction || 'buy');

  // Wheel linking state
  const [selectedWheelId, setSelectedWheelId] = useState<string | null>(null);
  const [showWheelLinking, setShowWheelLinking] = useState(false);

  // Controlled step index for pre-filling
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

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

  const [purchaseDate, setPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );
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

    dispatch(addTicker(ticker));
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
        breakEven: calculateBreakEven(longLeg.strike, longLeg.premium),
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
        breakEven: calculateBreakEven(shortLeg.strike, shortLeg.premium),
        notes: notes ? `${notes}\nSpread ID: ${spreadId}` : `Spread ID: ${spreadId}`,
      };

      // Ensure ticker exists in central store
      dispatch(ensureTicker({
        symbol: selectedTicker.symbol,
        name: selectedTicker.name,
        type: 'stock',
        optionsAvailable: selectedTicker.optionsAvailable,
        miniContractsAvailable: selectedTicker.miniContractsAvailable,
      }));

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
        action,
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
        breakEven: calculateBreakEven(longLeg.strike, longLeg.premium, action === 'buy'),
        notes,
        // Link to Wheel if selected (only for sell/CSP)
        wheelId: action === 'sell' && selectedWheelId ? selectedWheelId : undefined,
      };

      // Update wheel premium if linked
      if (action === 'sell' && selectedWheelId) {
        const premiumCollected = longLeg.premium * longLeg.contracts * 100;
        dispatch(updateWheelPremium({
          id: selectedWheelId,
          premiumCollected,
          realizedPnL: 0, // P&L will be realized when the option closes
        }));
      }

      // Ensure ticker exists in central store
      dispatch(ensureTicker({
        symbol: selectedTicker.symbol,
        name: selectedTicker.name,
        type: 'stock',
        optionsAvailable: selectedTicker.optionsAvailable,
        miniContractsAvailable: selectedTicker.miniContractsAvailable,
      }));

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
    // Reset text states
    setLongLegStrikeText('');
    setLongLegPremiumText('');
    setShortLegStrikeText('');
    setShortLegPremiumText('');
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
              <button
                onClick={() => setAction('buy')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  action === 'buy'
                    ? 'border-red-600 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-red-300'
                }`}
              >
                <TrendingDown className="w-6 h-6 mx-auto mb-1.5 text-red-600 dark:text-red-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                  {t('putWizard.actionStep.buyPut')}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('putWizard.actionStep.buyPutDesc')}
                </p>
              </button>

              <button
                onClick={() => setAction('sell')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  action === 'sell'
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                }`}
              >
                <TrendingUp className="w-6 h-6 mx-auto mb-1.5 text-green-600 dark:text-green-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                  {t('putWizard.actionStep.sellPut')}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('putWizard.actionStep.sellPutDesc')}
                </p>
              </button>

              <button
                onClick={() => setAction('credit-spread')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  action === 'credit-spread'
                    ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                }`}
              >
                <ArrowRightLeft className="w-6 h-6 mx-auto mb-1.5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                  {t('putWizard.actionStep.creditSpread')}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('putWizard.actionStep.creditSpreadDesc')}
                </p>
              </button>

              <button
                onClick={() => setAction('debit-spread')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  action === 'debit-spread'
                    ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                }`}
              >
                <ArrowRightLeft className="w-6 h-6 mx-auto mb-1.5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                  {t('putWizard.actionStep.debitSpread')}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('putWizard.actionStep.debitSpreadDesc')}
                </p>
              </button>
            </div>

            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1.5">
                {action === 'buy' && t('putWizard.actionStep.buyPut')}
                {action === 'sell' && t('putWizard.actionStep.sellPut')}
                {action === 'credit-spread' && t('putWizard.actionStep.creditSpread')}
                {action === 'debit-spread' && t('putWizard.actionStep.debitSpread')}
              </h4>
              <p className="text-xs text-blue-800 dark:text-blue-400 mb-2">
                {action === 'buy' && (
                  <>
                    <strong>{t('putWizard.actionStep.buyPutInfo.when')}</strong> {t('putWizard.actionStep.buyPutInfo.whenText')}
                    <br /><br />
                    <strong>{t('putWizard.actionStep.buyPutInfo.how')}</strong> {t('putWizard.actionStep.buyPutInfo.howText')}
                    <br /><br />
                    <strong>{t('putWizard.actionStep.buyPutInfo.risk')}</strong> {t('putWizard.actionStep.buyPutInfo.riskText')}
                  </>
                )}
                {action === 'sell' && (
                  <>
                    <strong>{t('putWizard.actionStep.sellPutInfo.when')}</strong> {t('putWizard.actionStep.sellPutInfo.whenText')}
                    <br /><br />
                    <strong>{t('putWizard.actionStep.sellPutInfo.how')}</strong> {t('putWizard.actionStep.sellPutInfo.howText')}
                    <br /><br />
                    <strong>{t('putWizard.actionStep.sellPutInfo.risk')}</strong> {t('putWizard.actionStep.sellPutInfo.riskText')}
                  </>
                )}
                {action === 'credit-spread' && (
                  <>
                    <strong>{t('putWizard.actionStep.creditSpreadInfo.when')}</strong> {t('putWizard.actionStep.creditSpreadInfo.whenText')}
                    <br /><br />
                    <strong>{t('putWizard.actionStep.creditSpreadInfo.how')}</strong> {t('putWizard.actionStep.creditSpreadInfo.howText')}
                    <br /><br />
                    <strong>{t('putWizard.actionStep.creditSpreadInfo.risk')}</strong> {t('putWizard.actionStep.creditSpreadInfo.riskText')}
                  </>
                )}
                {action === 'debit-spread' && (
                  <>
                    <strong>{t('putWizard.actionStep.debitSpreadInfo.when')}</strong> {t('putWizard.actionStep.debitSpreadInfo.whenText')}
                    <br /><br />
                    <strong>{t('putWizard.actionStep.debitSpreadInfo.how')}</strong> {t('putWizard.actionStep.debitSpreadInfo.howText')}
                    <br /><br />
                    <strong>{t('putWizard.actionStep.debitSpreadInfo.risk')}</strong> {t('putWizard.actionStep.debitSpreadInfo.riskText')}
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-green-900 dark:text-green-300">
                          {selectedTicker.symbol}
                        </h4>
                        <p className="text-sm text-green-700 dark:text-green-400">
                          {selectedTicker.name}
                        </p>
                        {selectedTicker.optionsAvailable && (
                          <p className="text-xs text-green-600 dark:text-green-500">
                            {t('putWizard.tickerStep.optionsAvailable')}
                            {selectedTicker.miniContractsAvailable && ` • ${t('putWizard.tickerStep.miniContracts')}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                    {t('putWizard.tickerStep.newTicker')} {newTickerData.symbol}
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-400">
                    {t('putWizard.tickerStep.newTickerDesc')}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('putWizard.tickerStep.companyName')}
                  </label>
                  <input
                    type="text"
                    value={newTickerData.name}
                    onChange={(e) =>
                      setNewTickerData({ ...newTickerData, name: e.target.value })
                    }
                    className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Apple Inc."
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setNewTickerData({ ...newTickerData, type: 'stock' })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        newTickerData.type === 'stock'
                          ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <p className="font-medium text-gray-900 dark:text-white">Aandeel</p>
                    </button>
                    <button
                      onClick={() => setNewTickerData({ ...newTickerData, type: 'etf' })}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        newTickerData.type === 'etf'
                          ? 'border-green-600 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <p className="font-medium text-gray-900 dark:text-white">ETF</p>
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
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Opties beschikbaar
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
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      Mini contracts beschikbaar
                      <div className="group relative">
                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
                          Sommige aandelen hebben mini-contracten van 10 aandelen per contract in plaats van de standaard 100 aandelen per contract
                        </div>
                      </div>
                    </span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCreateTicker}
                    disabled={!newTickerData.name}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                  >
                    Ticker Toevoegen
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
                      });
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            )}
          </div>
        ),
      },
      {
        id: 'details',
        title: 'Optie details',
        description: isSpread ? 'Voer details in voor beide legs van de spread' : 'Voer de optie details in',
        isValid:
          isSpread
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
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <h4 className="font-semibold text-orange-900 dark:text-orange-300 mb-3 text-sm">
                          Short Leg (Verkoop - Hogere Strike)
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Strike prijs *
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
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`140${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Premuim per aandeel *
                            </label>
                            <input
                              type="text"
                              value={shortLegPremiumText}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (validateNumberInput(value)) {
                                  setShortLegPremiumText(value);
                                  setShortLeg({ ...shortLeg, premium: parseLocalizedNumber(value) });
                                }
                              }}
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`2${getDecimalSeparator()}50`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Long Leg second for credit spread */}
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 text-sm">
                          Long Leg (Koop - Lagere Strike)
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Strike prijs *
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
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`30${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Premuim per aandeel *
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
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`0${getDecimalSeparator()}20`}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Long Leg first for debit spread */}
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-3 text-sm">
                          Long Leg (Koop - Hogere Strike)
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Strike prijs *
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
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`140${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Premuim per aandeel *
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
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`2${getDecimalSeparator()}50`}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Short Leg second for debit spread */}
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <h4 className="font-semibold text-orange-900 dark:text-orange-300 mb-3 text-sm">
                          Short Leg (Verkoop - Lagere Strike)
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Strike prijs *
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
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`30${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Premuim per aandeel *
                            </label>
                            <input
                              type="text"
                              value={shortLegPremiumText}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (validateNumberInput(value)) {
                                  setShortLegPremiumText(value);
                                  setShortLeg({ ...shortLeg, premium: parseLocalizedNumber(value) });
                                }
                              }}
                              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                              placeholder={`0${getDecimalSeparator()}20`}
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
                    Spread instellingen
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Expiratie datum *
                      </label>
                      <FridayDatePicker
                        value={longLeg.expiration}
                        onChange={(date) => {
                          setLongLeg({ ...longLeg, expiration: date });
                          setShortLeg({ ...shortLeg, expiration: date });
                        }}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                      {longLeg.expiration && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          DTE: {calculateDTE(longLeg.expiration)} dagen
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Aantal contracten *
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
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="1"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        = {longLeg.contracts * 100} aandelen
                      </p>
                    </div>
                  </div>
                </div>

                {/* Spread Summary */}
                {longLeg.strike > 0 && shortLeg.strike > 0 && longLeg.premium > 0 && shortLeg.premium > 0 && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-3 text-sm flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Spread Overzicht
                    </h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {action === 'credit-spread' ? 'Netto Credit' : 'Netto Debit'}
                        </p>
                        <p className={`font-semibold ${action === 'credit-spread' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {action === 'credit-spread' ? '+' : '-'}${formatNumber(Math.abs((shortLeg.premium - longLeg.premium) * longLeg.contracts * 100), 2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Max Winst</p>
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          ${action === 'credit-spread'
                            ? formatNumber((shortLeg.premium - longLeg.premium) * longLeg.contracts * 100, 2)
                            : formatNumber((Math.abs(shortLeg.strike - longLeg.strike) - (longLeg.premium - shortLeg.premium)) * longLeg.contracts * 100, 2)
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Max Verlies</p>
                        <p className="font-semibold text-red-600 dark:text-red-400">
                          -${action === 'credit-spread'
                            ? formatNumber((Math.abs(shortLeg.strike - longLeg.strike) - (shortLeg.premium - longLeg.premium)) * longLeg.contracts * 100, 2)
                            : formatNumber((longLeg.premium - shortLeg.premium) * longLeg.contracts * 100, 2)
                          }
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
                          {action === 'credit-spread'
                            ? `($${formatNumber(Math.abs(shortLeg.strike - longLeg.strike), 2)} × 100 × ${longLeg.contracts}) - $${formatNumber((shortLeg.premium - longLeg.premium) * longLeg.contracts * 100, 2)}`
                            : `Netto debit betaald`
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Spread Breedte</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          ${formatNumber(Math.abs(shortLeg.strike - longLeg.strike), 2)}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-0.5">
                          Max: ${formatNumber(Math.abs(shortLeg.strike - longLeg.strike) * 100 * longLeg.contracts, 2)} ({longLeg.contracts}×100)
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
                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                        Huidige Koers {selectedTicker?.symbol}
                      </span>
                      <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                        ${formatNumber(currentTickerPrice, 2)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Single Option Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Strike prijs *
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
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder={`150${getDecimalSeparator()}00`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Premuim per aandeel *
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
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder={`5${getDecimalSeparator()}50`}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Totaal: ${formatNumber(longLeg.premium * longLeg.contracts * 100, 2)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Expiratie datum *
                    </label>
                    <FridayDatePicker
                      value={longLeg.expiration}
                      onChange={(date) => setLongLeg({ ...longLeg, expiration: date })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    {longLeg.expiration && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        DTE: {calculateDTE(longLeg.expiration)} dagen
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Aantal contracten *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={longLeg.contracts || ''}
                      onChange={(e) =>
                        setLongLeg({ ...longLeg, contracts: parseInt(e.target.value) || 1 })
                      }
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="1"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      = {longLeg.contracts * 100} aandelen
                    </p>
                  </div>
                </div>

                {/* Break-even & Max Display */}
                {longLeg.strike > 0 && longLeg.premium > 0 && (
                  <div className={`p-4 rounded-lg border ${
                    action === 'sell'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Break-even prijs</p>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          ${formatNumber(calculateBreakEven(longLeg.strike, longLeg.premium), 2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {action === 'buy' ? 'Max Verlies' : 'Max Winst'}
                        </p>
                        <p className={`text-lg font-semibold ${
                          action === 'buy' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                        }`}>
                          {action === 'buy' ? '-' : '+'}${formatNumber(longLeg.premium * longLeg.contracts * 100, 2)}
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
                Aankoop datum
              </label>
              <input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Notities
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="Bijv. strategie notities, doelen, ..."
              />
            </div>

            {/* Wheel Linking for CSP */}
            {action === 'sell' && matchingWheels.length > 0 && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3">
                  <RefreshCw className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-amber-900 dark:text-amber-300 mb-2">
                      Wheel campagne Gevonden
                    </h4>
                    <p className="text-sm text-amber-800 dark:text-amber-400 mb-3">
                      Er {matchingWheels.length === 1 ? 'is een actieve Wheel' : `zijn ${matchingWheels.length} actieve Wheels`} voor {selectedTicker?.symbol} in dit portfolio.
                      Wil je deze CSP koppelen aan een Wheel?
                    </p>
                    <div className="space-y-2">
                      {matchingWheels.map((wheel) => (
                        <label
                          key={wheel.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedWheelId === wheel.id
                              ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/40'
                              : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="wheel-link"
                            checked={selectedWheelId === wheel.id}
                            onChange={() => setSelectedWheelId(wheel.id)}
                            className="w-4 h-4 text-amber-600"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-white text-sm">
                              Wheel - {wheel.ticker}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {wheel.targetContracts} contracten • Cycli: {wheel.cycles} • Premium: ${formatNumber(wheel.totalPremiumCollected, 2)}
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
                            Niet koppelen
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            Deze CSP wordt een standalone positie
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* P&L Curve */}
            {isSpread ? (
              // Spread P&L Curve
              longLeg.strike > 0 && shortLeg.strike > 0 && longLeg.premium > 0 && shortLeg.premium > 0 && longLeg.contracts > 0 && (
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
            ) : (
              // Single Option P&L Curve
              longLeg.strike > 0 && longLeg.premium > 0 && longLeg.contracts > 0 && (
                <PnLCurve
                  type={action === 'buy' ? 'put-buy' : 'put-sell'}
                  strike={longLeg.strike}
                  premium={longLeg.premium}
                  contracts={longLeg.contracts}
                  currency={portfolio.currency}
                />
              )
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
