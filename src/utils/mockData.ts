import type {
  Position,
  LEAP,
  CoveredCall,
  StockPosition,
  CreditSpread,
  PortfolioSummary,
  DailyPortfolioData,
  PositionAlert,
  Portfolio,
} from '../types';

export const mockPortfolios: Portfolio[] = [
  { id: '1', name: 'Lynx', logo: '/src/assets/LogoLynx.png', pricePerContract: 0.75, strategy: 'PMCC and KaChing', hasOptions: true, strategies: ['pmcc', 'kaching'], currency: 'USD' },
  { id: '2', name: 'FreeStoxx', logo: '/src/assets/LogoFreestoxx.png', pricePerContract: 0.65, strategy: 'PMCC, Spreads, and CSP', hasOptions: true, strategies: ['pmcc', 'spreads', 'csp'], currency: 'EUR' },
  { id: '3', name: 'DeGiro', logo: '/src/assets/LogoDeGiro.png', pricePerContract: 1.00, strategy: 'PMCC and Spreads', hasOptions: false, strategies: ['pmcc', 'spreads'], currency: 'EUR' },
  { id: '4', name: 'SAXO', logo: '/src/assets/LogoSaxo.png', pricePerContract: 1.25, strategy: 'KaChing', hasOptions: true, strategies: ['kaching'], currency: 'USD' },
];

export const mockLeaps: LEAP[] = [
  {
    id: 'leap-1',
    type: 'leap',
    ticker: 'SOFI',
    portfolio: 'Lynx',
    strike: 25,
    expiration: '2025-11-21',
    contracts: 5,
    costBasis: 3545,
    currentValue: 3900,
    openDate: '2024-09-29',
    status: 'open',
    notes: 'First test, maybe not the best stock because it has high volatility',
  },
  {
    id: 'leap-2',
    type: 'leap',
    ticker: 'HIMS',
    portfolio: 'Lynx',
    strike: 40,
    expiration: '2026-06-19',
    contracts: 10,
    costBasis: 13545,
    currentValue: 15000,
    openDate: '2024-09-11',
    status: 'open',
  },
];

export const mockCoveredCalls: CoveredCall[] = [
  {
    id: 'cc-1',
    type: 'covered-call',
    ticker: 'SOFI',
    portfolio: 'Lynx',
    underlyingType: 'leap',
    underlyingId: 'leap-1',
    strike: 27,
    expiration: '2025-01-17',
    contracts: 5,
    premiumCollected: 710,
    currentValue: 120,
    openDate: '2024-11-10',
    status: 'open',
  },
  {
    id: 'cc-2',
    type: 'covered-call',
    ticker: 'HIMS',
    portfolio: 'Lynx',
    underlyingType: 'leap',
    underlyingId: 'leap-2',
    strike: 45,
    expiration: '2024-12-20',
    contracts: 5,
    premiumCollected: 950,
    currentValue: 180,
    openDate: '2024-11-05',
    status: 'open',
  },
];

export const mockStocks: StockPosition[] = [
  {
    id: 'stock-1',
    type: 'stock',
    ticker: 'NVDA',
    portfolio: 'FreeStoxx',
    shares: 200,
    costBasis: 28000,
    currentValue: 32000,
    openDate: '2024-08-15',
    status: 'open',
  },
];

export const mockSpreads: CreditSpread[] = [
  {
    id: 'spread-1',
    type: 'credit-spread',
    ticker: 'TSLA',
    portfolio: 'DeGiro',
    spreadType: 'put',
    shortStrike: 465,
    longStrike: 460,
    expiration: '2024-12-20',
    contracts: 3,
    premiumCollected: 450,
    currentValue: 180,
    collateral: 1500,
    maxLoss: 1050,
    openDate: '2024-11-01',
    status: 'open',
  },
];

export const mockPortfolioSummaries: PortfolioSummary[] = [
  {
    portfolio: 'DeGiro',
    totalValue: 62887,
    cash: 15000,
    uncoveredValue: 0,
    totalWeeklyReturn: 1.52,
    yearlyReturn: 0.56,
    positionCount: 12,
    activeStrategies: ['PMCC', 'Spreads'],
  },
  {
    portfolio: 'Lynx',
    totalValue: 172073,
    cash: 50000,
    uncoveredValue: 4926,
    totalWeeklyReturn: 3.3,
    yearlyReturn: 1.76,
    positionCount: 18,
    activeStrategies: ['PMCC', 'KaChing'],
  },
  {
    portfolio: 'FreeStoxx',
    totalValue: 207500,
    cash: 75000,
    uncoveredValue: 470,
    totalWeeklyReturn: 4.19,
    yearlyReturn: 2.24,
    positionCount: 22,
    activeStrategies: ['PMCC', 'Spreads', 'CSP'],
  },
  {
    portfolio: 'SAXO',
    totalValue: 5049,
    cash: 1000,
    uncoveredValue: 427,
    totalWeeklyReturn: 0.01,
    yearlyReturn: 0.08,
    positionCount: 3,
    activeStrategies: ['KaChing'],
  },
];

export const mockDailyData: DailyPortfolioData[] = [
  {
    date: '2024-11-11',
    portfolio: 'Lynx',
    totalValue: 172073,
    dailyPnL: 850,
    weeklyPnL: 5600,
    uncoveredPositions: 1,
    cash: 50000,
  },
  {
    date: '2024-11-11',
    portfolio: 'FreeStoxx',
    totalValue: 207500,
    dailyPnL: 1200,
    weeklyPnL: 8300,
    cash: 75000,
  },
  {
    date: '2024-11-11',
    portfolio: 'DeGiro',
    totalValue: 62887,
    dailyPnL: 320,
    weeklyPnL: 950,
    cash: 15000,
  },
  {
    date: '2024-11-11',
    portfolio: 'SAXO',
    totalValue: 5049,
    dailyPnL: 12,
    weeklyPnL: 4,
    cash: 1000,
  },
];

export const mockAlerts: PositionAlert[] = [
  {
    id: 'alert-1',
    positionId: 'cc-2',
    ticker: 'HIMS',
    severity: 'warning',
    type: 'expiring-soon',
    message: 'Covered call expires in 12 days',
    actionable: true,
    suggestedAction: 'Roll or close',
  },
  {
    id: 'alert-2',
    positionId: 'cc-1',
    ticker: 'SOFI',
    severity: 'info',
    type: 'profit-target',
    message: '83% profit captured - consider closing',
    actionable: true,
    suggestedAction: 'Close for profit',
  },
];

export const getAllMockPositions = (): Position[] => {
  return [
    ...mockLeaps,
    ...mockCoveredCalls,
    ...mockStocks,
    ...mockSpreads,
  ];
};
