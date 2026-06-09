import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { parseCountInput } from '../../utils/inputFormat';
import { TrendingUp, TrendingDown, ArrowRightLeft, BarChart3, RefreshCw } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectPositions } from '../../store/slices/positionsSlice';
import { openPosition } from '../../store/commands/positionCommands';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import { ensureTicker } from '../../store/commands/tickerCommands';
import { selectActiveWheels } from '../../store/slices/wheelsSlice';
import { selectUnlockedLevels, isFeatureAvailable } from '../../store/slices/userProgressSlice';
import { getOptionActionFeature } from '../../utils/optionFeatureAccess';
import { pickParentForNewShortCall } from '../../utils/coverageAllocation';
import { isLEAPS } from '../../utils/campaignDetector';
import { WizardModal, type WizardStep } from './WizardModal';
import { TickerSelector } from '../widgets/TickerSelector';
import { PnLCurve } from '../widgets/PnLCurve';
import { FridayDatePicker } from '../common/FridayDatePicker';
import { LocalizedNumberInput } from '../common/LocalizedNumberInput';
import { NewTickerForm } from './NewTickerForm';
import { formatNumber, getDecimalSeparator } from '../../utils/numberFormat';
import type {
  CallOption,
  Ticker,
  PortfolioName,
  CurrencyType,
  Position,
  StockPosition,
} from '../../types';
import { groupHoldings, type Holding } from '../../utils/holdings';
import type { RootState } from '../../store';
import {
  type OptionAction,
  type OptionLegData,
  type NewTickerData,
  calculateDTE,
  calculateCallBreakEven,
  calculateCallValues,
} from './optionWizardUtils';

// Wizard step order is fixed: action(0) → ticker(1) → details(2). A pre-filled
// open (ticker + action already chosen via a suggestion) jumps straight to details.
const DETAILS_STEP_INDEX = 2;

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
  /** Pre-fill the strike for the LEAPS buy-more flow; leave undefined for other opens. */
  initialStrike?: number;
  /** Pre-fill the expiration (ISO date string) for the LEAPS buy-more flow; leave undefined for other opens. */
  initialExpiration?: string;
  /**
   * When the wizard is opened from a specific LEAPS/stock suggestion badge, this holds the
   * initiating position's id. For short calls it overrides `pickParentForNewShortCall` so
   * the new call is explicitly linked to that initiator (LEAPS → PMCC; stock → CC on that lot).
   * Leave undefined for generic "add call" opens — parent resolution then uses the default
   * stocks-before-LEAPS allocator.
   */
  initialUnderlyingId?: string;
}

export const CallOptionWizard: React.FC<CallOptionWizardProps> = ({
  isOpen,
  onClose,
  portfolio,
  initialAction,
  initialTicker,
  initialStep,
  initialWheelId,
  initialStrike,
  initialExpiration,
  initialUnderlyingId,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const allPositions = useAppSelector(selectPositions);
  const activeWheels = useAppSelector((state: RootState) => selectActiveWheels(state));
  const allWheels = useAppSelector((state: RootState) => state.wheels.wheels);
  const allTickers = useAppSelector(selectAllTickers);
  const unlockedLevels = useAppSelector(selectUnlockedLevels);

  // Level-gating: an option action may only be created once the corresponding
  // strategy is unlocked knowledge-wise. Locked actions are hidden in the
  // wizard and defensively blocked on completion.
  const canUseAction = (a: OptionAction): boolean =>
    isFeatureAvailable(getOptionActionFeature('call', a), unlockedLevels);

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

    dispatch(ensureTicker(ticker, new Date().toISOString()));
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
    // Safety net: block creation of a not-yet-unlocked option action.
    if (!canUseAction(action)) return;

    const { costBasis, currentValue, cashReserved } = calculateValues();
    const dte = calculateDTE(isSpread ? longLeg.expiration : longLeg.expiration);

    if (isSpread) {
      // Create spread position (to be implemented with SpreadPosition type)
      // For now, we'll create two separate call options linked together
      const spreadId = `spread-${Date.now()}`;
      const _spreadType = action === 'credit-spread' ? 'Credit' : 'Debit';

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
      const spreadTs = new Date().toISOString();
      dispatch(
        ensureTicker(
          {
            symbol: selectedTicker.symbol,
            name: selectedTicker.name,
            type: 'stock',
            optionsAvailable: selectedTicker.optionsAvailable,
            miniContractsAvailable: selectedTicker.miniContractsAvailable,
          },
          spreadTs
        )
      );

      // Transaction ledger lines are derived from PositionOpened events.
      dispatch(openPosition(longPosition, new Date().toISOString()));
      dispatch(openPosition(shortPosition, new Date().toISOString()));
    } else {
      // Single option position.
      // A covered call is a short call: normalize the action to 'sell'.
      const isShortCall = action === 'sell' || action === 'covered-call';
      const normalizedAction: 'buy' | 'sell' = isShortCall ? 'sell' : 'buy';
      const shouldLinkToWheel = isShortCall && !!selectedWheelId;

      // Automatic parent linking for short calls that aren't tied to a wheel.
      // If an explicit initiator was provided (opened from a specific LEAPS or stock
      // suggestion badge), honour it directly — that position becomes the parent.
      // Otherwise fall back to the stocks-before-LEAPS allocator default.
      let underlyingId: string | undefined;
      if (isShortCall && !shouldLinkToWheel) {
        if (initialUnderlyingId) {
          // Explicit initiator wins — link to the initiating position.
          underlyingId = initialUnderlyingId;
        } else {
          const tickerSym = selectedTicker.symbol.toUpperCase();
          const groupPositions = allPositions.filter(
            (p) =>
              p.status === 'open' &&
              p.portfolio === portfolio.name &&
              p.ticker.toUpperCase() === tickerSym &&
              !(p as { wheelId?: string }).wheelId
          );
          const groupStocks = groupPositions.filter(
            (p) => p.type === 'stock' || p.type === 'etf'
          ) as StockPosition[];
          const groupShortCalls = groupPositions.filter(
            (p) => p.type === 'call' && (p as CallOption).action === 'sell'
          ) as CallOption[];
          const groupLeaps = groupPositions.filter(
            (p) => p.type === 'call' && (p as CallOption).action === 'buy' && isLEAPS(p as CallOption)
          ) as CallOption[];
          const parent = pickParentForNewShortCall(
            {
              stocks: groupStocks,
              leaps: groupLeaps,
              shortCalls: groupShortCalls,
              currentPrice: currentTickerPrice ?? undefined,
            },
            { strike: longLeg.strike, contracts: longLeg.contracts }
          );
          underlyingId = parent?.parentId;
        }
      }

      const newPosition: CallOption = {
        id: `call-${Date.now()}`,
        portfolio: portfolio.name,
        ticker: selectedTicker.symbol,
        name: selectedTicker.name,
        type: 'call',
        action: normalizedAction,
        status: 'open',
        openDate: purchaseDate,
        strike: longLeg.strike,
        expiration: longLeg.expiration,
        contracts: longLeg.contracts,
        premium: longLeg.premium,
        costBasis,
        currentValue,
        cashReserved: isShortCall ? cashReserved : undefined,
        underlyingId,
        wheelId: shouldLinkToWheel ? selectedWheelId : undefined,
        dte,
        breakEven: calculateCallBreakEven(longLeg.strike, longLeg.premium),
        notes,
      };

      // Wheel premium accrual is now derived by the wheels projection
      // from the PositionOpened event (which carries wheelId).

      // Ensure ticker exists in central store
      const callTs = new Date().toISOString();
      dispatch(
        ensureTicker(
          {
            symbol: selectedTicker.symbol,
            name: selectedTicker.name,
            type: 'stock',
            optionsAvailable: selectedTicker.optionsAvailable,
            miniContractsAvailable: selectedTicker.miniContractsAvailable,
          },
          callTs
        )
      );

      // Transaction ledger line is derived from PositionOpened event.
      dispatch(openPosition(newPosition, new Date().toISOString()));
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
    // Base longLeg; merge in initialStrike / initialExpiration when provided so
    // the LEAPS buy-more flow pre-fills those fields and only premium/contracts/date remain.
    setLongLeg({
      strike: initialStrike ?? 0,
      expiration: initialExpiration ?? '',
      premium: 0,
      contracts: 1,
    });
    setShortLeg({ strike: 0, expiration: '', premium: 0, contracts: 1 });
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    // Reset wheel linking - use initialWheelId if provided
    setSelectedWheelId(initialWheelId || null);
    // Resolve initial step:
    //   - explicit initialStep always wins
    //   - when both initialTicker and initialAction are provided (pre-filled open),
    //     jump straight to the details step so only strike/expiration/premium remain
    //   - otherwise start at step 0
    if (initialStep !== undefined) {
      setCurrentStepIndex(initialStep);
    } else if (initialTicker && initialAction) {
      setCurrentStepIndex(DETAILS_STEP_INDEX);
    } else {
      setCurrentStepIndex(0);
    }
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
      // Pre-fill strike and/or expiration when provided (LEAPS buy-more flow).
      // Use functional updates so we don't clobber already-set fields.
      if (initialStrike !== undefined || initialExpiration !== undefined) {
        setLongLeg((prev) => ({
          ...prev,
          strike: initialStrike ?? prev.strike,
          expiration: initialExpiration ?? prev.expiration,
        }));
      }
      // Resolve initial step (same logic as resetForm):
      //   explicit prop wins; both ticker+action → details(2); otherwise step 0.
      if (initialStep !== undefined) {
        setCurrentStepIndex(initialStep);
      } else if (initialTicker && initialAction) {
        setCurrentStepIndex(DETAILS_STEP_INDEX);
      }
      if (initialWheelId) {
        setSelectedWheelId(initialWheelId);
        // Also set the contracts to match the wheel's targetContracts
        if (initialWheel) {
          setLongLeg((prev) => ({ ...prev, contracts: initialWheel.targetContracts }));
        }
      }
    }
  }, [isOpen, initialAction, initialTicker, initialStep, initialWheelId, initialWheel, initialStrike, initialExpiration]);

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
              {canUseAction('buy') && (
                <button
                  onClick={() => setAction('buy')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    action === 'buy'
                      ? 'border-primary-700 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-surface-line dark:border-trading-dark-600 hover:border-primary-300'
                  }`}
                >
                  <TrendingUp className="w-6 h-6 mx-auto mb-1.5 text-primary-700 dark:text-primary-300" />
                  <h3 className="text-sm font-semibold text-ink-900 dark:text-white mb-0.5">
                    {t('callWizard.actionStep.buyCall')}
                  </h3>
                  <p className="text-xs text-ink-600 dark:text-ink-400">
                    {t('callWizard.actionStep.buyCallDesc')}
                  </p>
                </button>
              )}

              {canUseAction('sell') && (
                <button
                  onClick={() => setAction('sell')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    action === 'sell'
                      ? 'border-caution-600 bg-caution-50 dark:bg-caution-600/15'
                      : 'border-surface-line dark:border-trading-dark-600 hover:border-caution-500/40'
                  }`}
                >
                  <TrendingDown className="w-6 h-6 mx-auto mb-1.5 text-caution-600 dark:text-caution-500" />
                  <h3 className="text-sm font-semibold text-ink-900 dark:text-white mb-0.5">
                    {t('callWizard.actionStep.sellCall')}
                  </h3>
                  <p className="text-xs text-ink-600 dark:text-ink-400">
                    {t('callWizard.actionStep.sellCallDesc')}
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
                    {t('callWizard.actionStep.creditSpread')}
                  </h3>
                  <p className="text-xs text-ink-600 dark:text-ink-400">
                    {t('callWizard.actionStep.creditSpreadDesc')}
                  </p>
                </button>
              )}

              {canUseAction('debit-spread') && (
                <button
                  onClick={() => setAction('debit-spread')}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    action === 'debit-spread'
                      ? 'border-positive-600 bg-positive-50 dark:bg-positive-700/15'
                      : 'border-surface-line dark:border-trading-dark-600 hover:border-positive-500/30'
                  }`}
                >
                  <ArrowRightLeft className="w-6 h-6 mx-auto mb-1.5 text-positive-600 dark:text-positive-500" />
                  <h3 className="text-sm font-semibold text-ink-900 dark:text-white mb-0.5">
                    {t('callWizard.actionStep.debitSpread')}
                  </h3>
                  <p className="text-xs text-ink-600 dark:text-ink-400">
                    {t('callWizard.actionStep.debitSpreadDesc')}
                  </p>
                </button>
              )}
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
                  <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
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
                  newTickerHeading: t('callWizard.tickerStep.newTicker'),
                  newTickerDesc: t('callWizard.tickerStep.newTickerDesc'),
                  companyName: t('callWizard.tickerStep.companyName'),
                  companyPlaceholder: t('callWizard.tickerStep.companyPlaceholder'),
                  type: t('callWizard.tickerStep.type'),
                  stock: t('callWizard.tickerStep.stock'),
                  etf: t('callWizard.tickerStep.etf'),
                  optionsAvailableCheck: t('callWizard.tickerStep.optionsAvailableCheck'),
                  miniContractsCheck: t('callWizard.tickerStep.miniContractsCheck'),
                  miniContractsTooltip: t('callWizard.tickerStep.miniContractsTooltip'),
                  addTicker: t('callWizard.tickerStep.addTicker'),
                  cancel: t('callWizard.tickerStep.cancel'),
                }}
              />
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
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('callWizard.detailsStep.strikePrice')}
                            </label>
                            <LocalizedNumberInput
                              ref={strikeInputRef}
                              value={shortLeg.strike}
                              onChange={(strike) => setShortLeg({ ...shortLeg, strike })}
                              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                              placeholder={`150${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('callWizard.detailsStep.premiumPerShare')}
                            </label>
                            <LocalizedNumberInput
                              value={shortLeg.premium}
                              onChange={(premium) => setShortLeg({ ...shortLeg, premium })}
                              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
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
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('callWizard.detailsStep.strikePrice')}
                            </label>
                            <LocalizedNumberInput
                              value={longLeg.strike}
                              onChange={(strike) => setLongLeg({ ...longLeg, strike })}
                              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                              placeholder={`160${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('callWizard.detailsStep.premiumPerShare')}
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
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('callWizard.detailsStep.strikePrice')}
                            </label>
                            <LocalizedNumberInput
                              ref={strikeInputRef}
                              value={longLeg.strike}
                              onChange={(strike) => setLongLeg({ ...longLeg, strike })}
                              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                              placeholder={`150${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('callWizard.detailsStep.premiumPerShare')}
                            </label>
                            <LocalizedNumberInput
                              value={longLeg.premium}
                              onChange={(premium) => setLongLeg({ ...longLeg, premium })}
                              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
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
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('callWizard.detailsStep.strikePrice')}
                            </label>
                            <LocalizedNumberInput
                              value={shortLeg.strike}
                              onChange={(strike) => setShortLeg({ ...shortLeg, strike })}
                              className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                              placeholder={`160${getDecimalSeparator()}00`}
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                              {t('callWizard.detailsStep.premiumPerShare')}
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
                    </>
                  )}
                </div>

                {/* Shared Settings */}
                <div className="p-3 bg-surface dark:bg-trading-dark-700 rounded-lg border border-surface-line dark:border-trading-dark-500">
                  <h4 className="font-semibold text-ink-900 dark:text-white mb-3 text-sm">
                    {t('callWizard.detailsStep.spreadSettings')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                        {t('callWizard.detailsStep.expirationDate')}
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
                          {t('callWizard.detailsStep.dte')} {calculateDTE(longLeg.expiration)}{' '}
                          {t('callWizard.detailsStep.days')}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                        {t('callWizard.detailsStep.numberOfContracts')}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={longLeg.contracts || ''}
                        onChange={(e) => {
                          const contracts = parseCountInput(e.target.value);
                          setLongLeg({ ...longLeg, contracts });
                          setShortLeg({ ...shortLeg, contracts });
                        }}
                        className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                        placeholder="1"
                      />
                      <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
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
                          <p className="text-xs text-ink-600 dark:text-ink-400">
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
                          <p className="text-xs text-ink-600 dark:text-ink-400">
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
                          <p className="text-xs text-ink-600 dark:text-ink-400">
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
                          <p className="text-[10px] text-ink-500 dark:text-ink-500 mt-0.5">
                            {action === 'credit-spread'
                              ? `($${formatNumber(Math.abs(shortLeg.strike - longLeg.strike), 2)} × 100 × ${longLeg.contracts}) - $${formatNumber((shortLeg.premium - longLeg.premium) * longLeg.contracts * 100, 2)}`
                              : t('callWizard.detailsStep.netDebitPaid')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-ink-600 dark:text-ink-400">
                            {t('callWizard.detailsStep.spreadWidth')}
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
                    <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                      {t('callWizard.detailsStep.strikePrice')}
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
                      {t('callWizard.detailsStep.premiumPerShare')}
                    </label>
                    <LocalizedNumberInput
                      value={longLeg.premium}
                      onChange={(premium) => setLongLeg({ ...longLeg, premium })}
                      className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                      placeholder={`5${getDecimalSeparator()}50`}
                    />
                    <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                      {t('callWizard.detailsStep.total')} $
                      {formatNumber(longLeg.premium * longLeg.contracts * 100, 2)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                      {t('callWizard.detailsStep.expirationDate')}
                    </label>
                    <FridayDatePicker
                      value={longLeg.expiration}
                      onChange={(date) => setLongLeg({ ...longLeg, expiration: date })}
                      className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                    />
                    {longLeg.expiration && (
                      <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                        {t('callWizard.detailsStep.dte')} {calculateDTE(longLeg.expiration)}{' '}
                        {t('callWizard.detailsStep.days')}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
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
                      className={`bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white ${
                        wheelLockedContracts !== null ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                      placeholder="1"
                    />
                    <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                      = {longLeg.contracts * 100} {t('callWizard.detailsStep.shares')}
                      {wheelLockedContracts !== null && (
                        <span className="text-caution-600 dark:text-caution-500 ml-1">
                          {t('callWizard.detailsStep.determinedByWheel')}
                        </span>
                      )}
                    </p>
                    {action === 'covered-call' && Number.isFinite(maxCoveredCallContracts) && (
                      <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                        {t('modalsB.callWizard.maxFreeContracts', {
                          count: maxCoveredCallContracts,
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Break-even & Max Winst/Verlies Display */}
                {longLeg.strike > 0 && longLeg.premium > 0 && (
                  <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-ink-600 dark:text-ink-400">
                          {t('callWizard.detailsStep.breakEvenPrice')}
                        </p>
                        <p className="text-lg font-semibold text-ink-900 dark:text-white">
                          $
                          {formatNumber(calculateCallBreakEven(longLeg.strike, longLeg.premium), 2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-ink-600 dark:text-ink-400">
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
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                {t('callWizard.detailsStep.purchaseDate')}
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
                {t('callWizard.detailsStep.notes')}
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
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
                            {t('callWizard.detailsStep.dontLink')}
                          </p>
                          <p className="text-xs text-ink-600 dark:text-ink-400">
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
      title={t('callWizard.title')}
      steps={steps}
      onComplete={handleComplete}
      completeButtonLabel={t('callWizard.completeButton')}
      currentStepIndex={currentStepIndex}
      onStepChange={setCurrentStepIndex}
    />
  );
};
