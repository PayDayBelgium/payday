import React, { useState, useEffect } from 'react';
import { Calculator, TrendingUp, Info, DollarSign, Percent, Calendar, Target } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { FridayDatePicker } from '../../components/common/FridayDatePicker';
import { TickerSelector } from '../../components/widgets/TickerSelector';
import { addTicker } from '../../store/slices/tickersSlice';
import { PortalTooltip } from '../../components/common/PortalTooltip';
import { formatNumber, formatCurrency } from '../../utils/numberFormat';
import type { Ticker } from '../../types';

interface CCInputs {
  ticker: string;
  stockPrice: number;
  shares: number;
  strikePrice: number;
  premium: number;
  expirationDate: string;
  costBasis: number; // What you paid for the stock
}

interface CCResults {
  // Basic calculations
  totalPremium: number;
  premiumPerShare: number;
  contracts: number;
  daysToExpiration: number;

  // Price movement
  distanceToStrike: number;
  distanceToStrikePercent: number;
  breakEvenDown: number;
  breakEvenDownPercent: number;

  // Returns if called away
  stockGainIfCalled: number;
  totalProfitIfCalled: number;
  returnIfCalled: number;
  annualizedReturnIfCalled: number;

  // Returns if not called
  premiumReturn: number;
  annualizedPremiumReturn: number;

  // Cost basis adjusted
  newCostBasis: number;
  costBasisReduction: number;
}

// Tooltip explanations for each calculation
const TOOLTIPS = {
  totalPremium: 'Totale premium = Premium per contract × Aantal contracten × 100\n\nDit is het bedrag dat je direct ontvangt bij het verkopen van de covered calls.',
  premiumReturn: 'Premium Return = (Totale Premium / Totaal Geïnvesteerd) × 100%\n\nDit is het rendement dat je behaalt puur door de premium, ongeacht wat er met de koers gebeurt.',
  annualizedPremiumReturn: 'Annualized Return = Premium Return × (365 / Dagen tot Expiratie)\n\nDit toont wat je zou verdienen als je dit rendement het hele jaar zou herhalen. Let op: dit is theoretisch.',
  distanceToStrike: 'Verschil Strike - Huidige Koers\n\nDit is hoeveel het aandeel moet stijgen voordat je aandelen worden weggeroepen (assigned).',
  breakEvenDown: 'Break-even = Huidige Koers - Premium per Aandeel\n\nTot dit punt ben je beschermd door de ontvangen premium. Onder dit punt begin je verlies te maken.',
  returnIfCalled: 'Return If Called = (Totale Winst / Kostprijs) × 100%\n\nTotale winst = Premium + (Strike - Kostprijs) × Aandelen\n\nDit is je totale rendement als de optie wordt uitgeoefend en je aandelen verkoopt.',
  newCostBasis: 'Nieuwe Kostprijs = Originele Kostprijs - Premium per Aandeel\n\nDoor de ontvangen premium daalt effectief je aankoopprijs.',
  contracts: 'Aantal Contracten = Aantal Aandelen / 100\n\nElk optiecontract vertegenwoordigt 100 aandelen.',
};

const MULTIPLIER = 100;

export const CoveredCallSimulator: React.FC = () => {
  const dispatch = useAppDispatch();
  const { setPageTitle } = usePageTitle();

  const [inputs, setInputs] = useState<CCInputs>({
    ticker: '',
    stockPrice: 0,
    shares: 100,
    strikePrice: 0,
    premium: 0,
    expirationDate: '',
    costBasis: 0,
  });

  const [results, setResults] = useState<CCResults | null>(null);

  // New ticker creation state
  const [isCreatingTicker, setIsCreatingTicker] = useState(false);
  const [newTickerData, setNewTickerData] = useState({
    symbol: '',
    name: '',
    type: 'stock' as 'stock' | 'etf',
    optionsAvailable: true,
    miniContractsAvailable: false,
  });

  useEffect(() => {
    setPageTitle('Covered Call Simulator', 'Bereken je potentiële rendement op covered calls');
  }, [setPageTitle]);

  useEffect(() => {
    calculateResults();
  }, [inputs]);

  const handleInputChange = (field: keyof CCInputs, value: string | number) => {
    setInputs(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleCreateTicker = () => {
    if (!newTickerData.symbol || !newTickerData.name) return;

    const ticker: Ticker = {
      ...newTickerData,
      symbol: newTickerData.symbol.toUpperCase(),
      lastUsed: new Date().toISOString(),
      currentPrice: inputs.stockPrice || 0,
    };

    dispatch(addTicker(ticker));
    handleInputChange('ticker', ticker.symbol);
    setIsCreatingTicker(false);
    setNewTickerData({
      symbol: '',
      name: '',
      type: 'stock',
      optionsAvailable: true,
      miniContractsAvailable: false,
    });
  };

  const handleOpenCreateTicker = (symbol: string) => {
    setNewTickerData(prev => ({
      ...prev,
      symbol: symbol.toUpperCase(),
    }));
    setIsCreatingTicker(true);
  };

  const calculateResults = () => {
    const { stockPrice, shares, strikePrice, premium, expirationDate, costBasis } = inputs;

    if (!stockPrice || !shares || !strikePrice || !premium || !expirationDate) {
      setResults(null);
      return;
    }

    const effectiveCostBasis = costBasis || stockPrice;
    const contracts = Math.floor(shares / MULTIPLIER);

    if (contracts < 1) {
      setResults(null);
      return;
    }

    // Calculate days to expiration
    const today = new Date();
    const expDate = new Date(expirationDate);
    const daysToExpiration = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysToExpiration <= 0) {
      setResults(null);
      return;
    }

    // Basic calculations
    const totalPremium = premium * contracts * MULTIPLIER;
    const premiumPerShare = premium;
    const totalInvested = effectiveCostBasis * shares;

    // Distance to strike
    const distanceToStrike = strikePrice - stockPrice;
    const distanceToStrikePercent = (distanceToStrike / stockPrice) * 100;

    // Break-even calculations
    const breakEvenDown = stockPrice - premiumPerShare;
    const breakEvenDownPercent = (premiumPerShare / stockPrice) * 100;

    // Returns if called away
    const stockGainIfCalled = (strikePrice - effectiveCostBasis) * shares;
    const totalProfitIfCalled = stockGainIfCalled + totalPremium;
    const returnIfCalled = (totalProfitIfCalled / totalInvested) * 100;
    const annualizedReturnIfCalled = returnIfCalled * (365 / daysToExpiration);

    // Returns if not called (premium only)
    const premiumReturn = (totalPremium / totalInvested) * 100;
    const annualizedPremiumReturn = premiumReturn * (365 / daysToExpiration);

    // Cost basis adjustment
    const newCostBasis = effectiveCostBasis - premiumPerShare;
    const costBasisReduction = premiumPerShare;

    setResults({
      totalPremium,
      premiumPerShare,
      contracts,
      daysToExpiration,
      distanceToStrike,
      distanceToStrikePercent,
      breakEvenDown,
      breakEvenDownPercent,
      stockGainIfCalled,
      totalProfitIfCalled,
      returnIfCalled,
      annualizedReturnIfCalled,
      premiumReturn,
      annualizedPremiumReturn,
      newCostBasis,
      costBasisReduction,
    });
  };

  // Helper component for result rows with tooltips
  const ResultRow: React.FC<{
    label: string;
    value: string | React.ReactNode;
    tooltip?: string;
    highlight?: 'green' | 'red' | 'blue' | 'none';
  }> = ({ label, value, tooltip, highlight = 'none' }) => {
    const highlightClasses = {
      green: 'text-positive-600 dark:text-positive-500',
      red: 'text-negative-600 dark:text-negative-500',
      blue: 'text-primary-700 dark:text-primary-300',
      none: 'text-gray-900 dark:text-white',
    };

    return (
      <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
          {label}
          {tooltip && (
            <PortalTooltip
              content={
                <pre className="whitespace-pre-wrap text-xs max-w-xs">{tooltip}</pre>
              }
            >
              <Info className="w-3.5 h-3.5 text-gray-400 hover:text-primary-500 cursor-help" />
            </PortalTooltip>
          )}
        </span>
        <span className={`font-semibold ${highlightClasses[highlight]}`}>
          {value}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Explanatory note — title is provided by the global header */}
      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4">
        <p className="text-sm text-primary-700 dark:text-primary-200">
          <strong>Wat is een Covered Call?</strong> Je verkoopt een call optie op aandelen die je bezit.
          Je ontvangt premium als inkomen, maar als de koers boven de strike komt, worden je aandelen mogelijk weggeroepen.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Input Parameters
          </h2>

          <div className="space-y-4">
            {/* Ticker Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Aandeel
              </label>
              {isCreatingTicker ? (
                <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <input
                    type="text"
                    value={newTickerData.symbol}
                    onChange={(e) => setNewTickerData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    placeholder="Ticker symbol (bijv. AAPL)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <input
                    type="text"
                    value={newTickerData.name}
                    onChange={(e) => setNewTickerData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Bedrijfsnaam"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateTicker}
                      className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                    >
                      Toevoegen
                    </button>
                    <button
                      onClick={() => setIsCreatingTicker(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              ) : (
                <TickerSelector
                  value={inputs.ticker}
                  onChange={(value) => handleInputChange('ticker', value)}
                  onCreateNew={handleOpenCreateTicker}
                />
              )}
            </div>

            {/* Stock Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Huidige Aandelenprijs ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={inputs.stockPrice || ''}
                onChange={(e) => handleInputChange('stockPrice', parseFloat(e.target.value) || 0)}
                placeholder="175.00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Number of Shares */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Aantal Aandelen
              </label>
              <input
                type="number"
                step="100"
                value={inputs.shares || ''}
                onChange={(e) => handleInputChange('shares', parseInt(e.target.value) || 0)}
                placeholder="100"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                {inputs.shares ? `${Math.floor(inputs.shares / 100)} contract(en)` : 'Minimaal 100 aandelen voor 1 contract'}
              </p>
            </div>

            {/* Cost Basis */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kostprijs per Aandeel ($)
                <PortalTooltip content="De prijs die je betaald hebt voor de aandelen. Leeg = huidige prijs.">
                  <Info className="w-3.5 h-3.5 inline ml-1 text-gray-400" />
                </PortalTooltip>
              </label>
              <input
                type="number"
                step="0.01"
                value={inputs.costBasis || ''}
                onChange={(e) => handleInputChange('costBasis', parseFloat(e.target.value) || 0)}
                placeholder={inputs.stockPrice ? inputs.stockPrice.toString() : 'Optioneel'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <hr className="border-gray-200 dark:border-gray-700" />

            {/* Strike Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Strike Prijs ($)
              </label>
              <input
                type="number"
                step="1"
                value={inputs.strikePrice || ''}
                onChange={(e) => handleInputChange('strikePrice', parseFloat(e.target.value) || 0)}
                placeholder="180.00"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              {inputs.stockPrice > 0 && inputs.strikePrice > 0 && (
                <p className={`text-xs mt-1 ${inputs.strikePrice >= inputs.stockPrice ? 'text-positive-600' : 'text-caution-600'}`}>
                  {inputs.strikePrice >= inputs.stockPrice
                    ? `${((inputs.strikePrice - inputs.stockPrice) / inputs.stockPrice * 100).toFixed(1)}% boven huidige prijs (OTM)`
                    : `${((inputs.stockPrice - inputs.strikePrice) / inputs.stockPrice * 100).toFixed(1)}% onder huidige prijs (ITM)`
                  }
                </p>
              )}
            </div>

            {/* Premium */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Premium per Contract ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={inputs.premium || ''}
                onChange={(e) => handleInputChange('premium', parseFloat(e.target.value) || 0)}
                placeholder="2.50"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Expiration Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Expiratie Datum
              </label>
              <FridayDatePicker
                value={inputs.expirationDate}
                onChange={(date) => handleInputChange('expirationDate', date)}
              />
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-4">
          {results ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-positive-50 dark:bg-positive-700/15 rounded-xl p-4 border border-positive-500/20 dark:border-positive-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-positive-600 dark:text-positive-500" />
                    <span className="text-sm text-positive-700 dark:text-positive-500">Premium Inkomen</span>
                  </div>
                  <p className="text-2xl font-bold text-positive-700 dark:text-positive-500">
                    ${formatNumber(results.totalPremium)}
                  </p>
                  <p className="text-xs text-positive-600 dark:text-positive-500 mt-1">
                    {results.contracts} contract(en)
                  </p>
                </div>

                <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-4 border border-primary-200 dark:border-primary-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Percent className="w-5 h-5 text-primary-700 dark:text-primary-300" />
                    <span className="text-sm text-primary-700 dark:text-primary-300">Rendement</span>
                  </div>
                  <p className="text-2xl font-bold text-primary-700 dark:text-primary-300">
                    {results.premiumReturn.toFixed(2)}%
                  </p>
                  <p className="text-xs text-primary-700 dark:text-primary-300 mt-1">
                    {results.annualizedPremiumReturn.toFixed(1)}% annualized
                  </p>
                </div>
              </div>

              {/* Premium Details */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary-500" />
                  Premium Details
                </h3>
                <ResultRow
                  label="Totale Premium"
                  value={`$${formatNumber(results.totalPremium)}`}
                  tooltip={TOOLTIPS.totalPremium}
                  highlight="green"
                />
                <ResultRow
                  label="Premium per Aandeel"
                  value={`$${results.premiumPerShare.toFixed(2)}`}
                />
                <ResultRow
                  label="Aantal Contracten"
                  value={results.contracts.toString()}
                  tooltip={TOOLTIPS.contracts}
                />
                <ResultRow
                  label="Dagen tot Expiratie"
                  value={`${results.daysToExpiration} dagen`}
                />
              </div>

              {/* Strike Analysis */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary-500" />
                  Strike Analyse
                </h3>
                <ResultRow
                  label="Koers moet stijgen"
                  value={`$${results.distanceToStrike.toFixed(2)} (${results.distanceToStrikePercent.toFixed(1)}%)`}
                  tooltip={TOOLTIPS.distanceToStrike}
                  highlight={results.distanceToStrike >= 0 ? 'blue' : 'red'}
                />
                <ResultRow
                  label="Break-even (neerwaarts)"
                  value={`$${results.breakEvenDown.toFixed(2)}`}
                  tooltip={TOOLTIPS.breakEvenDown}
                />
                <ResultRow
                  label="Bescherming door premium"
                  value={`${results.breakEvenDownPercent.toFixed(2)}%`}
                  highlight="green"
                />
              </div>

              {/* If Called Away */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                  Als Aandelen Worden Weggeroepen
                </h3>
                <ResultRow
                  label="Koerswinst op Aandelen"
                  value={`$${formatNumber(results.stockGainIfCalled)}`}
                  highlight={results.stockGainIfCalled >= 0 ? 'green' : 'red'}
                />
                <ResultRow
                  label="Totale Winst (+ Premium)"
                  value={`$${formatNumber(results.totalProfitIfCalled)}`}
                  highlight={results.totalProfitIfCalled >= 0 ? 'green' : 'red'}
                />
                <ResultRow
                  label="Return If Called"
                  value={`${results.returnIfCalled.toFixed(2)}%`}
                  tooltip={TOOLTIPS.returnIfCalled}
                  highlight={results.returnIfCalled >= 0 ? 'green' : 'red'}
                />
                <ResultRow
                  label="Annualized Return"
                  value={`${results.annualizedReturnIfCalled.toFixed(1)}%`}
                  highlight="blue"
                />
              </div>

              {/* Cost Basis Impact */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-primary-500" />
                  Kostprijs Impact
                </h3>
                <ResultRow
                  label="Nieuwe Effectieve Kostprijs"
                  value={`$${results.newCostBasis.toFixed(2)}`}
                  tooltip={TOOLTIPS.newCostBasis}
                />
                <ResultRow
                  label="Kostprijs Verlaging"
                  value={`-$${results.costBasisReduction.toFixed(2)} per aandeel`}
                  highlight="green"
                />
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
              <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Vul alle velden in om de resultaten te berekenen
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoveredCallSimulator;
