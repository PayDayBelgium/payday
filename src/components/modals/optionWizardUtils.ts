/**
 * Shared utilities and types for CallOptionWizard and PutOptionWizard
 * This module consolidates common logic to reduce duplication
 */

import type { Ticker, PortfolioName, CurrencyType } from '../../types';
import { getDecimalSeparator, getThousandSeparator } from '../../utils/numberFormat';

// ============ TYPES ============

export type OptionAction =
  | 'buy'
  | 'sell'
  | 'credit-spread'
  | 'debit-spread'
  | 'covered-call'
  | 'spread';

export interface OptionLegData {
  strike: number;
  expiration: string;
  premium: number;
  contracts: number;
}

export interface OptionWizardPortfolio {
  name: PortfolioName;
  currency: CurrencyType;
  currentValue: number;
}

export interface NewTickerData {
  symbol: string;
  name: string;
  type: 'stock' | 'etf';
  optionsAvailable: boolean;
  hasDividend?: boolean;
}

export const DEFAULT_NEW_TICKER_DATA: NewTickerData = {
  symbol: '',
  name: '',
  type: 'stock',
  optionsAvailable: true,
  hasDividend: false,
};

// ============ VALIDATION HELPERS ============

/**
 * Validates number input based on browser locale
 */
export const validateNumberInput = (value: string): boolean => {
  if (!value) return true;

  const decimalSep = getDecimalSeparator();
  const thousandSep = getThousandSeparator();

  // Create pattern that allows digits and locale-specific separators
  const separators = [decimalSep, thousandSep]
    .filter((s) => s)
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('');
  const pattern = new RegExp(`^[\\d${separators}]*$`);

  if (!pattern.test(value)) return false;

  // Only one decimal separator allowed
  const decimals = value.split(decimalSep).length - 1;
  if (decimals > 1) return false;

  return true;
};

// ============ CALCULATION HELPERS ============

/**
 * Calculate days to expiration
 */
export const calculateDTE = (expirationDate: string): number => {
  if (!expirationDate) return 0;
  const today = new Date();
  const expiry = new Date(expirationDate);
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

/**
 * Calculate break-even for CALL options
 * - Buy call: strike + premium (need stock to rise above this)
 * - Sell call: strike + premium (profit if stock stays below)
 */
export const calculateCallBreakEven = (strike: number, premium: number): number => {
  return strike + premium;
};

/**
 * Calculate break-even for PUT options
 * - Buy put: strike - premium (need stock to fall below this)
 * - Sell put (CSP): strike - premium (profit if stock stays above)
 */
export const calculatePutBreakEven = (
  strike: number,
  premium: number,
  _isBuy: boolean = false
): number => {
  // For puts, break-even is always strike - premium
  // Whether it's profit or loss depends on direction
  return strike - premium;
};

/**
 * Calculate collateral required for spreads
 * For both calls and puts, collateral = strike width × contracts × 100
 */
export const calculateSpreadCollateral = (
  higherStrike: number,
  lowerStrike: number,
  contracts: number
): number => {
  return (higherStrike - lowerStrike) * contracts * 100;
};

/**
 * Calculate cash reserved for naked/cash-secured options
 */
export const calculateCashReserved = (strike: number, contracts: number): number => {
  return strike * contracts * 100;
};

// ============ SPREAD VALIDATION ============

/**
 * Validate CALL spread configuration
 * Credit spread: short lower strike, buy higher for protection
 * Debit spread: buy lower strike, sell higher
 */
export const validateCallSpread = (
  action: OptionAction,
  longLeg: OptionLegData,
  shortLeg: OptionLegData
): boolean => {
  if (action === 'credit-spread') {
    // Short lower strike, long higher strike
    // Short premium should be higher (we receive net credit)
    return shortLeg.strike < longLeg.strike && shortLeg.premium > longLeg.premium;
  } else if (action === 'debit-spread') {
    // Long lower strike, short higher strike
    // Long premium should be higher (we pay net debit)
    return longLeg.strike < shortLeg.strike && longLeg.premium > shortLeg.premium;
  }
  return true;
};

/**
 * Validate PUT spread configuration
 * Credit spread: short higher strike, buy lower for protection
 * Debit spread: buy higher strike, sell lower
 */
export const validatePutSpread = (
  action: OptionAction,
  longLeg: OptionLegData,
  shortLeg: OptionLegData
): boolean => {
  if (action === 'credit-spread') {
    // Short higher strike, long lower strike
    // Short premium should be higher (we receive net credit)
    return shortLeg.strike > longLeg.strike && shortLeg.premium > longLeg.premium;
  } else if (action === 'debit-spread') {
    // Long higher strike, short lower strike
    // Long premium should be higher (we pay net debit)
    return longLeg.strike > shortLeg.strike && longLeg.premium > shortLeg.premium;
  }
  return true;
};

// ============ COST/VALUE CALCULATIONS ============

interface CalculatedValues {
  costBasis: number;
  currentValue: number;
  cashReserved: number;
}

/**
 * Calculate cost basis and current value for CALL options
 */
export const calculateCallValues = (
  action: OptionAction,
  longLeg: OptionLegData,
  shortLeg: OptionLegData
): CalculatedValues => {
  const contractMultiplier = 100;

  if (action === 'credit-spread') {
    // Credit Spread: Sell lower strike, buy higher for protection
    const creditReceived =
      (shortLeg.premium - longLeg.premium) * longLeg.contracts * contractMultiplier;
    const costBasis = -creditReceived; // Negative = we received money
    const collateral = calculateSpreadCollateral(
      longLeg.strike,
      shortLeg.strike,
      longLeg.contracts
    );
    return { costBasis, currentValue: costBasis, cashReserved: collateral };
  } else if (action === 'debit-spread') {
    // Debit Spread: Buy lower strike, sell higher
    const debitPaid = (longLeg.premium - shortLeg.premium) * longLeg.contracts * contractMultiplier;
    return { costBasis: debitPaid, currentValue: debitPaid, cashReserved: 0 };
  } else if (action === 'buy') {
    const costBasis = longLeg.premium * longLeg.contracts * contractMultiplier;
    return { costBasis, currentValue: costBasis, cashReserved: 0 };
  } else {
    // Sell call
    const premiumCollected = longLeg.premium * longLeg.contracts * contractMultiplier;
    const costBasis = -premiumCollected;
    const cashReserved = calculateCashReserved(longLeg.strike, longLeg.contracts);
    return { costBasis, currentValue: costBasis, cashReserved };
  }
};

/**
 * Calculate cost basis and current value for PUT options
 */
export const calculatePutValues = (
  action: OptionAction,
  longLeg: OptionLegData,
  shortLeg: OptionLegData
): CalculatedValues => {
  const contractMultiplier = 100;

  if (action === 'credit-spread') {
    // Put Credit Spread: Sell higher strike, buy lower for protection
    const creditReceived =
      (shortLeg.premium - longLeg.premium) * longLeg.contracts * contractMultiplier;
    const costBasis = -creditReceived;
    const collateral = calculateSpreadCollateral(
      shortLeg.strike,
      longLeg.strike,
      longLeg.contracts
    );
    return { costBasis, currentValue: costBasis, cashReserved: collateral };
  } else if (action === 'debit-spread') {
    // Put Debit Spread: Buy higher strike, sell lower
    const debitPaid = (longLeg.premium - shortLeg.premium) * longLeg.contracts * contractMultiplier;
    return { costBasis: debitPaid, currentValue: debitPaid, cashReserved: 0 };
  } else if (action === 'buy') {
    const costBasis = longLeg.premium * longLeg.contracts * contractMultiplier;
    return { costBasis, currentValue: costBasis, cashReserved: 0 };
  } else {
    // Sell put (CSP)
    const premiumCollected = longLeg.premium * longLeg.contracts * contractMultiplier;
    const costBasis = -premiumCollected;
    const cashReserved = calculateCashReserved(longLeg.strike, longLeg.contracts);
    return { costBasis, currentValue: costBasis, cashReserved };
  }
};

// ============ P&L CURVE HELPERS ============

export type CallPnLType = 'call-buy' | 'call-sell' | 'call-spread';
export type PutPnLType = 'put-buy' | 'put-sell' | 'put-spread';

export const getCallPnLType = (action: OptionAction): CallPnLType => {
  if (action === 'credit-spread' || action === 'debit-spread') return 'call-spread';
  return action === 'buy' ? 'call-buy' : 'call-sell';
};

export const getPutPnLType = (action: OptionAction): PutPnLType => {
  if (action === 'credit-spread' || action === 'debit-spread') return 'put-spread';
  return action === 'buy' ? 'put-buy' : 'put-sell';
};

// ============ TICKER HELPERS ============

/**
 * Create a new ticker from form data
 */
export const createTickerFromFormData = (data: NewTickerData): Ticker => {
  return {
    ...data,
    symbol: data.symbol.toUpperCase(),
    lastUsed: new Date().toISOString(),
    currentPrice: 10, // Default price for new tickers
  };
};

// ============ SPREAD SUMMARY HELPERS ============

interface SpreadSummary {
  spreadWidth: number;
  netPremium: number;
  maxProfit: number;
  maxLoss: number;
  breakEven: number;
  collateral: number;
}

/**
 * Calculate summary for CALL spreads
 */
export const calculateCallSpreadSummary = (
  action: OptionAction,
  longLeg: OptionLegData,
  shortLeg: OptionLegData
): SpreadSummary => {
  const contracts = longLeg.contracts;
  const contractMultiplier = 100;

  if (action === 'credit-spread') {
    // Call Credit Spread: Sell lower, buy higher
    const spreadWidth = longLeg.strike - shortLeg.strike;
    const netPremium = (shortLeg.premium - longLeg.premium) * contracts * contractMultiplier;
    const maxProfit = netPremium;
    const maxLoss = spreadWidth * contracts * contractMultiplier - netPremium;
    const breakEven = shortLeg.strike + (shortLeg.premium - longLeg.premium);
    const collateral = spreadWidth * contracts * contractMultiplier;

    return { spreadWidth, netPremium, maxProfit, maxLoss, breakEven, collateral };
  } else {
    // Call Debit Spread: Buy lower, sell higher
    const spreadWidth = shortLeg.strike - longLeg.strike;
    const netPremium = (longLeg.premium - shortLeg.premium) * contracts * contractMultiplier;
    const maxLoss = netPremium;
    const maxProfit = spreadWidth * contracts * contractMultiplier - netPremium;
    const breakEven = longLeg.strike + (longLeg.premium - shortLeg.premium);

    return { spreadWidth, netPremium, maxProfit, maxLoss, breakEven, collateral: 0 };
  }
};

/**
 * Calculate summary for PUT spreads
 */
export const calculatePutSpreadSummary = (
  action: OptionAction,
  longLeg: OptionLegData,
  shortLeg: OptionLegData
): SpreadSummary => {
  const contracts = longLeg.contracts;
  const contractMultiplier = 100;

  if (action === 'credit-spread') {
    // Put Credit Spread: Sell higher, buy lower
    const spreadWidth = shortLeg.strike - longLeg.strike;
    const netPremium = (shortLeg.premium - longLeg.premium) * contracts * contractMultiplier;
    const maxProfit = netPremium;
    const maxLoss = spreadWidth * contracts * contractMultiplier - netPremium;
    const breakEven = shortLeg.strike - (shortLeg.premium - longLeg.premium);
    const collateral = spreadWidth * contracts * contractMultiplier;

    return { spreadWidth, netPremium, maxProfit, maxLoss, breakEven, collateral };
  } else {
    // Put Debit Spread: Buy higher, sell lower
    const spreadWidth = longLeg.strike - shortLeg.strike;
    const netPremium = (longLeg.premium - shortLeg.premium) * contracts * contractMultiplier;
    const maxLoss = netPremium;
    const maxProfit = spreadWidth * contracts * contractMultiplier - netPremium;
    const breakEven = longLeg.strike - (longLeg.premium - shortLeg.premium);

    return { spreadWidth, netPremium, maxProfit, maxLoss, breakEven, collateral: 0 };
  }
};

// ============ POSITION ID GENERATORS ============

export const generateCallOptionId = (): string => `call-${Date.now()}`;
export const generatePutOptionId = (): string => `put-${Date.now()}`;
export const generateSpreadId = (): string => `spread-${Date.now()}`;
export const generateTransactionId = (): string => `txn-${Date.now()}`;
