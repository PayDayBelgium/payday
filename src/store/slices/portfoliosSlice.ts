import { createSlice } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  Portfolio,
  PortfolioSummary,
  DailyPortfolioData,
  PortfolioTransaction,
  Position,
} from '../../types';
import type { RootState } from '../index';
import { appendEvents, replayEvents } from '../events/eventsSlice';
import { applyPortfolioEvent } from '../events/projectPortfolios';
import { applyTransactionEvent } from '../events/projectTransactions';
import { applyPositionEvent } from '../events/projectPositions';
import type { DomainEvent } from '../events/types';

interface PortfoliosState {
  portfolios: Portfolio[];
  summaries: PortfolioSummary[];
  transactions: PortfolioTransaction[];
}

const initialState: PortfoliosState = {
  portfolios: [],
  summaries: [],
  transactions: [],
};

/** Shared fold helper — mirrors tradesSlice's pattern exactly. */
function fold(state: PortfoliosState, events: DomainEvent[], positionsSeed: Position[]): void {
  let positions = positionsSeed;
  for (const event of events) {
    state.portfolios = applyPortfolioEvent(state.portfolios, event);
    // applyTransactionEvent needs positionsBefore (i.e. positions BEFORE this event)
    state.transactions = applyTransactionEvent(state.transactions, event, positions);
    positions = applyPositionEvent(positions, event);
  }
}

const portfoliosSlice = createSlice({
  name: 'portfolios',
  initialState,
  reducers: {
    updatePortfolioValue: (state, action: PayloadAction<{ portfolio: string; value: number }>) => {
      const portfolio = state.portfolios.find((b) => b.name === action.payload.portfolio);
      if (portfolio) {
        portfolio.currentValue = action.payload.value;
      }
    },
    updatePortfolioSummary: (state, action: PayloadAction<PortfolioSummary>) => {
      const index = state.summaries.findIndex((b) => b.portfolio === action.payload.portfolio);
      if (index !== -1) {
        state.summaries[index] = action.payload;
      }
    },
    // NOTE: Ticker management lives entirely in tickersSlice (single source of truth).
    // The legacy ticker reducers/selectors that used to live here were removed; see
    // tickerMigration.ts for the one-time migration of older persisted data.
  },
  extraReducers: (builder) => {
    builder.addCase(appendEvents, (state, action) => {
      fold(state, action.payload.events, action.payload.positionsBefore);
    });
    builder.addCase(replayEvents, (state, action) => {
      state.portfolios = [];
      state.transactions = [];
      // summaries are derived — cleared and recomputed by selectPortfolioSummaries
      fold(state, action.payload, []);
    });
  },
});

export const { updatePortfolioValue, updatePortfolioSummary } = portfoliosSlice.actions;

// Base Selectors
export const selectPortfolios = (state: RootState) => state.portfolios.portfolios;
export const selectTransactions = (state: RootState) => state.portfolios.transactions;

// Memoized selector for transactions by portfolio
export const selectTransactionsByPortfolio = createSelector(
  [selectTransactions, (_state: RootState, portfolioName: string) => portfolioName],
  (transactions, portfolioName) => (transactions || []).filter((t) => t.portfolio === portfolioName)
);

/**
 * Derives a realized equity time-series (DailyPortfolioData[]) from the transaction ledger.
 *
 * For each portfolio:
 * - Sort transactions by date ascending.
 * - Walk them applying the cash rule: withdrawal subtracts, every other type adds the signed amount.
 * - Emit one point per (portfolio, date) after all same-date transactions are processed.
 * - Append a final point whose totalValue is portfolio.currentValue (live mark-to-market), dated at
 *   the latest transaction date. If there are no transactions, emit a single bootstrap point.
 *
 * "Today" is intentionally derived from transaction dates — never from Date.now() — so the selector
 * stays pure and its output is deterministic for a given store state.
 */
export const selectEquitySeries = createSelector(
  [selectPortfolios, selectTransactions],
  (portfolios, transactions): DailyPortfolioData[] => {
    const points: DailyPortfolioData[] = [];

    for (const portfolio of portfolios) {
      const ptxns = [...(transactions || []).filter((t) => t.portfolio === portfolio.name)].sort(
        (a, b) => a.date.localeCompare(b.date)
      );

      if (ptxns.length === 0) {
        // No transactions yet — emit a single bootstrap point.
        const bootstrapDate = portfolio.startDate ?? '';
        points.push({
          date: bootstrapDate,
          portfolio: portfolio.name,
          totalValue: portfolio.currentValue,
          cash: portfolio.initialCapital,
          dailyPnL: 0,
          weeklyPnL: 0,
        });
        continue;
      }

      // Walk transactions, grouping by date.
      let runningCash = portfolio.initialCapital;
      let prevCash = portfolio.initialCapital;

      for (let i = 0; i < ptxns.length; i++) {
        const txn = ptxns[i];

        // Apply the cash rule — mirrors positionValueMiddleware exactly.
        if (txn.type === 'withdrawal') {
          runningCash -= txn.amount;
        } else {
          // deposit / dividend / position_sell / premium_collected are positive;
          // position_buy / premium_paid / fee / adjustment / option_roll carry their own sign.
          runningCash += txn.amount;
        }

        // Detect date boundary: flush when date changes or at the end of the list.
        const isLast = i === ptxns.length - 1;
        const nextDate = isLast ? null : ptxns[i + 1].date;

        if (isLast || nextDate !== txn.date) {
          points.push({
            date: txn.date,
            portfolio: portfolio.name,
            totalValue: runningCash,
            cash: runningCash,
            dailyPnL: runningCash - prevCash,
            weeklyPnL: 0,
          });
          prevCash = runningCash;
        }
      }

      // Final "live" point: replace the last emitted point's totalValue with portfolio.currentValue
      // so the curve ends at the true mark-to-market value. The date stays at the last transaction
      // date — we never call Date.now() inside a selector.
      const portfolioPoints = points.filter((p) => p.portfolio === portfolio.name);
      const lastPoint = portfolioPoints[portfolioPoints.length - 1];
      if (lastPoint) {
        // Compute the second-to-last totalValue for the live dailyPnL.
        const prevPoint = portfolioPoints[portfolioPoints.length - 2];
        const prevValue = prevPoint?.totalValue ?? portfolio.initialCapital;
        lastPoint.totalValue = portfolio.currentValue;
        lastPoint.dailyPnL = portfolio.currentValue - prevValue;
      }
    }

    return points;
  }
);

// Memoized selector to calculate portfolio summaries.
// IMPORTANT: portfolio.currentValue is the single source of truth for current portfolio value.
// Weekly/yearly returns are derived from selectEquitySeries.
export const selectPortfolioSummaries = createSelector(
  [selectPortfolios, selectEquitySeries, (state: RootState) => state.positions.positions],
  (portfolios, equitySeries, positions): PortfolioSummary[] => {
    return portfolios.map((portfolio) => {
      // SINGLE SOURCE OF TRUTH: portfolio.currentValue
      const totalValue = portfolio.currentValue || 0;

      // Calculate positions value and cash from actual positions
      const portfolioPositions = positions.filter(
        (p) => p.portfolio === portfolio.name && p.status === 'open'
      );

      // Calculate Long and Short values for proper cash calculation
      // Long = stocks + ETFs + bought options
      // Short = sold options

      // Stock and ETF value (always long positions)
      let longValue = 0;
      let shortValue = 0;
      let uncoveredValue = 0;

      // Track active strategies based on position types
      const strategySet = new Set<string>();
      let allocatedCash = 0;

      portfolioPositions.forEach((pos) => {
        if (pos.type === 'stock' || pos.type === 'etf') {
          // Stocks and ETFs: always long positions
          longValue += pos.currentValue ?? 0;
          strategySet.add(pos.type === 'etf' ? 'ETF' : 'Aandelen');
        } else if (pos.type === 'call' || pos.type === 'put') {
          const option = pos as any;
          if (option.action === 'buy') {
            // Long options: use current value
            longValue += Math.abs(pos.currentValue ?? 0);
            if (option.type === 'call') {
              strategySet.add('Long Calls');
            } else {
              strategySet.add('Long Puts');
            }
          } else if (option.action === 'sell') {
            // Short options: use current value (liability)
            const optionValue = Math.abs(pos.currentValue ?? 0);
            shortValue += optionValue;

            if (option.type === 'put') {
              // Short puts have uncovered risk (strike * contracts * 100)
              uncoveredValue += option.strike * option.contracts * 100;
              strategySet.add('Cash Secured Puts');
              // Track allocated cash from cashReserved
              if (option.cashReserved) {
                allocatedCash += option.cashReserved;
              }
            } else if (option.type === 'call') {
              strategySet.add('Covered Calls');
            }
          }
        } else if (pos.type === 'spread') {
          // Spreads: track collateral as allocated cash
          const spread = pos as any;
          if (spread.collateral) {
            allocatedCash += spread.collateral;
          }
        }
      });

      // Cash = Portfolio Value - Long + Short
      // This follows the formula: Portfolio Value = Cash + Long - Short
      const cash = Math.max(0, totalValue - longValue + shortValue);

      // Derive weekly/yearly returns from the equity series for this portfolio.
      const portfolioSeries = equitySeries
        .filter((d) => d.portfolio === portfolio.name)
        .sort((a, b) => a.date.localeCompare(b.date));

      let weeklyReturn = 0;
      let yearlyReturn = 0;

      if (portfolioSeries.length >= 2) {
        // Anchor the lookback to the series' latest point date (not the wall clock):
        // keeps this memoized selector pure/stable and matches the realized-series design
        // where everything is keyed off ledger dates.
        const latestMs = new Date(portfolioSeries[portfolioSeries.length - 1].date).getTime();
        const DAY = 24 * 60 * 60 * 1000;

        // Weekly: value ~7 days back vs the current (live) value.
        const oneWeekAgoIso = new Date(latestMs - 7 * DAY).toISOString().slice(0, 10);
        const weekAgoPoint = [...portfolioSeries].reverse().find((d) => d.date <= oneWeekAgoIso);
        if (weekAgoPoint && weekAgoPoint.totalValue > 0) {
          weeklyReturn = ((totalValue - weekAgoPoint.totalValue) / weekAgoPoint.totalValue) * 100;
        }

        // Yearly: value ~1 year back vs the current (live) value.
        const oneYearAgoIso = new Date(latestMs - 365 * DAY).toISOString().slice(0, 10);
        const yearAgoPoint = [...portfolioSeries].reverse().find((d) => d.date <= oneYearAgoIso);
        if (yearAgoPoint && yearAgoPoint.totalValue > 0) {
          yearlyReturn = ((totalValue - yearAgoPoint.totalValue) / yearAgoPoint.totalValue) * 100;
        }
      }

      return {
        portfolio: portfolio.name,
        totalValue, // Always from portfolio.currentValue
        cash,
        allocatedCash, // Cash reserved for CSPs and spreads
        uncoveredValue, // Calculated from short put positions
        totalWeeklyReturn: weeklyReturn,
        yearlyReturn, // Calculated from historical data
        positionCount: portfolioPositions.length,
        activeStrategies: Array.from(strategySet), // Derived from position types
      };
    });
  }
);

// Selector for portfolio data by name
export const selectPortfolioByName = (portfolioName: string) => (state: RootState) =>
  state.portfolios.portfolios.find((b) => b.name === portfolioName);

// Selector for portfolio summary by name
export const selectPortfolioSummaryByName = (portfolioName: string) => (state: RootState) => {
  const summaries = selectPortfolioSummaries(state);
  return summaries.find((s) => s.portfolio === portfolioName);
};

// Centralized selector for portfolio value breakdown
// This calculates long value, short value, and cash for a portfolio
export const selectPortfolioValueBreakdown = (portfolioName: string) =>
  createSelector(
    [
      (state: RootState) => state.portfolios.portfolios.find((p) => p.name === portfolioName),
      (state: RootState) =>
        state.positions.positions.filter(
          (p) => p.portfolio === portfolioName && p.status === 'open'
        ),
    ],
    (portfolio, positions) => {
      if (!portfolio) {
        return {
          totalValue: 0,
          longValue: 0,
          shortValue: 0,
          cash: 0,
          stockEtfValue: 0,
          optionsLongValue: 0,
          optionsShortValue: 0,
          positionCount: positions.length,
        };
      }

      const totalValue = portfolio.currentValue || 0;

      let stockEtfValue = 0;
      let optionsLongValue = 0;
      let optionsShortValue = 0;

      positions.forEach((pos) => {
        if (pos.type === 'stock' || pos.type === 'etf') {
          stockEtfValue += pos.currentValue ?? 0;
        } else if (pos.type === 'call' || pos.type === 'put') {
          const option = pos as any;
          if (option.action === 'buy') {
            optionsLongValue += Math.abs(pos.currentValue ?? 0);
          } else if (option.action === 'sell') {
            optionsShortValue += Math.abs(pos.currentValue ?? 0);
          }
        }
      });

      const longValue = stockEtfValue + optionsLongValue;
      const shortValue = optionsShortValue;
      const cash = Math.max(0, totalValue - longValue + shortValue);

      return {
        totalValue,
        longValue,
        shortValue,
        cash,
        stockEtfValue,
        optionsLongValue,
        optionsShortValue,
        positionCount: positions.length,
      };
    }
  );

// Selector for total portfolio value across all portfolios
export const selectTotalPortfolioValue = createSelector([selectPortfolios], (portfolios) =>
  portfolios.reduce((sum, p) => sum + (p.currentValue || 0), 0)
);

export default portfoliosSlice.reducer;
