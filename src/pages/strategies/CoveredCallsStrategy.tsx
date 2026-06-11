import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const { setPageTitle } = usePageTitle();
  const navigate = useNavigate();
  const { pushNavigation } = useNavigation();
  const portfolios = useAppSelector(selectPortfolios);
  const currency: CurrencyType = portfolios.find((p) => p.name === portfolio)?.currency ?? 'USD';
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
    setPageTitle('Covered Calls', t('stratPages.ccSubtitle', { portfolio }));
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
                      {t('stratPages.ccBannerTitle')}
                    </h4>
                    <p className="text-sm text-ink-700 dark:text-ink-300 mb-2">
                      {t('stratPages.ccBannerDesc1')}
                      <strong>{t('stratPages.ccBannerWilling')}</strong>
                      {t('stratPages.ccBannerDesc2')}
                      <strong>{t('stratPages.ccBannerPremium')}</strong>
                      {t('stratPages.ccBannerDesc3')}
                    </p>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-600 dark:text-ink-400">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-positive-500"></span>
                        {t('stratPages.ccBannerBenefit1')}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-positive-500"></span>
                        {t('stratPages.ccBannerBenefit2')}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-positive-500"></span>
                        {t('stratPages.ccBannerBenefit3')}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={dismissInfoBanner}
                    className="flex-shrink-0 p-1 text-ink-400 hover:text-ink-600 dark:hover:text-ink-300 transition-colors"
                    title={t('stratPages.ccDontShowAgain')}
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
                      {t('stratPages.ccHowTitle')}
                    </h3>
                    <p className="text-sm text-ink-700 dark:text-ink-300 mb-3">
                      {t('stratPages.ccHowIntro1')}
                      <strong>{t('stratPages.ccHowIntroWrite')}</strong>
                      {t('stratPages.ccHowIntro2')}
                      <strong>{t('stratPages.ccHowIntroPremium')}</strong>
                      {t('stratPages.ccHowIntro3')}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.ccOnStocksLabel')}</strong>
                          {t('stratPages.ccOnStocks')}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.ccOnLeapsLabel')}</strong>
                          {t('stratPages.ccOnLeaps')}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.ccAdvantageLabel')}</strong>
                          {t('stratPages.ccAdvantage')}
                        </p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary-700 dark:text-primary-300 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-ink-700 dark:text-ink-300">
                          <strong>{t('stratPages.ccDisadvantageLabel')}</strong>
                          {t('stratPages.ccDisadvantage')}
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
                          {t('stratPages.ccOnStocksCardTitle')}
                        </h4>
                      </div>
                      <p className="text-sm text-ink-700 dark:text-ink-300 mb-2">
                        {t('stratPages.ccOnStocksCardDesc')}
                      </p>
                      <div className="text-xs text-ink-600 dark:text-ink-400 space-y-1">
                        <p>{t('stratPages.ccOnStocksBullet1')}</p>
                        <p>{t('stratPages.ccOnStocksBullet2')}</p>
                        <p>{t('stratPages.ccOnStocksBullet3')}</p>
                      </div>
                    </div>

                    <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700/30 rounded-lg p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <DollarSign className="w-5 h-5 text-primary-700 dark:text-primary-300" />
                        <h4 className="font-semibold text-ink-900 dark:text-white">
                          {t('stratPages.ccOnLeapsCardTitle')}
                        </h4>
                      </div>
                      <p className="text-sm text-ink-700 dark:text-ink-300 mb-2">
                        {t('stratPages.ccOnLeapsCardDesc')}
                      </p>
                      <div className="text-xs text-ink-600 dark:text-ink-400 space-y-1">
                        <p>{t('stratPages.ccOnLeapsBullet1')}</p>
                        <p>{t('stratPages.ccOnLeapsBullet2')}</p>
                        <p>{t('stratPages.ccOnLeapsBullet3')}</p>
                      </div>
                    </div>
                  </div>

                  {/* Prerequisites */}
                  <div className="bg-caution-50 dark:bg-caution-600/15 border border-caution-500/30 dark:border-caution-500/30 rounded-lg p-4">
                    <h4 className="font-semibold text-ink-900 dark:text-white mb-3">
                      {t('stratPages.ccBeforeYouStart')}
                    </h4>
                    <div className="space-y-2 text-sm text-ink-700 dark:text-ink-300">
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                        <p>{t('stratPages.ccPrereq1')}</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-caution-600 dark:text-caution-500 mt-0.5 flex-shrink-0" />
                        <p>{t('stratPages.ccPrereq2')}</p>
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
                  {t('stratPages.nextSteps')}
                </h3>
              </div>
              <div className="space-y-3">
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
                        {t('stratPages.navStocksEtfs')}
                      </p>
                      <p className="text-sm text-ink-600 dark:text-ink-400">
                        {t('stratPages.ccLinkStocksDesc')}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-ink-400 flex-shrink-0 ml-3" />
                  </div>
                </button>
                <button
                  onClick={() => {
                    pushNavigation(`/portfolio/${portfolio}/leaps`, t('stratPages.navLeaps'));
                    navigate(`/portfolio/${portfolio}/leaps`);
                  }}
                  className="w-full text-left p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      <p className="font-medium text-ink-900 dark:text-white">
                        {t('stratPages.navLeaps')}
                      </p>
                      <p className="text-sm text-ink-600 dark:text-ink-400">
                        {t('stratPages.ccLinkLeapsDesc')}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-ink-400 flex-shrink-0 ml-3" />
                  </div>
                </button>
                <button
                  onClick={() => {
                    pushNavigation(
                      `/portfolio/${portfolio}/csp`,
                      t('stratPages.navCashSecuredPuts')
                    );
                    navigate(`/portfolio/${portfolio}/csp`);
                  }}
                  className="w-full text-left p-4 bg-white dark:bg-trading-dark-800 rounded-lg border border-surface-line dark:border-trading-dark-600 hover:border-primary-300 dark:hover:border-primary-500 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 text-left">
                      <p className="font-medium text-ink-900 dark:text-white">
                        {t('stratPages.navCashSecuredPuts')}
                      </p>
                      <p className="text-sm text-ink-600 dark:text-ink-400">
                        {t('stratPages.ccLinkCspDesc')}
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
