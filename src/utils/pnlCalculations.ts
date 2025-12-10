/**
 * Utility functions for consistent P&L (Profit & Loss) calculations
 *
 * CONVENTIONS:
 * - Long positions: costBasis is positive (money paid)
 * - Short positions: costBasis is negative (money received as credit)
 * - currentValue follows the same sign convention
 * - premium is always stored as positive (price per share)
 *
 * FORMULAS:
 * - Long (buy): P&L = currentValue - costBasis
 * - Short (sell): P&L = |costBasis| - |currentValue| = open - current
 */

export interface OptionPnLParams {
  action: 'buy' | 'sell';
  costBasis: number;      // Total cost basis (positive for long, negative for short)
  currentValue: number;   // Current total value (follows same sign convention)
}

export interface OptionClosePnLParams {
  action: 'buy' | 'sell';
  costBasis: number;      // Total cost basis
  closePremium: number;   // Close premium per share (always positive)
  contracts: number;      // Number of contracts
  contractMultiplier?: number; // Usually 100
}

export interface StockPnLParams {
  costBasis: number;      // Total cost basis (always positive for stocks)
  currentValue: number;   // Current total value
}

export interface StockClosePnLParams {
  costBasis: number;      // Total cost basis
  closePrice: number;     // Close price per share
  shares: number;         // Number of shares
}

/**
 * Calculate unrealized P&L for an option position
 */
export function calculateOptionUnrealizedPnL(params: OptionPnLParams): number {
  const { action, costBasis, currentValue } = params;

  if (action === 'buy') {
    // Long option: profit when currentValue > costBasis
    return currentValue - costBasis;
  } else {
    // Short option: profit when current liability < premium received
    // costBasis is negative (premium received), currentValue is negative (current liability)
    const premiumReceived = Math.abs(costBasis);
    const currentLiability = Math.abs(currentValue);
    return premiumReceived - currentLiability;
  }
}

/**
 * Calculate realized P&L when closing an option position
 */
export function calculateOptionRealizedPnL(params: OptionClosePnLParams): number {
  const { action, costBasis, closePremium, contracts, contractMultiplier = 100 } = params;
  const closeValue = closePremium * contracts * contractMultiplier;

  if (action === 'buy') {
    // Long option: we sell to close
    // P&L = what we receive - what we paid
    return closeValue - costBasis;
  } else {
    // Short option: we buy back to close
    // P&L = what we received (premium) - what we pay (to close)
    // costBasis is negative, so |costBasis| is premium received
    const premiumReceived = Math.abs(costBasis);
    return premiumReceived - closeValue;
  }
}

/**
 * Calculate unrealized P&L for a stock/ETF position
 */
export function calculateStockUnrealizedPnL(params: StockPnLParams): number {
  const { costBasis, currentValue } = params;
  return currentValue - costBasis;
}

/**
 * Calculate realized P&L when closing a stock/ETF position
 */
export function calculateStockRealizedPnL(params: StockClosePnLParams): number {
  const { costBasis, closePrice, shares } = params;
  const closeValue = closePrice * shares;
  return closeValue - costBasis;
}

/**
 * Calculate P&L percentage
 */
export function calculatePnLPercentage(pnl: number, costBasis: number): number {
  const absCostBasis = Math.abs(costBasis);
  if (absCostBasis === 0) return 0;
  return (pnl / absCostBasis) * 100;
}

/**
 * Calculate P&L for rolling an option (closing old + opening new)
 */
export function calculateRollPnL(params: {
  action: 'buy' | 'sell';
  oldCostBasis: number;
  closePremium: number;
  contracts: number;
  contractMultiplier?: number;
}): number {
  const { action, oldCostBasis, closePremium, contracts, contractMultiplier = 100 } = params;

  // First calculate realized P&L on closing the old position
  return calculateOptionRealizedPnL({
    action,
    costBasis: oldCostBasis,
    closePremium,
    contracts,
    contractMultiplier,
  });
}

/**
 * Calculate total P&L for a campaign (realized + unrealized)
 */
export function calculateCampaignTotalPnL(params: {
  totalRealizedPnL: number;
  activeOptions: Array<{
    action: 'buy' | 'sell';
    costBasis: number;
    currentValue: number;
  }>;
}): number {
  const { totalRealizedPnL, activeOptions } = params;

  let totalPnL = totalRealizedPnL;

  // Add unrealized P&L from active options
  for (const option of activeOptions) {
    totalPnL += calculateOptionUnrealizedPnL(option);
  }

  return totalPnL;
}

/**
 * Calculate cost basis for new position from premium
 */
export function calculateCostBasis(params: {
  action: 'buy' | 'sell';
  premium: number;       // Premium per share
  contracts: number;
  contractMultiplier?: number;
}): number {
  const { action, premium, contracts, contractMultiplier = 100 } = params;
  const totalPremium = premium * contracts * contractMultiplier;

  // Long positions: positive cost basis (we paid)
  // Short positions: negative cost basis (we received credit)
  return action === 'buy' ? totalPremium : -totalPremium;
}

/**
 * Calculate current value for an option position
 */
export function calculateCurrentValue(params: {
  action: 'buy' | 'sell';
  currentPremium: number; // Current premium per share
  contracts: number;
  contractMultiplier?: number;
}): number {
  const { action, currentPremium, contracts, contractMultiplier = 100 } = params;
  const totalValue = currentPremium * contracts * contractMultiplier;

  // Long positions: positive value (asset we own)
  // Short positions: negative value (liability we owe)
  return action === 'buy' ? totalValue : -totalValue;
}
