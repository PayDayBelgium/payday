import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { useAppSelector } from '../../hooks/useAppSelector';
import {
  TrendingUp,
  Plus,
  Info,
  ArrowRight,
  X,
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
import { getDefaultRulesForStrategy } from '../../utils/defaultStrategyRules';
import type { StockPosition, StrategyRule } from '../../types';
import type { StrategyAlert } from '../../components/widgets/GroupedStockList';
import { formatNumber } from '../../utils/numberFormat';

export const StocksETFsStrategy: React.FC = () => {
  const { portfolio } = useParams<{ portfolio: string }>();
  const { setPageTitle, setInfoIcon } = usePageTitle();
  const navigate = useNavigate();
  const { pushNavigation } = useNavigation();
  const [activeTab, setActiveTab] = useState<'positions' | 'rules' | 'info'>('positions');
  const [showInfo, setShowInfo] = useState(() => {
    const saved = localStorage.getItem('stocks-etfs-show-info');
    // First time: show info (saved will be null), otherwise use saved value
    return saved === null ? true : saved === 'true';
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<StockPosition | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<StrategyRule | null>(null);
  const [activeRuleCategory, setActiveRuleCategory] = useState<'alert' | 'opportunity' | undefined>(
    undefined
  );

  // Track dismissed strategy alerts
  const [dismissedStrategyAlerts, setDismissedStrategyAlerts] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('dismissed-strategy-alerts');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch (e) {
        return new Set();
      }
    }
    return new Set();
  });

  // Save dismissed strategy alerts to localStorage
  useEffect(() => {
    localStorage.setItem('dismissed-strategy-alerts', JSON.stringify([...dismissedStrategyAlerts]));
  }, [dismissedStrategyAlerts]);

  // Initialize rules with defaults (later will come from Redux)
  const [strategyRules, setStrategyRules] = useState<StrategyRule[]>(() => {
    const saved = localStorage.getItem(`strategy-rules-stocks-etfs-${portfolio}`);
    if (saved) {
      const rules = JSON.parse(saved) as StrategyRule[];

      // Migration: Fix category based on trigger type
      const migratedRules = rules.map((rule) => {
        let correctCategory: 'alert' | 'opportunity' = rule.category as 'alert' | 'opportunity';

        // Determine correct category based on trigger
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

        // Return rule with corrected category if needed
        if (correctCategory !== rule.category) {
          return { ...rule, category: correctCategory };
        }
        return rule;
      });

      return migratedRules;
    }
    return getDefaultRulesForStrategy('stocks-etfs', portfolio || '');
  });

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
            message = `${position.ticker} is ${formatNumber(Math.abs(changePercent), 1)}% gedaald (drempel: -${rule.parameters.percentage}%)`;
          }
        } else if (rule.trigger === 'price_increase' && rule.parameters?.percentage) {
          const changePercent =
            ((position.currentPrice - position.purchasePrice) / position.purchasePrice) * 100;
          if (changePercent >= rule.parameters.percentage) {
            triggered = true;
            message = `${position.ticker} is ${formatNumber(changePercent, 1)}% gestegen (drempel: +${rule.parameters.percentage}%)`;
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
  }, [allPositions, strategyRules, dismissedStrategyAlerts]);

  const handleDismissStrategyAlert = useCallback((alertId: string) => {
    setDismissedStrategyAlerts((prev) => new Set([...prev, alertId]));
  }, []);

  // Calculate summary metrics (only for open positions)
  const openPositions = allPositions.filter((pos) => pos.status === 'open');
  const totalValue = openPositions.reduce((sum, pos) => sum + pos.currentValue, 0);
  const totalPositions = openPositions.length;
  const availableForCC = holdings.filter((h) => h.canWriteCoveredCall).length;

  const handleToggleInfo = useCallback(() => {
    setShowInfo((prev) => {
      const newValue = !prev;
      localStorage.setItem('stocks-etfs-show-info', String(newValue));
      return newValue;
    });
  }, []);

  useEffect(() => {
    setPageTitle('Aandelen & ETFs', `De basis van je portfolio - long-term holdings`);
  }, [setPageTitle, portfolio]);

  // Save rules to localStorage when they change
  useEffect(() => {
    if (strategyRules.length > 0) {
      localStorage.setItem(
        `strategy-rules-stocks-etfs-${portfolio}`,
        JSON.stringify(strategyRules)
      );
    }
  }, [strategyRules, portfolio]);

  const handleEditPosition = (position: StockPosition) => {
    setSelectedPosition(position);
    setIsEditModalOpen(true);
  };

  // Rules handlers
  const handleAddRule = () => {
    setSelectedRule(null);
    setActiveRuleCategory(undefined);
    setIsRuleModalOpen(true);
  };

  const handleEditRule = (rule: StrategyRule) => {
    setSelectedRule(rule);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = (rule: StrategyRule) => {
    setStrategyRules((prev) => {
      const existingIndex = prev.findIndex((r) => r.id === rule.id);
      if (existingIndex >= 0) {
        // Update existing rule
        const updated = [...prev];
        updated[existingIndex] = rule;
        return updated;
      } else {
        // Add new rule
        return [...prev, rule];
      }
    });
    setIsRuleModalOpen(false);
    setSelectedRule(null);
  };

  const handleDeleteRule = (ruleId: string) => {
    setStrategyRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    setStrategyRules((prev) =>
      prev.map((r) =>
        r.id === ruleId ? { ...r, enabled, updatedAt: new Date().toISOString() } : r
      )
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Tabs with Action Button */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('positions')}
              className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'positions'
                  ? 'text-primary-700 dark:text-primary-300 border-b-2 border-primary-700 dark:border-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Posities
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
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <ListTodo className="w-4 h-4" />
              Regels
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
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Info className="w-4 h-4" />
              Informatie
            </button>
          </div>
          {(activeTab === 'positions' || activeTab === 'rules') && (
            <button
              onClick={() => (activeTab === 'positions' ? setIsModalOpen(true) : handleAddRule())}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'positions' ? 'Aandeel/ETF Toevoegen' : 'Regel Toevoegen'}
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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">Totale Waarde</p>
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-300 mt-1">
                  {formatCurrency(totalValue, allPortfolios)}
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">Aantal Posities</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {totalPositions}
                </p>
              </div>
              {currentPortfolio?.hasOptions && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Beschikbaar voor Covered Calls
                  </p>
                  <p className="text-2xl font-bold text-primary-700 dark:text-primary-300 mt-1">
                    {availableForCC}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Niet gedekt met calls
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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                <TrendingUp className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Geen aandelen of ETFs
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Begin met het toevoegen van je eerste aandelen of ETFs aan je portfolio
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors"
                >
                  Voeg je eerste positie toe
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Waarom beginnen met Aandelen & ETFs?
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Dit is de basis van je portfolio. Je koopt aandelen of ETFs die je wilt houden
                    voor de lange termijn. Denk aan bedrijven waar je in gelooft of gediversifieerde
                    ETFs zoals SPY, QQQ, of sector-specifieke ETFs.
                  </p>
                  {currentPortfolio?.hasOptions ? (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Stap 1:</strong> Begin met sterke, betrouwbare aandelen of ETFs
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Volgende stap:</strong> Verdien extra inkomen door Covered Calls
                          te schrijven op deze aandelen
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Let op:</strong> Deze portfolio ondersteunt geen opties. Je kunt
                          alleen verdienen via koersstijgingen en eventuele dividenden.
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Strategie:</strong> Focus op kwaliteitsaandelen met groei
                          potentieel en/of dividend uitkeringen
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
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Volgende Stappen
                  </h3>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      pushNavigation(`/portfolio/${portfolio}/covered-calls`, 'Covered Calls');
                      navigate(`/portfolio/${portfolio}/covered-calls`);
                    }}
                    className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 dark:text-white">Covered Calls</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Verdien extra premies op je aandelen en ETFs
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-3" />
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      pushNavigation(`/portfolio/${portfolio}/leaps`, 'LEAPS');
                      navigate(`/portfolio/${portfolio}/leaps`);
                    }}
                    className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 dark:text-white">
                          LEAPS (Synthetische Aandelen)
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Krijg exposure met leverage - ook geschikt voor Covered Calls
                        </p>
                      </div>
                      <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-3" />
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
          setIsRuleModalOpen(false);
          setSelectedRule(null);
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
