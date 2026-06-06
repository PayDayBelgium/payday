import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  ListTodo,
  Info,
  X,
  GraduationCap,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { StrategyRules } from '../../components/strategy/StrategyRules';
import { StrategyRuleModal } from '../../components/modals/StrategyRuleModal';
import { useStrategyRules } from '../../hooks/useStrategyRules';
import type { StrategyRule } from '../../types';

export const SpreadsStrategy: React.FC = () => {
  const { portfolio } = useParams<{ portfolio: string }>();
  const { setPageTitle, setInfoIcon } = usePageTitle();
  const navigate = useNavigate();
  const { pushNavigation } = useNavigation();
  const [activeTab, setActiveTab] = useState<'positions' | 'rules' | 'info'>('positions');
  const {
    strategyRules,
    isRuleModalOpen,
    selectedRule,
    openAddRule: handleAddRule,
    openEditRule: handleEditRule,
    closeRuleModal,
    saveRule: handleSaveRule,
    deleteRule: handleDeleteRule,
    toggleRule: handleToggleRule,
  } = useStrategyRules('spreads', portfolio);

  useEffect(() => {
    setPageTitle('Credit Spreads', `Manage credit spreads for ${portfolio}`);
  }, [setPageTitle, portfolio]);

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
              <span className="px-2 py-0.5 rounded-full text-xs bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">
                0
              </span>
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
              onClick={() => (activeTab === 'positions' ? {} : handleAddRule())}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'positions' ? 'Spread Toevoegen' : 'Regel Toevoegen'}
            </button>
          )}
        </div>

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">Actieve Spreads</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">0</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Credit Ontvangen</p>
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-300 mt-1">
                  $0.00
                </p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">Buying Power Used</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">$0.00</p>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <p className="text-sm text-gray-600 dark:text-gray-400">Win Rate</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">-%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Van alle gesloten spreads
                </p>
              </div>
            </div>

            {/* Positions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <TrendingDown className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Geen spreads
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Voeg je eerste spread toe - het systeem herkent automatisch of het een Bull Put,
                Bear Call of Iron Condor is
              </p>
              <button className="px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors">
                Voeg je eerste spread toe
              </button>
            </div>
          </>
        )}

        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            {/* Education Section */}
            <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/30 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Hoe werken Credit Spreads?
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      Credit spreads zijn defined-risk optie strategieën waarbij je één optie
                      verkoopt en een andere verder out-of-the-money optie koopt voor bescherming.
                      Je ontvangt direct een credit (premie). Het systeem herkent automatisch welk
                      type spread je maakt.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Bull Put Spread:</strong> Bullish - verkoop put + koop put (lagere
                          strike) voor bescherming
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Bear Call Spread:</strong> Bearish - verkoop call + koop call
                          (hogere strike) voor bescherming
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Iron Condor:</strong> Combinatie van beide - Bull Put Spread +
                          Bear Call Spread = dubbele premie bij neutraal verwachting
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Voordeel:</strong> Gedefinieerd risico - je weet vooraf exact
                          hoeveel je maximaal kunt verliezen
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Spread types comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-positive-50 dark:bg-positive-700/15 border border-positive-500/20 dark:border-positive-700/30 rounded-lg p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <TrendingUp className="w-5 h-5 text-positive-600 dark:text-positive-500" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          Bull Put Spread
                        </h4>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Wanneer je verwacht dat de prijs stabiel blijft of stijgt
                      </p>
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <p>✓ Neutraal tot bullish</p>
                        <p>✓ Tijd is je vriend</p>
                        <p>✓ Max winst = credit</p>
                      </div>
                    </div>

                    <div className="bg-negative-50 dark:bg-negative-700/15 border border-negative-500/20 dark:border-negative-700/30 rounded-lg p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <TrendingDown className="w-5 h-5 text-negative-600 dark:text-negative-500" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          Bear Call Spread
                        </h4>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Wanneer je verwacht dat de prijs stabiel blijft of daalt
                      </p>
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <p>✓ Neutraal tot bearish</p>
                        <p>✓ Tijd is je vriend</p>
                        <p>✓ Max winst = credit</p>
                      </div>
                    </div>

                    <div className="bg-surface-subtle dark:bg-trading-dark-700 border border-ink-200 dark:border-ink-600/30 rounded-lg p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <ArrowRight className="w-5 h-5 text-ink-600 dark:text-ink-300" />
                        <h4 className="font-semibold text-gray-900 dark:text-white">Iron Condor</h4>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                        Bull Put + Bear Call = dubbele premie bij neutrale markt
                      </p>
                      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <p>✓ Neutraal verwachting</p>
                        <p>✓ Hogere premie</p>
                        <p>✓ Beide kanten beschermd</p>
                      </div>
                    </div>
                  </div>

                  {/* Intelligent Recognition */}
                  <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/30 rounded-lg p-5">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                      Intelligente Herkenning
                    </h4>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      Het systeem herkent automatisch welk type spread je maakt op basis van je
                      posities:
                    </p>
                    <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                      <p>
                        • <strong>1 Put spread</strong> = Bull Put Spread (bullish/neutraal)
                      </p>
                      <p>
                        • <strong>1 Call spread</strong> = Bear Call Spread (bearish/neutraal)
                      </p>
                      <p>
                        • <strong>Put spread + Call spread samen</strong> = Iron Condor (neutraal)
                      </p>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-3">
                      Net zoals een Covered Call op een LEAP automatisch een Poor Man's Covered Call
                      wordt, combineren twee spreads automatisch tot een Iron Condor.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps Section */}
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
                    pushNavigation(`/portfolio/${portfolio}/csp`, 'Cash Secured Puts');
                    navigate(`/portfolio/${portfolio}/csp`);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">Cash Secured Puts</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Begin met de basis - verkoop individuele puts
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-3" />
                </button>
                <button
                  onClick={() => {
                    pushNavigation(`/portfolio/${portfolio}/covered-calls`, 'Covered Calls');
                    navigate(`/portfolio/${portfolio}/covered-calls`);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <p className="font-medium text-gray-900 dark:text-white">Covered Calls</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Genereer inkomsten met calls op je posities
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <StrategyRules
            strategyType="spreads"
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
            onClose={closeRuleModal}
            onSave={handleSaveRule}
            strategyType="spreads"
            portfolio={portfolio as any}
            existingRule={selectedRule}
          />
        )}
      </div>
    </>
  );
};
