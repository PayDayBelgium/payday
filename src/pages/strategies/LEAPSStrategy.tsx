import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import {
  Zap,
  Plus,
  AlertCircle,
  Info,
  ArrowRight,
  ListTodo,
  GraduationCap,
  Lightbulb,
} from 'lucide-react';
import { StrategyRules } from '../../components/strategy/StrategyRules';
import { StrategyRuleModal } from '../../components/modals/StrategyRuleModal';
import { useStrategyRules } from '../../hooks/useStrategyRules';

export const LEAPSStrategy: React.FC = () => {
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
  } = useStrategyRules('leaps', portfolio);

  useEffect(() => {
    setPageTitle('LEAPS', t('stratPages.leapsSubtitle', { portfolio }));
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
          {activeTab === 'rules' && (
            <button
              onClick={handleAddRule}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary-700 hover:bg-primary-800 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('stratPages.addRule')}
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
                  {t('stratPages.leapsTotalValue')}
                </p>
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-300 mt-1">
                  $0.00
                </p>
              </div>
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {t('stratPages.leapsCount')}
                </p>
                <p className="text-2xl font-bold text-ink-900 dark:text-white mt-1">0</p>
              </div>
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {t('stratPages.leapsAvgDelta')}
                </p>
                <p className="text-2xl font-bold text-ink-900 dark:text-white mt-1">-</p>
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                  {t('stratPages.leapsTarget')}
                </p>
              </div>
              <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6">
                <p className="text-sm text-ink-600 dark:text-ink-400">
                  {t('stratPages.leapsAvailableForCalls')}
                </p>
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-300 mt-1">0</p>
                <p className="text-xs text-ink-500 dark:text-ink-400 mt-1">
                  {t('stratPages.leapsNotCovered')}
                </p>
              </div>
            </div>

            {/* Positions */}
            <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-12 text-center">
              <Zap className="w-16 h-16 text-ink-300 dark:text-ink-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
                {t('stratPages.leapsNoPositionsTitle')}
              </h3>
              <p className="text-ink-600 dark:text-ink-400 mb-4">
                {t('stratPages.leapsNoPositionsDesc')}
              </p>
              <button className="px-6 py-3 bg-primary-700 hover:bg-primary-800 text-white rounded-lg font-medium transition-colors">
                {t('stratPages.leapsAddFirst')}
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
                      {t('stratPages.leapsWhatTitle')}
                    </h3>
                    <p className="text-sm text-ink-700 dark:text-ink-300 mb-3">
                      {t('stratPages.leapsWhatDesc1')}
                      <strong>{t('stratPages.leapsWhatLeverage')}</strong>
                      {t('stratPages.leapsWhatDesc2')}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.leapsAdvantageLabel')}</strong>
                          {t('stratPages.leapsAdvantage')}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.leapsLeverageLabel')}</strong>
                          {t('stratPages.leapsLeverage')}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.leapsCcLabel')}</strong>
                          {t('stratPages.leapsCc')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-caution-50 dark:bg-caution-600/15 border border-caution-500/30 dark:border-caution-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="font-medium text-ink-900 dark:text-white mb-1">
                          {t('stratPages.leapsWarningTitle')}
                        </h4>
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          {t('stratPages.leapsWarningDesc')}
                        </p>
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
                <h3 className="text-lg font-semibold text-ink-900 dark:text-white">
                  {t('stratPages.nextSteps')}
                </h3>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => {
                    pushNavigation(
                      `/portfolio/${portfolio}/covered-calls`,
                      t('stratPages.navCoveredCalls')
                    );
                    navigate(`/portfolio/${portfolio}/covered-calls`);
                  }}
                  className="w-full text-left p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      <p className="font-medium text-ink-900 dark:text-white">
                        {t('stratPages.leapsLinkCcTitle')}
                      </p>
                      <p className="text-sm text-ink-600 dark:text-ink-400">
                        {t('stratPages.leapsLinkCcDesc')}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-ink-400 flex-shrink-0 ml-3" />
                  </div>
                </button>
                <button
                  onClick={() => {
                    pushNavigation(
                      `/portfolio/${portfolio}/stocks-etfs`,
                      t('stratPages.navStocksEtfs')
                    );
                    navigate(`/portfolio/${portfolio}/stocks-etfs`);
                  }}
                  className="w-full text-left p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      <p className="font-medium text-ink-900 dark:text-white">
                        {t('stratPages.leapsLinkStocksTitle')}
                      </p>
                      <p className="text-sm text-ink-600 dark:text-ink-400">
                        {t('stratPages.leapsLinkStocksDesc')}
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
            onClose={closeRuleModal}
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
