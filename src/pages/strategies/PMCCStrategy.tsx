import React, { useMemo, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calculator,
  Shield,
  X,
} from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import type { LEAP, CoveredCall, StockPosition, PortfolioName } from '../../types';
import { getDaysToExpiration } from '../../utils/dateHelpers';
import { PROFIT_THRESHOLDS } from '../../constants/trading';
import { selectPositionsByPortfolio } from '../../store/slices/positionsSlice';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import { formatNumber } from '../../utils/numberFormat';
// import { AddLeapModal } from '../../components/modals/AddLeapModal';
// import { AddCoveredCallModal } from '../../components/modals/AddCoveredCallModal';

export const PMCCStrategy: React.FC = () => {
  const { portfolio } = useParams<{ portfolio: string }>();
  const navigate = useNavigate();
  const { setPageTitle } = usePageTitle();
  const { pushNavigation } = useNavigation();
  const positions = useAppSelector(selectPositionsByPortfolio(portfolio as PortfolioName));
  const tickers = useAppSelector(selectAllTickers);
  const priceBySymbol = useMemo(() => {
    const map = new Map<string, number>();
    tickers.forEach((t) => map.set(t.symbol.toUpperCase(), t.currentPrice ?? 0));
    return map;
  }, [tickers]);
  const [, setIsAddLeapModalOpen] = useState(false);
  const [, setIsAddCoveredCallModalOpen] = useState(false);
  const [, setSelectedLeapId] = useState<string | undefined>(undefined);
  const [showInfoCard, setShowInfoCard] = useState(() => {
    const saved = localStorage.getItem('pmcc-show-info');
    return saved !== 'false'; // Default to true if not set
  });

  useEffect(() => {
    if (portfolio) {
      setPageTitle(
        `Poor Man's Covered Call - ${portfolio.toUpperCase()}`,
        'Manage your LEAPs, stocks, and covered calls'
      );
    }
  }, [portfolio, setPageTitle]);

  // Filter positions for this portfolio and strategy (positions already filtered by portfolio via selector)
  const { leaps, coveredCalls, stocks } = useMemo(() => {
    const activePositions = positions.filter((p) => p.status === 'open');

    return {
      leaps: activePositions.filter((p) => p.type === 'leap') as LEAP[],
      coveredCalls: activePositions.filter((p) => p.type === 'covered-call') as CoveredCall[],
      stocks: activePositions.filter((p) => p.type === 'stock') as StockPosition[],
    };
  }, [positions]);

  // Calculate coverage status
  const coverageAnalysis = useMemo(() => {
    const analysis: Array<{
      underlying: LEAP | StockPosition;
      coveredCalls: CoveredCall[];
      uncovered: number;
    }> = [];

    // Check LEAPs coverage
    leaps.forEach((leap) => {
      const calls = coveredCalls.filter((cc) => cc.underlyingId === leap.id);
      const totalCovered = calls.reduce((sum, cc) => sum + cc.contracts, 0);
      const uncovered = leap.contracts - totalCovered;
      analysis.push({ underlying: leap, coveredCalls: calls, uncovered });
    });

    // Check Stock coverage
    stocks.forEach((stock) => {
      const calls = coveredCalls.filter((cc) => cc.underlyingId === stock.id);
      const totalCovered = calls.reduce((sum, cc) => sum + cc.contracts * 100, 0);
      const uncovered = stock.shares - totalCovered;
      analysis.push({ underlying: stock, coveredCalls: calls, uncovered });
    });

    return analysis;
  }, [leaps, stocks, coveredCalls]);

  const getExpirationWarning = (expiration: string): 'critical' | 'warning' | 'safe' => {
    const daysToExpiration = getDaysToExpiration(expiration);
    if (daysToExpiration <= 7) return 'critical';
    if (daysToExpiration <= 14) return 'warning';
    return 'safe';
  };

  const getLeapExpirationWarning = (expiration: string): 'critical' | 'warning' | 'safe' => {
    const daysToExpiration = getDaysToExpiration(expiration);
    if (daysToExpiration <= 30) return 'critical';
    if (daysToExpiration <= 90) return 'warning';
    return 'safe';
  };

  const getProfitStatus = (
    premiumCollected: number,
    currentValue: number
  ): 'take-profit' | 'normal' => {
    const profitCaptured = ((premiumCollected - currentValue) / premiumCollected) * 100;
    return profitCaptured >= PROFIT_THRESHOLDS.TAKE_PROFIT ? 'take-profit' : 'normal';
  };

  return (
    <div className="p-8 space-y-6">
      {/* Toolbar — title is provided by the global header */}
      <div className="flex items-center justify-end">
        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => {
              pushNavigation('/tools/pmcc-calculator', "Poor Man's Covered Call Calculator");
              navigate('/tools/pmcc-calculator');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-trading-dark-600 hover:bg-trading-dark-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <Calculator className="w-5 h-5" />
            Calculator
          </button>
          <button
            onClick={() => setIsAddLeapModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 btn-primary text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add LEAP
          </button>
        </div>
      </div>

      {/* Strategy Info Card */}
      {showInfoCard && (
        <div className="bg-primary-50 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6 relative">
          <button
            onClick={() => {
              setShowInfoCard(false);
              localStorage.setItem('pmcc-show-info', 'false');
            }}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-surface-muted dark:hover:bg-trading-dark-600 transition-colors"
            title="Dismiss"
          >
            <X className="w-5 h-5 text-ink-500 dark:text-ink-400" />
          </button>
          <div className="flex items-start gap-4">
            <Shield className="w-12 h-12 icon-text-primary flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
                How Poor Man's Covered Call Works
              </h3>
              <ul className="space-y-2 text-sm text-ink-700 dark:text-ink-300">
                <li className="flex items-start gap-2">
                  <span className="icon-text-primary mt-0.5">•</span>
                  <span>
                    Buy a deep ITM LEAP (Long-term Equity Anticipation Security) as a stock
                    replacement
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="icon-text-primary mt-0.5">•</span>
                  <span>Sell covered calls against the LEAP to generate income</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="icon-text-primary mt-0.5">•</span>
                  <span>Requires much less capital than owning 100 shares outright</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="icon-text-primary mt-0.5">•</span>
                  <span>Goal: Collect premium to offset LEAP cost and generate profit</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Coverage Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-trading-dark-800 border border-surface-line dark:border-trading-dark-600 rounded-lg p-6">
          <h3 className="text-ink-600 dark:text-ink-400 text-sm mb-2">Total LEAPs</h3>
          <p className="text-3xl font-bold text-ink-900 dark:text-white">{leaps.length}</p>
        </div>
        <div className="bg-white dark:bg-trading-dark-800 border border-surface-line dark:border-trading-dark-600 rounded-lg p-6">
          <h3 className="text-ink-600 dark:text-ink-400 text-sm mb-2">Active Covered Calls</h3>
          <p className="text-3xl font-bold text-ink-900 dark:text-white">{coveredCalls.length}</p>
        </div>
        <div className="bg-caution-50 dark:bg-trading-dark-800 border border-caution-500/30 dark:border-caution-500/50 rounded-lg p-6">
          <h3 className="text-ink-600 dark:text-ink-400 text-sm mb-2">Uncovered Contracts</h3>
          <p className="text-3xl font-bold text-caution-600 dark:text-caution-500">
            {coverageAnalysis.reduce((sum, item) => sum + item.uncovered, 0)}
          </p>
        </div>
      </div>

      {/* Coverage Analysis */}
      <div className="space-y-6">
        {coverageAnalysis.map((item) => {
          const isLeap = item.underlying.type === 'leap';
          const leap = item.underlying as LEAP;
          const stock = item.underlying as StockPosition;
          const expirationWarning = isLeap ? getLeapExpirationWarning(leap.expiration) : 'safe';

          return (
            <div
              key={item.underlying.id}
              className="bg-white dark:bg-trading-dark-800 border border-surface-line dark:border-trading-dark-600 rounded-lg overflow-hidden"
            >
              {/* Underlying Position Header */}
              <div
                className={`p-6 border-b border-surface-line dark:border-trading-dark-600 ${
                  expirationWarning === 'critical'
                    ? 'bg-negative-50 dark:bg-negative-700/15'
                    : expirationWarning === 'warning'
                      ? 'bg-caution-50 dark:bg-caution-600/15'
                      : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-ink-900 dark:text-white">
                        {item.underlying.ticker}
                      </h3>
                      <span className="px-2 py-1 bg-surface-subtle dark:bg-trading-dark-700 rounded text-xs text-ink-600 dark:text-ink-400">
                        {isLeap ? 'LEAP' : 'STOCK'}
                      </span>
                      {expirationWarning !== 'safe' && (
                        <span
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                            expirationWarning === 'critical'
                              ? 'bg-negative-50 dark:bg-negative-700/20 text-negative-700 dark:text-negative-500'
                              : 'bg-caution-50 dark:bg-caution-500/20 text-caution-600 dark:text-caution-500'
                          }`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          {expirationWarning === 'critical' ? 'Expires Soon' : 'Expiring'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-ink-600 dark:text-ink-400">
                      {isLeap ? (
                        <>
                          <span>Strike: ${leap.strike}</span>
                          <span>Expires: {leap.expiration}</span>
                          <span>Contracts: {leap.contracts}</span>
                          <span>Cost: ${leap.costBasis.toLocaleString()}</span>
                        </>
                      ) : (
                        <>
                          <span>Shares: {stock.shares}</span>
                          <span>Cost Basis: ${stock.costBasis.toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-ink-600 dark:text-ink-400 mb-1">Coverage</p>
                    <div className="flex items-center gap-2">
                      {item.uncovered > 0 ? (
                        <AlertTriangle className="w-5 h-5 text-caution-600 dark:text-caution-500" />
                      ) : (
                        <CheckCircle className="w-5 h-5 text-positive-600 dark:text-positive-500" />
                      )}
                      <span
                        className={`text-lg font-semibold ${
                          item.uncovered > 0
                            ? 'text-caution-600 dark:text-caution-500'
                            : 'text-positive-600 dark:text-positive-500'
                        }`}
                      >
                        {item.uncovered === 0 ? 'Fully Covered' : `${item.uncovered} Uncovered`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Covered Calls List */}
              {item.coveredCalls.length > 0 && (
                <div className="p-6">
                  <h4 className="text-sm font-semibold text-ink-600 dark:text-ink-400 uppercase tracking-wider mb-4">
                    Covered Calls
                  </h4>
                  <div className="space-y-3">
                    {item.coveredCalls.map((call) => {
                      const expiryWarning = getExpirationWarning(call.expiration);
                      const profitStatus = getProfitStatus(
                        call.premiumCollected,
                        call.currentValue
                      );
                      // A short call is in-the-money when the underlying trades above its strike.
                      const underlyingPrice =
                        priceBySymbol.get(item.underlying.ticker.toUpperCase()) ?? 0;
                      const isITM = underlyingPrice > 0 && underlyingPrice > call.strike;
                      const daysToExpiry = getDaysToExpiration(call.expiration);

                      let bgClass = 'bg-surface dark:bg-trading-dark-700';
                      if (profitStatus === 'take-profit')
                        bgClass = 'bg-positive-50 dark:bg-positive-700/15';
                      else if (isITM) bgClass = 'bg-negative-50 dark:bg-negative-700/15';
                      else if (expiryWarning === 'critical')
                        bgClass = 'bg-negative-50 dark:bg-negative-700/15';
                      else if (expiryWarning === 'warning')
                        bgClass = 'bg-caution-50 dark:bg-caution-600/15';

                      return (
                        <div
                          key={call.id}
                          className={`${bgClass} border border-surface-line dark:border-trading-dark-600 rounded-lg p-4`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-medium text-ink-900 dark:text-white">
                                  ${call.strike} Strike
                                </span>
                                <span className="text-sm text-ink-600 dark:text-ink-400">
                                  {call.contracts} contracts
                                </span>
                                {profitStatus === 'take-profit' && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-positive-50 dark:bg-positive-700/20 text-positive-700 dark:text-positive-500 rounded text-xs font-medium">
                                    <CheckCircle className="w-3 h-3" />
                                    80%+ Profit
                                  </span>
                                )}
                                {isITM && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 bg-negative-50 dark:bg-negative-700/20 text-negative-700 dark:text-negative-500 rounded text-xs font-medium">
                                    <AlertTriangle className="w-3 h-3" />
                                    ITM
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-ink-600 dark:text-ink-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {call.expiration} ({daysToExpiry}d)
                                </span>
                                <span>Premium: ${call.premiumCollected}</span>
                                <span>Current: ${call.currentValue}</span>
                                <span
                                  className={`font-medium ${
                                    call.premiumCollected - call.currentValue > 0
                                      ? 'text-positive-600 dark:text-positive-500'
                                      : 'text-negative-600 dark:text-negative-500'
                                  }`}
                                >
                                  P/L: ${formatNumber(call.premiumCollected - call.currentValue, 2)}
                                </span>
                              </div>
                            </div>
                            <button className="px-3 py-1.5 bg-surface-muted dark:bg-trading-dark-600 hover:bg-ink-200 dark:hover:bg-trading-dark-500 text-ink-900 dark:text-white rounded text-sm font-medium transition-colors">
                              Manage
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* No Covered Calls */}
              {item.coveredCalls.length === 0 && (
                <div className="p-6 text-center">
                  <p className="text-ink-600 dark:text-ink-400 mb-4">
                    No covered calls on this position
                  </p>
                  <button
                    onClick={() => {
                      setSelectedLeapId(item.underlying.id);
                      setIsAddCoveredCallModalOpen(true);
                    }}
                    className="px-4 py-2 bg-primary-900 hover:bg-blue-950 text-white rounded-lg font-medium transition-colors"
                  >
                    Sell Covered Call
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {coverageAnalysis.length === 0 && (
        <div className="bg-white dark:bg-trading-dark-800 border border-surface-line dark:border-trading-dark-600 rounded-lg p-12 text-center">
          <p className="text-ink-600 dark:text-ink-400 mb-4">
            No positions found for this strategy. Get started by adding a LEAP or stock position.
          </p>
          <button
            onClick={() => setIsAddLeapModalOpen(true)}
            className="px-6 py-3 bg-primary-900 hover:bg-blue-950 text-white rounded-lg font-medium transition-colors"
          >
            Add First Position
          </button>
        </div>
      )}

      {/* Modals */}
      {/* <AddLeapModal isOpen={isAddLeapModalOpen} onClose={() => setIsAddLeapModalOpen(false)} portfolio={portfolio || ''} />
      <AddCoveredCallModal
        isOpen={isAddCoveredCallModalOpen}
        onClose={() => {
          setIsAddCoveredCallModalOpen(false);
          setSelectedLeapId(undefined);
        }}
        portfolio={portfolio || ''}
        preselectedLeapId={selectedLeapId}
      /> */}
    </div>
  );
};
