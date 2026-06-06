import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  Plus,
  Info,
  ArrowRight,
  Wallet,
  ListTodo,
  DollarSign,
  GraduationCap,
  Lightbulb,
} from 'lucide-react';
import { StrategyRules } from '../../components/strategy/StrategyRules';
import { StrategyRuleModal } from '../../components/modals/StrategyRuleModal';
// import { AddCSPModal } from '../../components/modals/AddCSPModal';
import { useStrategyRules } from '../../hooks/useStrategyRules';

export const CSPStrategy: React.FC = () => {
  const { portfolio } = useParams<{ portfolio: string }>();
  const { t } = useTranslation();
  const { setPageTitle } = usePageTitle();
  const navigate = useNavigate();
  const { pushNavigation } = useNavigation();
  const [activeTab, setActiveTab] = useState<'positions' | 'rules' | 'info'>('positions');
  const [, setIsCSPModalOpen] = useState(false);
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
    setPageTitle('Cash Secured Puts', t('stratPages.cspSubtitle', { portfolio }));
  }, [setPageTitle, portfolio, t]);

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
              onClick={() =>
                activeTab === 'positions' ? setIsCSPModalOpen(true) : handleAddRule()
              }
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'positions' ? t('stratPages.cspAddPut') : t('stratPages.addRule')}
            </button>
          )}
        </div>

        {/* Positions Tab */}
        {activeTab === 'positions' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {t('stratPages.cspActivePuts')}
                </p>
                <p className="text-2xl font-bold text-ink-900 dark:text-white mt-1">0</p>
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                  {t('stratPages.cspOpenPositions')}
                </p>
              </div>
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {t('stratPages.cspCashReserved')}
                </p>
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-300 mt-1">
                  $0.00
                </p>
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                  {t('stratPages.cspTotalCollateral')}
                </p>
              </div>
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {t('stratPages.cspAvailableCash')}
                </p>
                <p className="text-2xl font-bold text-ink-900 dark:text-white mt-1">$0.00</p>
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                  {t('stratPages.cspForNewCsps')}
                </p>
              </div>
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {t('stratPages.cspPremium')}
                </p>
                <p className="text-2xl font-bold text-positive-600 dark:text-positive-500 mt-1">
                  $0.00 / $0.00
                </p>
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                  {t('stratPages.cspEarnedExpected', { percent: 0 })}
                </p>
              </div>
            </div>

            {/* Positions */}
            <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-12 text-center">
              <DollarSign className="w-16 h-16 text-ink-300 dark:text-ink-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
                {t('stratPages.cspNoPositionsTitle')}
              </h3>
              <p className="text-ink-600 dark:text-ink-400 mb-4">
                {t('stratPages.cspNoPositionsDesc')}
              </p>
              <button className="px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors">
                {t('stratPages.cspWriteFirst')}
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
                      {t('stratPages.cspHowTitle')}
                    </h3>
                    <p className="text-sm text-ink-700 dark:text-ink-300 mb-3">
                      {t('stratPages.cspHowIntro1')}
                      <strong>{t('stratPages.cspHowIntroWrite')}</strong>
                      {t('stratPages.cspHowIntro2')}
                      <strong>{t('stratPages.cspHowIntroWant')}</strong>
                      {t('stratPages.cspHowIntro3')}
                      <strong>{t('stratPages.cspHowIntroLower')}</strong>
                      {t('stratPages.cspHowIntro4')}
                      <strong>{t('stratPages.cspHowIntroPremium')}</strong>
                      {t('stratPages.cspHowIntro5')}
                      <strong>{t('stratPages.cspHowIntroCash')}</strong>
                      {t('stratPages.cspHowIntro6')}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.cspScenario1Label')}</strong>
                          {t('stratPages.cspScenario1')}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.cspScenario2Label')}</strong>
                          {t('stratPages.cspScenario2')}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.cspAdvantageLabel')}</strong>
                          {t('stratPages.cspAdvantage')}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.cspRequirementLabel')}</strong>
                          {t('stratPages.cspRequirement')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Collateral Explanation */}
                  <div className="bg-caution-50 dark:bg-caution-600/15 border border-caution-500/30 dark:border-caution-500/30 rounded-lg p-5">
                    <div className="flex items-start gap-3">
                      <Wallet className="w-5 h-5 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-semibold text-ink-900 dark:text-white mb-2">
                          {t('stratPages.cspWhyCashSecured')}
                        </h4>
                        <p className="text-sm text-ink-700 dark:text-ink-300 mb-3">
                          {t('stratPages.cspWhyCashSecuredDesc1')}
                          <strong>{t('stratPages.cspWhyCashSecuredCash')}</strong>
                          {t('stratPages.cspWhyCashSecuredDesc2')}
                        </p>
                        <div className="bg-white dark:bg-trading-dark-800 rounded-lg p-4 border border-caution-500/30 dark:border-caution-500/30">
                          <p className="text-sm font-medium text-ink-900 dark:text-white mb-2">
                            {t('stratPages.cspExampleLabel')}
                          </p>
                          <ul className="text-sm text-ink-700 dark:text-ink-300 space-y-1">
                            <li>• {t('stratPages.cspExample1')}</li>
                            <li>• {t('stratPages.cspExample2')}</li>
                            <li>
                              • <strong>{t('stratPages.cspExample3Label')}</strong>
                              {t('stratPages.cspExample3')}
                            </li>
                            <li>• {t('stratPages.cspExample4')}</li>
                            <li>
                              • {t('stratPages.cspExample5')}
                              <strong>{t('stratPages.cspExample5Bold')}</strong>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Strategy Tips */}
                  <div>
                    <h4 className="text-lg font-semibold text-ink-900 dark:text-white mb-3">
                      {t('stratPages.cspWhenUse')}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white dark:bg-trading-dark-800 rounded-lg p-4 border border-surface-line dark:border-trading-dark-600">
                        <h5 className="font-medium text-ink-900 dark:text-white mb-2">
                          {t('stratPages.cspGoodUseCases')}
                        </h5>
                        <ul className="text-sm text-ink-700 dark:text-ink-300 space-y-1">
                          <li>• {t('stratPages.cspGood1')}</li>
                          <li>• {t('stratPages.cspGood2')}</li>
                          <li>• {t('stratPages.cspGood3')}</li>
                          <li>• {t('stratPages.cspGood4')}</li>
                        </ul>
                      </div>
                      <div className="bg-white dark:bg-trading-dark-800 rounded-lg p-4 border border-surface-line dark:border-trading-dark-600">
                        <h5 className="font-medium text-ink-900 dark:text-white mb-2">
                          {t('stratPages.cspAvoidWhen')}
                        </h5>
                        <ul className="text-sm text-ink-700 dark:text-ink-300 space-y-1">
                          <li>• {t('stratPages.cspAvoid1')}</li>
                          <li>• {t('stratPages.cspAvoid2')}</li>
                          <li>• {t('stratPages.cspAvoid3')}</li>
                          <li>• {t('stratPages.cspAvoid4')}</li>
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
                  <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-3">
                    {t('stratPages.cspCompleteCycle')}
                  </h3>
                  <p className="text-sm text-ink-700 dark:text-ink-300 mb-4">
                    {t('stratPages.cspCompleteCycleDesc')}
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold text-sm">
                        1
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink-900 dark:text-white">
                          {t('stratPages.cspCycle1')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold text-sm">
                        2
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink-900 dark:text-white">
                          {t('stratPages.cspCycle2')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-positive-50 dark:bg-positive-700/25 text-positive-600 dark:text-positive-500 font-semibold text-sm">
                        3
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink-900 dark:text-white">
                          {t('stratPages.cspCycle3')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-surface-muted dark:bg-trading-dark-600 text-ink-600 dark:text-ink-300 font-semibold text-sm">
                        4
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-ink-900 dark:text-white">
                          {t('stratPages.cspCycle4')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3 mt-6">
                <button
                  onClick={() => {
                    pushNavigation(
                      `/portfolio/${portfolio}/covered-calls`,
                      t('stratPages.navCoveredCalls')
                    );
                    navigate(`/portfolio/${portfolio}/covered-calls`);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <p className="font-medium text-ink-900 dark:text-white">
                      {t('stratPages.cspLinkCcTitle')}
                    </p>
                    <p className="text-sm text-ink-600 dark:text-ink-400">
                      {t('stratPages.cspLinkCcDesc')}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-ink-400 flex-shrink-0 ml-3" />
                </button>
                <button
                  onClick={() => {
                    pushNavigation(
                      `/portfolio/${portfolio}/stocks-etfs`,
                      t('stratPages.navStocksEtfs')
                    );
                    navigate(`/portfolio/${portfolio}/stocks-etfs`);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <p className="font-medium text-ink-900 dark:text-white">
                      {t('stratPages.navStocksEtfs')}
                    </p>
                    <p className="text-sm text-ink-600 dark:text-ink-400">
                      {t('stratPages.cspLinkStocksDesc')}
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
