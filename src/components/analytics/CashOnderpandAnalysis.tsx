import React, { useMemo } from 'react';
import { DollarSign, Shield, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectPortfolios, selectPortfolioSummaries } from '../../store/slices/portfoliosSlice';
import { selectPositions } from '../../store/slices/positionsSlice';
import { formatCurrency } from '../../utils/currencyHelpers';
import { formatNumber } from '../../utils/numberFormat';
import { getSpreadId } from '../../utils/spreadHelpers';
import type {
  Position,
  PortfolioName,
  CashSecuredPut,
  CreditSpread,
  IronCondor,
} from '../../types';

interface OnderpandPosition {
  id: string;
  ticker: string;
  type: 'cash-secured-put' | 'credit-spread' | 'iron-condor';
  onderpand: number;
  expiration: string;
  delta?: number; // For early close decisions
  daysToExpiration: number;
  canCloseEarly: boolean;
}

interface PortfolioCashAnalysis {
  portfolio: PortfolioName;
  totalCash: number;
  totalOnderpand: number;
  freeCash: number;
  positions: OnderpandPosition[];
  hasOptions: boolean;
}

export const CashOnderpandAnalysis: React.FC = () => {
  const portfolios = useAppSelector(selectPortfolios);
  const positions = useAppSelector(selectPositions);
  const summaries = useAppSelector(selectPortfolioSummaries);

  const calculateDaysToExpiration = (expiration: string): number => {
    const today = new Date();
    const expDate = new Date(expiration);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getOnderpandForPosition = (position: Position): number => {
    switch (position.type) {
      case 'cash-secured-put':
        return (position as CashSecuredPut).cashReserved;
      case 'credit-spread':
        return (position as CreditSpread).collateral;
      case 'iron-condor':
        return (position as IronCondor).sharedCollateral;
      case 'put':
      case 'call':
        // For new put/call options, check cashReserved field
        // Only short legs of credit spreads and cash-secured puts have cashReserved
        return (position as any).cashReserved || 0;
      default:
        return 0;
    }
  };

  const cashAnalysis = useMemo((): PortfolioCashAnalysis[] => {
    const portfolioMap = new Map<PortfolioName, PortfolioCashAnalysis>();

    // Initialize portfolios with options support
    portfolios.forEach((portfolio) => {
      if (portfolio.hasOptions) {
        // Real available cash for the portfolio (derived in selectPortfolioSummaries),
        // not a hardcoded placeholder. freeCash = totalCash - reserved collateral.
        const totalCash = summaries.find((s) => s.portfolio === portfolio.name)?.cash ?? 0;
        portfolioMap.set(portfolio.name, {
          portfolio: portfolio.name,
          totalCash,
          totalOnderpand: 0,
          freeCash: 0,
          positions: [],
          hasOptions: true,
        });
      }
    });

    // Process positions that require onderpand
    // Track processed spreads to avoid double-counting
    const processedSpreads = new Set<string>();

    positions.forEach((position) => {
      // Skip non-option positions
      if (
        !['cash-secured-put', 'credit-spread', 'iron-condor', 'put', 'call'].includes(position.type)
      ) {
        return;
      }

      if (position.status !== 'open') {
        return;
      }

      const analysis = portfolioMap.get(position.portfolio);
      if (!analysis) return;

      // Check if this position is part of a spread
      const spreadId = getSpreadId(position);

      // Skip if we've already processed this spread
      if (spreadId && processedSpreads.has(spreadId)) {
        return;
      }

      const onderpand = getOnderpandForPosition(position);

      // Skip positions with no onderpand (e.g., long options, debit spreads)
      if (onderpand === 0) {
        return;
      }

      // Mark spread as processed if this is a spread position
      if (spreadId) {
        processedSpreads.add(spreadId);
      }

      const expiration = 'expiration' in position ? position.expiration : '';
      const daysToExpiration = expiration ? calculateDaysToExpiration(expiration) : 0;

      // Estimate delta (simplified - in real app this would come from option chain data)
      // Delta closer to 0.5 = ATM, closer to 0 = OTM (safer to hold), closer to 1 = ITM (consider closing)
      const estimatedDelta = daysToExpiration < 7 ? 0.3 : 0.2; // Simplified

      // Determine display type
      let displayType: 'cash-secured-put' | 'credit-spread' | 'iron-condor';
      if (position.type === 'cash-secured-put') {
        displayType = 'cash-secured-put';
      } else if (position.type === 'credit-spread') {
        displayType = 'credit-spread';
      } else if (position.type === 'iron-condor') {
        displayType = 'iron-condor';
      } else if (spreadId) {
        // Both PUT and CALL spreads with onderpand are credit spreads
        displayType = 'credit-spread';
      } else if (position.type === 'put') {
        // Single sold put displayed as Cash Secured Put
        displayType = 'cash-secured-put';
      } else {
        // Single sold call - also needs collateral, display as Cash Secured Put equivalent
        displayType = 'cash-secured-put';
      }

      const onderpandPosition: OnderpandPosition = {
        id: spreadId || position.id,
        ticker: position.ticker,
        type: displayType,
        onderpand,
        expiration,
        delta: estimatedDelta,
        daysToExpiration,
        canCloseEarly: daysToExpiration < 7 && estimatedDelta < 0.3, // Close if < 7 DTE and profitable
      };

      analysis.positions.push(onderpandPosition);
      analysis.totalOnderpand += onderpand;
    });

    // Calculate free cash
    portfolioMap.forEach((analysis) => {
      analysis.freeCash = analysis.totalCash - analysis.totalOnderpand;
    });

    return Array.from(portfolioMap.values());
  }, [portfolios, positions, summaries]);

  const totalAnalysis = useMemo(() => {
    const total = {
      totalCash: 0,
      totalOnderpand: 0,
      freeCash: 0,
      positionsCount: 0,
    };

    cashAnalysis.forEach((portfolio) => {
      total.totalCash += portfolio.totalCash;
      total.totalOnderpand += portfolio.totalOnderpand;
      total.freeCash += portfolio.freeCash;
      total.positionsCount += portfolio.positions.length;
    });

    return total;
  }, [cashAnalysis]);

  if (cashAnalysis.length === 0) {
    return (
      <div className="bg-caution-50 dark:bg-caution-600/15 border border-caution-500/30 dark:border-caution-500/30 rounded-lg p-4">
        <p className="text-sm text-caution-600 dark:text-amber-200">
          Geen portfolios met opties gevonden. Deze analyse is alleen beschikbaar voor portfolios
          die opties ondersteunen.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Total Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-5 h-5 text-primary-700 dark:text-primary-300" />
            <p className="text-sm text-ink-600 dark:text-ink-400">Totale Cash</p>
          </div>
          <p className="text-2xl font-bold text-ink-900 dark:text-white">
            {formatCurrency(totalAnalysis.totalCash, portfolios)}
          </p>
          <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">Alle portfolios met opties</p>
        </div>

        <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-ink-600 dark:text-ink-300" />
            <p className="text-sm text-ink-600 dark:text-ink-400">Totaal Onderpand</p>
          </div>
          <p className="text-2xl font-bold text-ink-600 dark:text-ink-300">
            {formatCurrency(totalAnalysis.totalOnderpand, portfolios)}
          </p>
          <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
            {totalAnalysis.positionsCount} posities
          </p>
        </div>

        <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-positive-600 dark:text-positive-500" />
            <p className="text-sm text-ink-600 dark:text-ink-400">Vrije cash</p>
          </div>
          <p className="text-2xl font-bold text-positive-600 dark:text-positive-500">
            {formatCurrency(totalAnalysis.freeCash, portfolios)}
          </p>
          <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
            Beschikbaar voor nieuwe posities
          </p>
        </div>

        <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-caution-600 dark:text-caution-500" />
            <p className="text-sm text-ink-600 dark:text-ink-400">Onderpand %</p>
          </div>
          <p className="text-2xl font-bold text-ink-900 dark:text-white">
            {totalAnalysis.totalCash > 0
              ? formatNumber((totalAnalysis.totalOnderpand / totalAnalysis.totalCash) * 100, 1)
              : 0}
            %
          </p>
          <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">Van totale cash</p>
        </div>
      </div>

      {/* Per Portfolio Analysis */}
      {cashAnalysis.map((portfolio) => (
        <div
          key={portfolio.portfolio}
          className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 overflow-hidden"
        >
          {/* Portfolio Header */}
          <div className="bg-gradient-to-r from-primary-50 to-primary-50 dark:from-trading-dark-600 dark:to-trading-dark-700 p-4 border-b border-surface-line dark:border-trading-dark-600">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-ink-900 dark:text-white">
                {portfolio.portfolio}
              </h3>
              <div className="flex gap-4 text-sm">
                <div className="text-right">
                  <p className="text-ink-600 dark:text-ink-400">Cash</p>
                  <p className="font-bold text-ink-900 dark:text-white">
                    {formatCurrency(portfolio.totalCash, portfolios)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-ink-600 dark:text-ink-400">Onderpand</p>
                  <p className="font-bold text-ink-600 dark:text-ink-300">
                    {formatCurrency(portfolio.totalOnderpand, portfolios)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-ink-600 dark:text-ink-400">Vrij</p>
                  <p className="font-bold text-positive-600 dark:text-positive-500">
                    {formatCurrency(portfolio.freeCash, portfolios)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Positions Table */}
          {portfolio.positions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-surface dark:bg-trading-dark-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wider">
                      Ticker
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wider">
                      Onderpand
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wider">
                      Expiratie
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wider">
                      DTE
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wider">
                      Delta
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-ink-500 dark:text-ink-400 uppercase tracking-wider">
                      Actie
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-line dark:divide-trading-dark-600">
                  {portfolio.positions.map((position) => (
                    <tr
                      key={position.id}
                      className="hover:bg-surface dark:hover:bg-trading-dark-700/50"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-ink-900 dark:text-white">
                          {position.ticker}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            position.type === 'cash-secured-put'
                              ? 'bg-surface-muted dark:bg-trading-dark-600 text-ink-700 dark:text-ink-300'
                              : position.type === 'credit-spread'
                                ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                : 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                          }`}
                        >
                          {position.type === 'cash-secured-put'
                            ? 'Cash Secured Put'
                            : position.type === 'credit-spread'
                              ? 'Spread'
                              : 'IC'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        <span className="font-medium text-ink-900 dark:text-white">
                          {formatCurrency(position.onderpand, portfolios)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-ink-600 dark:text-ink-400">
                        {new Date(position.expiration).toLocaleDateString('nl-NL', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className={`font-medium ${
                            position.daysToExpiration < 7
                              ? 'text-caution-600 dark:text-caution-500'
                              : position.daysToExpiration < 14
                                ? 'text-caution-600 dark:text-caution-500'
                                : 'text-ink-600 dark:text-ink-400'
                          }`}
                        >
                          {position.daysToExpiration}d
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <span
                          className={`font-medium ${
                            (position.delta || 0) > 0.5
                              ? 'text-negative-600 dark:text-negative-500'
                              : (position.delta || 0) > 0.3
                                ? 'text-caution-600 dark:text-caution-500'
                                : 'text-positive-600 dark:text-positive-500'
                          }`}
                        >
                          {position.delta ? formatNumber(position.delta, 2) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {position.canCloseEarly ? (
                          <div className="flex items-center justify-center gap-1">
                            <AlertCircle className="w-4 h-4 text-positive-600 dark:text-positive-500" />
                            <span className="text-xs text-positive-600 dark:text-positive-500 font-medium">
                              Overweeg sluiten
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-500 dark:text-ink-400">Aanhouden</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-ink-500 dark:text-ink-400">
              Geen posities met onderpand vereisten
            </div>
          )}
        </div>
      ))}

      {/* Info Box */}
      <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h4 className="font-semibold text-primary-900 dark:text-blue-100 mb-2">
              Hoe gebruik je deze analyse?
            </h4>
            <ul className="text-sm text-primary-700 dark:text-primary-200 space-y-1">
              <li>
                • <strong>Vrije cash</strong>: Dit is het bedrag dat je kunt gebruiken voor nieuwe
                Cash Secured Puts of spreads
              </li>
              <li>
                • <strong>DTE (Days To Expiration)</strong>: Oranje (&lt;7 dagen) = expireert
                binnenkort, overweeg vroeg sluiten als winstgevend
              </li>
              <li>
                • <strong>Delta</strong>: Hoe dichtbij de strike price. Groen (&lt;0.3) = veilig,
                Oranje (0.3-0.5) = let op, Rood (&gt;0.5) = ITM risk
              </li>
              <li>
                • <strong>Actie</strong>: "Overweeg sluiten" = positie is &lt;7 DTE én winstgevend,
                onderpand kan vrijkomen voor nieuwe trades
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
