import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { Zap, Plus, AlertCircle, Info, ArrowRight, X, ListTodo, GraduationCap, Lightbulb } from 'lucide-react';
import { StrategyRules } from '../../components/strategy/StrategyRules';
import { StrategyRuleModal } from '../../components/modals/StrategyRuleModal';
import { getDefaultRulesForStrategy } from '../../utils/defaultStrategyRules';
import type { StrategyRule } from '../../types';

export const LEAPSStrategy: React.FC = () => {
  const { portfolio } = useParams<{ portfolio: string }>();
  const { setPageTitle, setInfoIcon, setWarningIcon } = usePageTitle();
  const navigate = useNavigate();
  const { pushNavigation } = useNavigation();
  const [activeTab, setActiveTab] = useState<'positions' | 'rules' | 'info'>('positions');
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<StrategyRule | null>(null);

  // Initialize rules with defaults
  const [strategyRules, setStrategyRules] = useState<StrategyRule[]>(() => {
    const saved = localStorage.getItem(`strategy-rules-leaps-${portfolio}`);
    if (saved) {
      return JSON.parse(saved) as StrategyRule[];
    }
    return getDefaultRulesForStrategy('leaps', portfolio || '');
  });

  useEffect(() => {
    setPageTitle('LEAPS', `Synthetische aandelen met leverage voor ${portfolio}`);
  }, [setPageTitle, portfolio]);

  // Save rules to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`strategy-rules-leaps-${portfolio}`, JSON.stringify(strategyRules));
  }, [strategyRules, portfolio]);

  const handleAddRule = () => {
    setSelectedRule(null);
    setIsRuleModalOpen(true);
  };

  const handleEditRule = (rule: StrategyRule) => {
    setSelectedRule(rule);
    setIsRuleModalOpen(true);
  };

  const handleSaveRule = (rule: StrategyRule) => {
    if (selectedRule) {
      // Editing existing rule
      setStrategyRules(prev => prev.map(r => r.id === rule.id ? rule : r));
    } else {
      // Adding new rule
      setStrategyRules(prev => [...prev, rule]);
    }
    setIsRuleModalOpen(false);
    setSelectedRule(null);
  };

  const handleDeleteRule = (ruleId: string) => {
    setStrategyRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    setStrategyRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled } : r));
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
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Posities
            <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
              0
            </span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'rules'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <ListTodo className="w-4 h-4" />
            Regels
            {strategyRules.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                {strategyRules.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'info'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Info className="w-4 h-4" />
            Informatie
          </button>
        </div>
        {(activeTab === 'positions' || activeTab === 'rules') && (
          <button
            onClick={() => activeTab === 'positions' ? {} : handleAddRule()}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'positions' ? 'LEAP Toevoegen' : 'Regel Toevoegen'}
          </button>
        )}
      </div>

      {/* Positions Tab */}
      {activeTab === 'positions' && (
        <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Totale Waarde</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">$0.00</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Aantal LEAPS</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">0</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Gemiddelde Delta</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">-</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Doel: 0.80 - 0.90</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Beschikbaar voor Calls</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">0</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Niet gedekt met calls</p>
        </div>
      </div>

      {/* Positions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
        <Zap className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Geen LEAPS posities
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Voeg LEAPS toe om exposure te krijgen met minder kapitaal
        </p>
        <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          Voeg je eerste LEAP toe
        </button>
      </div>
        </>
      )}

      {/* Info Tab */}
      {activeTab === 'info' && (
        <div className="space-y-6">
          {/* Education Section */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-6">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Wat zijn LEAPS?
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    LEAPS (Long-term Equity AnticiPation Securities) zijn call opties met een lange looptijd (typisch 1-2 jaar).
                    Ze fungeren als "synthetische aandelen" omdat ze zich bijna identiek gedragen aan het bezitten van aandelen,
                    maar met <strong>leverage</strong> - je controleert 100 aandelen voor een fractie van de prijs.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Voordeel:</strong> Minder kapitaal nodig dan 100 aandelen kopen
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Leverage:</strong> Grotere procentuele winsten bij koersstijgingen
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Covered Calls:</strong> Schrijf calls op je LEAPS om extra premies te verdienen (zoals bij aandelen)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-500/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        Let op: Leverage werkt twee kanten op
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        LEAPS hebben theta decay (tijdswaardeverval) en kunnen waardeloos aflopen.
                        Gebruik alleen deep-in-the-money LEAPS (hoge delta ~0.80-0.90) voor een synthetisch aandeel effect.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps Section */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/10 dark:to-green-900/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <GraduationCap className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
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
                className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">Covered Calls op LEAPS</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Schrijf calls op je LEAPS voor extra premie-inkomen
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-3" />
                </div>
              </button>
              <button
                onClick={() => {
                  pushNavigation(`/portfolio/${portfolio}/stocks-etfs`, 'Aandelen & ETFs');
                  navigate(`/portfolio/${portfolio}/stocks-etfs`);
                }}
                className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">Terug naar Aandelen & ETFs</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Beheer je basis portfolio
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-3" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <StrategyRules
          strategyType="leaps"
          portfolio={portfolio as any}
          rules={strategyRules}
          onAddRule={handleAddRule}
          onEditRule={handleEditRule}
          onDeleteRule={handleDeleteRule}
          onToggleRule={handleToggleRule}
        />
      )}

      {/* Strategy Rule Modal */}
      {isRuleModalOpen && (
        <StrategyRuleModal
          isOpen={isRuleModalOpen}
          onClose={() => {
            setIsRuleModalOpen(false);
            setSelectedRule(null);
          }}
          onSave={handleSaveRule}
          strategyType="leaps"
          portfolio={portfolio as any}
          existingRule={selectedRule}
        />
      )}
    </div>
    </>
  );
};
