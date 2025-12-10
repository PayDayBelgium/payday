import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { WizardModal, type WizardStep } from './WizardModal';
import { TickerSelector } from '../widgets/TickerSelector';
import { TrendingUp, Building2, Calendar, DollarSign, Hash, Info } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { addTicker } from '../../store/slices/portfoliosSlice';
import { addPosition } from '../../store/slices/positionsSlice';
import { addTransaction } from '../../store/slices/portfoliosSlice';
import { ensureTicker } from '../../store/slices/tickersSlice';
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
}

export const StockETFWizard: React.FC<StockETFWizardProps> = ({
  isOpen,
  onClose,
  portfolio,
}) => {
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

  // Auto-fill purchase price when ticker is selected
  React.useEffect(() => {
    if (selectedTicker?.currentPrice && purchaseDetails.purchasePrice === 0) {
      setPurchaseDetails(prev => ({
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

    dispatch(addTicker(newTicker));
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
    dispatch(ensureTicker({
      symbol: selectedTicker.symbol,
      name: selectedTicker.name,
      type: positionType,
      optionsAvailable: selectedTicker.optionsAvailable,
      miniContractsAvailable: selectedTicker.miniContractsAvailable,
      currentPrice: purchaseDetails.purchasePrice,
    }));

    // Add position
    dispatch(addPosition(newPosition));

    // Log transaction
    // Portfolio value stays the same when buying stocks (Cash decreases, Long increases)
    const transaction = {
      id: `txn-${Date.now()}`,
      portfolio: portfolio.name,
      date: purchaseDetails.purchaseDate,
      type: 'position_buy' as const,
      amount: -costBasis, // Negative because it's a purchase
      description: `Gekocht ${purchaseDetails.shares} ${selectedTicker.symbol} @ ${getCurrencySymbol(portfolio.currency)}${formatNumber(purchaseDetails.purchasePrice, 2)}`,
      relatedPositionId: newPosition.id,
      previousValue: portfolio.currentValue,
      newValue: portfolio.currentValue, // Portfolio value stays the same
      createdAt: new Date().toISOString(),
      notes: purchaseDetails.notes || undefined,
    };

    dispatch(addTransaction(transaction));

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
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('stockWizard.typeStep.selectType')}
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setPositionType('stock')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  positionType === 'stock'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <TrendingUp className={`w-12 h-12 mx-auto mb-3 ${
                  positionType === 'stock' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                }`} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('stockWizard.typeStep.stock')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t('stockWizard.typeStep.stockDesc')}
                </p>
              </button>

              <button
                onClick={() => setPositionType('etf')}
                className={`p-6 rounded-lg border-2 transition-all ${
                  positionType === 'etf'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                }`}
              >
                <Building2 className={`w-12 h-12 mx-auto mb-3 ${
                  positionType === 'etf' ? 'text-green-600 dark:text-green-400' : 'text-gray-400'
                }`} />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('stockWizard.typeStep.etf')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
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
        description: isCreatingTicker ? t('stockWizard.tickerStep.descriptionCreate') : t('stockWizard.tickerStep.description'),
        isValid: selectedTicker !== null,
        component: isCreatingTicker ? (
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                {t('stockWizard.tickerStep.tickerSymbol')}
              </label>
              <input
                type="text"
                value={newTickerData.symbol}
                disabled
                className="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                {t('stockWizard.tickerStep.name')}
              </label>
              <input
                type="text"
                value={newTickerData.name}
                onChange={(e) => setNewTickerData({ ...newTickerData, name: e.target.value })}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t('stockWizard.tickerStep.namePlaceholder', { example: positionType === 'stock' ? 'Apple Inc.' : 'SPDR S&P 500 ETF' })}
                required
                autoFocus
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTickerData.optionsAvailable}
                  onChange={(e) => setNewTickerData({ ...newTickerData, optionsAvailable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('stockWizard.tickerStep.optionsAvailable')}
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTickerData.miniContractsAvailable}
                  onChange={(e) => setNewTickerData({ ...newTickerData, miniContractsAvailable: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  {t('stockWizard.tickerStep.miniContracts')}
                  <div className="group relative">
                    <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 z-50">
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
                  setNewTickerData({ symbol: '', name: '', optionsAvailable: false, miniContractsAvailable: false });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
              >
                {t('stockWizard.tickerStep.cancel')}
              </button>
              <button
                onClick={handleSaveNewTicker}
                disabled={!newTickerData.name}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
              >
                {t('stockWizard.tickerStep.save')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('stockWizard.tickerStep.searchTicker')}
            </p>
            <TickerSelector
              value={selectedTicker?.symbol || ''}
              onChange={setSelectedTicker}
              onCreateNew={handleCreateTicker}
              placeholder={t('stockWizard.tickerStep.searchPlaceholder', { type: positionType === 'stock' ? t('stockWizard.typeStep.stock').toLowerCase() : 'ETF' })}
              autoFocus
            />

            {selectedTicker && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                  {t('stockWizard.tickerStep.selected')}
                </p>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedTicker.type === 'stock'
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  }`}>
                    {selectedTicker.type === 'stock' ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <Building2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-300">
                      {selectedTicker.symbol}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-400">
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
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  {t('stockWizard.detailsStep.numberOfShares')}
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={purchaseDetails.shares || ''}
                  onChange={(e) => setPurchaseDetails({ ...purchaseDetails, shares: parseInt(e.target.value) || 0 })}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="100"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  {t('stockWizard.detailsStep.pricePerShare')} ({currencySymbol})
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={purchaseDetails.purchasePrice || ''}
                  onChange={(e) => setPurchaseDetails({ ...purchaseDetails, purchasePrice: parseFloat(e.target.value) || 0 })}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="150,00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {t('stockWizard.detailsStep.purchaseDate')}
              </label>
              <input
                type="date"
                value={purchaseDetails.purchaseDate}
                onChange={(e) => setPurchaseDetails({ ...purchaseDetails, purchaseDate: e.target.value })}
                max={new Date().toISOString().split('T')[0]}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                {t('stockWizard.detailsStep.notes')}
              </label>
              <textarea
                value={purchaseDetails.notes}
                onChange={(e) => setPurchaseDetails({ ...purchaseDetails, notes: e.target.value })}
                rows={3}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder={t('stockWizard.detailsStep.notesPlaceholder')}
              />
            </div>

            {/* Summary */}
            {purchaseDetails.shares > 0 && purchaseDetails.purchasePrice > 0 && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-900 dark:text-green-300 mb-2">
                  {t('stockWizard.detailsStep.summary')}
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700 dark:text-green-400">{t('stockWizard.detailsStep.quantity')}</span>
                    <span className="font-medium text-green-900 dark:text-green-300">
                      {purchaseDetails.shares} {t('stockWizard.detailsStep.shares')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700 dark:text-green-400">{t('stockWizard.detailsStep.pricePerShareLabel')}</span>
                    <span className="font-medium text-green-900 dark:text-green-300">
                      {currencySymbol}{formatNumber(purchaseDetails.purchasePrice, 2)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-green-300 dark:border-green-700">
                    <span className="font-semibold text-green-900 dark:text-green-200">{t('stockWizard.detailsStep.totalCost')}</span>
                    <span className="font-bold text-green-900 dark:text-green-200">
                      {currencySymbol}{formatNumber(totalCost)}
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
  }, [positionType, selectedTicker, isCreatingTicker, newTickerData, purchaseDetails, currencySymbol, totalCost]);

  return (
    <WizardModal
      isOpen={isOpen}
      onClose={() => {
        handleReset();
        onClose();
      }}
      title={positionType === 'stock' ? t('stockWizard.titleStock') : positionType === 'etf' ? t('stockWizard.titleETF') : t('stockWizard.titlePosition')}
      steps={steps}
      onComplete={handleComplete}
      completeButtonLabel={t('stockWizard.completeButton')}
    />
  );
};
