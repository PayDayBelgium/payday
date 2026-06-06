import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  TrendingDown,
  TrendingUp,
  Plus,
  ListTodo,
  Info,
  GraduationCap,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { StrategyRules } from '../../components/strategy/StrategyRules';
import { StrategyRuleModal } from '../../components/modals/StrategyRuleModal';
import { useStrategyRules } from '../../hooks/useStrategyRules';

export const SpreadsStrategy: React.FC = () => {
  const { portfolio } = useParams<{ portfolio: string }>();
  const { t } = useTranslation();
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
  } = useStrategyRules('spreads', portfolio);

  useEffect(() => {
    setPageTitle('Credit Spreads', `Manage credit spreads for ${portfolio}`);
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
              onClick={() => (activeTab === 'positions' ? {} : handleAddRule())}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {activeTab === 'positions' ? t('stratPages.spreadsAdd') : t('stratPages.addRule')}
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
                  {t('stratPages.spreadsActive')}
                </p>
                <p className="text-2xl font-bold text-ink-900 dark:text-white mt-1">0</p>
              </div>
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {t('stratPages.spreadsTotalCredit')}
                </p>
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-300 mt-1">
                  $0.00
                </p>
              </div>
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">Buying Power Used</p>
                <p className="text-2xl font-bold text-ink-900 dark:text-white mt-1">$0.00</p>
              </div>
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">Win Rate</p>
                <p className="text-2xl font-bold text-ink-900 dark:text-white mt-1">-%</p>
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                  {t('stratPages.spreadsOfAllClosed')}
                </p>
              </div>
            </div>

            {/* Positions */}
            <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-12 text-center">
              <TrendingDown className="w-16 h-16 text-ink-300 dark:text-ink-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
                {t('stratPages.spreadsNoPositionsTitle')}
              </h3>
              <p className="text-ink-600 dark:text-ink-400 mb-4">
                {t('stratPages.spreadsNoPositionsDesc')}
              </p>
              <button className="px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors">
                {t('stratPages.spreadsAddFirst')}
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
                      {t('stratPages.spreadsHowTitle')}
                    </h3>
                    <p className="text-sm text-ink-700 dark:text-ink-300 mb-3">
                      {t('stratPages.spreadsHowDesc')}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.spreadsBullPutLabel')}</strong>
                          {t('stratPages.spreadsBullPut')}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.spreadsBearCallLabel')}</strong>
                          {t('stratPages.spreadsBearCall')}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.spreadsIronCondorLabel')}</strong>
                          {t('stratPages.spreadsIronCondor')}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.spreadsAdvantageLabel')}</strong>
                          {t('stratPages.spreadsAdvantage')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Spread types comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-positive-50 dark:bg-positive-700/15 border border-positive-500/20 dark:border-positive-700/30 rounded-lg p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <TrendingUp className="w-5 h-5 text-positive-600 dark:text-positive-500" />
                        <h4 className="font-semibold text-ink-900 dark:text-white">
                          {t('stratPages.spreadsBullPutCardTitle')}
                        </h4>
                      </div>
                      <p className="text-sm text-ink-700 dark:text-ink-300 mb-2">
                        {t('stratPages.spreadsBullPutCardDesc')}
                      </p>
                      <div className="text-xs text-ink-600 dark:text-ink-400 space-y-1">
                        <p>{t('stratPages.spreadsBullPutBullet1')}</p>
                        <p>{t('stratPages.spreadsBullPutBullet2')}</p>
                        <p>{t('stratPages.spreadsBullPutBullet3')}</p>
                      </div>
                    </div>

                    <div className="bg-negative-50 dark:bg-negative-700/15 border border-negative-500/20 dark:border-negative-700/30 rounded-lg p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <TrendingDown className="w-5 h-5 text-negative-600 dark:text-negative-500" />
                        <h4 className="font-semibold text-ink-900 dark:text-white">
                          {t('stratPages.spreadsBearCallCardTitle')}
                        </h4>
                      </div>
                      <p className="text-sm text-ink-700 dark:text-ink-300 mb-2">
                        {t('stratPages.spreadsBearCallCardDesc')}
                      </p>
                      <div className="text-xs text-ink-600 dark:text-ink-400 space-y-1">
                        <p>{t('stratPages.spreadsBearCallBullet1')}</p>
                        <p>{t('stratPages.spreadsBearCallBullet2')}</p>
                        <p>{t('stratPages.spreadsBearCallBullet3')}</p>
                      </div>
                    </div>

                    <div className="bg-surface-subtle dark:bg-trading-dark-700 border border-ink-200 dark:border-ink-600/30 rounded-lg p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <ArrowRight className="w-5 h-5 text-ink-600 dark:text-ink-300" />
                        <h4 className="font-semibold text-ink-900 dark:text-white">
                          {t('stratPages.spreadsIronCondorCardTitle')}
                        </h4>
                      </div>
                      <p className="text-sm text-ink-700 dark:text-ink-300 mb-2">
                        {t('stratPages.spreadsIronCondorCardDesc')}
                      </p>
                      <div className="text-xs text-ink-600 dark:text-ink-400 space-y-1">
                        <p>{t('stratPages.spreadsIronCondorBullet1')}</p>
                        <p>{t('stratPages.spreadsIronCondorBullet2')}</p>
                        <p>{t('stratPages.spreadsIronCondorBullet3')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Intelligent Recognition */}
                  <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/30 rounded-lg p-5">
                    <h4 className="font-semibold text-ink-900 dark:text-white mb-3">
                      {t('stratPages.spreadsRecognitionTitle')}
                    </h4>
                    <p className="text-sm text-ink-700 dark:text-ink-300 mb-3">
                      {t('stratPages.spreadsRecognitionDesc')}
                    </p>
                    <div className="space-y-2 text-xs text-ink-700 dark:text-ink-300">
                      <p>
                        • <strong>{t('stratPages.spreadsRecog1Label')}</strong>
                        {t('stratPages.spreadsRecog1')}
                      </p>
                      <p>
                        • <strong>{t('stratPages.spreadsRecog2Label')}</strong>
                        {t('stratPages.spreadsRecog2')}
                      </p>
                      <p>
                        • <strong>{t('stratPages.spreadsRecog3Label')}</strong>
                        {t('stratPages.spreadsRecog3')}
                      </p>
                    </div>
                    <p className="text-xs text-ink-600 dark:text-ink-400 mt-3">
                      {t('stratPages.spreadsRecognitionNote')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps Section */}
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
                      `/portfolio/${portfolio}/csp`,
                      t('stratPages.navCashSecuredPuts')
                    );
                    navigate(`/portfolio/${portfolio}/csp`);
                  }}
                  className="w-full flex items-center justify-between p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex-1 text-left">
                    <p className="font-medium text-ink-900 dark:text-white">
                      {t('stratPages.navCashSecuredPuts')}
                    </p>
                    <p className="text-sm text-ink-600 dark:text-ink-400">
                      {t('stratPages.spreadsLinkCspDesc')}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-ink-400 flex-shrink-0 ml-3" />
                </button>
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
                      {t('stratPages.navCoveredCalls')}
                    </p>
                    <p className="text-sm text-ink-600 dark:text-ink-400">
                      {t('stratPages.spreadsLinkCcDesc')}
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
