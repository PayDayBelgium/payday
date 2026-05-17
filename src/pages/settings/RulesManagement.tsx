import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, AlertCircle, Target, Lightbulb, TrendingUp, TrendingDown, Calendar, Banknote, Settings } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { ConfirmModal } from '../../components/modals/ConfirmModal';
import type { StrategyRule, StrategyType, StrategyRuleCategory, StrategyRuleTrigger } from '../../types';

type WizardStep = 'asset-type' | 'configure';
type AssetType = 'stocks-etfs' | 'options' | 'general';

// Default rules that are initialized for each portfolio
const DEFAULT_RULES: Omit<StrategyRule, 'id' | 'portfolio'>[] = [
  {
    strategyType: 'stocks-etfs',
    name: 'Aandeel Gedaald 10%',
    description: 'Alert wanneer een aandeel 10% gedaald is',
    category: 'alert',
    trigger: 'price_decrease',
    enabled: true,
    parameters: { percentage: 10 },
    actions: { notify: true },
  },
  {
    strategyType: 'stocks-etfs',
    name: 'Aandeel Gestegen 15%',
    description: 'Opportunity wanneer een aandeel 15% gestegen is',
    category: 'opportunity',
    trigger: 'price_increase',
    enabled: true,
    parameters: { percentage: 15 },
    actions: { notify: true },
  },
  {
    strategyType: 'stocks-etfs',
    name: 'Synthetische Positie Mogelijk',
    description: 'Idea: Vervang aandelen door een deep ITM call (delta 0.9+) om kapitaal vrij te maken met dezelfde exposure',
    category: 'idea',
    trigger: 'price_increase',
    enabled: true,
    parameters: { percentage: 20 },
    actions: { notify: true },
  },
  {
    strategyType: 'options',
    name: 'Optie Verloopt Binnen 1 Week',
    description: 'Alert wanneer een optie binnen 7 dagen verloopt',
    category: 'alert',
    trigger: 'time_based',
    enabled: true,
    parameters: { threshold: 7 },
    actions: { notify: true },
  },
  {
    strategyType: 'general',
    name: 'Negatieve vrije cash',
    description: 'Alert wanneer vrije cash negatief is (margin trading)',
    category: 'alert',
    trigger: 'price_decrease',
    enabled: true,
    parameters: {},
    actions: { notify: true },
  },
];

export const RulesManagement: React.FC = () => {
  const [rules, setRules] = useState<StrategyRule[]>([]);

  // Wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep>('asset-type');
  const [selectedAssetType, setSelectedAssetType] = useState<AssetType | null>(null);
  const [wizardFormData, setWizardFormData] = useState<{
    name: string;
    description: string;
    category: StrategyRuleCategory;
    trigger: StrategyRuleTrigger;
    percentage?: number;
    threshold?: number;
  }>({
    name: '',
    description: '',
    category: 'alert',
    trigger: 'price_increase',
  });

  // Delete confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; ruleId: string | null; ruleName: string }>({
    isOpen: false,
    ruleId: null,
    ruleName: '',
  });

  // Load rules from localStorage on mount
  useEffect(() => {
    const loadedRules: StrategyRule[] = [];

    // Load rules for each strategy type
    const strategyTypes: StrategyType[] = ['stocks-etfs', 'options', 'general'];
    strategyTypes.forEach(strategyType => {
      const storageKey = `strategy-rules-${strategyType}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsedRules = JSON.parse(saved) as StrategyRule[];
          loadedRules.push(...parsedRules);
        } catch (e) {
          console.error('Error loading rules:', e);
        }
      }
    });

    // If no rules exist, initialize with defaults
    if (loadedRules.length === 0) {
      const defaultRules = DEFAULT_RULES.map((rule, index) => ({
        ...rule,
        id: `default-${Date.now()}-${index}`,
        portfolio: 'global', // Global rules apply to all portfolios
      }));
      setRules(defaultRules);
      // Save defaults to localStorage
      saveRulesToStorage(defaultRules);
    } else {
      setRules(loadedRules);
    }
  }, []);

  const saveRulesToStorage = (rulesToSave: StrategyRule[]) => {
    // Group rules by strategy type
    const rulesByStrategy: Record<string, StrategyRule[]> = {};
    rulesToSave.forEach(rule => {
      if (!rulesByStrategy[rule.strategyType]) {
        rulesByStrategy[rule.strategyType] = [];
      }
      rulesByStrategy[rule.strategyType].push(rule);
    });

    // Save each group to localStorage (global, not per portfolio)
    Object.entries(rulesByStrategy).forEach(([strategyType, strategyRules]) => {
      const storageKey = `strategy-rules-${strategyType}`;
      localStorage.setItem(storageKey, JSON.stringify(strategyRules));
    });
  };

  const handleStartWizard = () => {
    setShowWizard(true);
    setWizardStep('asset-type');
    setSelectedAssetType(null);
    setWizardFormData({
      name: '',
      description: '',
      category: 'alert',
      trigger: 'price_increase',
    });
  };

  const handleSelectAssetType = (assetType: AssetType) => {
    setSelectedAssetType(assetType);
    setWizardStep('configure');

    // Pre-fill default trigger based on asset type
    if (assetType === 'stocks-etfs') {
      setWizardFormData(prev => ({
        ...prev,
        trigger: 'price_increase',
        percentage: 10,
      }));
    } else if (assetType === 'options') {
      setWizardFormData(prev => ({
        ...prev,
        trigger: 'time_based',
        threshold: 7,
      }));
    } else {
      // general
      setWizardFormData(prev => ({
        ...prev,
        trigger: 'price_decrease',
        percentage: undefined,
      }));
    }
  };

  const handleSaveRule = () => {
    if (!selectedAssetType) return;

    const strategyTypeMap: Record<AssetType, StrategyType> = {
      'stocks-etfs': 'stocks-etfs',
      'options': 'options',
      'general': 'general',
    };

    const newRule: StrategyRule = {
      id: `rule-${Date.now()}`,
      strategyType: strategyTypeMap[selectedAssetType],
      portfolio: 'global', // Global rules apply to all portfolios
      name: wizardFormData.name,
      description: wizardFormData.description,
      category: wizardFormData.category,
      trigger: wizardFormData.trigger,
      enabled: true,
      parameters: {
        percentage: wizardFormData.percentage,
        threshold: wizardFormData.threshold,
      },
      actions: { notify: true },
    };

    const updatedRules = [...rules, newRule];
    setRules(updatedRules);
    saveRulesToStorage(updatedRules);
    setShowWizard(false);
  };

  const handleDeleteRule = (ruleId: string) => {
    const updatedRules = rules.filter(r => r.id !== ruleId);
    setRules(updatedRules);
    saveRulesToStorage(updatedRules);
    setDeleteConfirm({ isOpen: false, ruleId: null, ruleName: '' });
  };

  const handleToggleEnabled = (ruleId: string) => {
    const updatedRules = rules.map(r =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    setRules(updatedRules);
    saveRulesToStorage(updatedRules);
  };

  const getRuleIcon = (category: StrategyRuleCategory) => {
    if (category === 'alert') {
      return <AlertCircle className="w-4 h-4 text-caution-600 dark:text-caution-500" />;
    } else if (category === 'opportunity') {
      return <Target className="w-4 h-4 text-positive-600 dark:text-positive-500" />;
    } else {
      return <Lightbulb className="w-4 h-4 text-caution-600 dark:text-caution-500" />;
    }
  };

  const getRuleBadge = (category: StrategyRuleCategory) => {
    if (category === 'alert') {
      return (
        <span className="px-2 py-1 bg-caution-50 dark:bg-caution-600/25 text-caution-600 dark:text-caution-500 rounded text-xs font-medium">
          Alert
        </span>
      );
    } else if (category === 'opportunity') {
      return (
        <span className="px-2 py-1 bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500 rounded text-xs font-medium">
          Opportunity
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 bg-caution-50 dark:bg-caution-600/25 text-caution-600 dark:text-caution-500 rounded text-xs font-medium">
          Idea
        </span>
      );
    }
  };

  const getStrategyTypeName = (strategyType: StrategyType): string => {
    const names: Record<StrategyType, string> = {
      'stocks-etfs': 'Aandelen & ETFs',
      'leaps': 'LEAPS',
      'covered-calls': 'Covered Calls',
      'csp': 'Cash Secured Puts',
      'pmcc': 'PMCC',
      'spreads': 'Spreads',
      'kaching': 'KaChing',
      'options': 'Opties',
      'general': 'Algemeen',
    };
    return names[strategyType] || strategyType;
  };

  const getTriggerName = (trigger: StrategyRuleTrigger): string => {
    const names: Record<StrategyRuleTrigger, string> = {
      'price_increase': 'Prijs Stijging',
      'price_decrease': 'Prijs Daling',
      'profit_target': 'Winstdoel',
      'loss_limit': 'Stoploss',
      'time_based': 'Tijd Gebaseerd',
      'volatility': 'Volatiliteit',
    };
    return names[trigger] || trigger;
  };

  const getAssetTypeIcon = (assetType: AssetType) => {
    switch (assetType) {
      case 'stocks-etfs':
        return <TrendingUp className="w-8 h-8" />;
      case 'options':
        return <Calendar className="w-8 h-8" />;
      case 'general':
        return <Settings className="w-8 h-8" />;
    }
  };

  const getAssetTypeName = (assetType: AssetType): string => {
    const names: Record<AssetType, string> = {
      'stocks-etfs': 'Aandelen & ETFs',
      'options': 'Opties',
      'general': 'Algemeen',
    };
    return names[assetType];
  };

  const groupedRules = useMemo(() => {
    const groups: Record<StrategyType, StrategyRule[]> = {
      'stocks-etfs': [],
      'leaps': [],
      'covered-calls': [],
      'csp': [],
      'pmcc': [],
      'spreads': [],
      'kaching': [],
      'options': [],
      'general': [],
    };
    rules.forEach(rule => {
      if (groups[rule.strategyType]) {
        groups[rule.strategyType].push(rule);
      }
    });
    return groups;
  }, [rules]);

  // System rules that are automatically active
  const systemRules = [
    {
      name: 'Expirerende Opties',
      description: 'Alert wanneer een optie binnen 7 dagen verloopt',
      category: 'alert' as StrategyRuleCategory,
      strategyType: 'options' as StrategyType,
    },
    {
      name: 'Expirerende Spreads',
      description: 'Alert wanneer een spread binnen 7 dagen verloopt',
      category: 'alert' as StrategyRuleCategory,
      strategyType: 'options' as StrategyType,
    },
    {
      name: 'Negatieve Vrije Cash',
      description: 'Alert wanneer vrije cash in portfolio negatief is',
      category: 'alert' as StrategyRuleCategory,
      strategyType: 'general' as StrategyType,
    },
    {
      name: 'Put Positie Alert',
      description: 'Alert wanneer stock prijs onder strike van short put zakt',
      category: 'alert' as StrategyRuleCategory,
      strategyType: 'options' as StrategyType,
    },
    {
      name: 'Put Spread Alert',
      description: 'Alert wanneer stock prijs onder short strike van put spread zakt',
      category: 'alert' as StrategyRuleCategory,
      strategyType: 'options' as StrategyType,
    },
    {
      name: 'Covered Call Opportunity',
      description: 'Opportunity om covered calls te verkopen op aandelen positie',
      category: 'opportunity' as StrategyRuleCategory,
      strategyType: 'stocks-etfs' as StrategyType,
    },
    {
      name: 'PMCC Opportunity',
      description: 'Opportunity om covered calls te verkopen op LEAPS posities',
      category: 'opportunity' as StrategyRuleCategory,
      strategyType: 'options' as StrategyType,
    },
    {
      name: 'KaChing Opportunity',
      description: 'Opportunity om puts te verkopen op bestaande long puts',
      category: 'opportunity' as StrategyRuleCategory,
      strategyType: 'options' as StrategyType,
    },
    {
      name: 'Profit Opportunity',
      description: 'Opportunity wanneer optie positie 80% of meer winst heeft',
      category: 'opportunity' as StrategyRuleCategory,
      strategyType: 'options' as StrategyType,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Add Button */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Trading Rules
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Deze regels worden toegepast op alle portfolios
            </p>
          </div>
          <button
            onClick={handleStartWizard}
            className="flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Regel Toevoegen
          </button>
        </div>
      </div>

      {/* Wizard Modal */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 max-w-2xl w-full h-[700px] flex flex-col">
            {/* Asset Type Selection */}
            {wizardStep === 'asset-type' && (
              <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                  Kies Asset Type
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => handleSelectAssetType('stocks-etfs')}
                    className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-lg text-primary-700 dark:text-primary-300">
                        {getAssetTypeIcon('stocks-etfs')}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          Aandelen & ETFs
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Regels voor aandelen en ETF posities
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectAssetType('options')}
                    className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-positive-500 dark:hover:border-positive-500 hover:bg-positive-50 dark:hover:bg-positive-700/10 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-positive-50 dark:bg-positive-700/25 rounded-lg text-positive-600 dark:text-positive-500">
                        {getAssetTypeIcon('options')}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          Opties
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Regels voor optie posities (Calls, Puts, LEAPS, etc.)
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSelectAssetType('general')}
                    className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-caution-500 dark:hover:border-caution-500 hover:bg-caution-50 dark:hover:bg-amber-900/10 transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-caution-50 dark:bg-caution-600/25 rounded-lg text-caution-600 dark:text-caution-500">
                        {getAssetTypeIcon('general')}
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          Algemeen
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Algemene regels voor portfolio monitoring (vrije cash, etc.)
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowWizard(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Configure Rule */}
            {wizardStep === 'configure' && selectedAssetType && (
              <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg text-primary-700 dark:text-primary-300">
                    {getAssetTypeIcon(selectedAssetType)}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Nieuwe Regel voor {getAssetTypeName(selectedAssetType)}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Configureer de regel instellingen
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Regel Naam
                    </label>
                    <input
                      type="text"
                      value={wizardFormData.name}
                      onChange={(e) => setWizardFormData({ ...wizardFormData, name: e.target.value })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                      placeholder="bv. Aandeel Gedaald 10%"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Beschrijving
                    </label>
                    <input
                      type="text"
                      value={wizardFormData.description}
                      onChange={(e) => setWizardFormData({ ...wizardFormData, description: e.target.value })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                      placeholder="bv. Alert wanneer een aandeel 10% gedaald is"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                      Type
                    </label>
                    <select
                      value={wizardFormData.category}
                      onChange={(e) => setWizardFormData({ ...wizardFormData, category: e.target.value as StrategyRuleCategory })}
                      className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="alert">Alert (waarschuwing)</option>
                      <option value="opportunity">Opportunity (kans)</option>
                      <option value="idea">Idea (advanced strategie)</option>
                    </select>
                  </div>

                  {selectedAssetType === 'stocks-etfs' && (
                    <>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                          Trigger
                        </label>
                        <select
                          value={wizardFormData.trigger}
                          onChange={(e) => setWizardFormData({ ...wizardFormData, trigger: e.target.value as StrategyRuleTrigger })}
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="price_increase">Prijs Stijging</option>
                          <option value="price_decrease">Prijs Daling</option>
                        </select>
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                          Percentage (%)
                        </label>
                        <input
                          type="number"
                          value={wizardFormData.percentage || ''}
                          onChange={(e) => setWizardFormData({ ...wizardFormData, percentage: parseFloat(e.target.value) })}
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                          placeholder="10"
                          min="0"
                          max="100"
                          step="1"
                        />
                      </div>
                    </>
                  )}

                  {selectedAssetType === 'options' && (
                    <>
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                          Trigger
                        </label>
                        <select
                          value={wizardFormData.trigger}
                          onChange={(e) => setWizardFormData({ ...wizardFormData, trigger: e.target.value as StrategyRuleTrigger })}
                          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="time_based">Tijd tot Expiratie</option>
                          <option value="price_decrease">Waarde Daling (positief bij verkochte opties)</option>
                          <option value="price_increase">Waarde Stijging</option>
                        </select>
                      </div>

                      {wizardFormData.trigger === 'time_based' && (
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                            Dagen tot Expiratie
                          </label>
                          <input
                            type="number"
                            value={wizardFormData.threshold || ''}
                            onChange={(e) => setWizardFormData({ ...wizardFormData, threshold: parseFloat(e.target.value) })}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                            placeholder="7"
                            min="1"
                            max="30"
                            step="1"
                          />
                        </div>
                      )}

                      {(wizardFormData.trigger === 'price_decrease' || wizardFormData.trigger === 'price_increase') && (
                        <div>
                          <label className="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
                            Percentage (%)
                          </label>
                          <input
                            type="number"
                            value={wizardFormData.percentage || ''}
                            onChange={(e) => setWizardFormData({ ...wizardFormData, percentage: parseFloat(e.target.value) })}
                            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                            placeholder="80"
                            min="0"
                            max="100"
                            step="1"
                          />
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Voor verkochte opties: 80% daling = opportunity (sluiten voor winst)
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {selectedAssetType === 'general' && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Algemene regels worden automatisch gecontroleerd op portfolio niveau.
                        Bijvoorbeeld: alert wanneer vrije cash negatief is.
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setWizardStep('asset-type');
                        setSelectedAssetType(null);
                      }}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Terug
                    </button>
                    <button
                      onClick={() => setShowWizard(false)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={handleSaveRule}
                      disabled={!wizardFormData.name || !wizardFormData.description}
                      className="px-4 py-2 bg-primary-700 hover:bg-primary-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      Opslaan
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* System Rules - Always Active */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Systeem Regels
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Deze regels zijn altijd actief en worden automatisch geëvalueerd
          </p>
        </div>

        <div className="p-6 space-y-3">
          {systemRules.map((rule, index) => (
            <div
              key={index}
              className="bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getRuleIcon(rule.category)}
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                      {rule.name}
                    </h4>
                    {getRuleBadge(rule.category)}
                    <span className="px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded text-xs font-medium">
                      Systeem
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {rule.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">
                      {getStrategyTypeName(rule.strategyType)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className="px-3 py-1 bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500 rounded text-sm font-medium">
                    Actief
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Rules List by Strategy Type */}
      <div className="space-y-4">
        {Object.entries(groupedRules).map(([strategyType, strategyRules]) => {
          if (strategyRules.length === 0) return null;

          return (
            <div key={strategyType} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getStrategyTypeName(strategyType as StrategyType)}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {strategyRules.length} {strategyRules.length === 1 ? 'regel' : 'regels'}
                </p>
              </div>

              <div className="p-6 space-y-3">
                {strategyRules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`bg-gray-50 dark:bg-gray-700/50 rounded-lg border ${
                      rule.enabled
                        ? 'border-gray-200 dark:border-gray-600'
                        : 'border-gray-300 dark:border-gray-600 opacity-60'
                    } p-4`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getRuleIcon(rule.category)}
                          <h4 className="text-base font-semibold text-gray-900 dark:text-white">
                            {rule.name}
                          </h4>
                          {getRuleBadge(rule.category)}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {rule.description}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">
                            {getTriggerName(rule.trigger)}
                          </span>
                          {rule.parameters.percentage && (
                            <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">
                              {rule.parameters.percentage}%
                            </span>
                          )}
                          {rule.parameters.threshold && (
                            <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded">
                              {rule.parameters.threshold} dagen
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleToggleEnabled(rule.id)}
                          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                            rule.enabled
                              ? 'bg-positive-50 dark:bg-positive-700/25 text-positive-700 dark:text-positive-500 hover:bg-positive-50 dark:hover:bg-positive-700/50'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        >
                          {rule.enabled ? 'Actief' : 'Inactief'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ isOpen: true, ruleId: rule.id, ruleName: rule.name })}
                          className="p-2 text-negative-600 dark:text-negative-500 hover:bg-negative-50 dark:hover:bg-negative-700/25 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {rules.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Geen Regels
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Begin door je eerste regel toe te voegen
          </p>
          <button
            onClick={handleStartWizard}
            className="px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors"
          >
            Eerste regel toevoegen
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.isOpen && (
        <ConfirmModal
          isOpen={deleteConfirm.isOpen}
          onClose={() => setDeleteConfirm({ isOpen: false, ruleId: null, ruleName: '' })}
          onConfirm={() => deleteConfirm.ruleId && handleDeleteRule(deleteConfirm.ruleId)}
          title="Regel Verwijderen"
          message={`Weet je zeker dat je de regel "${deleteConfirm.ruleName}" wilt verwijderen? Deze actie kan niet ongedaan gemaakt worden.`}
          confirmText="Verwijderen"
          cancelText="Annuleren"
          variant="danger"
        />
      )}
    </div>
  );
};
