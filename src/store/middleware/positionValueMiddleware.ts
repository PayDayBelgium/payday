import type { Middleware } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { updatePortfolioValue } from '../slices/portfoliosSlice';
import type {
  Position,
  StockPosition,
  CallOption,
  PutOption,
  PortfolioTransaction,
} from '../../types';

// Helper to check if action is a position mutation
const isPositionMutation = (action: any): boolean => {
  return (
    // Position lifecycle (open/close/edit/portfolio-rename) now flows through the
    // event log: every command commits domain events via appendEvents, and a cold
    // boot replays them via replayEvents. Both fold into the positions projection,
    // so the derived portfolio value must be recomputed when they fire.
    action.type === 'events/appendEvents' ||
    action.type === 'events/replayEvents' ||
    // Live-price mutations: these change position.currentValue and therefore the
    // derived portfolio value. Without these, portfolio.currentValue drifts out of
    // sync with the selectors that combine it with the fresh position values.
    action.type === 'positions/updatePositionValue' ||
    action.type === 'positions/updateMultiplePositionValues' ||
    action.type === 'positions/updateOptionPremium' ||
    action.type === 'positions/updatePositionLivePrice'
  );
};

// NOTE: Transaction mutations previously dispatched via `portfolios/addTransaction` now flow
// through `events/appendEvents` (the ledger projection folds CashDeposited, OptionRolled, etc.).
// `isPositionMutation` already covers `events/appendEvents`, so no separate transaction check is needed.

// Compute the current value of all open positions in a portfolio (per call — this
// part changes on every price tick).
const computePositionsValue = (state: RootState, portfolioName: string): number => {
  // Get all open positions for this portfolio
  const portfolioPositions = state.positions.positions.filter(
    (p) => p.portfolio === portfolioName && p.status === 'open'
  );

  // Calculate total position value and cost basis
  let totalCurrentValue = 0;

  portfolioPositions.forEach((pos) => {
    if (pos.type === 'stock' || pos.type === 'etf') {
      const stockPos = pos as StockPosition;
      // Get the latest price from tickers or position
      const ticker = state.tickers.tickers.find(
        (t) => t.symbol.toUpperCase() === stockPos.ticker.toUpperCase()
      );
      const currentPrice = ticker?.currentPrice || stockPos.currentPrice || stockPos.purchasePrice;
      totalCurrentValue += stockPos.shares * currentPrice;
    } else if (pos.type === 'call' || pos.type === 'put') {
      const option = pos as CallOption | PutOption;
      if (option.action === 'buy') {
        // Long options: positive cost basis (money paid).
        // Use ?? (not ||) so an option marked to exactly 0 (worthless) counts
        // as 0 instead of falling back to its cost basis.
        totalCurrentValue += Math.abs(option.currentValue ?? option.costBasis);
      } else {
        // Short options: negative cost basis (money received)
        // Current value is also negative (liability)
        // Add the negative value directly (which subtracts the liability from total)
        totalCurrentValue += option.currentValue ?? option.costBasis;
      }
    }
  });

  return totalCurrentValue;
};

// Compute cash from initial capital + all cash-affecting transactions (pure fold
// over the ledger). This uses position_buy and position_sell to track cash flow.
const computeCashBalance = (
  initialCapital: number,
  transactions: PortfolioTransaction[],
  portfolioName: string
): number => {
  let cashBalance = initialCapital;

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
    // Previously omitted types — now included so rolls/dividends/fees affect cash balance:
    else if (transaction.type === 'option_roll') {
      // Net signed cash flow of the roll (positive = credit roll, negative = debit roll)
      cashBalance += transaction.amount;
    } else if (transaction.type === 'dividend') {
      // Dividend received (positive amount)
      cashBalance += transaction.amount;
    } else if (transaction.type === 'fee') {
      // Transaction fee (stored as negative amount by the ledger projection)
      cashBalance += transaction.amount;
    }
  });

  return cashBalance;
};

// ---------------------------------------------------------------------------
// Cash-balance cache.
//
// On a live price tick only position values change — the transaction ledger does
// NOT — yet the old code re-folded the ENTIRE (ever-growing) ledger on every tick.
//
// The cache is keyed on the IDENTITY of `state.portfolios.transactions`. Every
// reducer that can change the ledger replaces that array reference (the
// events/appendEvents and events/replayEvents folds via immer, and redux-persist
// REHYDRATE which swaps in a whole new state tree), so a changed ledger always
// misses the cache and is recomputed — there is no explicit invalidation list to
// drift out of sync. Using a WeakMap also means dropped state trees (e.g. a
// previous per-user store) don't leak.
//
// Cash additionally depends on `portfolio.initialCapital`, which can change via
// portfolio events WITHOUT touching the transactions array, so each cached entry
// records the initialCapital it was computed with and is bypassed on mismatch.
// ---------------------------------------------------------------------------
interface CashCacheEntry {
  initialCapital: number;
  cash: number;
}

const cashBalanceCache = new WeakMap<PortfolioTransaction[], Map<string, CashCacheEntry>>();

const getCashBalance = (
  initialCapital: number,
  transactions: PortfolioTransaction[] | undefined,
  portfolioName: string
): number => {
  // No ledger array to key on (legacy/partial state) — compute directly.
  if (!transactions) {
    return computeCashBalance(initialCapital, [], portfolioName);
  }

  let perPortfolio = cashBalanceCache.get(transactions);
  if (!perPortfolio) {
    perPortfolio = new Map();
    cashBalanceCache.set(transactions, perPortfolio);
  }

  const cached = perPortfolio.get(portfolioName);
  if (cached && cached.initialCapital === initialCapital) {
    return cached.cash;
  }

  const cash = computeCashBalance(initialCapital, transactions, portfolioName);
  perPortfolio.set(portfolioName, { initialCapital, cash });
  return cash;
};

/**
 * Calculate the total portfolio value (cash + current value of open positions).
 * The cash component is cached per ledger snapshot (see cashBalanceCache above);
 * the positions component is recomputed on every call.
 */
export const calculatePortfolioValue = (state: RootState, portfolioName: string): number => {
  const portfolio = state.portfolios.portfolios.find((p) => p.name === portfolioName);
  if (!portfolio) return 0;

  const cashBalance = getCashBalance(
    portfolio.initialCapital,
    state.portfolios.transactions,
    portfolioName
  );

  return cashBalance + computePositionsValue(state, portfolioName);
};

/**
 * Uncached reference implementation — recomputes the cash fold from scratch.
 * Exported ONLY for regression tests that assert the cached path is bit-identical.
 */
export const calculatePortfolioValueUncached = (
  state: RootState,
  portfolioName: string
): number => {
  const portfolio = state.portfolios.portfolios.find((p) => p.name === portfolioName);
  if (!portfolio) return 0;

  const cashBalance = computeCashBalance(
    portfolio.initialCapital,
    state.portfolios.transactions || [],
    portfolioName
  );

  return cashBalance + computePositionsValue(state, portfolioName);
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
    // Domain-event commits/replays can touch positions in any portfolio (and the
    // payload is a heterogeneous event list), so recompute every portfolio. These
    // fire on user commands and once at cold boot — infrequent enough that a full
    // recompute is cheaper than decoding affected portfolios from the event stream.
    case 'events/appendEvents':
    case 'events/replayEvents':
      return dedupe(stateAfter.portfolios.portfolios.map((p) => p.name));

    case 'positions/updatePositionValue':
    case 'positions/updatePositionLivePrice': {
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

    default:
      return [];
  }
};

export const positionValueMiddleware: Middleware = (store) => (next) => (action) => {
  // Only process position mutations (position lifecycle + live-price ticks).
  // Transaction mutations now flow through events/appendEvents (already in isPositionMutation).
  if (!isPositionMutation(action)) {
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
