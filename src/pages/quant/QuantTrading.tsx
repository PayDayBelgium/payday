import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Sigma, Activity, Radar, TrendingUp } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';

export const QuantTrading: React.FC = () => {
  const { t } = useTranslation();
  const { setPageTitle } = usePageTitle();
  useEffect(() => {
    setPageTitle(t('pagesB.quant.pageTitle'), t('pagesB.quant.pageSubtitle'));
  }, [setPageTitle, t]);

  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-600 dark:text-ink-300 max-w-2xl leading-relaxed">
        {t('pagesB.quant.intro')}
      </p>

      {/* Concept cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--line)] rounded-md overflow-hidden">
        {[
          {
            icon: Radar,
            title: t('pagesB.quant.card1Title'),
            desc: t('pagesB.quant.card1Desc'),
          },
          {
            icon: Activity,
            title: t('pagesB.quant.card2Title'),
            desc: t('pagesB.quant.card2Desc'),
          },
          {
            icon: TrendingUp,
            title: t('pagesB.quant.card3Title'),
            desc: t('pagesB.quant.card3Desc'),
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white dark:bg-trading-dark-800 p-5">
            <div className="w-9 h-9 rounded-md bg-caution-50 text-caution-600 flex items-center justify-center mb-3">
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </div>
            <h3 className="font-semibold text-sm text-ink-900 dark:text-white tracking-tight mb-1">
              {title}
            </h3>
            <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Teaser visual */}
      <div className="surface-card p-8 text-center">
        <Sigma className="w-10 h-10 mx-auto text-caution-500 mb-3" strokeWidth={1.5} />
        <p className="eyebrow mb-2">{t('pagesB.quant.teaserEyebrow')}</p>
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white tracking-tight mb-2">
          {t('pagesB.quant.teaserTitle')}
        </h2>
        <p className="text-sm text-ink-500 dark:text-ink-400 max-w-md mx-auto leading-relaxed">
          {t('pagesB.quant.teaserDescription')}
        </p>
      </div>
    </div>
  );
};
