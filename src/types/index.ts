// Cache-busting comment - force reload
// Cache-busting comment
// Portfolio types
export type PortfolioName = string;

export type StrategyType =
  | 'stocks-etfs'
  | 'leaps'
  | 'covered-calls'
  | 'csp'
  | 'pmcc'
  | 'spreads'
  | 'kaching'
  | 'options'
  | 'general';

// Trading Strategy for grouping positions
export type TradingStrategyType =
  | 'covered-call'
  | 'pmcc'
  | 'kaching'
  | 'csp'
  | 'spread'
  | 'wheel'
  | 'custom';

export interface TradingStrategy {
  id: string;
  name: string;
  type: TradingStrategyType;
  portfolio: PortfolioName;
  description?: string;
  positionIds: string[]; // IDs of positions in this strategy
  createdAt: string;
  updatedAt?: string;
  color?: string; // Optional color for UI
}

export type CurrencyType = 'USD' | 'EUR';

export interface ImageMetadata {
  backgroundColor?: string;
  rotation?: number;
  zoom?: number;
  crop?: { x: number; y: number };
  addBorder?: boolean;
  borderSize?: number;
  borderColor?: string;
  borderRadius?: number;
}

export interface Portfolio {
  id: string;
  name: PortfolioName;
  logo: string;
  logoOriginal?: string; // Original unedited image for re-editing
  logoMetadata?: ImageMetadata; // Store image editing settings
  pricePerContract: number;
  strategy: string; // Short description for card views
  description?: string; // Long description: Extra information and goals
  hasOptions: boolean;
  strategies: StrategyType[];
  currency: CurrencyType;
  startDate?: string; // Optional: start date for data tracking (YYYY-MM-DD format)
  url?: string; // URL to portfolio portal/website
  initialCapital: number; // Starting capital when the portfolio is created
  currentValue: number; // Current value of the portfolio
}

// Base position types
export interface BasePosition {
  id: string;
  ticker: string;
  portfolio: PortfolioName;
  openDate: string;
  closeDate?: string;
  notes?: string;
  status: 'open' | 'closed';
  // Set when a position is closed (written by positionsSlice.closePosition).
  closePrice?: number; // stocks/ETFs
  closePremium?: number; // options
  realizedPnL?: number;
}

// LEAP (Long-term Equity AnticiPation Securities)
export interface LEAP extends BasePosition {
  type: 'leap';
  strike: number;
  expiration: string;
  contracts: number;
  costBasis: number;
  currentValue: number;
}

// Covered Call (can be on LEAP or Stock)
export interface CoveredCall extends BasePosition {
  type: 'covered-call';
  underlyingType: 'leap' | 'stock';
  underlyingId: string; // Reference to LEAP or Stock
  strike: number;
  expiration: string;
  contracts: number;
  premiumCollected: number;
  costBasis: number; // Total cost basis
  currentValue: number;
}

// Stock Position
export interface StockPosition extends BasePosition {
  type: 'stock' | 'etf';
  name?: string; // Company/ETF name (optional)
  shares: number;
  costBasis: number; // Total cost (shares * purchase price)
  purchasePrice: number; // Price per share at purchase
  currentPrice: number; // Current price per share
  currentValue: number; // Current total value
  optionsSupported: boolean; // Whether options are available for this ticker
  miniContractsSupported: boolean; // Whether mini contracts (10 shares) are available
  wheelId?: string; // Optional: link to Wheel campaign
}

// Credit Spread
export interface CreditSpread extends BasePosition {
  type: 'credit-spread';
  spreadType: 'put' | 'call';
  shortStrike: number;
  longStrike: number;
  expiration: string;
  contracts: number;
  premiumCollected: number;
  currentValue: number;
  collateral: number;
  maxLoss: number;
}

// Iron Condor (combination of put and call spreads)
export interface IronCondor extends BasePosition {
  type: 'iron-condor';
  putSpreadId: string;
  callSpreadId: string;
  expiration: string;
  totalPremium: number;
  currentValue: number;
  sharedCollateral: number;
}

// Cash Secured Put
export interface CashSecuredPut extends BasePosition {
  type: 'cash-secured-put';
  strike: number;
  expiration: string;
  contracts: number;
  premiumCollected: number;
  currentValue: number;
  cashReserved: number;
}

// KaChing Strategy
export interface KaChingStrategy extends BasePosition {
  type: 'kaching';
  protectivePut: {
    strike: number;
    expiration: string;
    contracts: number;
    cost: number;
    currentValue: number;
  };
  weeklyPuts: Array<{
    id: string;
    strike: number;
    expiration: string;
    contracts: number;
    premiumCollected: number;
    currentValue: number;
    status: 'open' | 'closed' | 'expired';
  }>;
  totalPremiumCollected: number;
  netCost: number;
  costBasis: number; // Total cost basis
  currentValue: number; // Current total value
}

// New generic Call Position
export interface CallOption extends BasePosition {
  type: 'call';
  name?: string; // Optional company/ticker name
  action: 'buy' | 'sell'; // Bought or sold
  strike: number;
  expiration: string;
  contracts: number;
  premium: number; // Price per contract
  costBasis: number; // Total cost (buy) or proceeds (sell)
  currentValue: number;
  cashReserved?: number; // For symmetry with PutOption (rarely used on calls)
  underlyingId?: string; // Optional: link to underlying stock/leap
  wheelId?: string; // Optional: link to Wheel campaign
  dte?: number; // Days to expiration (calculated)
  breakEven?: number; // Break-even price (calculated)
  currentPremium?: number; // Live premium for live-tracking
  delta?: number; // Live greek (written by updateOptionPremium)
  strategy?: string; // Strategy label for analytics
}

// New generic Put Position
export interface PutOption extends BasePosition {
  type: 'put';
  name?: string; // Optional company/ticker name
  action: 'buy' | 'sell'; // Bought or sold
  strike: number;
  expiration: string;
  contracts: number;
  premium: number; // Price per contract
  costBasis: number; // Total cost (buy) or proceeds (sell)
  currentValue: number;
  cashReserved?: number; // For cash-secured puts
  underlyingId?: string; // Optional: link to underlying stock/protective put
  wheelId?: string; // Optional: link to Wheel campaign
  dte?: number; // Days to expiration (calculated)
  breakEven?: number; // Break-even price (calculated)
  currentPremium?: number; // Live premium for live-tracking
  delta?: number; // Live greek (written by updateOptionPremium)
  strategy?: string; // Strategy label for analytics
}

// Spread Position (call of put spread)
export interface SpreadPosition extends BasePosition {
  type: 'spread';
  spreadType: 'call' | 'put';
  spreadStyle: 'credit' | 'debit'; // Credit spread (selling) or debit spread (buying)
  longLeg: OptionLeg; // Bought option
  shortLeg: OptionLeg; // Sold option
  netPremium: number; // Net premium (credit) or cost (debit)
  currentValue: number;
  maxProfit: number;
  maxLoss: number;
  collateral: number;
  breakEven: number;
}

// Union type for all positions
export type Position =
  | LEAP
  | CoveredCall
  | StockPosition
  | CreditSpread
  | IronCondor
  | CashSecuredPut
  | KaChingStrategy
  | CallOption
  | PutOption
  | SpreadPosition;

// Trade History
export interface Trade {
  id: string;
  ticker: string;
  portfolio: PortfolioName;
  strategy: string;
  openDate: string;
  closeDate: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  commission: number;
  fees: number;
  realizedPnL: number;
  notes?: string;
  tags?: string[];
}

// Daily Portfolio Data
export interface DailyPortfolioData {
  date: string;
  portfolio: PortfolioName;
  totalValue: number;
  cash: number;
  dailyPnL: number;
  weeklyPnL: number;
  comment?: string;
  uncoveredPositions?: number;
}

// Portfolio Summary
export interface PortfolioSummary {
  portfolio: PortfolioName;
  totalValue: number;
  cash: number;
  uncoveredValue: number;
  totalWeeklyReturn: number; // w/w %
  yearlyReturn: number; // yearly w/w %
  positionCount: number;
  activeStrategies: string[];
}

// Alert/Warning types
export interface PositionAlert {
  id: string;
  positionId: string;
  ticker: string;
  severity: 'info' | 'warning' | 'critical';
  type:
    | 'expiring-soon'
    | 'itm'
    | 'uncovered'
    | 'profit-target'
    | 'loss-limit'
    | 'roll-opportunity'
    | 'price-change' // Added for stock/ETF price alerts
    | 'persistence-failure'; // System alert: the event log could not be written durably
  message: string;
  actionable: boolean;
  suggestedAction?: string;
}

// Price Alert Rule for Stocks/ETFs
export interface PriceAlertRule {
  id: string;
  positionId: string;
  type: 'price_increase' | 'price_decrease';
  percentage: number; // e.g., 10 for 10%
  alertMethods: ('email' | 'dashboard')[];
  isActive: boolean;
  createdAt: string;
  triggeredAt?: string; // When the alert was last triggered
}

// Active Price Alert
export interface PriceAlert {
  id: string;
  ruleId: string;
  positionId: string;
  ticker: string;
  triggeredAt: string;
  currentPrice: number;
  purchasePrice: number;
  changePercentage: number;
  message: string;
  isRead: boolean;
  category: 'alert' | 'opportunity';
  methods: ('email' | 'dashboard')[];
}

// Strategy Rule Types
export type StrategyRuleCategory = 'alert' | 'opportunity' | 'idea';
export type StrategyRuleTrigger =
  | 'price_increase'
  | 'price_decrease'
  | 'profit_target'
  | 'loss_limit'
  | 'time_based'
  | 'volatility';

export interface StrategyRule {
  id: string;
  strategyType: StrategyType;
  portfolio: PortfolioName;
  name: string;
  description: string;
  category: StrategyRuleCategory;
  trigger: StrategyRuleTrigger;
  enabled: boolean;
  parameters: {
    percentage?: number;
    threshold?: number;
    timeframe?: string;
    [key: string]: any;
  };
  actions: {
    showOnDashboard?: boolean;
    showOnPortfolioOverview?: boolean;
    showInList?: boolean;
    notification?: boolean;
    notify?: boolean;
  };
  createdAt: string;
  updatedAt?: string;
}

// Trading Rules
export interface TradingRule {
  id: string;
  name: string;
  type:
    | 'position-size'
    | 'allocation'
    | 'dte-warning'
    | 'profit-target'
    | 'loss-limit'
    | 'coverage';
  enabled: boolean;
  parameters: Record<string, any>;
}

// Analytics
export interface ProfitLossBreakdown {
  totalPnL: number;
  realizedPnL: number;
  unrealizedPnL: number;
  premiumIncome: number;
  capitalGains: number;
  byStrategy: Record<string, number>;
  byTicker: Record<string, number>;
  byPortfolio: Record<PortfolioName, number>;
}

export interface PerformanceMetrics {
  winRate: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
}

// Journal types
export type GoalType = 'total-value' | 'assets-under-management' | 'monthly-premium' | 'custom';

export interface JournalGoal {
  id: string;
  type: GoalType;
  title: string;
  description?: string;
  targetValue: number;
  currentValue?: number;
  deadline?: string;
  createdAt: string;
  completed: boolean;
  completedAt?: string;
}

export interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  portfolio?: PortfolioName;
  tags?: string[];
  mood?: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  pnl?: number;
  createdAt: string;
  updatedAt?: string;
}

// Portfolio Transaction Types (new structure)
export type TransactionType =
  | 'deposit' // Cash deposit
  | 'withdrawal' // Cash withdrawal
  | 'position_buy' // Position bought (shares/options)
  | 'position_sell' // Position sold
  | 'premium_collected' // Premium received (sold option)
  | 'premium_paid' // Premium paid (bought option)
  | 'dividend' // Dividend received
  | 'fee' // Costs (transaction fees, etc.)
  | 'adjustment' // Manual correction of portfolio value
  | 'option_roll'; // Option roll (close + open new)

export interface PortfolioTransaction {
  id: string;
  portfolio: PortfolioName;
  date: string; // ISO date string
  type: TransactionType;
  amount: number; // Amount (positive for income, negative for expenses)
  description: string;
  relatedPositionId?: string; // Optional: link to position
  previousValue?: number; // Portfolio value before transaction
  newValue?: number; // Portfolio value after transaction
  createdAt: string;
  notes?: string;
}

// Ticker definition for reuse
export interface Ticker {
  symbol: string; // Ticker symbol (e.g., AAPL, SPY)
  name: string; // Name of stock/ETF
  type: 'stock' | 'etf';
  optionsAvailable: boolean; // Are options available?
  miniContractsAvailable: boolean; // Are mini contracts available?
  hasDividend?: boolean; // Does this stock/ETF pay a dividend?
  lastUsed?: string; // Last used (for autocomplete sorting)
  currentPrice?: number; // Current price (fetched later via service)
  isWatchlist?: boolean; // Is this a watchlist ticker (no positions)
  createdAt?: string; // When added
}

// Option Leg for spread construction
export interface OptionLeg {
  action: 'buy' | 'sell'; // Buy or sell
  optionType: 'call' | 'put';
  strike: number;
  expiration: string; // ISO date
  contracts: number;
  premium: number; // Price per contract
  totalCost: number; // Total cost/proceeds (premium * contracts * 100)
}

// Wheel Campaign - cyclical strategy of Cash Secured Put -> Stock -> Covered Call
export interface WheelCampaign {
  id: string;
  ticker: string;
  portfolio: PortfolioName;
  phase: 'csp' | 'stock' | 'completed'; // Current phase of the wheel
  targetContracts: number; // Number of contracts/lots (100 shares per contract)
  startDate: string;
  endDate?: string; // When the wheel is completed
  status: 'active' | 'completed';
  totalPremiumCollected: number; // Total premium received
  totalRealizedPnL: number; // Total realized profit/loss
  cycles: number; // Number of completed cycles (Cash Secured Put -> Stock -> Covered Call -> sale)
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// WebSocket Connection Status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Data mode for the price feed
export type DataMode = 'demo' | 'demo-feed' | 'live';

// =====================================================
// USER LEVEL SYSTEM - Ski Slope Analogy
// =====================================================

// User Experience Levels (like ski slopes)
export type UserLevel = 'beginner' | 'medior' | 'senior' | 'expert' | 'offpiste';

// Level configuration with ski slope names
export interface LevelConfig {
  level: UserLevel;
  name: string; // Display name (e.g., "Beginner")
  slopeName: string; // Ski slope analogy (e.g., "Baby Slope")
  slopeColor: string; // Ski slope color (green, blue, red, black)
  icon: string; // Emoji or icon identifier
  description: string; // What this level includes
  features: FeatureId[]; // Features unlocked at this level
  creditsRequired: number; // Credits needed to unlock (0 for beginner)
  priceEUR?: number; // Optional price to unlock immediately
}

// Feature identifiers for gating
export type FeatureId =
  // Beginner features
  | 'broker_setup'
  | 'stocks'
  | 'etfs'
  | 'dividends'
  | 'portfolio_tracking'
  | 'basic_analytics'
  // Medior features
  | 'covered_calls'
  | 'cash_secured_puts'
  | 'wheel_strategy'
  | 'options_basics'
  | 'premium_tracking'
  // Senior features
  | 'leaps'
  | 'delta_management'
  | 'pmcc'
  | 'advanced_analytics'
  | 'roll_management'
  // Expert features
  | 'spreads'
  | 'iron_condors'
  | 'kaching'
  | 'complex_strategies'
  | 'paper_trading'
  | 'ai_assistant'
  // Off-piste features
  | 'quant_trading';

// Free modules (no level/credits) that you activate to show in the sidebar.
export type ModuleId = 'community' | 'mentorship';

// User progress and credits
export interface UserProgress {
  currentLevel: UserLevel;
  credits: number;
  unlockedLevels: UserLevel[];
  completedLessons: string[];
  achievements: Achievement[];
  activatedModules: ModuleId[];
  paperTradingEnabled: boolean;
  joinedAt: string;
  lastActiveAt: string;
}

// Achievement system
export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  creditsAwarded: number;
}

// Credit transaction history
export interface CreditTransaction {
  id: string;
  type: 'earned' | 'spent' | 'purchased';
  amount: number;
  reason: string;
  timestamp: string;
  relatedAchievementId?: string;
  relatedLevelId?: UserLevel;
}

// Lesson/Tutorial structure
export interface Lesson {
  id: string;
  level: UserLevel;
  title: string;
  description: string;
  duration: string; // e.g., "15 min"
  contentType: 'video' | 'article' | 'interactive' | 'quiz';
  creditsAwarded: number;
  order: number;
  prerequisites?: string[];
}

// =====================================================
// LEARNING RESOURCES - Tips, Books, Tutorials per Level
// =====================================================

// Tip or Trick
export interface TradingTip {
  id: string;
  level: UserLevel;
  title: string;
  content: string;
  category: 'strategy' | 'risk' | 'psychology' | 'tax' | 'tool' | 'general';
  icon?: string;
  relatedFeatures?: FeatureId[];
}

// Recommended Book
export interface RecommendedBook {
  id: string;
  level: UserLevel;
  title: string;
  author: string;
  description: string;
  coverImage?: string;
  amazonUrl?: string;
  bolUrl?: string; // Bol.com for Belgian/Dutch users
  category: 'beginner' | 'options' | 'leaps' | 'income' | 'psychology' | 'tax';
  rating?: number; // 1-5 stars
  difficulty: 'easy' | 'medium' | 'advanced';
}

// Video Tutorial
export interface VideoTutorial {
  id: string;
  level: UserLevel;
  title: string;
  description: string;
  duration: string; // e.g., "15:30"
  thumbnailUrl?: string;
  videoUrl?: string; // YouTube, Vimeo, etc.
  platform: 'youtube' | 'vimeo' | 'internal' | 'external';
  category: 'basics' | 'strategy' | 'platform' | 'analysis';
  creditsAwarded?: number;
}

// External Resource Link
export interface ExternalResource {
  id: string;
  level: UserLevel;
  title: string;
  description: string;
  url: string;
  type: 'website' | 'tool' | 'calculator' | 'community' | 'broker';
  isFree: boolean;
}

// Learning Resource Collection per Level
export interface LevelResources {
  level: UserLevel;
  tips: TradingTip[];
  books: RecommendedBook[];
  videos: VideoTutorial[];
  externalResources: ExternalResource[];
}

// =====================================================
// EDUCATION CURRICULUM - Structured Learning Path
// =====================================================

// Education Chapter - Groups related lessons
export interface EducationChapter {
  id: string;
  level: UserLevel;
  title: string;
  description: string;
  icon: string;
  order: number;
  lessons: EducationLesson[];
  estimatedDuration: string; // e.g., "45 min"
}

// Individual Lesson within a Chapter
export interface EducationLesson {
  id: string;
  chapterId: string;
  title: string;
  order: number;
  content: EducationContent[];
  quiz?: EducationQuiz;
  creditsAwarded: number;
  estimatedDuration: string;
}

// Content block types for lessons
export type EducationContentType =
  | 'text' // Regular text paragraph
  | 'heading' // Section heading
  | 'callout' // Important info box (info, warning, tip)
  | 'definition' // Term definition box
  | 'comparison' // Side-by-side comparison
  | 'diagram' // Visual diagram/image
  | 'example' // Practical example with numbers
  | 'formula' // Mathematical formula
  | 'list' // Bulleted or numbered list
  | 'table' // Data table
  | 'analogy' // Real-world analogy box
  | 'video'; // Embedded video

export interface EducationContent {
  type: EducationContentType;
  content: string;
  // Optional properties based on type
  variant?: 'info' | 'warning' | 'tip' | 'success'; // For callout
  term?: string; // For definition
  items?: string[]; // For list
  leftTitle?: string; // For comparison
  rightTitle?: string; // For comparison
  leftItems?: string[]; // For comparison
  rightItems?: string[]; // For comparison
  columns?: string[]; // For table
  rows?: string[][]; // For table
  imageUrl?: string; // For diagram
  caption?: string; // For diagram/example
  videoUrl?: string; // For video
  duration?: string; // For video
}

// Quiz for lesson completion
export interface EducationQuiz {
  questions: QuizQuestion[];
  passingScore: number; // Percentage needed to pass (e.g., 70)
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

// User's education progress
export interface EducationProgress {
  completedLessons: string[]; // Lesson IDs
  completedChapters: string[]; // Chapter IDs
  quizScores: Record<string, number>; // Lesson ID -> Score
  currentLesson?: string; // Currently active lesson ID
  lastAccessedAt: string;
}

// =====================================================
// Community / Trading ideas
// =====================================================

export type CommunityChannel = 'ideas' | 'general' | 'quant';

export interface CommunityAuthor {
  name: string;
  initials: string;
  color: string; // avatar background color (hex)
  level: UserLevel; // determines the slope badge
}

export interface TradeIdea {
  ticker: string;
  strategy: FeatureId; // e.g. 'cash_secured_puts' | 'covered_calls'
  expiry: string;
  strike?: number;
  premium?: number;
  returnPct?: number;
  delta?: number;
  ivRank: number; // 0–100, the "juice"
}

export interface CommunityReply {
  id: string;
  author: CommunityAuthor;
  text: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  author: CommunityAuthor;
  channel: CommunityChannel;
  text: string;
  createdAt: string;
  likes: number;
  likedByMe: boolean;
  replies: CommunityReply[];
  tradeIdea?: TradeIdea;
}

// Mentorship (ski-school) — decoupled from credits/levels.
export type MentorshipFocus =
  | 'options' // option strategies
  | 'risk' // risk management
  | 'psychology' // trading psychology
  | 'portfolio' // portfolio building
  | 'quant'; // quantitative / off-piste

export type MentorStyle =
  | 'hands_on' // intensive, trading together
  | 'coaching' // periodic coaching/reviews
  | 'async'; // asynchronous (messages/feedback)

export type MentorshipStatus = 'pending';

export interface MentorshipRequest {
  id: string;
  focus: MentorshipFocus;
  level: UserLevel; // current level of the requester
  style: MentorStyle;
  availability: string; // free text, e.g. "weekends, 2h/week"
  message: string; // motivation / context
  createdAt: string; // ISO
  status: MentorshipStatus;
}
