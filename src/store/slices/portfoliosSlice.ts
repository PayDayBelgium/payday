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
  // NOTE: dailyData (equity time-series) is never written by event projections.
  // The event-sourced daily/equity time-series is a deferred follow-up; this
  // array is kept for backward-compat with selectors and persisted data.
  dailyData: DailyPortfolioData[];
  transactions: PortfolioTransaction[];
}

const initialState: PortfoliosState = {
  portfolios: [],
  summaries: [],
  dailyData: [],
  transactions: [],
};

/** Shared fold helper — mirrors tradesSlice's pattern exactly. */
function fold(
  state: PortfoliosState,
  events: DomainEvent[],
  positionsSeed: Position[]
): void {
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
      // summaries and dailyData are left as [] (derived/deferred — not replayed from events)
      fold(state, action.payload, []);
    });
  },
});

export const { updatePortfolioValue, updatePortfolioSummary } = portfoliosSlice.actions;

// Base Selectors
export const selectPortfolios = (state: RootState) => state.portfolios.portfolios;
export const selectDailyData = (state: RootState) => state.portfolios.dailyData;
export const selectTransactions = (state: RootState) => state.portfolios.transactions;

// Memoized selector for transactions by portfolio
export const selectTransactionsByPortfolio = createSelector(
  [selectTransactions, (_state: RootState, portfolioName: string) => portfolioName],
  (transactions, portfolioName) => (transactions || []).filter((t) => t.portfolio === portfolioName)
);

// Memoized selector to calculate portfolio summaries
// IMPORTANT: portfolio.currentValue is the single source of truth for current portfolio value
// dailyData is only used for historical tracking and weekly returns
export const selectPortfolioSummaries = createSelector(
  [selectPortfolios, selectDailyData, (state: RootState) => state.positions.positions],
  (portfolios, dailyData, positions): PortfolioSummary[] => {
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

      // Get weekly return from latest daily data if available
      const portfolioData = dailyData.filter((d) => d.portfolio === portfolio.name);
      let weeklyReturn = 0;
      let yearlyReturn = 0;

      if (portfolioData.length > 0) {
        // Sort by date descending
        const sortedData = [...portfolioData].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const latestData = sortedData[0];
        weeklyReturn = latestData.weeklyPnL || 0;

        // Calculate yearly return from historical data
        // Find data from approximately 1 year ago
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        const yearAgoData = sortedData.find((d) => new Date(d.date) <= oneYearAgo);

        if (yearAgoData && yearAgoData.totalValue > 0) {
          yearlyReturn = ((totalValue - yearAgoData.totalValue) / yearAgoData.totalValue) * 100;
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

// Selector for daily data by portfolio
export const selectDailyDataByPortfolio = (portfolioName: string) => (state: RootState) =>
  state.portfolios.dailyData.filter((d) => d.portfolio === portfolioName);

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
