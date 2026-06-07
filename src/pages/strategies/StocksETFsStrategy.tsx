import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  TrendingUp,
  Plus,
  Info,
  ArrowRight,
  ListTodo,
  GraduationCap,
  Lightbulb,
} from 'lucide-react';
// import { AddStockETFModal } from '../../components/modals/AddStockETFModal';
// import { EditStockETFModal } from '../../components/modals/EditStockETFModal';
import { StrategyRuleModal } from '../../components/modals/StrategyRuleModal';
import { GroupedStockList } from '../../components/widgets/GroupedStockList';
import { StrategyRules } from '../../components/strategy/StrategyRules';
import {
  selectPositionsByPortfolioAndType,
  selectAllPriceAlerts,
  selectHoldingsByPortfolio,
} from '../../store/slices/positionsSlice';
import { selectPortfolios } from '../../store/slices/portfoliosSlice';
import { formatCurrency } from '../../utils/currencyHelpers';
import { useStrategyRules } from '../../hooks/useStrategyRules';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import type { StockPosition } from '../../types';
import type { StrategyAlert } from '../../components/widgets/GroupedStockList';
import { formatNumber } from '../../utils/numberFormat';

export const StocksETFsStrategy: React.FC = () => {
  const { portfolio } = useParams<{ portfolio: string }>();
  const { t } = useTranslation();
  const { setPageTitle } = usePageTitle();
  const navigate = useNavigate();
  const { pushNavigation } = useNavigation();
  const [activeTab, setActiveTab] = useState<'positions' | 'rules' | 'info'>('positions');
  const [, setIsModalOpen] = useState(false);
  const [, setIsEditModalOpen] = useState(false);
  const [, setSelectedPosition] = useState<StockPosition | null>(null);
  const {
    strategyRules,
    isRuleModalOpen,
    selectedRule,
    openAddRule,
    openEditRule: handleEditRule,
    closeRuleModal,
    saveRule: handleSaveRule,
    deleteRule: handleDeleteRule,
    toggleRule: handleToggleRule,
  } = useStrategyRules('stocks-etfs', portfolio, (rules) =>
    // One-time normalisation: derive the category from the trigger type so older
    // saved rules show the correct alert/opportunity badge.
    rules.map((rule) => {
      let correctCategory: 'alert' | 'opportunity' = rule.category as 'alert' | 'opportunity';
      if (
        rule.trigger === 'price_increase' ||
        rule.trigger === 'profit_target' ||
        rule.trigger === 'time_based' ||
        rule.trigger === 'volatility'
      ) {
        correctCategory = 'opportunity';
      } else if (rule.trigger === 'price_decrease' || rule.trigger === 'loss_limit') {
        correctCategory = 'alert';
      }
      return correctCategory !== rule.category ? { ...rule, category: correctCategory } : rule;
    })
  );
  const [activeRuleCategory, setActiveRuleCategory] = useState<'alert' | 'opportunity' | undefined>(
    undefined
  );

  // Track dismissed strategy alerts
  const [dismissedStrategyAlerts, setDismissedStrategyAlerts] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('dismissed-strategy-alerts');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch {
        return new Set();
      }
    }
    return new Set();
  });

  // Save dismissed strategy alerts to localStorage
  useEffect(() => {
    localStorage.setItem('dismissed-strategy-alerts', JSON.stringify([...dismissedStrategyAlerts]));
  }, [dismissedStrategyAlerts]);

  // Get stock and ETF positions for this portfolio
  const stockPositions = useAppSelector(
    selectPositionsByPortfolioAndType(portfolio || '', 'stock')
  ) as StockPosition[];
  const etfPositions = useAppSelector(
    selectPositionsByPortfolioAndType(portfolio || '', 'etf')
  ) as StockPosition[];
  const allPositions = [...stockPositions, ...etfPositions];
  const allPortfolios = useAppSelector(selectPortfolios);
  const currentPortfolio = allPortfolios.find((b) => b.name === portfolio);

  // Get all price alerts once at component level (avoids Hooks violation in map)
  const allPriceAlerts = useAppSelector(selectAllPriceAlerts);

  // Holdings: per-ticker aggregated lots with covered-call capacity
  const holdingsSelector = useMemo(() => selectHoldingsByPortfolio(portfolio || ''), [portfolio]);
  const holdings = useAppSelector(holdingsSelector);

  // Evaluate strategy rules for each position
  const positionStrategyAlerts = useMemo(() => {
    const alertsMap = new Map<string, StrategyAlert[]>();

    const openStockETFPositions = allPositions.filter(
      (p) => p.status === 'open' && (p.type === 'stock' || p.type === 'etf')
    ) as StockPosition[];

    openStockETFPositions.forEach((position) => {
      const enabledRules = strategyRules.filter((r) => r.enabled);
      const alerts: StrategyAlert[] = [];

      enabledRules.forEach((rule) => {
        let triggered = false;
        let message = '';

        // Evaluate price-based rules
        if (rule.trigger === 'price_decrease' && rule.parameters?.percentage) {
          const changePercent =
            ((position.currentPrice - position.purchasePrice) / position.purchasePrice) * 100;
          if (changePercent <= -rule.parameters.percentage) {
            triggered = true;
            message = t('stratPages.stocksAlertDecreased', {
              ticker: position.ticker,
              percent: formatNumber(Math.abs(changePercent), 1),
              threshold: rule.parameters.percentage,
            });
          }
        } else if (rule.trigger === 'price_increase' && rule.parameters?.percentage) {
          const changePercent =
            ((position.currentPrice - position.purchasePrice) / position.purchasePrice) * 100;
          if (changePercent >= rule.parameters.percentage) {
            triggered = true;
            message = t('stratPages.stocksAlertIncreased', {
              ticker: position.ticker,
              percent: formatNumber(changePercent, 1),
              threshold: rule.parameters.percentage,
            });
          }
        }

        if (triggered) {
          const alertId = `${position.id}-${rule.id}`;
          // Only add if not dismissed
          if (!dismissedStrategyAlerts.has(alertId)) {
            alerts.push({
              id: alertId,
              message,
              category: rule.category as 'alert' | 'opportunity',
            });
          }
        }
      });

      if (alerts.length > 0) {
        alertsMap.set(position.id, alerts);
      }
    });

    return alertsMap;
  }, [allPositions, strategyRules, dismissedStrategyAlerts, t]);

  const handleDismissStrategyAlert = useCallback((alertId: string) => {
    setDismissedStrategyAlerts((prev) => new Set([...prev, alertId]));
  }, []);

  // Calculate summary metrics (only for open positions)
  const openPositions = allPositions.filter((pos) => pos.status === 'open');
  const totalValue = openPositions.reduce((sum, pos) => sum + pos.currentValue, 0);
  const totalPositions = openPositions.length;
  // Covered-call writing is a level-gated opportunity (covered_calls = medior); don't surface
  // the "available for CC" count on lower levels (e.g. beginner/green slope).
  const { hasAccess: canUseCoveredCalls } = useFeatureAccess('covered_calls');
  const availableForCC = canUseCoveredCalls
    ? holdings.filter((h) => h.canWriteCoveredCall).length
    : 0;

  useEffect(() => {
    setPageTitle(t('stratPages.navStocksEtfs'), t('stratPages.stocksSubtitle'));
  }, [setPageTitle, portfolio, t]);

  const handleEditPosition = (position: StockPosition) => {
    setSelectedPosition(position);
    setIsEditModalOpen(true);
  };

  // Rules handlers: wrap the hook so the extra category state is reset along with it
  const handleAddRule = () => {
    setActiveRuleCategory(undefined);
    openAddRule();
  };

  return (
    <>
      <div className="space-y-6">
        {/* Tabs with Action Button */}
        <div className="flex items-center justify-between border-b border-surface-line dark:border-trading-dark-600">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('positions')}
              className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'positions'
                  ? 'text-primary-700 dark:text-primary-300 border-b-2 border-primary-700 dark:border-primary-400'
                  : 'text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white'
              }`}
            >
              {t('stratPages.tabPositions')}
              {totalPositions > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                  {totalPositions}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'rules'
                  ? 'text-primary-700 dark:text-primary-300 border-b-2 border-primary-700 dark:border-primary-400'
                  : 'text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white'
              }`}
            >
              <ListTodo className="w-4 h-4" />
              {t('stratPages.tabRules')}
              {strategyRules.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                  {strategyRules.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'info'
                  ? 'text-primary-700 dark:text-primary-300 border-b-2 border-primary-700 dark:border-primary-400'
                  : 'text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white'
              }`}
            >
              <Info className="w-4 h-4" />
              {t('stratPages.tabInfo')}
            </button>
          </div>
          {(activeTab === 'positions' || activeTab === 'rules') && (
            <button
              onClick={() => (activeTab === 'positions' ? setIsModalOpen(true) : handleAddRule())}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'positions' ? t('stratPages.stocksAdd') : t('stratPages.addRule')}
            </button>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === 'positions' && (
          <>
            {/* Summary Cards */}
            <div
              className={`grid grid-cols-1 gap-4 ${currentPortfolio?.hasOptions ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}
            >
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {t('stratPages.stocksTotalValue')}
                </p>
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-300 mt-1">
                  {formatCurrency(totalValue, allPortfolios)}
                </p>
              </div>
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {t('stratPages.stocksCount')}
                </p>
                <p className="text-2xl font-bold text-ink-900 dark:text-white mt-1">
                  {totalPositions}
                </p>
              </div>
              {currentPortfolio?.hasOptions && (
                <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                  <p className="text-sm text-ink-600 dark:text-ink-400">
                    {t('stratPages.stocksAvailableForCC')}
                  </p>
                  <p className="text-2xl font-bold text-primary-700 dark:text-primary-300 mt-1">
                    {availableForCC}
                  </p>
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                    {t('stratPages.stocksNotCovered')}
                  </p>
                </div>
              )}
            </div>

            {/* Positions */}
            {allPositions.length > 0 ? (
              <GroupedStockList
                positions={allPositions}
                alerts={allPriceAlerts}
                strategyAlertsMap={positionStrategyAlerts}
                allPortfolios={allPortfolios}
                onEditPosition={handleEditPosition}
                onDismissStrategyAlert={handleDismissStrategyAlert}
              />
            ) : (
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-12 text-center">
                <TrendingUp className="w-16 h-16 text-ink-300 dark:text-ink-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
                  {t('stratPages.stocksNoPositionsTitle')}
                </h3>
                <p className="text-ink-600 dark:text-ink-400 mb-4">
                  {t('stratPages.stocksNoPositionsDesc')}
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors"
                >
                  {t('stratPages.stocksAddFirst')}
                </button>
              </div>
            )}
          </>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <StrategyRules
            strategyType="stocks-etfs"
            portfolio={portfolio || ''}
            rules={strategyRules}
            onAddRule={handleAddRule}
            onEditRule={handleEditRule}
            onDeleteRule={handleDeleteRule}
            onToggleRule={handleToggleRule}
          />
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            {/* Education Section */}
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/30 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
                    {t('stratPages.stocksWhyTitle')}
                  </h3>
                  <p className="text-sm text-ink-700 dark:text-ink-300 mb-3">
                    {t('stratPages.stocksWhyDesc')}
                  </p>
                  {currentPortfolio?.hasOptions ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.stocksStep1Label')}</strong>
                          {t('stratPages.stocksStep1')}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.stocksStep2Label')}</strong>
                          {t('stratPages.stocksStep2')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.stocksNoOptionsLabel')}</strong>
                          {t('stratPages.stocksNoOptions')}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.stocksStrategyLabel')}</strong>
                          {t('stratPages.stocksStrategy')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Next Steps Section */}
            {currentPortfolio?.hasOptions && (
              <div className="bg-gradient-to-r from-primary-50 to-positive-50 dark:from-blue-900/10 dark:to-green-900/10 border border-primary-200 dark:border-primary-700/30 rounded-lg p-6">
                <div className="flex items-start gap-3 mb-4">
                  <GraduationCap className="w-5 h-5 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                  <h3 className="text-lg font-semibold text-ink-900 dark:text-white">
                    {t('stratPages.nextSteps')}
                  </h3>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      pushNavigation(
                        `/portfolio/${portfolio}/covered-calls`,
                        t('stratPages.navCoveredCalls')
                      );
                      navigate(`/portfolio/${portfolio}/covered-calls`);
                    }}
                    className="w-full text-left p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-left">
                        <p className="font-medium text-ink-900 dark:text-white">
                          {t('stratPages.navCoveredCalls')}
                        </p>
                        <p className="text-sm text-ink-600 dark:text-ink-400">
                          {t('stratPages.stocksLinkCcDesc')}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-ink-400 flex-shrink-0 ml-3" />
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      pushNavigation(`/portfolio/${portfolio}/leaps`, t('stratPages.navLeaps'));
                      navigate(`/portfolio/${portfolio}/leaps`);
                    }}
                    className="w-full text-left p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-left">
                        <p className="font-medium text-ink-900 dark:text-white">
                          {t('stratPages.stocksLinkLeapsTitle')}
                        </p>
                        <p className="text-sm text-ink-600 dark:text-ink-400">
                          {t('stratPages.stocksLinkLeapsDesc')}
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-ink-400 flex-shrink-0 ml-3" />
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Position Modal */}
      {/* <AddStockETFModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        portfolio={portfolio || ''}
      /> */}

      {/* Edit Position Modal */}
      {/* <EditStockETFModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedPosition(null);
        }}
        position={selectedPosition}
      /> */}

      {/* Strategy Rule Modal */}
      <StrategyRuleModal
        isOpen={isRuleModalOpen}
        onClose={() => {
          closeRuleModal();
          setActiveRuleCategory(undefined);
        }}
        onSave={handleSaveRule}
        strategyType="stocks-etfs"
        portfolio={portfolio || ''}
        existingRule={selectedRule}
        activeCategory={activeRuleCategory}
      />
    </>
  );
};
