import { createSlice } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  Portfolio,
  PortfolioSummary,
  DailyPortfolioData,
  PortfolioTransaction,
} from '../../types';
import type { RootState } from '../index';

interface PortfoliosState {
  portfolios: Portfolio[];
  summaries: PortfolioSummary[];
  dailyData: DailyPortfolioData[];
  transactions: PortfolioTransaction[]; // Portfolio transacties per portfolio
}

const initialState: PortfoliosState = {
  portfolios: [],
  summaries: [],
  dailyData: [],
  transactions: [],
};

const portfoliosSlice = createSlice({
  name: 'portfolios',
  initialState,
  reducers: {
    setInitialState: (state, action: PayloadAction<Portfolio[]>) => {
      state.portfolios = action.payload;
    },
    loadMockData: (
      state,
      action: PayloadAction<{
        portfolios: Portfolio[];
        summaries: PortfolioSummary[];
        dailyData: DailyPortfolioData[];
        transactions?: PortfolioTransaction[];
      }>
    ) => {
      state.portfolios = action.payload.portfolios;
      state.summaries = action.payload.summaries;
      state.dailyData = action.payload.dailyData;
      if (action.payload.transactions) {
        state.transactions = action.payload.transactions;
      }
    },
    addPortfolio: (state, action: PayloadAction<Portfolio>) => {
      state.portfolios.push(action.payload);
    },
    updatePortfolio: (state, action: PayloadAction<Portfolio & { oldName?: string }>) => {
      const index = state.portfolios.findIndex((b) => b.id === action.payload.id);
      if (index !== -1) {
        const oldPortfolio = state.portfolios[index];
        const oldName = action.payload.oldName || oldPortfolio.name;
        const newName = action.payload.name;

        // Update the portfolio
        state.portfolios[index] = action.payload;

        // If name changed, update all references in summaries, dailyData, and transactions
        if (oldName !== newName) {
          // Update summaries (ensure array exists)
          if (state.summaries && Array.isArray(state.summaries)) {
            state.summaries = state.summaries.map((summary) =>
              summary.portfolio === oldName ? { ...summary, portfolio: newName } : summary
            );
          }

          // Update dailyData (ensure array exists)
          if (state.dailyData && Array.isArray(state.dailyData)) {
            state.dailyData = state.dailyData.map((data) =>
              data.portfolio === oldName ? { ...data, portfolio: newName } : data
            );
          }

          // Update transactions (ensure array exists)
          if (state.transactions && Array.isArray(state.transactions)) {
            state.transactions = state.transactions.map((transaction) =>
              transaction.portfolio === oldName
                ? { ...transaction, portfolio: newName }
                : transaction
            );
          }
        }
      }
    },
    deletePortfolio: (state, action: PayloadAction<string>) => {
      state.portfolios = state.portfolios.filter((b) => b.id !== action.payload);
    },
    reorderPortfolios: (state, action: PayloadAction<Portfolio[]>) => {
      state.portfolios = action.payload;
    },
    updatePortfolioSummary: (state, action: PayloadAction<PortfolioSummary>) => {
      const index = state.summaries.findIndex((b) => b.portfolio === action.payload.portfolio);
      if (index !== -1) {
        state.summaries[index] = action.payload;
      }
    },
    addDailyData: (state, action: PayloadAction<DailyPortfolioData>) => {
      state.dailyData.push(action.payload);
    },
    updateDailyData: (state, action: PayloadAction<DailyPortfolioData>) => {
      const index = state.dailyData.findIndex(
        (d) => d.date === action.payload.date && d.portfolio === action.payload.portfolio
      );
      if (index !== -1) {
        state.dailyData[index] = action.payload;
      } else {
        state.dailyData.push(action.payload);
      }
    },
    loadDailyData: (state, action: PayloadAction<DailyPortfolioData[]>) => {
      state.dailyData = action.payload;
    },
    // Portfolio Transaction Actions
    addTransaction: (state, action: PayloadAction<PortfolioTransaction>) => {
      // Initialize transactions array if it doesn't exist
      if (!state.transactions) {
        state.transactions = [];
      }
      state.transactions.push(action.payload);

      // Update portfolio currentValue if transaction includes newValue
      if (action.payload.newValue !== undefined) {
        const portfolio = state.portfolios.find((b) => b.name === action.payload.portfolio);
        if (portfolio) {
          portfolio.currentValue = action.payload.newValue;
        }

        // Automatically add/update daily data entry for this transaction date
        const transactionDate = action.payload.date;
        const existingDailyDataIndex = state.dailyData.findIndex(
          (d) => d.date === transactionDate && d.portfolio === action.payload.portfolio
        );

        // Calculate total transactions for this date
        const transactionsOnDate = state.transactions.filter(
          (t) => t.portfolio === action.payload.portfolio && t.date === transactionDate
        );

        // Sum up all transaction amounts for dailyPnL
        const dailyPnL = transactionsOnDate.reduce((sum, t) => sum + t.amount, 0);

        // Create or update daily data entry
        const dailyDataEntry: DailyPortfolioData = {
          date: transactionDate,
          portfolio: action.payload.portfolio,
          totalValue: action.payload.newValue,
          cash: portfolio?.currentValue || 0, // For now, use currentValue as cash (can be refined later)
          dailyPnL,
          weeklyPnL: 0, // Can be calculated later
        };

        if (existingDailyDataIndex !== -1) {
          state.dailyData[existingDailyDataIndex] = dailyDataEntry;
        } else {
          state.dailyData.push(dailyDataEntry);
        }
      }
    },
    updateTransaction: (state, action: PayloadAction<PortfolioTransaction>) => {
      const index = state.transactions.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.transactions[index] = action.payload;
      }
    },
    deleteTransaction: (state, action: PayloadAction<string>) => {
      state.transactions = state.transactions.filter((t) => t.id !== action.payload);
    },
    updatePortfolioValue: (state, action: PayloadAction<{ portfolio: string; value: number }>) => {
      const portfolio = state.portfolios.find((b) => b.name === action.payload.portfolio);
      if (portfolio) {
        portfolio.currentValue = action.payload.value;
      }
    },
    // NOTE: Ticker management lives entirely in tickersSlice (single source of truth).
    // The legacy ticker reducers/selectors that used to live here were removed; see
    // tickerMigration.ts for the one-time migration of older persisted data.
    resetPortfoliosState: () => initialState,
  },
});

export const {
  setInitialState,
  loadMockData,
  addPortfolio,
  updatePortfolio,
  deletePortfolio,
  reorderPortfolios,
  updatePortfolioSummary,
  addDailyData,
  updateDailyData,
  loadDailyData,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  updatePortfolioValue,
  resetPortfoliosState,
} = portfoliosSlice.actions;

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
