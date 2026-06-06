import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Calculator,
  TrendingUp,
  DollarSign,
  Zap,
  WalletMinimal,
  Settings,
  Briefcase,
  BarChart3,
  BookOpen,
} from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  description: string;
  content: {
    subtitle: string;
    text: string;
  }[];
}

const buildHelpSections = (t: (key: string) => string): HelpSection[] => [
  {
    id: 'glossary',
    title: t('pagesA.help.glossaryTitle'),
    icon: <BookOpen className="w-6 h-6" />,
    description: t('pagesA.help.glossaryDesc'),
    content: [
      {
        subtitle: 'Cash Secured Put',
        text: t('pagesA.help.glossaryCspText'),
      },
      {
        subtitle: 'Covered Call',
        text: t('pagesA.help.glossaryCoveredCallText'),
      },
      {
        subtitle: "Poor Man's Covered Call",
        text: t('pagesA.help.glossaryPmccText'),
      },
      {
        subtitle: 'LEAP / LEAPS',
        text: t('pagesA.help.glossaryLeapText'),
      },
      {
        subtitle: 'Wheel Strategie',
        text: t('pagesA.help.glossaryWheelText'),
      },
      {
        subtitle: 'KaChing',
        text: t('pagesA.help.glossaryKachingText'),
      },
      {
        subtitle: 'Assignment',
        text: t('pagesA.help.glossaryAssignmentText'),
      },
      {
        subtitle: 'Strike Price',
        text: t('pagesA.help.glossaryStrikeText'),
      },
      {
        subtitle: 'Premium',
        text: t('pagesA.help.glossaryPremiumText'),
      },
      {
        subtitle: 'DTE (Days To Expiration)',
        text: t('pagesA.help.glossaryDteText'),
      },
      {
        subtitle: 'ITM / ATM / OTM',
        text: t('pagesA.help.glossaryMoneynessText'),
      },
      {
        subtitle: 'Credit Spread',
        text: t('pagesA.help.glossaryCreditSpreadText'),
      },
      {
        subtitle: 'Iron Condor',
        text: t('pagesA.help.glossaryIronCondorText'),
      },
      {
        subtitle: 'Onderpand / Collateral',
        text: t('pagesA.help.glossaryCollateralText'),
      },
      {
        subtitle: 'Kostenbasis / Cost Basis',
        text: t('pagesA.help.glossaryCostBasisText'),
      },
      {
        subtitle: 'Roll',
        text: t('pagesA.help.glossaryRollText'),
      },
      {
        subtitle: 'Break-even',
        text: t('pagesA.help.glossaryBreakEvenText'),
      },
    ],
  },
  {
    id: 'overview',
    title: 'PayDay Overview',
    icon: <HelpCircle className="w-6 h-6" />,
    description: 'Welcome to PayDay - Your comprehensive options trading tracker',
    content: [
      {
        subtitle: 'What is PayDay?',
        text: "PayDay is a powerful tool designed to help you track and manage your options trading strategies across multiple portfolios. Whether you're running Poor Man's Covered Calls, selling Cash Secured Puts, or managing complex spreads, PayDay keeps everything organized in one place.",
      },
      {
        subtitle: 'Key Features',
        text: 'Track multiple portfolios, monitor your positions in real-time, calculate potential returns with built-in calculators, manage different strategies independently, and analyze your trading performance with detailed metrics and charts.',
      },
      {
        subtitle: 'Getting Started',
        text: 'Start by adding your portfolios in the Portfolio Management section. Then, choose which strategies you want to track for each portfolio. You can enter your positions manually or use our calculators to plan trades before executing them.',
      },
    ],
  },
  {
    id: 'pmcc',
    title: "Poor Man's Covered Call (PMCC)",
    icon: <WalletMinimal className="w-6 h-6" />,
    description: "Learn about the Poor Man's Covered Call strategy and how to track it",
    content: [
      {
        subtitle: "What is Poor Man's Covered Call?",
        text: "The Poor Man's Covered Call is a bullish options strategy that uses a deep in-the-money (ITM) LEAP call option as a stock replacement. Instead of buying 100 shares of stock, you buy a long-dated call option (LEAP) and then sell shorter-term covered calls against it.",
      },
      {
        subtitle: "How to Use Poor Man's Covered Call in PayDay",
        text: 'Navigate to your portfolio\'s Poor Man\'s Covered Call page to add LEAP positions. Each LEAP shows how many contracts are "covered" by short calls and which are uncovered. The system tracks your cost basis, current value, and warns you about approaching expirations.',
      },
      {
        subtitle: "Poor Man's Covered Call Calculator",
        text: "Use the Poor Man's Covered Call Calculator to plan your trades before executing them. Enter the stock price, LEAP details, and expected premium from selling calls. The calculator shows your potential ROI, break-even point, and annualized returns. You can then transfer the data directly to create a position.",
      },
      {
        subtitle: 'Key Metrics',
        text: 'PayDay tracks total LEAPs, active covered calls, uncovered contracts, and overall P&L. Yellow warnings appear when LEAPs are approaching expiration or when contracts are uncovered for too long.',
      },
    ],
  },
  {
    id: 'kaching',
    title: 'KaChing Strategy',
    icon: <Zap className="w-6 h-6" />,
    description: 'Protected income generation with weekly premiums',
    content: [
      {
        subtitle: 'How KaChing Works',
        text: 'The KaChing strategy combines protective puts with weekly income generation. You buy a longer-dated protective put (6-12 weeks out) for downside protection, then sell weekly puts slightly below the protective put strike to collect premiums.',
      },
      {
        subtitle: 'Goal of the Strategy',
        text: 'The goal is to collect enough weekly premiums to make the protective put "free" or even profitable. This provides peace of mind with downside protection while generating consistent income.',
      },
      {
        subtitle: 'Tracking in PayDay',
        text: 'The KaChing page shows your protective puts, total cost, premium collected, and net cost. The system calculates how many weeks it will take to break even and tracks your progress toward making the protection free.',
      },
      {
        subtitle: 'Using the Calculator',
        text: 'The KaChing Calculator helps you plan the strategy. Enter the protective put details and expected weekly premium. The calculator shows break-even weeks, net cost over time, and potential profit/loss scenarios.',
      },
    ],
  },
  {
    id: 'spreads',
    title: 'Spreads Strategy',
    icon: <TrendingUp className="w-6 h-6" />,
    description: 'Vertical spreads and other multi-leg strategies',
    content: [
      {
        subtitle: 'What are Spreads?',
        text: 'Spreads involve buying and selling options at different strike prices (vertical spreads) or different expiration dates (calendar spreads). They limit both risk and reward, making them a more conservative approach to options trading.',
      },
      {
        subtitle: 'Types of Spreads',
        text: 'Common spreads include Bull Call Spreads (buy lower strike, sell higher strike), Bear Put Spreads (buy higher strike, sell lower strike), Iron Condors (combination of spreads), and Calendar Spreads (same strike, different dates).',
      },
      {
        subtitle: 'Managing Spreads',
        text: 'PayDay tracks each leg of your spread separately while calculating the overall position P&L. You can see the max profit, max loss, and break-even points for each spread position.',
      },
    ],
  },
  {
    id: 'csp',
    title: 'Cash Secured Puts',
    icon: <DollarSign className="w-6 h-6" />,
    description: 'Generate income while potentially acquiring stock',
    content: [
      {
        subtitle: 'What is a Cash Secured Put?',
        text: "A Cash Secured Put involves selling a put option while keeping enough cash in your account to buy the stock if assigned. It's a way to generate income while potentially acquiring stock at a price you're happy with.",
      },
      {
        subtitle: 'Why Sell Cash Secured Puts?',
        text: "Cash Secured Puts are ideal when you're bullish on a stock and wouldn't mind owning it at a lower price. You collect premium immediately, and if the stock stays above your strike price, you keep the premium without buying the stock.",
      },
      {
        subtitle: 'Tracking Cash Secured Puts',
        text: 'PayDay shows all your active Cash Secured Put positions, tracks premium collected, monitors days to expiration, and calculates your return on capital. The system warns you about approaching expirations and potential assignments.',
      },
    ],
  },
  {
    id: 'portfolios',
    title: 'Portfolio Management',
    icon: <Briefcase className="w-6 h-6" />,
    description: 'Set up and manage multiple portfolio accounts',
    content: [
      {
        subtitle: 'Adding Portfolios',
        text: 'Go to Settings > Portfolio Management to add your portfolios. You can add as many portfolios as you need and customize which strategies you track for each one. Upload portfolio logos to make them easier to identify.',
      },
      {
        subtitle: 'Portfolio Overview',
        text: 'Each portfolio has its own overview page showing portfolio value, active strategies, and recent activity. You can quickly navigate between portfolios from the main portfolio list.',
      },
      {
        subtitle: 'Strategy Assignment',
        text: 'Choose which strategies to enable for each portfolio. For example, you might use one portfolio for PMCC and another for CSPs. This keeps your positions organized and easy to find.',
      },
      {
        subtitle: 'Reordering Portfolios',
        text: 'You can drag and drop portfolios to reorder them. Your preferred order is saved and applies throughout the application.',
      },
    ],
  },
  {
    id: 'calculators',
    title: 'Built-in Calculators',
    icon: <Calculator className="w-6 h-6" />,
    description: 'Plan your trades before executing them',
    content: [
      {
        subtitle: "Poor Man's Covered Call Calculator",
        text: 'Plan Poor Man\'s Covered Call trades by entering stock price, LEAP details, and expected premium from selling calls. The calculator shows ROI, annualized returns, and break-even analysis. Use the "Create LEAP Position" button to transfer data directly to your portfolio.',
      },
      {
        subtitle: 'KaChing Calculator',
        text: 'Calculate the economics of protective puts with weekly income. Enter your protective put details and expected weekly premium to see break-even weeks and net cost projections.',
      },
      {
        subtitle: 'Monthly Income Calculator',
        text: 'Project your monthly income across all strategies and portfolios. Set income targets and track your progress toward them.',
      },
      {
        subtitle: 'Using Calculator Results',
        text: 'All calculators auto-update as you type. Results include detailed metrics, warnings about risky setups, and visual indicators for quick assessment. Data can be transferred to position entry forms with one click.',
      },
    ],
  },
  {
    id: 'settings',
    title: 'Settings & Customization',
    icon: <Settings className="w-6 h-6" />,
    description: 'Personalize your PayDay experience',
    content: [
      {
        subtitle: 'Theme Selection',
        text: 'Choose from 5 color themes: Navy Blue, Forest Green, Royal Purple, Crimson Red, and Sunset Orange. The theme applies to all buttons, icons, and accent colors throughout the app.',
      },
      {
        subtitle: 'Language Options',
        text: 'PayDay supports English, Nederlands, and Français. Switch languages from the user menu or login screen. Your preference is saved for future sessions.',
      },
      {
        subtitle: 'Help Cards',
        text: 'Toggle strategy help cards on/off from the user menu. These cards appear on strategy pages and explain how each strategy works. Dismiss individual cards with the (X) button.',
      },
      {
        subtitle: 'Account Settings',
        text: 'Manage your profile, set trading preferences, and configure notifications. Access account settings from the user menu.',
      },
    ],
  },
  {
    id: 'analytics',
    title: 'Analytics & Reporting',
    icon: <BarChart3 className="w-6 h-6" />,
    description: 'Track performance and analyze your trading',
    content: [
      {
        subtitle: 'Dashboard Overview',
        text: 'The dashboard shows your total portfolio value, available cash, and free cash across all portfolios. View trends with percentage changes and quick access to all your active positions.',
      },
      {
        subtitle: 'Daily Data Timeline',
        text: 'Track your portfolio value over time with the daily data timeline. See growth trends, identify winning periods, and analyze the impact of market movements on your positions.',
      },
      {
        subtitle: 'Ticker Overview',
        text: 'View all positions grouped by ticker symbol. This helps identify concentration risk and see your overall exposure to specific stocks across different strategies and portfolios.',
      },
      {
        subtitle: 'Trade History',
        text: "Review past trades, analyze what worked and what didn't, and learn from your trading history. Filter by portfolio, strategy, or time period.",
      },
    ],
  },
];

export const HelpPortal: React.FC = () => {
  const { t } = useTranslation();
  const { setPageTitle } = usePageTitle();
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);
  const helpSections = useMemo(() => buildHelpSections(t), [t]);

  useEffect(() => {
    setPageTitle('Help Portal', 'Everything you need to know about using PayDay');
  }, [setPageTitle]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  return (
    <div className="space-y-6">
      {/* Help Sections */}
      <div className="space-y-4">
        {helpSections.map((section) => (
          <div
            key={section.id}
            className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 overflow-hidden"
          >
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-5 hover:bg-surface dark:hover:bg-trading-dark-700/50 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="icon-bg-primary p-2 rounded-lg">
                  <div className="icon-text-primary">{section.icon}</div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-ink-900 dark:text-white">
                    {section.title}
                  </h2>
                  <p className="text-sm text-ink-600 dark:text-ink-400">{section.description}</p>
                </div>
              </div>
              {expandedSections.includes(section.id) ? (
                <ChevronDown className="w-5 h-5 text-ink-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-ink-400" />
              )}
            </button>

            {/* Section Content */}
            {expandedSections.includes(section.id) && (
              <div className="px-5 pb-5 space-y-4 border-t border-surface-line dark:border-trading-dark-600 pt-4">
                {section.content.map((item, index) => (
                  <div key={index}>
                    <h3 className="text-base font-semibold text-ink-900 dark:text-white mb-2">
                      {item.subtitle}
                    </h3>
                    <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Tips */}
      <div className="bg-primary-50 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-5">
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white mb-3">Quick Tips</h2>
        <ul className="space-y-2 text-sm text-ink-700 dark:text-ink-300">
          <li className="flex items-start gap-2">
            <span className="icon-text-primary mt-0.5">•</span>
            <span>
              Use the calculators to plan trades before executing them - they help you understand
              potential returns and risks.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="icon-text-primary mt-0.5">•</span>
            <span>
              Enable help cards from the user menu if you need reminders about how each strategy
              works.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="icon-text-primary mt-0.5">•</span>
            <span>
              Regularly update your position values to track accurate P&L and make informed
              decisions.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="icon-text-primary mt-0.5">•</span>
            <span>
              Watch for yellow warning indicators - they highlight positions that need attention
              (approaching expiration, uncovered contracts, etc.).
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="icon-text-primary mt-0.5">•</span>
            <span>
              Use the ticker overview to monitor concentration risk across all your positions.
            </span>
          </li>
        </ul>
      </div>

      {/* Need More Help */}
      <div className="bg-white dark:bg-trading-dark-800 rounded-lg shadow-sm border border-surface-line dark:border-trading-dark-600 p-5 text-center">
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white mb-2">Need More Help?</h2>
        <p className="text-sm text-ink-600 dark:text-ink-400 mb-4">
          Have a question that isn't covered here? We're here to help!
        </p>
        <p className="text-xs text-ink-500 dark:text-ink-400">
          PayDay is constantly being improved based on user feedback.
        </p>
      </div>
    </div>
  );
};
