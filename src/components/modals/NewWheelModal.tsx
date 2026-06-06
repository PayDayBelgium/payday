import React, { useState, useMemo } from 'react';
import { X, RefreshCw, Info, ArrowLeft, TrendingUp, Building2, Plus } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { addWheel } from '../../store/slices/wheelsSlice';
import { addPosition, selectPositions, updatePosition } from '../../store/slices/positionsSlice';
import { ensureTicker } from '../../store/slices/tickersSlice';
import { TickerSelector } from '../widgets/TickerSelector';
import type {
  Ticker,
  PortfolioName,
  WheelCampaign,
  StockPosition,
  PutOption,
  Position,
} from '../../types';
import { formatNumber } from '../../utils/numberFormat';

interface NewWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolioName: PortfolioName;
}

export const NewWheelModal: React.FC<NewWheelModalProps> = ({ isOpen, onClose, portfolioName }) => {
  const dispatch = useAppDispatch();
  const allPositions = useAppSelector(selectPositions);

  const [selectedTicker, setSelectedTicker] = useState<Ticker | null>(null);
  const [targetContracts, setTargetContracts] = useState(1);
  const [notes, setNotes] = useState('');

  // Start position selection - what to link to the wheel
  const [startOption, setStartOption] = useState<
    'new-csp' | 'existing-csp' | 'new-stock' | 'existing-stock' | null
  >(null);
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null);

  // New stock creation
  const [stockPurchasePrice, setStockPurchasePrice] = useState('');
  const [stockPurchaseDate, setStockPurchaseDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  // New ticker creation state
  const [isCreatingTicker, setIsCreatingTicker] = useState(false);
  const [newTickerData, setNewTickerData] = useState({
    symbol: '',
    name: '',
    type: 'stock' as 'stock' | 'etf',
    optionsAvailable: true,
    miniContractsAvailable: false,
    hasDividend: false,
  });

  // Find existing positions for selected ticker
  const existingPositions = useMemo(() => {
    if (!selectedTicker) return { csps: [], stocks: [] };

    const openPositions = allPositions.filter(
      (p) =>
        p.status === 'open' &&
        p.ticker.toUpperCase() === selectedTicker.symbol.toUpperCase() &&
        p.portfolio === portfolioName &&
        !(p as { wheelId?: string }).wheelId // Not already linked to a wheel
    );

    const csps = openPositions.filter(
      (p) => p.type === 'put' && (p as PutOption).action === 'sell'
    ) as PutOption[];

    const stocks = openPositions.filter(
      (p) => p.type === 'stock' || p.type === 'etf'
    ) as StockPosition[];

    return { csps, stocks };
  }, [selectedTicker, allPositions, portfolioName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTicker || !startOption) return;

    const wheelId = `wheel-${Date.now()}`;
    const shares = targetContracts * 100;

    // Determine starting phase based on selection
    const isStockPhase = startOption === 'new-stock' || startOption === 'existing-stock';
    const startPhase = isStockPhase ? 'stock' : 'csp';

    // Calculate initial premium if linking to existing CSP
    let initialPremium = 0;
    if (startOption === 'existing-csp' && selectedPositionId) {
      const csp = existingPositions.csps.find((p) => p.id === selectedPositionId);
      if (csp) {
        initialPremium = csp.premium * csp.contracts * 100;
      }
    }

    const newWheel: WheelCampaign = {
      id: wheelId,
      ticker: selectedTicker.symbol.toUpperCase(),
      portfolio: portfolioName,
      phase: startPhase,
      targetContracts,
      startDate: new Date().toISOString().split('T')[0],
      status: 'active',
      totalPremiumCollected: initialPremium,
      totalRealizedPnL: 0,
      cycles: 0,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
    };

    dispatch(addWheel(newWheel));

    // Handle different start options
    if (startOption === 'new-stock' && stockPurchasePrice) {
      // Create new stock position
      const purchasePrice = parseFloat(stockPurchasePrice);
      const costBasis = purchasePrice * shares;

      const stockPosition: StockPosition = {
        id: `stock-${Date.now()}`,
        type: 'stock',
        ticker: selectedTicker.symbol.toUpperCase(),
        name: selectedTicker.name,
        portfolio: portfolioName,
        status: 'open',
        shares,
        costBasis,
        purchasePrice,
        currentPrice: purchasePrice,
        currentValue: costBasis,
        optionsSupported: true,
        miniContractsSupported: false,
        openDate: stockPurchaseDate,
        notes: `Bestaande positie gekoppeld aan Wheel`,
        wheelId,
      };

      dispatch(addPosition(stockPosition));
    } else if (startOption === 'existing-stock' && selectedPositionId) {
      // Link existing stock to wheel
      const stock = existingPositions.stocks.find((p) => p.id === selectedPositionId);
      if (stock) {
        dispatch(
          updatePosition({
            ...stock,
            wheelId,
          } as Position)
        );
      }
    } else if (startOption === 'existing-csp' && selectedPositionId) {
      // Link existing CSP to wheel
      const csp = existingPositions.csps.find((p) => p.id === selectedPositionId);
      if (csp) {
        dispatch(
          updatePosition({
            ...csp,
            wheelId,
          } as Position)
        );
      }
    }
    // For 'new-csp', user will create the CSP manually after

    handleClose();
  };

  const handleClose = () => {
    setSelectedTicker(null);
    setTargetContracts(1);
    setNotes('');
    setStartOption(null);
    setSelectedPositionId(null);
    setStockPurchasePrice('');
    setStockPurchaseDate(new Date().toISOString().split('T')[0]);
    setIsCreatingTicker(false);
    setNewTickerData({
      symbol: '',
      name: '',
      type: 'stock',
      optionsAvailable: true,
      miniContractsAvailable: false,
      hasDividend: false,
    });
    onClose();
  };

  const handleCreateNewTicker = (symbol: string) => {
    setNewTickerData({
      symbol: symbol.toUpperCase(),
      name: '',
      type: 'stock',
      optionsAvailable: true,
      miniContractsAvailable: false,
      hasDividend: false,
    });
    setIsCreatingTicker(true);
  };

  const handleConfirmNewTicker = () => {
    const newTicker: Ticker = {
      symbol: newTickerData.symbol.toUpperCase(),
      name: newTickerData.name || newTickerData.symbol.toUpperCase(),
      type: newTickerData.type,
      optionsAvailable: newTickerData.optionsAvailable,
      miniContractsAvailable: newTickerData.miniContractsAvailable,
      hasDividend: newTickerData.hasDividend,
      lastUsed: new Date().toISOString(),
    };

    dispatch(ensureTicker(newTicker));
    setSelectedTicker(newTicker);
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

  const handleCancelNewTicker = () => {
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={handleClose} />

        {/* Modal */}
        <div className="relative bg-white dark:bg-trading-dark-800 rounded-xl shadow-xl w-full max-w-2xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-surface-line dark:border-trading-dark-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <RefreshCw className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <h2 className="text-lg font-semibold text-ink-900 dark:text-white">
                Nieuw wheel starten
              </h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Info box */}
            <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-teal-700 dark:text-teal-300">
                  Een Wheel is een cyclische strategie: verkoop CSP's tot assignment, schrijf dan
                  covered calls tot verkoop, en herhaal.
                </p>
              </div>
            </div>

            {/* Ticker Selection */}
            {isCreatingTicker ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={handleCancelNewTicker}
                    className="p-1 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <h3 className="text-sm font-medium text-ink-700 dark:text-ink-300">
                    Nieuwe Ticker: {newTickerData.symbol}
                  </h3>
                </div>

                {/* Ticker Name */}
                <div>
                  <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                    Bedrijfsnaam
                  </label>
                  <input
                    type="text"
                    value={newTickerData.name}
                    onChange={(e) => setNewTickerData({ ...newTickerData, name: e.target.value })}
                    className="bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                    placeholder={`Bijv. ${newTickerData.symbol} Inc.`}
                  />
                </div>

                {/* Ticker Type */}
                <div>
                  <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                    Type
                  </label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setNewTickerData({ ...newTickerData, type: 'stock' })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        newTickerData.type === 'stock'
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
                          : 'border-surface-line dark:border-trading-dark-500 text-ink-600 dark:text-ink-400 hover:border-ink-200'
                      }`}
                    >
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-medium">Aandeel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTickerData({ ...newTickerData, type: 'etf' })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                        newTickerData.type === 'etf'
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'
                          : 'border-surface-line dark:border-trading-dark-500 text-ink-600 dark:text-ink-400 hover:border-ink-200'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span className="text-sm font-medium">ETF</span>
                    </button>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTickerData.optionsAvailable}
                      onChange={(e) =>
                        setNewTickerData({ ...newTickerData, optionsAvailable: e.target.checked })
                      }
                      className="w-4 h-4 text-teal-600 bg-surface-subtle border-ink-200 rounded focus:ring-teal-500 dark:bg-trading-dark-700 dark:border-trading-dark-500"
                    />
                    <span className="text-sm text-ink-700 dark:text-ink-300">
                      Opties beschikbaar
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTickerData.miniContractsAvailable}
                      onChange={(e) =>
                        setNewTickerData({
                          ...newTickerData,
                          miniContractsAvailable: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-teal-600 bg-surface-subtle border-ink-200 rounded focus:ring-teal-500 dark:bg-trading-dark-700 dark:border-trading-dark-500"
                    />
                    <span className="text-sm text-ink-700 dark:text-ink-300">
                      Mini contracten beschikbaar
                    </span>
                  </label>
                </div>

                {/* Confirm Button */}
                <button
                  type="button"
                  onClick={handleConfirmNewTicker}
                  className="w-full px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors"
                >
                  Ticker Toevoegen
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                  Ticker
                </label>
                <TickerSelector
                  value={selectedTicker?.symbol || ''}
                  onChange={setSelectedTicker}
                  onCreateNew={handleCreateNewTicker}
                  placeholder="Selecteer ticker..."
                />
              </div>
            )}

            {/* Start Position Selection - only show when ticker is selected and not creating ticker */}
            {!isCreatingTicker && selectedTicker && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-300">
                  Start Positie
                </label>

                {/* Side-by-side CSP and Stock options */}
                <div className="grid grid-cols-2 gap-4">
                  {/* CSP Options */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wide">
                      CSP Fase (Cash-Secured Put)
                    </p>

                    {/* Existing CSPs */}
                    {existingPositions.csps.map((csp) => (
                      <label
                        key={csp.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          startOption === 'existing-csp' && selectedPositionId === csp.id
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                            : 'border-surface-line dark:border-trading-dark-600 hover:border-teal-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="start-option"
                          checked={startOption === 'existing-csp' && selectedPositionId === csp.id}
                          onChange={() => {
                            setStartOption('existing-csp');
                            setSelectedPositionId(csp.id);
                            setTargetContracts(csp.contracts);
                          }}
                          className="w-4 h-4 text-teal-600 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ink-900 dark:text-white text-sm truncate">
                            {csp.contracts}x ${csp.strike} Put
                          </p>
                          <p className="text-xs text-ink-600 dark:text-ink-400 truncate">
                            {new Date(csp.expiration).toLocaleDateString('nl-NL')} • $
                            {formatNumber(csp.premium * csp.contracts * 100, 0)}
                          </p>
                        </div>
                      </label>
                    ))}

                    {/* New CSP option */}
                    <label
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        startOption === 'new-csp'
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                          : 'border-surface-line dark:border-trading-dark-600 hover:border-teal-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="start-option"
                        checked={startOption === 'new-csp'}
                        onChange={() => {
                          setStartOption('new-csp');
                          setSelectedPositionId(null);
                        }}
                        className="w-4 h-4 text-teal-600 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ink-900 dark:text-white text-sm flex items-center gap-1">
                          <Plus className="w-3 h-3" />
                          Nieuwe CSP
                        </p>
                        <p className="text-xs text-ink-600 dark:text-ink-400">Later toevoegen</p>
                      </div>
                    </label>
                  </div>

                  {/* Stock Options */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wide">
                      Aandelen Fase (Covered Calls)
                    </p>

                    {/* Existing Stocks */}
                    {existingPositions.stocks.map((stock) => (
                      <label
                        key={stock.id}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          startOption === 'existing-stock' && selectedPositionId === stock.id
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                            : 'border-surface-line dark:border-trading-dark-600 hover:border-teal-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="start-option"
                          checked={
                            startOption === 'existing-stock' && selectedPositionId === stock.id
                          }
                          onChange={() => {
                            setStartOption('existing-stock');
                            setSelectedPositionId(stock.id);
                            setTargetContracts(Math.floor(stock.shares / 100));
                          }}
                          className="w-4 h-4 text-teal-600 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-ink-900 dark:text-white text-sm truncate">
                            {stock.shares} aandelen
                          </p>
                          <p className="text-xs text-ink-600 dark:text-ink-400 truncate">
                            ${formatNumber(stock.purchasePrice, 2)}/aandeel
                          </p>
                        </div>
                      </label>
                    ))}

                    {/* New Stock option */}
                    <label
                      className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                        startOption === 'new-stock'
                          ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                          : 'border-surface-line dark:border-trading-dark-600 hover:border-teal-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="start-option"
                        checked={startOption === 'new-stock'}
                        onChange={() => {
                          setStartOption('new-stock');
                          setSelectedPositionId(null);
                        }}
                        className="w-4 h-4 text-teal-600 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ink-900 dark:text-white text-sm flex items-center gap-1">
                          <Plus className="w-3 h-3" />
                          Nieuwe aandelen
                        </p>
                        <p className="text-xs text-ink-600 dark:text-ink-400">Invoeren</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Target Contracts - only show for new positions */}
            {!isCreatingTicker && (startOption === 'new-csp' || startOption === 'new-stock') && (
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                  Aantal contracten
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={targetContracts}
                    onChange={(e) => setTargetContracts(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24 bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                  />
                  <span className="text-sm text-ink-500 dark:text-ink-400">
                    = {targetContracts * 100} aandelen
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">
                  {startOption === 'new-csp'
                    ? 'Dit bepaalt hoeveel CSPs je schrijft en hoeveel aandelen je eventueel koopt.'
                    : 'Dit bepaalt hoeveel aandelen je hebt en hoeveel covered calls je kunt schrijven.'}
                </p>
              </div>
            )}

            {/* Stock Purchase Info - only show when adding new stock */}
            {!isCreatingTicker && startOption === 'new-stock' && (
              <div className="space-y-4 p-3 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-200 dark:border-teal-800">
                <h4 className="text-sm font-medium text-teal-700 dark:text-teal-300">
                  Aandelen Informatie
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                      Aankoopprijs per aandeel
                    </label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500 text-sm">
                        $
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={stockPurchasePrice}
                        onChange={(e) => setStockPurchasePrice(e.target.value)}
                        className="w-full pl-7 bg-white border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                      Aankoopdatum
                    </label>
                    <input
                      type="date"
                      value={stockPurchaseDate}
                      onChange={(e) => setStockPurchaseDate(e.target.value)}
                      className="w-full bg-white border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 p-2 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                    />
                  </div>
                </div>
                {stockPurchasePrice && (
                  <p className="text-xs text-teal-600 dark:text-teal-400">
                    Totale waarde: $
                    {formatNumber(parseFloat(stockPurchasePrice) * targetContracts * 100, 2)}
                  </p>
                )}
              </div>
            )}

            {/* Notes - only show when start option is selected */}
            {!isCreatingTicker && startOption && (
              <div>
                <label className="block text-sm font-medium text-ink-700 dark:text-ink-300 mb-2">
                  Notities (optioneel)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-surface border border-ink-200 text-ink-900 text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 p-2.5 dark:bg-trading-dark-700 dark:border-trading-dark-500 dark:text-white"
                  placeholder="Bijv. doel strike, strategie notities..."
                />
              </div>
            )}

            {/* Actions - only show when not creating ticker */}
            {!isCreatingTicker && (
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-ink-700 dark:text-ink-300 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 rounded-lg transition-colors"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={
                    !selectedTicker ||
                    !startOption ||
                    (startOption === 'new-stock' && !stockPurchasePrice) ||
                    ((startOption === 'existing-csp' || startOption === 'existing-stock') &&
                      !selectedPositionId)
                  }
                  className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:bg-ink-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Wheel Starten
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
