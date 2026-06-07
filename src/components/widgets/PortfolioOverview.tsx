import React, { useState, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  selectPortfolioSummaries,
  selectEquitySeries,
} from '../../store/slices/portfoliosSlice';
import { useAlerts } from '../../hooks/useAlerts';
import { formatCurrency, formatNumber } from '../../utils/numberFormat';
import { getCurrencySymbol } from '../../utils/currency';
import { AlertTooltipContent } from '../common/AlertTooltipContent';
import {
  TrendingUp,
  TrendingDown,
  RotateCcw,
  AlertCircle,
  Target,
  Settings,
} from 'lucide-react';

type TimePeriod = '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

export const PortfolioOverview: React.FC = memo(() => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { pushNavigation } = useNavigation();
  const summaries = useAppSelector(selectPortfolioSummaries);
  const dailyData = useAppSelector(selectEquitySeries);
  const portfolios = useAppSelector((state) => state.portfolios.portfolios);
  const positions = useAppSelector((state) => state.positions.positions);

  // Use central alerts hook - no portfolio filter to get all
  const { getPortfolioCounts } = useAlerts();
  const portfolioAlertsOpportunities = getPortfolioCounts();

  // Track which cards are flipped
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  // Track selected time period per card
  const [timePeriods, setTimePeriods] = useState<Record<string, TimePeriod>>({});

  const toggleFlip = (portfolioName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFlippedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(portfolioName)) {
        newSet.delete(portfolioName);
      } else {
        newSet.add(portfolioName);
      }
      return newSet;
    });
  };

  const setTimePeriod = (portfolioName: string, period: TimePeriod, e: React.MouseEvent) => {
    e.stopPropagation();
    setTimePeriods((prev) => ({ ...prev, [portfolioName]: period }));
  };

  const handlePortfolioClick = (portfolioName: string) => {
    pushNavigation(`/portfolio/${portfolioName}`, portfolioName);
    navigate(`/portfolio/${portfolioName}`);
  };

  if (summaries.length === 0) {
    return null;
  }

  const handleManagePortfolios = () => {
    pushNavigation('/settings/portfolios', t('widgetsB.portfolioManagement'));
    navigate('/settings/portfolios');
  };

  const handleEditPortfolio = (portfolioId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    pushNavigation('/settings/portfolios', t('widgetsB.portfolioManagement'));
    navigate('/settings/portfolios', {
      state: { editPortfolioId: portfolioId, fromPage: 'dashboard' },
    });
  };

  return (
    <div className="bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600">
      {/* Header */}
      <div className="px-6 py-4 border-b border-surface-line dark:border-trading-dark-600 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-ink-900 dark:text-white">
            {t('widgetsB.portfolios')}
          </h3>
          <p className="text-sm text-ink-600 dark:text-ink-400 mt-1">
            {summaries.length}{' '}
            {summaries.length === 1
              ? t('widgetsB.onePortfolio')
              : t('widgetsB.multiplePortfolios')}
          </p>
        </div>
        <button
          onClick={handleManagePortfolios}
          className="flex items-center gap-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors"
          title={t('widgetsB.managePortfolio')}
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">{t('widgetsB.manage')}</span>
        </button>
      </div>

      {/* Portfolio Cards */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {summaries.map((summary) => {
            const portfolio = portfolios.find((b) => b.name === summary.portfolio);
            if (!portfolio) return null;

            const currencySymbol = getCurrencySymbol(portfolio.currency);
            const isFlipped = flippedCards.has(summary.portfolio);
            const selectedPeriod = timePeriods[summary.portfolio] || 'ALL';

            // Calculate Long and Short values for this portfolio
            const portfolioPositions = positions.filter(
              (p) => p.portfolio === summary.portfolio && p.status === 'open'
            );

            // Stock and ETF value (always long positions)
            const stockEtfValue = portfolioPositions
              .filter((p) => p.type === 'stock' || p.type === 'etf')
              .reduce((sum, pos) => sum + (pos.currentValue ?? 0), 0);

            // Options long value (bought options)
            const optionsLongValue = portfolioPositions
              .filter(
                (p) =>
                  (p.type === 'call' || p.type === 'put') &&
                  'action' in p &&
                  (p as any).action === 'buy'
              )
              .reduce((sum, pos) => sum + Math.abs(pos.currentValue ?? 0), 0);

            const longValue = stockEtfValue + optionsLongValue;

            // Short value (sold options)
            const shortValue = portfolioPositions
              .filter(
                (p) =>
                  (p.type === 'call' || p.type === 'put') &&
                  'action' in p &&
                  (p as any).action === 'sell'
              )
              .reduce((sum, pos) => sum + Math.abs(pos.currentValue ?? 0), 0);

            // Calculate allocated cash (collateral)
            const allocatedCash = portfolioPositions.reduce((sum, pos) => {
              if (pos.type === 'put' && 'cashReserved' in pos && (pos as any).cashReserved) {
                return sum + (pos as any).cashReserved;
              }
              if (pos.type === 'spread' && 'collateral' in pos && (pos as any).collateral) {
                return sum + (pos as any).collateral;
              }
              return sum;
            }, 0);

            const freeCash = summary.cash - allocatedCash;

            // Calculate gains based on selected period
            const portfolioDailyData = dailyData.filter((d) => d.portfolio === summary.portfolio);
            const calculateGain = (period: TimePeriod) => {
              if (portfolioDailyData.length === 0) {
                // No daily data, calculate from initial capital
                return {
                  absolute: summary.totalValue - portfolio.initialCapital,
                  percentage:
                    portfolio.initialCapital > 0
                      ? ((summary.totalValue - portfolio.initialCapital) /
                          portfolio.initialCapital) *
                        100
                      : 0,
                };
              }

              const now = new Date();
              let startDate: Date;

              switch (period) {
                case '1W':
                  startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  break;
                case '1M':
                  startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                  break;
                case '3M':
                  startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
                  break;
                case 'YTD':
                  startDate = new Date(now.getFullYear(), 0, 1);
                  break;
                case '1Y':
                  startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                  break;
                case 'ALL':
                default:
                  // Use initial capital
                  return {
                    absolute: summary.totalValue - portfolio.initialCapital,
                    percentage:
                      portfolio.initialCapital > 0
                        ? ((summary.totalValue - portfolio.initialCapital) /
                            portfolio.initialCapital) *
                          100
                        : 0,
                  };
              }

              // Find the closest data point to start date
              const relevantData = portfolioDailyData
                .filter((d) => new Date(d.date) >= startDate)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

              if (relevantData.length === 0) {
                return { absolute: 0, percentage: 0 };
              }

              const startValue = relevantData[0].totalValue;
              const gain = summary.totalValue - startValue;
              const percentage = startValue > 0 ? (gain / startValue) * 100 : 0;

              return { absolute: gain, percentage };
            };

            const gain = calculateGain(selectedPeriod);
            const alertsOpp = portfolioAlertsOpportunities[summary.portfolio] || {
              alerts: 0,
              opportunities: 0,
              alertItems: [],
              opportunityItems: [],
            };

            return (
              <div
                key={summary.portfolio}
                className="relative h-[180px] perspective-1000"
                style={{ perspective: '1000px' }}
              >
                <div
                  className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
                    isFlipped ? 'rotate-y-180' : ''
                  }`}
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  }}
                >
                  {/* Front of card */}
                  <div
                    className="absolute w-full h-full backface-hidden"
                    style={{ backfaceVisibility: 'hidden' }}
                  >
                    <button
                      onClick={() => handlePortfolioClick(summary.portfolio)}
                      className="w-full h-full bg-surface dark:bg-trading-dark-700/50 rounded-lg border border-surface-line dark:border-trading-dark-500 p-4 hover:shadow-md transition-shadow text-left flex flex-col relative"
                    >
                      {/* Top-right badges and flip button */}
                      <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                        {alertsOpp.alerts > 0 && (
                          <div className="relative group">
                            <div className="flex items-center gap-1 px-2 py-1 bg-caution-50 dark:bg-caution-600/25 rounded-full cursor-help">
                              <AlertCircle className="w-3 h-3 text-caution-600 dark:text-caution-500" />
                              <span className="text-xs font-semibold text-caution-600 dark:text-caution-500">
                                {alertsOpp.alerts}
                              </span>
                            </div>
                            {alertsOpp.alertItems.length > 0 && (
                              <div className="absolute right-0 top-full mt-2 hidden group-hover:block w-64 p-3 bg-white dark:bg-trading-dark-800 text-ink-900 dark:text-white text-xs rounded-lg shadow-lg z-50 border-2 border-surface-line dark:border-trading-dark-500">
                                <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white dark:bg-trading-dark-800 border-l border-t border-surface-line dark:border-trading-dark-500 transform rotate-45"></div>
                                <AlertTooltipContent items={alertsOpp.alertItems} type="alert" />
                              </div>
                            )}
                          </div>
                        )}
                        {alertsOpp.opportunities > 0 && (
                          <div className="relative group">
                            <div className="flex items-center gap-1 px-2 py-1 bg-positive-50 dark:bg-positive-700/25 rounded-full cursor-help">
                              <Target className="w-3 h-3 text-positive-600 dark:text-positive-500" />
                              <span className="text-xs font-semibold text-positive-600 dark:text-positive-500">
                                {alertsOpp.opportunities}
                              </span>
                            </div>
                            {alertsOpp.opportunityItems.length > 0 && (
                              <div className="absolute right-0 top-full mt-2 hidden group-hover:block w-64 p-3 bg-white dark:bg-trading-dark-800 text-ink-900 dark:text-white text-xs rounded-lg shadow-lg z-50 border-2 border-surface-line dark:border-trading-dark-500">
                                <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white dark:bg-trading-dark-800 border-l border-t border-surface-line dark:border-trading-dark-500 transform rotate-45"></div>
                                <AlertTooltipContent
                                  items={alertsOpp.opportunityItems}
                                  type="opportunity"
                                />
                              </div>
                            )}
                          </div>
                        )}
                        <div
                          onClick={(e) => handleEditPortfolio(portfolio.id, e)}
                          className="p-1.5 hover:bg-surface-muted dark:hover:bg-trading-dark-600 rounded-lg transition-colors cursor-pointer"
                          title={t('widgetsB.editPortfolio')}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              handleEditPortfolio(portfolio.id, e as unknown as React.MouseEvent);
                            }
                          }}
                        >
                          <Settings className="w-4 h-4 text-ink-500 dark:text-ink-400" />
                        </div>
                        <div
                          onClick={(e) => toggleFlip(summary.portfolio, e)}
                          className="p-1.5 hover:bg-surface-muted dark:hover:bg-trading-dark-600 rounded-lg transition-colors cursor-pointer"
                          title={t('widgetsB.showGains')}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleFlip(summary.portfolio, e as unknown as React.MouseEvent);
                            }
                          }}
                        >
                          <RotateCcw className="w-4 h-4 text-ink-500 dark:text-ink-400" />
                        </div>
                      </div>

                      {/* Header with logo and name */}
                      <div className="flex items-center gap-3 mb-3 pr-24">
                        {portfolio.logo && (
                          <img
                            src={portfolio.logo}
                            alt={portfolio.name}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-ink-900 dark:text-white truncate">
                            {portfolio.name}
                          </h3>
                          <p className="text-lg font-bold text-ink-900 dark:text-white">
                            {formatCurrency(summary.totalValue, currencySymbol)}
                          </p>
                        </div>
                      </div>

                      {/* Stats - all aligned left */}
                      <div className="space-y-1.5 text-xs flex-1">
                        <div className="flex">
                          <span className="text-ink-500 dark:text-ink-400 w-20">
                            {t('widgetsB.longPositions')}
                          </span>
                          <span className="font-medium text-ink-900 dark:text-white">
                            {formatCurrency(longValue, currencySymbol)}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="text-ink-500 dark:text-ink-400 w-20">
                            {t('widgetsB.shortPositions')}
                          </span>
                          <span className="font-medium text-ink-900 dark:text-white">
                            {formatCurrency(shortValue, currencySymbol)}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="text-ink-500 dark:text-ink-400 w-20">
                            {t('widgetsB.cash')}
                          </span>
                          <span className="font-medium text-ink-900 dark:text-white">
                            {formatCurrency(summary.cash, currencySymbol)}
                          </span>
                        </div>
                        <div className="flex">
                          <span className="text-ink-500 dark:text-ink-400 w-20">
                            {t('widgetsB.freeCash')}
                          </span>
                          <span
                            className={`font-medium ${freeCash < 0 ? 'text-negative-600 dark:text-negative-500' : 'text-ink-900 dark:text-white'}`}
                          >
                            {formatCurrency(freeCash, currencySymbol)}
                          </span>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Back of card (Gains) */}
                  <div
                    className="absolute w-full h-full backface-hidden rotate-y-180"
                    style={{
                      backfaceVisibility: 'hidden',
                      transform: 'rotateY(180deg)',
                    }}
                  >
                    <button
                      onClick={() => handlePortfolioClick(summary.portfolio)}
                      className="w-full h-full bg-surface dark:bg-trading-dark-700/50 rounded-lg border border-surface-line dark:border-trading-dark-500 p-4 flex flex-col text-left hover:shadow-md transition-shadow"
                    >
                      {/* Header with flip back button */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {portfolio.logo && (
                            <img
                              src={portfolio.logo}
                              alt={portfolio.name}
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <h3 className="text-sm font-semibold text-ink-900 dark:text-white">
                            {portfolio.name}
                          </h3>
                        </div>
                        <div
                          onClick={(e) => toggleFlip(summary.portfolio, e)}
                          className="p-1.5 hover:bg-surface-muted dark:hover:bg-trading-dark-600 rounded-lg transition-colors cursor-pointer"
                          title={t('widgetsB.back')}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleFlip(summary.portfolio, e as unknown as React.MouseEvent);
                            }
                          }}
                        >
                          <RotateCcw className="w-4 h-4 text-ink-500 dark:text-ink-400" />
                        </div>
                      </div>

                      {/* Time period selector */}
                      <div className="flex gap-1 mb-4">
                        {(['1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as TimePeriod[]).map((period) => (
                          <div
                            key={period}
                            onClick={(e) => setTimePeriod(summary.portfolio, period, e)}
                            className={`flex-1 py-1 text-xs font-medium rounded transition-colors text-center cursor-pointer ${
                              selectedPeriod === period
                                ? 'bg-primary-700 text-white'
                                : 'bg-surface-muted dark:bg-trading-dark-600 text-ink-600 dark:text-ink-300 hover:bg-ink-200 dark:hover:bg-ink-400'
                            }`}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setTimePeriod(
                                  summary.portfolio,
                                  period,
                                  e as unknown as React.MouseEvent
                                );
                              }
                            }}
                          >
                            {period}
                          </div>
                        ))}
                      </div>

                      {/* Gain display */}
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <p className="text-xs text-ink-500 dark:text-ink-400 mb-1">
                          {selectedPeriod === 'ALL'
                            ? t('widgetsB.totalGain')
                            : t('widgetsB.gainPeriod', { period: selectedPeriod })}
                        </p>
                        <p
                          className={`text-2xl font-bold mb-1 ${
                            gain.absolute >= 0
                              ? 'text-positive-600 dark:text-positive-500'
                              : 'text-negative-600 dark:text-negative-500'
                          }`}
                        >
                          {gain.absolute >= 0 ? '+' : ''}
                          {formatCurrency(gain.absolute, currencySymbol)}
                        </p>
                        <p
                          className={`text-sm font-medium flex items-center gap-1 ${
                            gain.percentage >= 0
                              ? 'text-positive-600 dark:text-positive-500'
                              : 'text-negative-600 dark:text-negative-500'
                          }`}
                        >
                          {gain.percentage >= 0 ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          {gain.percentage >= 0 ? '+' : ''}
                          {formatNumber(gain.percentage)}%
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

PortfolioOverview.displayName = 'PortfolioOverview';
