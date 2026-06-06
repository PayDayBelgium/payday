import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  Zap,
  Plus,
  Shield,
  Info,
  ListTodo,
  GraduationCap,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { StrategyRules } from '../../components/strategy/StrategyRules';
import { StrategyRuleModal } from '../../components/modals/StrategyRuleModal';
import { useStrategyRules } from '../../hooks/useStrategyRules';

export const KaChingStrategy: React.FC = () => {
  const { portfolio } = useParams<{ portfolio: string }>();
  const { setPageTitle } = usePageTitle();
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
  } = useStrategyRules('kaching', portfolio);

  useEffect(() => {
    setPageTitle('KaChing Strategy', `Manage KaChing positions for ${portfolio}`);
  }, [setPageTitle, portfolio]);

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
                  : 'text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white'
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
                  : 'text-ink-600 dark:text-ink-400 hover:text-ink-900 dark:hover:text-white'
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
              {activeTab === 'positions' ? 'KaChing Toevoegen' : 'Regel Toevoegen'}
            </button>
          )}
        </div>

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">Protective Puts</p>
                <p className="text-2xl font-bold text-ink-900 dark:text-white mt-1">0</p>
              </div>
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">Total Cost</p>
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-300 mt-1">
                  $0.00
                </p>
              </div>
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">Premium Collected</p>
                <p className="text-2xl font-bold text-ink-900 dark:text-white mt-1">$0.00</p>
              </div>
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">Net Cost</p>
                <p className="text-2xl font-bold text-ink-900 dark:text-white mt-1">$0.00</p>
              </div>
            </div>

            {/* Positions */}
            <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-12 text-center">
              <Zap className="w-16 h-16 text-ink-300 dark:text-ink-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
                Geen KaChing posities
              </h3>
              <p className="text-ink-600 dark:text-ink-400 mb-4">
                Start je eerste KaChing strategie om beschermde inkomsten te genereren
              </p>
              <button className="px-6 py-3 btn-primary text-white rounded-lg font-medium transition-colors">
                Voeg je eerste positie toe
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
                    <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
                      Hoe werkt KaChing?
                    </h3>
                    <p className="text-sm text-ink-700 dark:text-ink-300 mb-3">
                      KaChing is een beschermende strategie die long-term protective puts combineert
                      met wekelijkse premie collectie om de kosten van bescherming te compenseren.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <Shield className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>Bescherming:</strong> Koop long-term protective puts voor downside
                          bescherming
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <Zap className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>Inkomen:</strong> Verkoop wekelijkse calls of puts om premie te
                          verzamelen
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>Doel:</strong> De wekelijkse premies betalen voor de kosten van de
                          bescherming
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>Voordeel:</strong> Beschermde positie die mogelijk zichzelf
                          terugbetaalt
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Strategy components */}
                  <div className="bg-white dark:bg-trading-dark-800 rounded-lg p-5 border border-primary-200 dark:border-primary-700/30">
                    <h4 className="font-semibold text-ink-900 dark:text-white mb-3">
                      Componenten van de KaChing Strategie
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold text-sm flex-shrink-0">
                          1
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink-900 dark:text-white">
                            Koop Protective Puts
                          </p>
                          <p className="text-xs text-ink-600 dark:text-ink-400">
                            Long-term puts (3-12 maanden) voor downside bescherming
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold text-sm flex-shrink-0">
                          2
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink-900 dark:text-white">
                            Verkoop Wekelijkse Opties
                          </p>
                          <p className="text-xs text-ink-600 dark:text-ink-400">
                            Gebruik CSPs (Cash Secured Puts) en/of Covered Calls om wekelijks premie
                            te verzamelen
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold text-sm flex-shrink-0">
                          3
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink-900 dark:text-white">
                            Herhaal Wekelijks
                          </p>
                          <p className="text-xs text-ink-600 dark:text-ink-400">
                            Continue proces - de wekelijkse premies betalen idealiter je bescherming
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Build on CSP */}
                  <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/30 rounded-lg p-5">
                    <h4 className="font-semibold text-ink-900 dark:text-white mb-3">
                      Bouw op bestaande strategieën
                    </h4>
                    <p className="text-sm text-ink-700 dark:text-ink-300 mb-3">
                      KaChing combineert strategieën die je al kent:
                    </p>
                    <div className="space-y-2 text-xs text-ink-700 dark:text-ink-300">
                      <p>
                        • <strong>Cash Secured Puts</strong> als basis voor wekelijkse premie
                      </p>
                      <p>
                        • <strong>Covered Calls</strong> op je aandelen voor extra inkomen
                      </p>
                      <p>
                        • <strong>Protective Puts</strong> voor downside bescherming
                      </p>
                    </div>
                    <p className="text-xs text-ink-600 dark:text-ink-400 mt-3">
                      Net zoals een Covered Call op een LEAP een Poor Man's Covered Call wordt,
                      bouwt KaChing voort op je bestaande Cash Secured Put en Covered Call kennis.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps Section */}
            <div className="bg-gradient-to-r from-primary-50 to-surface-subtle dark:from-blue-900/10 dark:to-purple-900/10 border border-primary-200 dark:border-primary-700/30 rounded-lg p-6">
              <div className="flex items-start gap-3 mb-4">
                <GraduationCap className="w-5 h-5 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                <h3 className="text-lg font-semibold text-ink-900 dark:text-white">
                  Volgende Stappen
                </h3>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    pushNavigation(`/portfolio/${portfolio}/stocks-etfs`, 'Aandelen & ETFs');
                    navigate(`/portfolio/${portfolio}/stocks-etfs`);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <p className="font-medium text-ink-900 dark:text-white">Aandelen & ETFs</p>
                    <p className="text-sm text-ink-600 dark:text-ink-400">
                      Zorg eerst voor een sterke basis portfolio
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-ink-400 flex-shrink-0 ml-3" />
                </button>
                <button
                  onClick={() => {
                    pushNavigation(`/portfolio/${portfolio}/covered-calls`, 'Covered Calls');
                    navigate(`/portfolio/${portfolio}/covered-calls`);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <p className="font-medium text-ink-900 dark:text-white">Covered Calls</p>
                    <p className="text-sm text-ink-600 dark:text-ink-400">
                      Leer eerst hoe je wekelijkse premies verzamelt
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-ink-400 flex-shrink-0 ml-3" />
                </button>
                <button
                  onClick={() => {
                    pushNavigation(`/portfolio/${portfolio}/spreads`, 'Credit Spreads');
                    navigate(`/portfolio/${portfolio}/spreads`);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <p className="font-medium text-ink-900 dark:text-white">Credit Spreads</p>
                    <p className="text-sm text-ink-600 dark:text-ink-400">
                      Geavanceerde strategie voor ervaren traders
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-ink-400 flex-shrink-0 ml-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <StrategyRules
            strategyType="kaching"
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
            strategyType="kaching"
            portfolio={portfolio as any}
            existingRule={selectedRule}
          />
        )}
      </div>
    </>
  );
};
