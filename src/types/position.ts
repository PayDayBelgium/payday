// Position type for stocks/ETFs
export interface Position {
  id: string;
  portfolioId: string;
  type: 'stock' | 'etf';
  ticker: string;
  purchaseDate: string; // ISO date string
  purchasePrice: number;
  quantity: number;
  currentPrice: number;
  optionsSupported: boolean;
  miniContractsSupported: boolean;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

// Rule type for price alerts
export interface Rule {
  id: string;
  positionId: string;
  type: 'price_increase' | 'price_decrease';
  percentage: number; // e.g., 10 for 10%
  alertTypes: ('email' | 'dashboard')[];
  isActive: boolean;
  createdAt: string; // ISO date string
}

// Alert type for active notifications
export interface Alert {
  id: string;
  positionId: string;
  ruleId: string;
  triggeredAt: string; // ISO date string
  message: string;
  isRead: boolean;
}

// Position with calculated fields for display
export interface PositionWithCalculations extends Position {
  currentValue: number; // quantity * currentPrice
  totalCost: number; // quantity * purchasePrice
  profitLoss: number; // currentValue - totalCost
  profitLossPercentage: number; // (profitLoss / totalCost) * 100
  canWriteCoveredCalls: boolean; // true if quantity >= 100 (or >= 10 for mini contracts) && optionsSupported
  activeAlerts: Alert[];
}
