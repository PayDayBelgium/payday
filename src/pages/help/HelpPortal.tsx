import React, { useState, useEffect } from 'react';
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

const helpSections: HelpSection[] = [
  {
    id: 'glossary',
    title: 'Woordenlijst / Glossary',
    icon: <BookOpen className="w-6 h-6" />,
    description: 'Overzicht van alle termen en afkortingen gebruikt in PayDay',
    content: [
      {
        subtitle: 'Cash Secured Put',
        text: 'Een optiestrategie waarbij je een put optie verkoopt terwijl je voldoende cash aanhoudt om de aandelen te kopen als je wordt assigned. Je ontvangt direct premie en koopt mogelijk aandelen tegen een prijs die je acceptabel vindt.',
      },
      {
        subtitle: 'Covered Call',
        text: 'Een strategie waarbij je call opties schrijft (verkoopt) op aandelen die je al bezit. Voor elke 100 aandelen kun je 1 call contract verkopen. Je ontvangt premie maar beperkt je upside potential tot de strike price.',
      },
      {
        subtitle: "Poor Man's Covered Call",
        text: 'Een variant van de Covered Call waarbij je een LEAP (langlopende call optie) gebruikt als onderpand in plaats van aandelen. Dit verlaagt de kapitaalvereiste maar voegt het risico toe dat de LEAP waardeloos kan aflopen.',
      },
      {
        subtitle: 'LEAP / LEAPS',
        text: 'Long-term Equity Anticipation Securities. Call of put opties met een looptijd van meer dan 1 jaar. Vaak gebruikt als goedkoper alternatief voor het kopen van aandelen.',
      },
      {
        subtitle: 'Wheel Strategie',
        text: 'Een cyclische strategie: verkoop Cash Secured Puts tot assignment, schrijf dan Covered Calls op de verkregen aandelen tot verkoop, en herhaal. Continue premie-inkomsten.',
      },
      {
        subtitle: 'KaChing',
        text: 'Een beschermde inkomensstrategie. Koop een protective put met langere looptijd (6+ weken) en verkoop wekelijks puts boven die strike om de kosten van de bescherming terug te verdienen.',
      },
      {
        subtitle: 'Assignment',
        text: 'Wanneer een optie wordt uitgeoefend. Bij een put assignment koop je de aandelen tegen de strike price. Bij een call assignment verkoop je de aandelen tegen de strike price.',
      },
      {
        subtitle: 'Strike Price',
        text: 'De prijs waartegen je de aandelen kunt kopen (put) of verkopen (call) als de optie wordt uitgeoefend.',
      },
      {
        subtitle: 'Premium',
        text: 'De prijs die je betaalt of ontvangt voor een optiecontract. Wordt uitgedrukt per aandeel (1 contract = 100 aandelen).',
      },
      {
        subtitle: 'DTE (Days To Expiration)',
        text: 'Het aantal dagen tot de optie expireert. Opties verliezen waarde naarmate de expiratiedatum nadert (time decay).',
      },
      {
        subtitle: 'ITM / ATM / OTM',
        text: 'In The Money (optie heeft intrinsieke waarde), At The Money (strike = huidige koers), Out of The Money (optie heeft geen intrinsieke waarde).',
      },
      {
        subtitle: 'Credit Spread',
        text: 'Een spread waarbij je netto premie ontvangt. Bijvoorbeeld een bull put spread of bear call spread. Beperkt risico en beperkte winst.',
      },
      {
        subtitle: 'Iron Condor',
        text: 'Een combinatie van een bear call spread en bull put spread op dezelfde underlying. Wint als de koers binnen een bepaalde range blijft.',
      },
      {
        subtitle: 'Onderpand / Collateral',
        text: 'De waarde die gereserveerd moet worden om een positie te openen. Bij een Cash Secured Put is dit strike × 100. Bij een spread is dit het verschil tussen de strikes × 100.',
      },
      {
        subtitle: 'Kostenbasis / Cost Basis',
        text: 'Je totale investering in een positie. Bij aandelen: aankoopprijs × aantal. Kan worden verlaagd door ontvangen premie van covered calls.',
      },
      {
        subtitle: 'Roll',
        text: 'Het sluiten van een bestaande optie en tegelijk openen van een nieuwe met andere strike en/of expiratie. Gebruikt om posities te beheren.',
      },
      {
        subtitle: 'Break-even',
        text: 'De koers waarbij je geen winst of verlies maakt. Bij een covered call: aankoopprijs aandelen - ontvangen premie.',
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
  const { setPageTitle } = usePageTitle();
  const [expandedSections, setExpandedSections] = useState<string[]>(['overview']);

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
