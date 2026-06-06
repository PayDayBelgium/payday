import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  TrendingUp,
  Plus,
  Info,
  ArrowRight,
  X,
  ListTodo,
  DollarSign,
  GraduationCap,
  Lightbulb,
} from 'lucide-react';
import { StrategyRules } from '../../components/strategy/StrategyRules';
import { StrategyRuleModal } from '../../components/modals/StrategyRuleModal';
import { useStrategyRules } from '../../hooks/useStrategyRules';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectPortfolios } from '../../store/slices/portfoliosSlice';
import { CampaignView } from '../../components/widgets/CampaignView';
import type { CurrencyType } from '../../types';

export const CoveredCallsStrategy: React.FC = () => {
  const { portfolio } = useParams<{ portfolio: string }>();
  const { setPageTitle } = usePageTitle();
  const navigate = useNavigate();
  const { pushNavigation } = useNavigation();
  const portfolios = useAppSelector(selectPortfolios);
  const currency: CurrencyType =
    portfolios.find((p) => p.name === portfolio)?.currency ?? 'USD';
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
  } = useStrategyRules('covered-calls', portfolio);
  const [showInfoBanner, setShowInfoBanner] = useState(() => {
    const dismissed = localStorage.getItem('covered-calls-info-banner-dismissed');
    return dismissed !== 'true';
  });

  const dismissInfoBanner = () => {
    setShowInfoBanner(false);
    localStorage.setItem('covered-calls-info-banner-dismissed', 'true');
  };

  useEffect(() => {
    setPageTitle('Covered Calls', `Genereer extra inkomen voor ${portfolio}`);
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
          {activeTab === 'rules' && (
            <button
              onClick={handleAddRule}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Regel Toevoegen
            </button>
          )}
        </div>

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <>
            {/* Info Banner - dismissible */}
            {showInfoBanner && (
              <div className="bg-gradient-to-r from-primary-50 to-primary-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-primary-200 dark:border-primary-700/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-800/50 flex items-center justify-center">
                      <Info className="w-4 h-4 text-primary-700 dark:text-primary-300" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-ink-900 dark:text-white mb-1">
                      Wat is een Covered Call?
                    </h4>
                    <p className="text-sm text-ink-700 dark:text-ink-300 mb-2">
                      Met een covered call ga je een contract aan waarbij je{' '}
                      <strong>bereid bent om je aandelen te verkopen</strong> tegen een bepaalde
                      prijs (strike) vóór een bepaalde datum (expiratie). In ruil hiervoor ontvang
                      je direct een <strong>premie</strong>.
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-600 dark:text-ink-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-positive-500"></span>
                        Profiteer van prijsstijging tot de strike
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-positive-500"></span>
                        Ontvang premie als extra inkomen
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-positive-500"></span>
                        Herhaal wekelijks of maandelijks
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={dismissInfoBanner}
                    className="flex-shrink-0 p-1 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 transition-colors"
                    title="Niet meer tonen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Covered-call campaigns: each stock position with the calls written
                against it, derived from the shared coverage allocator (shares are
                covered before LEAPS). The campaign view also surfaces the
                write-opportunity when there is free capacity. */}
            <CampaignView
              portfolioName={portfolio ?? ''}
              currency={currency}
              initialFilter="covered-call"
              lockFilter
              className="min-h-[400px]"
            />
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
                      Hoe werkt een Covered Call?
                    </h3>
                    <p className="text-sm text-ink-700 dark:text-ink-300 mb-3">
                      Een Covered Call is een strategie waarbij je een call optie{' '}
                      <strong>schrijft (verkoopt)</strong> op aandelen, ETFs of LEAPS die je al
                      bezit. Je ontvangt direct een <strong>premie</strong> in ruil voor het recht
                      dat iemand anders je aandelen kan kopen tegen de strike price.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>Op Aandelen/ETFs:</strong> Schrijf calls op je bestaande posities
                          voor extra inkomen
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>Op LEAPS:</strong> Schrijf calls op je synthetische aandelen (ook
                          wel "Poor Man's Covered Call" genoemd)
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>Voordeel:</strong> Regelmatig premie-inkomen, typisch maandelijks
                          of wekelijks
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>Nadeel:</strong> Je winst is gelimiteerd tot de strike price (+
                          premie)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Strategy Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/30 rounded-lg p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <TrendingUp className="w-5 h-5 text-primary-700 dark:text-primary-300" />
                        <h4 className="font-semibold text-ink-900 dark:text-white">
                          Covered Calls op Aandelen/ETFs
                        </h4>
                      </div>
                      <p className="text-sm text-ink-700 dark:text-ink-300 mb-2">
                        De traditionele methode: je bezit 100 aandelen en schrijft 1 call contract.
                      </p>
                      <div className="text-xs text-ink-600 dark:text-ink-400 space-y-1">
                        <p>✓ Geen leverage risico</p>
                        <p>✓ Dividend inkomsten blijven</p>
                        <p>✓ Volle ownership rechten</p>
                      </div>
                    </div>

                    <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/30 rounded-lg p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <DollarSign className="w-5 h-5 text-primary-700 dark:text-primary-300" />
                        <h4 className="font-semibold text-ink-900 dark:text-white">
                          Covered Calls op LEAPS
                        </h4>
                      </div>
                      <p className="text-sm text-ink-700 dark:text-ink-300 mb-2">
                        Ook wel Poor Man's Covered Call genoemd: je gebruikt een LEAP als onderpand
                        in plaats van aandelen.
                      </p>
                      <div className="text-xs text-ink-600 dark:text-ink-400 space-y-1">
                        <p>✓ Minder kapitaal nodig</p>
                        <p>✓ Leverage voordeel</p>
                        <p>✗ Theta decay op LEAP</p>
                      </div>
                    </div>
                  </div>

                  {/* Prerequisites */}
                  <div className="bg-caution-50 dark:bg-caution-600/15 border border-caution-500/30 dark:border-caution-500/30 rounded-lg p-4">
                    <h4 className="font-semibold text-ink-900 dark:text-white mb-3">
                      Voordat je begint
                    </h4>
                    <div className="space-y-2 text-sm text-ink-700 dark:text-ink-300">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                        <p>Je hebt minstens 100 aandelen nodig voor 1 covered call op aandelen</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                        <p>Of je hebt 1 LEAP nodig voor een Poor Man's Covered Call</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps Section */}
            <div className="bg-gradient-to-r from-primary-50 to-primary-50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-primary-200 dark:border-primary-700/30 rounded-lg p-6">
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
                  className="w-full text-left p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      <p className="font-medium text-ink-900 dark:text-white">Aandelen & ETFs</p>
                      <p className="text-sm text-ink-600 dark:text-ink-400">
                        Beheer je onderliggende posities voor covered calls
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-ink-400 flex-shrink-0 ml-3" />
                  </div>
                </button>
                <button
                  onClick={() => {
                    pushNavigation(`/portfolio/${portfolio}/leaps`, 'LEAPS');
                    navigate(`/portfolio/${portfolio}/leaps`);
                  }}
                  className="w-full text-left p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      <p className="font-medium text-ink-900 dark:text-white">LEAPS</p>
                      <p className="text-sm text-ink-600 dark:text-ink-400">
                        Bekijk je LEAPS posities voor Poor Man's Covered Call strategie
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-ink-400 flex-shrink-0 ml-3" />
                  </div>
                </button>
                <button
                  onClick={() => {
                    pushNavigation(`/portfolio/${portfolio}/csp`, 'Cash Secured Puts');
                    navigate(`/portfolio/${portfolio}/csp`);
                  }}
                  className="w-full text-left p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      <p className="font-medium text-ink-900 dark:text-white">Cash Secured Puts</p>
                      <p className="text-sm text-ink-600 dark:text-ink-400">
                        Krijg premies om aandelen te kopen aan jouw gewenste prijs
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-ink-400 flex-shrink-0 ml-3" />
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <StrategyRules
            strategyType="covered-calls"
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
            strategyType="covered-calls"
            portfolio={portfolio as any}
            existingRule={selectedRule}
          />
        )}
      </div>
    </>
  );
};
