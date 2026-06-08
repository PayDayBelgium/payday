import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { WizardModal, type WizardStep } from './WizardModal';
import { TickerSelector } from '../widgets/TickerSelector';
import { TrendingUp, Building2, Calendar, DollarSign, Hash, Info } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { openPosition } from '../../store/commands/positionCommands';
import { ensureTicker } from '../../store/commands/tickerCommands';
import type { Ticker, StockPosition, PortfolioName, CurrencyType } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';
import { formatNumber } from '../../utils/numberFormat';

interface StockETFWizardProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: {
    name: PortfolioName;
    currency: CurrencyType;
    currentValue: number;
  };
  /** When provided, pre-selects this ticker when the wizard opens (buy-more flow). */
  initialTicker?: Ticker;
}

export const StockETFWizard: React.FC<StockETFWizardProps> = ({ isOpen, onClose, portfolio, initialTicker }) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();

  // Step 1: Type selection (stock or ETF) - default to 'stock'
  const [positionType, setPositionType] = useState<'stock' | 'etf' | null>('stock');

  // Step 2: Ticker selection/creation
  const [selectedTicker, setSelectedTicker] = useState<Ticker | null>(null);
  const [isCreatingTicker, setIsCreatingTicker] = useState(false);
  const [newTickerData, setNewTickerData] = useState({
    symbol: '',
    name: '',
    optionsAvailable: true,
    miniContractsAvailable: false,
    hasDividend: false,
  });

  // Step 3: Purchase details
  const [purchaseDetails, setPurchaseDetails] = useState({
    shares: 0,
    purchasePrice: 0,
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // When the wizard opens with an initialTicker, pre-select that ticker and
  // match the position type so the wizard skips straight to the details step.
  // Mirrors the pattern used by CallOptionWizard for its initialTicker prop.
  useEffect(() => {
    if (isOpen && initialTicker) {
      setSelectedTicker(initialTicker);
      if (initialTicker.type === 'stock' || initialTicker.type === 'etf') {
        setPositionType(initialTicker.type);
      }
    } else if (!isOpen) {
      // Clear the pre-selection on close so a fresh open starts blank.
      setSelectedTicker(null);
    }
  }, [isOpen, initialTicker]);

  // Auto-fill purchase price when ticker is selected
  React.useEffect(() => {
    if (selectedTicker?.currentPrice && purchaseDetails.purchasePrice === 0) {
      setPurchaseDetails((prev) => ({
        ...prev,
        purchasePrice: selectedTicker.currentPrice || 0,
      }));
    }
  }, [selectedTicker]);

  const handleCreateTicker = (symbol: string) => {
    setIsCreatingTicker(true);
    setNewTickerData({
      symbol: symbol.toUpperCase(),
      name: '',
      optionsAvailable: true,
      miniContractsAvailable: false,
      hasDividend: false,
    });
  };

  const handleSaveNewTicker = () => {
    if (!positionType || !newTickerData.name) return;

    const newTicker: Ticker = {
      symbol: newTickerData.symbol,
      name: newTickerData.name,
      type: positionType,
      optionsAvailable: newTickerData.optionsAvailable,
      miniContractsAvailable: newTickerData.miniContractsAvailable,
      hasDividend: newTickerData.hasDividend,
      lastUsed: new Date().toISOString(),
      currentPrice: 10, // Default price for new tickers
    };

    dispatch(ensureTicker(newTicker, new Date().toISOString()));
    setSelectedTicker(newTicker);
    setIsCreatingTicker(false);
  };

  const handleComplete = () => {
    if (!selectedTicker || !positionType) return;

    const costBasis = purchaseDetails.shares * purchaseDetails.purchasePrice;

    const newPosition: StockPosition = {
      id: `pos-${Date.now()}`,
      type: positionType,
      ticker: selectedTicker.symbol,
      name: selectedTicker.name,
      portfolio: portfolio.name,
      openDate: purchaseDetails.purchaseDate,
      status: 'open',
      shares: purchaseDetails.shares,
      costBasis,
      purchasePrice: purchaseDetails.purchasePrice,
      currentPrice: purchaseDetails.purchasePrice, // Initial current price = purchase price
      currentValue: costBasis,
      optionsSupported: selectedTicker.optionsAvailable,
      miniContractsSupported: selectedTicker.miniContractsAvailable,
      notes: purchaseDetails.notes || undefined,
    };

    // Ensure ticker exists in central store
    const stockTs = new Date().toISOString();
    dispatch(
      ensureTicker(
        {
          symbol: selectedTicker.symbol,
          name: selectedTicker.name,
          type: positionType,
          optionsAvailable: selectedTicker.optionsAvailable,
          miniContractsAvailable: selectedTicker.miniContractsAvailable,
        },
        stockTs
      )
    );

    // Add position — the transaction ledger line is derived automatically
    // from the PositionOpened event by the transaction projection.
    dispatch(openPosition(newPosition, new Date().toISOString()));

    // Reset and close
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setPositionType('stock'); // Reset to default 'stock' selection
    setSelectedTicker(null);
    setIsCreatingTicker(false);
    setNewTickerData({
      symbol: '',
      name: '',
      optionsAvailable: false,
      miniContractsAvailable: false,
      hasDividend: false,
    });
    setPurchaseDetails({
      shares: 0,
      purchasePrice: 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  const currencySymbol = getCurrencySymbol(portfolio.currency);
  const totalCost = purchaseDetails.shares * purchaseDetails.purchasePrice;

  const steps: WizardStep[] = useMemo(() => {
    const stepList: WizardStep[] = [
      // Step 1: Type Selection
      {
        id: 'type',
        title: t('stockWizard.typeStep.title'),
        description: t('stockWizard.typeStep.description'),
        isValid: positionType !== null,
        component: (
          <div className="space-y-4">
            <p className="text-sm text-ink-600 dark:text-ink-400">
              {t('stockWizard.typeStep.selectType')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPositionType('stock')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  positionType === 'stock'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-ink-200 dark:border-trading-dark-500 hover:border-ink-300'
                }`}
              >
                <TrendingUp
                  className={`w-12 h-12 mx-auto mb-3 ${
                    positionType === 'stock'
                      ? 'text-primary-700 dark:text-primary-300'
                      : 'text-ink-400'
                  }`}
                />
                <h3 className="text-lg font-semibold text-ink-900 dark:text-white">
                  {t('stockWizard.typeStep.stock')}
                </h3>
                <p className="text-sm text-ink-600 dark:text-ink-400 mt-1">
                  {t('stockWizard.typeStep.stockDesc')}
                </p>
              </button>

              <button
                onClick={() => setPositionType('etf')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  positionType === 'etf'
                    ? 'border-positive-500 bg-positive-50 dark:bg-positive-700/15'
                    : 'border-ink-200 dark:border-trading-dark-500 hover:border-ink-300'
                }`}
              >
                <Building2
                  className={`w-12 h-12 mx-auto mb-3 ${
                    positionType === 'etf'
                      ? 'text-positive-600 dark:text-positive-500'
                      : 'text-ink-400'
                  }`}
                />
                <h3 className="text-lg font-semibold text-ink-900 dark:text-white">
                  {t('stockWizard.typeStep.etf')}
                </h3>
                <p className="text-sm text-ink-600 dark:text-ink-400 mt-1">
                  {t('stockWizard.typeStep.etfDesc')}
                </p>
              </button>
            </div>
          </div>
        ),
      },
    ];

    // Step 2: Ticker Selection
    if (positionType) {
      stepList.push({
        id: 'ticker',
        title: t('stockWizard.tickerStep.title'),
        description: isCreatingTicker
          ? t('stockWizard.tickerStep.descriptionCreate')
          : t('stockWizard.tickerStep.description'),
        isValid: selectedTicker !== null,
        component: isCreatingTicker ? (
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-ink-900 dark:text-white">
                {t('stockWizard.tickerStep.tickerSymbol')}
              </label>
              <input
                type="text"
                value={newTickerData.symbol}
                disabled
                className="bg-surface-subtle border border-ink-200 text-ink-900 text-sm rounded-lg block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-ink-900 dark:text-white">
                {t('stockWizard.tickerStep.name')}
              </label>
              <input
                type="text"
                value={newTickerData.name}
                onChange={(e) => setNewTickerData({ ...newTickerData, name: e.target.value })}
                className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                placeholder={t('stockWizard.tickerStep.namePlaceholder', {
                  example: positionType === 'stock' ? 'Apple Inc.' : 'SPDR S&P 500 ETF',
                })}
                required
                autoFocus
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTickerData.optionsAvailable}
                  onChange={(e) =>
                    setNewTickerData({ ...newTickerData, optionsAvailable: e.target.checked })
                  }
                  className="w-4 h-4 text-primary-700 bg-surface-subtle border-ink-200 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-ink-900 dark:text-white">
                  {t('stockWizard.tickerStep.optionsAvailable')}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTickerData.miniContractsAvailable}
                  onChange={(e) =>
                    setNewTickerData({ ...newTickerData, miniContractsAvailable: e.target.checked })
                  }
                  className="w-4 h-4 text-primary-700 bg-surface-subtle border-ink-200 rounded focus:ring-primary-500"
                />
                <span className="text-sm font-medium text-ink-900 dark:text-white flex items-center gap-2">
                  {t('stockWizard.tickerStep.miniContracts')}
                  <div className="group relative">
                    <Info className="w-4 h-4 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-white dark:bg-trading-dark-800 text-ink-700 dark:text-ink-300 text-xs rounded-lg shadow-lg border border-surface-line dark:border-trading-dark-500 z-50">
                      {t('stockWizard.tickerStep.miniContractsTooltip')}
                    </div>
                  </div>
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => {
                  setIsCreatingTicker(false);
                  setNewTickerData({
                    symbol: '',
                    name: '',
                    optionsAvailable: false,
                    miniContractsAvailable: false,
                    hasDividend: false,
                  });
                }}
                className="flex-1 px-4 py-2 bg-surface-muted dark:bg-trading-dark-700 hover:bg-ink-200 dark:hover:bg-trading-dark-600 text-ink-700 dark:text-ink-200 rounded-lg font-medium transition-colors"
              >
                {t('stockWizard.tickerStep.cancel')}
              </button>
              <button
                onClick={handleSaveNewTicker}
                disabled={!newTickerData.name}
                className="flex-1 px-4 py-2 bg-primary-700 hover:bg-primary-800 disabled:bg-ink-300 text-white rounded-lg font-medium transition-colors"
              >
                {t('stockWizard.tickerStep.save')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-600 dark:text-ink-400">
              {t('stockWizard.tickerStep.searchTicker')}
            </p>
            <TickerSelector
              value={selectedTicker?.symbol || ''}
              onChange={setSelectedTicker}
              onCreateNew={handleCreateTicker}
              placeholder={t('stockWizard.tickerStep.searchPlaceholder', {
                type:
                  positionType === 'stock' ? t('stockWizard.typeStep.stock').toLowerCase() : 'ETF',
              })}
              autoFocus
            />

            {selectedTicker && (
              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                <p className="text-sm font-medium text-primary-900 dark:text-primary-300 mb-2">
                  {t('stockWizard.tickerStep.selected')}
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selectedTicker.type === 'stock'
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'bg-positive-50 dark:bg-positive-700/25 text-positive-600 dark:text-positive-500'
                    }`}
                  >
                    {selectedTicker.type === 'stock' ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <Building2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-primary-900 dark:text-primary-300">
                      {selectedTicker.symbol}
                    </p>
                    <p className="text-sm text-primary-700 dark:text-primary-300">
                      {selectedTicker.name}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ),
      });
    }

    // Step 3: Purchase Details
    if (selectedTicker) {
      stepList.push({
        id: 'details',
        title: t('stockWizard.detailsStep.title'),
        description: t('stockWizard.detailsStep.description'),
        isValid: purchaseDetails.shares > 0 && purchaseDetails.purchasePrice > 0,
        component: (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-medium text-ink-900 dark:text-white flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  {t('stockWizard.detailsStep.numberOfShares')}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={purchaseDetails.shares || ''}
                  onChange={(e) =>
                    setPurchaseDetails({
                      ...purchaseDetails,
                      shares: parseInt(e.target.value) || 0,
                    })
                  }
                  className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                  placeholder="100"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-ink-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {t('stockWizard.detailsStep.pricePerShare')} ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={purchaseDetails.purchasePrice || ''}
                  onChange={(e) =>
                    setPurchaseDetails({
                      ...purchaseDetails,
                      purchasePrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                  placeholder="150,00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-ink-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('stockWizard.detailsStep.purchaseDate')}
              </label>
              <input
                type="date"
                value={purchaseDetails.purchaseDate}
                onChange={(e) =>
                  setPurchaseDetails({ ...purchaseDetails, purchaseDate: e.target.value })
                }
                max={new Date().toISOString().split('T')[0]}
                className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-ink-900 dark:text-white">
                {t('stockWizard.detailsStep.notes')}
              </label>
              <textarea
                value={purchaseDetails.notes}
                onChange={(e) => setPurchaseDetails({ ...purchaseDetails, notes: e.target.value })}
                rows={3}
                className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                placeholder={t('stockWizard.detailsStep.notesPlaceholder')}
              />
            </div>

            {/* Summary */}
            {purchaseDetails.shares > 0 && purchaseDetails.purchasePrice > 0 && (
              <div className="p-4 bg-positive-50 dark:bg-positive-700/15 rounded-lg border border-positive-500/20 dark:border-positive-700/30">
                <p className="text-sm font-medium text-positive-700 dark:text-positive-500 mb-2">
                  {t('stockWizard.detailsStep.summary')}
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-positive-700 dark:text-positive-500">
                      {t('stockWizard.detailsStep.quantity')}
                    </span>
                    <span className="font-medium text-positive-700 dark:text-positive-500">
                      {purchaseDetails.shares} {t('stockWizard.detailsStep.shares')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-positive-700 dark:text-positive-500">
                      {t('stockWizard.detailsStep.pricePerShareLabel')}
                    </span>
                    <span className="font-medium text-positive-700 dark:text-positive-500">
                      {currencySymbol}
                      {formatNumber(purchaseDetails.purchasePrice, 2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-positive-500/30 dark:border-positive-700">
                    <span className="font-semibold text-positive-700 dark:text-positive-500">
                      {t('stockWizard.detailsStep.totalCost')}
                    </span>
                    <span className="font-bold text-positive-700 dark:text-positive-500">
                      {currencySymbol}
                      {formatNumber(totalCost)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ),
      });
    }

    return stepList;
  }, [
    positionType,
    selectedTicker,
    isCreatingTicker,
    newTickerData,
    purchaseDetails,
    currencySymbol,
    totalCost,
  ]);

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title={
        positionType === 'stock'
          ? t('stockWizard.titleStock')
          : positionType === 'etf'
            ? t('stockWizard.titleETF')
            : t('stockWizard.titlePosition')
      }
      steps={steps}
      onComplete={handleComplete}
      completeButtonLabel={t('stockWizard.completeButton')}
    />
  );
};
