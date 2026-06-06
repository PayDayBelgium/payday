import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import { Plus, Info, ArrowRight, Wallet, X, ListTodo, DollarSign, GraduationCap, Lightbulb } from 'lucide-react';
import { StrategyRules } from '../../components/strategy/StrategyRules';
import { StrategyRuleModal } from '../../components/modals/StrategyRuleModal';
// import { AddCSPModal } from '../../components/modals/AddCSPModal';
import { useStrategyRules } from '../../hooks/useStrategyRules';
import type { StrategyRule } from '../../types';

export const CSPStrategy: React.FC = () => {
  const { portfolio } = useParams<{ portfolio: string }>();
  const { setPageTitle, setInfoIcon } = usePageTitle();
  const navigate = useNavigate();
  const { pushNavigation } = useNavigation();
  const [activeTab, setActiveTab] = useState<'positions' | 'rules' | 'info'>('positions');
  const [isCSPModalOpen, setIsCSPModalOpen] = useState(false);
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
  } = useStrategyRules('csp', portfolio);

  useEffect(() => {
    setPageTitle('Cash Secured Puts', `Beheer CSPs voor ${portfolio}`);
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
            onClick={() => activeTab === 'positions' ? setIsCSPModalOpen(true) : handleAddRule()}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'positions' ? 'Put Toevoegen' : 'Regel Toevoegen'}
          </button>
        )}
      </div>

      {/* Positions Tab */}
      {activeTab === 'positions' && (
        <>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Actieve Puts</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">0</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Open posities</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Cash Reserved</p>
          <p className="text-2xl font-bold text-primary-700 dark:text-primary-300 mt-1">$0.00</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Totaal onderpand</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Beschikbare Cash</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">$0.00</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Voor nieuwe CSPs</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400">Premie</p>
          <p className="text-2xl font-bold text-positive-600 dark:text-positive-500 mt-1">$0.00 / $0.00</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Verdient / Verwacht (0%)</p>
        </div>
      </div>

      {/* Positions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
        <DollarSign className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Geen Cash Secured Puts
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Schrijf je eerste CSP om premie-inkomen te genereren terwijl je wacht op een goede instapprijs
        </p>
        <button className="px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors">
          Schrijf je Eerste CSP
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
                    Hoe werkt een Cash Secured Put?
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    Een Cash Secured Put is een strategie waarbij je een put optie <strong>schrijft (verkoopt)</strong> op een
                    aandeel of ETF die je <strong>wilt kopen</strong>, maar aan een <strong>lagere prijs</strong> dan de huidige koers.
                    Je ontvangt direct een <strong>premie</strong> en moet <strong>cash als onderpand</strong> aanhouden.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Scenario 1:</strong> Prijs blijft boven strike → Put verloopt waardeloos → Jij houdt de premie
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Scenario 2:</strong> Prijs daalt onder strike → Je wordt "assigned" → Je koopt 100 aandelen aan de strike price
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Voordeel:</strong> Je krijgt betaald (premie) om te wachten tot aandelen goedkoper worden
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <strong>Vereiste:</strong> Cash onderpand = Strike price × 100 aandelen
                      </p>
                    </div>
                  </div>
                </div>

                {/* Onderpand Explanation */}
                <div className="bg-caution-50 dark:bg-caution-600/15 border border-caution-500/30 dark:border-caution-500/30 rounded-lg p-5">
                  <div className="flex items-start gap-3">
                    <Wallet className="w-5 h-5 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                        Waarom "Cash Secured"?
                      </h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                        Je moet voldoende <strong>cash (onderpand)</strong> hebben om de aandelen te kopen als je wordt "assigned".
                      </p>
                      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-caution-500/30 dark:border-caution-500/30">
                        <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Voorbeeld:</p>
                        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          <li>• Je schrijft 1 put op AAPL met strike $150</li>
                          <li>• Je ontvangt $200 premie</li>
                          <li>• <strong>Vereist onderpand: $15,000</strong> ($150 × 100)</li>
                          <li>• Als AAPL onder $150 gaat → Je koopt 100 AAPL aan $150</li>
                          <li>• Effectieve kostprijs: $150 - $2 (premie) = <strong>$148 per aandeel</strong></li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Strategy Tips */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Wanneer gebruik je een CSP?
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                        ✓ Goede Use Cases
                      </h5>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        <li>• Je wilt een aandeel/ETF kopen, maar vindt het nu te duur</li>
                        <li>• Je hebt cash en wilt extra rendement terwijl je wacht</li>
                        <li>• Je bent bullish op een aandeel op langere termijn</li>
                        <li>• Je wilt je gemiddelde inkoopprijs verlagen</li>
                      </ul>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-2">
                        ✗ Vermijd CSP wanneer
                      </h5>
                      <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        <li>• Je het aandeel niet wilt bezitten</li>
                        <li>• Je onvoldoende cash hebt als onderpand</li>
                        <li>• Je bearish bent op het aandeel</li>
                        <li>• De premie is te laag voor het risico</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps Section */}
          <div className="bg-gradient-to-r from-primary-50 to-positive-50 dark:from-blue-900/10 dark:to-green-900/10 border border-primary-200 dark:border-primary-700/30 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <GraduationCap className="w-5 h-5 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  De Complete Cyclus
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
                  CSPs en Covered Calls kunnen samen een krachtige income strategie vormen:
                </p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold text-sm">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Schrijf CSP → Ontvang premie</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold text-sm">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Wordt assigned → Krijg 100 aandelen aan strike price
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-positive-50 dark:bg-positive-700/25 text-positive-600 dark:text-positive-500 font-semibold text-sm">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Schrijf Covered Calls op die aandelen → Ontvang meer premie
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-muted dark:bg-trading-dark-600 text-ink-600 dark:text-ink-300 font-semibold text-sm">
                      4
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Aandelen worden called away → Verkoop met winst → Herhaal cyclus
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-3 mt-6">
              <button
                onClick={() => {
                  pushNavigation(`/portfolio/${portfolio}/covered-calls`, 'Covered Calls');
                  navigate(`/portfolio/${portfolio}/covered-calls`);
                }}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
              >
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 dark:text-white">Covered Calls Strategie</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Leer hoe je premies verdient op je aandelen
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-3" />
              </button>
              <button
                onClick={() => {
                  pushNavigation(`/portfolio/${portfolio}/stocks-etfs`, 'Aandelen & ETFs');
                  navigate(`/portfolio/${portfolio}/stocks-etfs`);
                }}
                className="w-full flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
              >
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900 dark:text-white">Aandelen & ETFs</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Bekijk je huidige posities
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
          strategyType="csp"
          portfolio={portfolio as any}
          rules={strategyRules}
          onAddRule={handleAddRule}
          onEditRule={handleEditRule}
          onDeleteRule={handleDeleteRule}
          onToggleRule={handleToggleRule}
        />
      )}

      {/* Add CSP Modal */}
      {/* <AddCSPModal
        isOpen={isCSPModalOpen}
        onClose={() => setIsCSPModalOpen(false)}
        portfolio={portfolio as any}
      /> */}

      {/* Strategy Rule Modal */}
      {isRuleModalOpen && (
        <StrategyRuleModal
          isOpen={isRuleModalOpen}
          onClose={closeRuleModal}
          onSave={handleSaveRule}
          strategyType="csp"
          portfolio={portfolio as any}
          existingRule={selectedRule}
        />
      )}
    </div>
    </>
  );
};
