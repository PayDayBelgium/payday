import type { Middleware } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { updatePortfolioValue } from '../slices/portfoliosSlice';
import type { Position, StockPosition, CallOption, PutOption } from '../../types';

// Helper to check if action is a position mutation
const isPositionMutation = (action: any): boolean => {
  return (
    action.type === 'positions/addPosition' ||
    action.type === 'positions/updatePosition' ||
    action.type === 'positions/closePosition' ||
    action.type === 'positions/removePosition' ||
    // Live-price mutations: these change position.currentValue and therefore the
    // derived portfolio value. Without these, portfolio.currentValue drifts out of
    // sync with the selectors that combine it with the fresh position values.
    action.type === 'positions/updatePositionValue' ||
    action.type === 'positions/updateMultiplePositionValues' ||
    action.type === 'positions/updateOptionPremium'
  );
};

// Helper to check if action is a transaction that affects portfolio value
const isTransactionMutation = (action: any): boolean => {
  return action.type === 'portfolios/addTransaction';
};

// Calculate portfolio value from positions
const calculatePortfolioValue = (state: RootState, portfolioName: string): number => {
  const portfolio = state.portfolios.portfolios.find((p) => p.name === portfolioName);
  if (!portfolio) return 0;

  // Get all open positions for this portfolio
  const portfolioPositions = state.positions.positions.filter(
    (p) => p.portfolio === portfolioName && p.status === 'open'
  );

  // Calculate total position value and cost basis
  let totalCurrentValue = 0;
  let totalCostBasis = 0;

  portfolioPositions.forEach((pos) => {
    if (pos.type === 'stock' || pos.type === 'etf') {
      const stockPos = pos as StockPosition;
      // Get the latest price from tickers or position
      const ticker = state.tickers.tickers.find(
        (t) => t.symbol.toUpperCase() === stockPos.ticker.toUpperCase()
      );
      const currentPrice = ticker?.currentPrice || stockPos.currentPrice || stockPos.purchasePrice;
      totalCurrentValue += stockPos.shares * currentPrice;
      totalCostBasis += stockPos.costBasis; // Cost basis is positive for stocks
    } else if (pos.type === 'call' || pos.type === 'put') {
      const option = pos as CallOption | PutOption;
      if (option.action === 'buy') {
        // Long options: positive cost basis (money paid)
        totalCurrentValue += Math.abs(option.currentValue || option.costBasis);
        totalCostBasis += option.costBasis;
      } else {
        // Short options: negative cost basis (money received)
        // Current value is also negative (liability)
        // Add the negative value directly (which subtracts the liability from total)
        totalCurrentValue += option.currentValue ?? option.costBasis;
        totalCostBasis += option.costBasis; // Already negative
      }
    }
  });

  // Calculate cash from initial capital + all cash-affecting transactions
  // This uses position_buy and position_sell to track cash flow
  let cashBalance = portfolio.initialCapital;

  const transactions = state.portfolios.transactions || [];
  const portfolioTransactions = transactions.filter((t) => t.portfolio === portfolioName);

  portfolioTransactions.forEach((transaction) => {
    if (transaction.type === 'deposit') {
      cashBalance += transaction.amount;
    } else if (transaction.type === 'withdrawal') {
      cashBalance -= transaction.amount;
    } else if (transaction.type === 'adjustment') {
      cashBalance += transaction.amount;
    } else if (transaction.type === 'position_sell') {
      // Cash received from selling a position
      cashBalance += transaction.amount;
    } else if (transaction.type === 'position_buy') {
      // Cash spent buying a position (amount is negative)
      cashBalance += transaction.amount;
    } else if (transaction.type === 'premium_collected') {
      // Cash received from selling options
      cashBalance += transaction.amount;
    } else if (transaction.type === 'premium_paid') {
      // Cash spent buying options (amount is negative)
      cashBalance += transaction.amount;
    }
  });

  // Total portfolio value = cash + current value of positions
  return cashBalance + totalCurrentValue;
};

// Get affected portfolios from the action. Some actions (a batched value update or
// an option-premium tick matched by symbol/strike/expiration) can affect positions
// across multiple portfolios, so this always returns a (de-duplicated) list.
const getAffectedPortfolios = (
  action: any,
  stateBefore: RootState,
  stateAfter: RootState
): string[] => {
  const dedupe = (names: (string | null | undefined)[]): string[] =>
    Array.from(new Set(names.filter((n): n is string => !!n)));

  switch (action.type) {
    case 'positions/addPosition':
    case 'positions/updatePosition':
      return dedupe([action.payload.portfolio]);

    case 'positions/closePosition': {
      const position = stateBefore.positions.positions.find((p) => p.id === action.payload.id);
      return dedupe([position?.portfolio]);
    }

    case 'positions/removePosition': {
      const position = stateBefore.positions.positions.find((p) => p.id === action.payload);
      return dedupe([position?.portfolio]);
    }

    case 'positions/updatePositionValue': {
      const position = stateAfter.positions.positions.find((p) => p.id === action.payload.id);
      return dedupe([position?.portfolio]);
    }

    case 'positions/updateMultiplePositionValues': {
      const ids = new Set((action.payload as Array<{ id: string }>).map((p) => p.id));
      return dedupe(
        stateAfter.positions.positions.filter((p) => ids.has(p.id)).map((p) => p.portfolio)
      );
    }

    case 'positions/updateOptionPremium': {
      const { symbol, strike, expiration, optionType } = action.payload;
      return dedupe(
        stateAfter.positions.positions
          .filter(
            (p): p is Extract<Position, { strike: number; expiration: string }> =>
              (p.type === 'call' || p.type === 'put') &&
              p.type === optionType &&
              p.status === 'open' &&
              p.ticker.toUpperCase() === String(symbol).toUpperCase() &&
              (p as any).strike === strike &&
              (p as any).expiration === expiration
          )
          .map((p) => p.portfolio)
      );
    }

    case 'portfolios/addTransaction':
      return dedupe([action.payload.portfolio]);

    default:
      return [];
  }
};

export const positionValueMiddleware: Middleware = (store) => (next) => (action) => {
  // Only process position mutations and transaction mutations
  if (!isPositionMutation(action) && !isTransactionMutation(action)) {
    return next(action);
  }

  // Get state BEFORE the action
  const stateBefore = store.getState() as RootState;

  // Let the action pass through
  const result = next(action);

  // Get state AFTER the action
  const stateAfter = store.getState() as RootState;

  // Get the affected portfolios (can be more than one for batched/premium updates)
  const portfolioNames = getAffectedPortfolios(action, stateBefore, stateAfter);

  portfolioNames.forEach((portfolioName) => {
    const newPortfolioValue = calculatePortfolioValue(stateAfter, portfolioName);
    store.dispatch(
      updatePortfolioValue({
        portfolio: portfolioName,
        value: Math.round(newPortfolioValue * 100) / 100, // Round to 2 decimals
      })
    );
  });

  return result;
};
