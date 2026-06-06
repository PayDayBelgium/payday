import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calculator, Shield, X } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { useNavigation } from '../../contexts/NavigationContext';
import type { CurrencyType } from '../../types';
import { selectPortfolios } from '../../store/slices/portfoliosSlice';
import { CampaignView } from '../../components/widgets/CampaignView';

export const PMCCStrategy: React.FC = () => {
  const { portfolio } = useParams<{ portfolio: string }>();
  const navigate = useNavigate();
  const { setPageTitle } = usePageTitle();
  const { pushNavigation } = useNavigation();
  const portfolios = useAppSelector(selectPortfolios);
  const currency: CurrencyType =
    portfolios.find((p) => p.name === portfolio)?.currency ?? 'USD';
  const [showInfoCard, setShowInfoCard] = useState(() => {
    const saved = localStorage.getItem('pmcc-show-info');
    return saved !== 'false'; // Default to true if not set
  });

  useEffect(() => {
    if (portfolio) {
      setPageTitle(
        `Poor Man's Covered Call - ${portfolio.toUpperCase()}`,
        'Manage your LEAPs and the calls written against them'
      );
    }
  }, [portfolio, setPageTitle]);

  return (
    <div className="p-8 space-y-6">
      {/* Toolbar — title is provided by the global header */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => {
            pushNavigation('/tools/pmcc-calculator', "Poor Man's Covered Call Calculator");
            navigate('/tools/pmcc-calculator');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-trading-dark-600 hover:bg-trading-dark-700 text-white rounded-lg font-medium transition-colors shadow-sm"
        >
          <Calculator className="w-5 h-5" />
          Calculator
        </button>
      </div>

      {/* Strategy Info Card */}
      {showInfoCard && (
        <div className="bg-primary-50 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-6 relative">
          <button
            onClick={() => {
              setShowInfoCard(false);
              localStorage.setItem('pmcc-show-info', 'false');
            }}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-surface-muted dark:hover:bg-trading-dark-600 transition-colors"
            title="Dismiss"
          >
            <X className="w-5 h-5 text-ink-500 dark:text-ink-400" />
          </button>
          <div className="flex items-start gap-4">
            <Shield className="w-12 h-12 icon-text-primary flex-shrink-0" />
            <div>
              <h3 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">
                How Poor Man's Covered Call Works
              </h3>
              <ul className="space-y-2 text-sm text-ink-700 dark:text-ink-300">
                <li className="flex items-start gap-2">
                  <span className="icon-text-primary mt-0.5">•</span>
                  <span>
                    Buy a deep ITM LEAP (Long-term Equity Anticipation Security) as a stock
                    replacement
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="icon-text-primary mt-0.5">•</span>
                  <span>Sell covered calls against the LEAP to generate income</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="icon-text-primary mt-0.5">•</span>
                  <span>Requires much less capital than owning 100 shares outright</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="icon-text-primary mt-0.5">•</span>
                  <span>Goal: Collect premium to offset LEAP cost and generate profit</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* PMCC campaigns: each LEAPS with the calls written against it, derived
          from the shared coverage allocator (stocks are covered first, the rest
          of the short calls are matched to their LEAPS). */}
      <CampaignView
        portfolioName={portfolio ?? ''}
        currency={currency}
        initialFilter="pmcc"
        lockFilter
        className="min-h-[400px]"
      />
    </div>
  );
};
