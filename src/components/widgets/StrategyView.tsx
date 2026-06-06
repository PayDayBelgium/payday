import React, { useState, useMemo } from 'react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import {
  selectStrategiesByPortfolio,
  addStrategy,
  deleteStrategy,
  removePositionFromStrategy,
  addPositionToStrategy,
} from '../../store/slices/strategiesSlice';
import {
  Layers,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Link2,
  Unlink,
  TrendingUp,
  ShieldCheck,
  Zap,
  Target,
  LayoutGrid,
  Shuffle,
  Settings,
} from 'lucide-react';
import type {
  Position,
  TradingStrategy,
  TradingStrategyType,
  PortfolioName,
  CallOption,
  PutOption,
  StockPosition,
  LEAP,
} from '../../types';
import { formatCurrency } from '../../utils/numberFormat';
import { getCurrencySymbol } from '../../utils/currency';

interface StrategyViewProps {
  portfolioName: PortfolioName;
  currency: string;
}

// Strategy type configuration
const strategyTypeConfig: Record<
  TradingStrategyType,
  { label: string; icon: React.ReactNode; color: string; bgColor: string }
> = {
  'covered-call': {
    label: 'Covered Call',
    icon: <TrendingUp className="w-4 h-4" />,
    color: 'text-primary-700 dark:text-primary-300',
    bgColor: 'bg-primary-50 dark:bg-primary-900/30',
  },
  pmcc: {
    label: "Poor Man's Covered Call",
    icon: <Layers className="w-4 h-4" />,
    color: 'text-ink-600 dark:text-ink-300',
    bgColor: 'bg-surface-muted dark:bg-trading-dark-600',
  },
  kaching: {
    label: 'KaChing',
    icon: <Zap className="w-4 h-4" />,
    color: 'text-caution-600 dark:text-caution-500',
    bgColor: 'bg-caution-50 dark:bg-caution-600/25',
  },
  csp: {
    label: 'Cash Secured Put',
    icon: <ShieldCheck className="w-4 h-4" />,
    color: 'text-positive-600 dark:text-positive-500',
    bgColor: 'bg-positive-50 dark:bg-positive-700/25',
  },
  spread: {
    label: 'Spread',
    icon: <LayoutGrid className="w-4 h-4" />,
    color: 'text-caution-600 dark:text-caution-500',
    bgColor: 'bg-caution-50 dark:bg-caution-600/25',
  },
  wheel: {
    label: 'Wheel',
    icon: <Shuffle className="w-4 h-4" />,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  custom: {
    label: 'Custom',
    icon: <Settings className="w-4 h-4" />,
    color: 'text-ink-600 dark:text-ink-400',
    bgColor: 'bg-surface-subtle dark:bg-trading-dark-900/30',
  },
};

export const StrategyView: React.FC<StrategyViewProps> = ({ portfolioName, currency }) => {
  const dispatch = useAppDispatch();
  const strategies = useAppSelector(selectStrategiesByPortfolio(portfolioName));
  const allPositions = useAppSelector((state) => state.positions.positions);

  // Filter positions for this portfolio
  const portfolioPositions = useMemo(() => {
    return allPositions.filter((p) => p.portfolio === portfolioName && p.status === 'open');
  }, [allPositions, portfolioName]);

  // State
  const [expandedStrategies, setExpandedStrategies] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [newStrategyName, setNewStrategyName] = useState('');
  const [newStrategyType, setNewStrategyType] = useState<TradingStrategyType>('covered-call');
  const [newStrategyDescription, setNewStrategyDescription] = useState('');
  const [selectedStrategyForLinking, setSelectedStrategyForLinking] = useState<string | null>(null);

  // Get positions that are not in any strategy
  const unassignedPositions = useMemo(() => {
    const assignedIds = new Set(strategies.flatMap((s) => s.positionIds));
    return portfolioPositions.filter((p) => !assignedIds.has(p.id));
  }, [portfolioPositions, strategies]);

  // Toggle strategy expansion
  const toggleStrategy = (strategyId: string) => {
    setExpandedStrategies((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(strategyId)) {
        newSet.delete(strategyId);
      } else {
        newSet.add(strategyId);
      }
      return newSet;
    });
  };

  // Create new strategy
  const handleCreateStrategy = () => {
    if (!newStrategyName.trim()) return;

    const strategy: TradingStrategy = {
      id: `strategy-${Date.now()}`,
      name: newStrategyName.trim(),
      type: newStrategyType,
      portfolio: portfolioName,
      description: newStrategyDescription.trim() || undefined,
      positionIds: [],
      createdAt: new Date().toISOString(),
    };

    dispatch(addStrategy(strategy));
    setNewStrategyName('');
    setNewStrategyDescription('');
    setIsCreating(false);
  };

  // Delete strategy
  const handleDeleteStrategy = (strategyId: string) => {
    dispatch(deleteStrategy(strategyId));
  };

  // Link position to strategy
  const handleLinkPosition = (strategyId: string, positionId: string) => {
    dispatch(addPositionToStrategy({ strategyId, positionId }));
    setSelectedStrategyForLinking(null);
  };

  // Unlink position from strategy
  const handleUnlinkPosition = (strategyId: string, positionId: string) => {
    dispatch(removePositionFromStrategy({ strategyId, positionId }));
  };

  // Get position display info
  const getPositionDisplayInfo = (position: Position) => {
    const label = position.ticker;
    let details = '';
    let value = 0;

    switch (position.type) {
      case 'stock':
      case 'etf': {
        const stockPos = position as StockPosition;
        details = `${stockPos.shares} shares`;
        value = stockPos.currentValue;
        break;
      }
      case 'call': {
        const callPos = position as CallOption;
        details = `${callPos.action === 'buy' ? 'Long' : 'Short'} Call $${callPos.strike} ${callPos.expiration}`;
        value = callPos.currentValue;
        break;
      }
      case 'put': {
        const putPos = position as PutOption;
        details = `${putPos.action === 'buy' ? 'Long' : 'Short'} Put $${putPos.strike} ${putPos.expiration}`;
        value = putPos.currentValue;
        break;
      }
      case 'leap': {
        const leapPos = position as LEAP;
        details = `LEAP $${leapPos.strike} ${leapPos.expiration}`;
        value = leapPos.currentValue;
        break;
      }
      default:
        value = 'currentValue' in position ? (position as any).currentValue : 0;
    }

    return { label, details, value };
  };

  // Calculate strategy value
  const getStrategyValue = (strategy: TradingStrategy) => {
    return strategy.positionIds.reduce((sum, posId) => {
      const pos = portfolioPositions.find((p) => p.id === posId);
      if (!pos) return sum;

      if ('currentValue' in pos) {
        // For sold options, value is negative
        if (
          (pos.type === 'call' || pos.type === 'put') &&
          'action' in pos &&
          pos.action === 'sell'
        ) {
          return sum - Math.abs(pos.currentValue);
        }
        return sum + pos.currentValue;
      }
      return sum;
    }, 0);
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      {/* Header with create button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-ink-600 dark:text-ink-400" />
          <h3 className="text-lg font-semibold text-ink-900 dark:text-white">
            Trading Strategies
          </h3>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-3 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nieuwe Strategie
        </button>
      </div>

      {/* Create Strategy Form */}
      {isCreating && (
        <div className="mb-6 p-4 bg-surface dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600">
          <h4 className="text-sm font-semibold text-ink-900 dark:text-white mb-3">
            Nieuwe Strategie Aanmaken
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                Naam
              </label>
              <input
                type="text"
                value={newStrategyName}
                onChange={(e) => setNewStrategyName(e.target.value)}
                placeholder="Bijv. AAPL Covered Calls"
                className="w-full px-3 py-2 bg-white dark:bg-trading-dark-700 border border-ink-200 dark:border-trading-dark-500 rounded-lg text-sm text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                Type
              </label>
              <select
                value={newStrategyType}
                onChange={(e) => setNewStrategyType(e.target.value as TradingStrategyType)}
                className="w-full px-3 py-2 bg-white dark:bg-trading-dark-700 border border-ink-200 dark:border-trading-dark-500 rounded-lg text-sm text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {Object.entries(strategyTypeConfig).map(([type, config]) => (
                  <option key={type} value={type}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-700 dark:text-ink-300 mb-1">
                Beschrijving (optioneel)
              </label>
              <textarea
                value={newStrategyDescription}
                onChange={(e) => setNewStrategyDescription(e.target.value)}
                placeholder="Beschrijf de strategie..."
                rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-trading-dark-700 border border-ink-200 dark:border-trading-dark-500 rounded-lg text-sm text-ink-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateStrategy}
                disabled={!newStrategyName.trim()}
                className="px-4 py-2 bg-primary-700 hover:bg-primary-800 disabled:bg-ink-300 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Aanmaken
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewStrategyName('');
                  setNewStrategyDescription('');
                }}
                className="px-4 py-2 bg-surface-muted dark:bg-trading-dark-700 hover:bg-ink-200 dark:hover:bg-trading-dark-600 text-ink-700 dark:text-ink-300 rounded-lg text-sm font-medium transition-colors"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strategies List */}
      <div className="space-y-4">
        {strategies.length === 0 && !isCreating ? (
          <div className="text-center py-12 bg-surface dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600">
            <Layers className="w-12 h-12 mx-auto mb-3 text-ink-400 dark:text-ink-500" />
            <p className="text-ink-600 dark:text-ink-400 mb-2">Geen strategieën geconfigureerd</p>
            <p className="text-sm text-ink-500 dark:text-ink-500 mb-4">
              Maak strategieën aan om posities te groeperen
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Eerste Strategie Aanmaken
            </button>
          </div>
        ) : (
          strategies.map((strategy) => {
            const config = strategyTypeConfig[strategy.type];
            const isExpanded = expandedStrategies.has(strategy.id);
            const strategyPositions = strategy.positionIds
              .map((id) => portfolioPositions.find((p) => p.id === id))
              .filter(Boolean) as Position[];
            const strategyValue = getStrategyValue(strategy);
            const isLinking = selectedStrategyForLinking === strategy.id;

            return (
              <div
                key={strategy.id}
                className="bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 overflow-hidden"
              >
                {/* Strategy Header */}
                <div className="p-4 flex items-center justify-between">
                  <button
                    onClick={() => toggleStrategy(strategy.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-ink-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-ink-400" />
                    )}
                    <div className={`p-2 rounded-lg ${config.bgColor}`}>
                      <div className={config.color}>{config.icon}</div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-ink-900 dark:text-white">
                        {strategy.name}
                      </h4>
                      <p className="text-xs text-ink-500 dark:text-ink-400">
                        {config.label} • {strategyPositions.length} positie
                        {strategyPositions.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-ink-900 dark:text-white">
                      {formatCurrency(strategyValue, getCurrencySymbol(currency as 'USD' | 'EUR'))}
                    </span>
                    <button
                      onClick={() => setSelectedStrategyForLinking(isLinking ? null : strategy.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isLinking
                          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'hover:bg-surface-subtle dark:hover:bg-trading-dark-700 text-ink-500 dark:text-ink-400'
                      }`}
                      title="Posities koppelen"
                    >
                      <Link2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteStrategy(strategy.id)}
                      className="p-2 hover:bg-negative-50 dark:hover:bg-negative-700/25 text-ink-500 dark:text-ink-400 hover:text-negative-600 dark:hover:text-negative-500 rounded-lg transition-colors"
                      title="Strategie verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-surface-line dark:border-trading-dark-600 bg-surface dark:bg-trading-dark-900/50 p-4">
                    {strategy.description && (
                      <p className="text-sm text-ink-600 dark:text-ink-400 mb-4">
                        {strategy.description}
                      </p>
                    )}

                    {strategyPositions.length === 0 ? (
                      <p className="text-sm text-ink-500 dark:text-ink-500 italic">
                        Geen posities gekoppeld aan deze strategie
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {strategyPositions.map((pos) => {
                          const { label, details, value } = getPositionDisplayInfo(pos);
                          return (
                            <div
                              key={pos.id}
                              className="flex items-center justify-between p-3 bg-white dark:bg-trading-dark-800 rounded-lg"
                            >
                              <div>
                                <p className="text-sm font-medium text-ink-900 dark:text-white">
                                  {label}
                                </p>
                                <p className="text-xs text-ink-500 dark:text-ink-400">
                                  {details}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-ink-900 dark:text-white">
                                  {formatCurrency(
                                    value,
                                    getCurrencySymbol(currency as 'USD' | 'EUR')
                                  )}
                                </span>
                                <button
                                  onClick={() => handleUnlinkPosition(strategy.id, pos.id)}
                                  className="p-1.5 hover:bg-surface-subtle dark:hover:bg-trading-dark-700 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 rounded transition-colors"
                                  title="Ontkoppelen"
                                >
                                  <Unlink className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Link Positions Panel */}
                {isLinking && unassignedPositions.length > 0 && (
                  <div className="border-t border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 p-4">
                    <p className="text-xs font-medium text-primary-700 dark:text-primary-300 mb-3">
                      Selecteer posities om te koppelen:
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {unassignedPositions.map((pos) => {
                        const { label, details, value } = getPositionDisplayInfo(pos);
                        return (
                          <button
                            key={pos.id}
                            onClick={() => handleLinkPosition(strategy.id, pos.id)}
                            className="w-full flex items-center justify-between p-3 bg-white dark:bg-trading-dark-800 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/25 transition-colors"
                          >
                            <div className="text-left">
                              <p className="text-sm font-medium text-ink-900 dark:text-white">
                                {label}
                              </p>
                              <p className="text-xs text-ink-500 dark:text-ink-400">{details}</p>
                            </div>
                            <span className="text-sm text-ink-600 dark:text-ink-400">
                              {formatCurrency(value, getCurrencySymbol(currency as 'USD' | 'EUR'))}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Unassigned Positions Section */}
      {unassignedPositions.length > 0 && strategies.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-ink-700 dark:text-ink-300 mb-3 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Niet-gekoppelde Posities ({unassignedPositions.length})
          </h4>
          <div className="bg-surface dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 p-4">
            <div className="space-y-2">
              {unassignedPositions.map((pos) => {
                const { label, details, value } = getPositionDisplayInfo(pos);
                return (
                  <div
                    key={pos.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-trading-dark-700 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-900 dark:text-white">{label}</p>
                      <p className="text-xs text-ink-500 dark:text-ink-400">{details}</p>
                    </div>
                    <span className="text-sm font-medium text-ink-900 dark:text-white">
                      {formatCurrency(value, getCurrencySymbol(currency as 'USD' | 'EUR'))}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
