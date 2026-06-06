import { createSlice, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { TradingStrategy, PortfolioName, StrategyRule, StrategyType } from '../../types';
import type { RootState } from '../index';

interface StrategiesState {
  strategies: TradingStrategy[];
  strategyRules: StrategyRule[];
  dismissedAlerts: string[]; // IDs of dismissed strategy alerts
}

const initialState: StrategiesState = {
  strategies: [],
  strategyRules: [],
  dismissedAlerts: [],
};

const strategiesSlice = createSlice({
  name: 'strategies',
  initialState,
  reducers: {
    // Add a new strategy
    addStrategy: (state, action: PayloadAction<TradingStrategy>) => {
      state.strategies.push(action.payload);
    },

    // Update an existing strategy
    updateStrategy: (state, action: PayloadAction<TradingStrategy>) => {
      const index = state.strategies.findIndex((s) => s.id === action.payload.id);
      if (index !== -1) {
        state.strategies[index] = {
          ...action.payload,
          updatedAt: new Date().toISOString(),
        };
      }
    },

    // Delete a strategy
    deleteStrategy: (state, action: PayloadAction<string>) => {
      state.strategies = state.strategies.filter((s) => s.id !== action.payload);
    },

    // Add a position to a strategy
    addPositionToStrategy: (
      state,
      action: PayloadAction<{ strategyId: string; positionId: string }>
    ) => {
      const strategy = state.strategies.find((s) => s.id === action.payload.strategyId);
      if (strategy && !strategy.positionIds.includes(action.payload.positionId)) {
        strategy.positionIds.push(action.payload.positionId);
        strategy.updatedAt = new Date().toISOString();
      }
    },

    // Remove a position from a strategy
    removePositionFromStrategy: (
      state,
      action: PayloadAction<{ strategyId: string; positionId: string }>
    ) => {
      const strategy = state.strategies.find((s) => s.id === action.payload.strategyId);
      if (strategy) {
        strategy.positionIds = strategy.positionIds.filter(
          (id) => id !== action.payload.positionId
        );
        strategy.updatedAt = new Date().toISOString();
      }
    },

    // Set all positions for a strategy
    setStrategyPositions: (
      state,
      action: PayloadAction<{ strategyId: string; positionIds: string[] }>
    ) => {
      const strategy = state.strategies.find((s) => s.id === action.payload.strategyId);
      if (strategy) {
        strategy.positionIds = action.payload.positionIds;
        strategy.updatedAt = new Date().toISOString();
      }
    },

    // Load all strategies (for initialization)
    loadStrategies: (state, action: PayloadAction<TradingStrategy[]>) => {
      state.strategies = action.payload;
    },

    // Clear all strategies for a portfolio
    clearPortfolioStrategies: (state, action: PayloadAction<PortfolioName>) => {
      state.strategies = state.strategies.filter((s) => s.portfolio !== action.payload);
    },

    // Strategy Rules actions
    addStrategyRule: (state, action: PayloadAction<StrategyRule>) => {
      state.strategyRules.push(action.payload);
    },

    updateStrategyRule: (state, action: PayloadAction<StrategyRule>) => {
      const index = state.strategyRules.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.strategyRules[index] = action.payload;
      }
    },

    deleteStrategyRule: (state, action: PayloadAction<string>) => {
      state.strategyRules = state.strategyRules.filter((r) => r.id !== action.payload);
    },

    toggleStrategyRule: (state, action: PayloadAction<string>) => {
      const rule = state.strategyRules.find((r) => r.id === action.payload);
      if (rule) {
        rule.enabled = !rule.enabled;
      }
    },

    loadStrategyRules: (state, action: PayloadAction<StrategyRule[]>) => {
      state.strategyRules = action.payload;
    },

    // Dismissed alerts actions
    dismissStrategyAlert: (state, action: PayloadAction<string>) => {
      if (!state.dismissedAlerts.includes(action.payload)) {
        state.dismissedAlerts.push(action.payload);
      }
    },

    clearDismissedAlerts: (state) => {
      state.dismissedAlerts = [];
    },

    // Clear dismissed alerts for a specific portfolio
    clearPortfolioDismissedAlerts: (state, action: PayloadAction<string>) => {
      // Remove alerts that contain the portfolio name in their ID
      state.dismissedAlerts = state.dismissedAlerts.filter((id) => !id.includes(action.payload));
    },
  },
});

export const {
  addStrategy,
  updateStrategy,
  deleteStrategy,
  addPositionToStrategy,
  removePositionFromStrategy,
  setStrategyPositions,
  loadStrategies,
  clearPortfolioStrategies,
  addStrategyRule,
  updateStrategyRule,
  deleteStrategyRule,
  toggleStrategyRule,
  loadStrategyRules,
  dismissStrategyAlert,
  clearDismissedAlerts,
  clearPortfolioDismissedAlerts,
} = strategiesSlice.actions;

// Base Selectors
export const selectAllStrategies = (state: RootState) => state.strategies.strategies;
export const selectAllStrategyRules = (state: RootState) => state.strategies.strategyRules;
export const selectDismissedAlerts = (state: RootState) => state.strategies.dismissedAlerts;

// Memoized selectors for strategies
export const selectStrategiesByPortfolio = (portfolio: PortfolioName) =>
  createSelector([selectAllStrategies], (strategies) =>
    strategies.filter((s) => s.portfolio === portfolio)
  );

export const selectStrategyById = (id: string) =>
  createSelector([selectAllStrategies], (strategies) => strategies.find((s) => s.id === id));

export const selectStrategyByPositionId = (positionId: string) =>
  createSelector([selectAllStrategies], (strategies) =>
    strategies.find((s) => s.positionIds.includes(positionId))
  );

export const selectPositionStrategy = (positionId: string) =>
  createSelector([selectAllStrategies], (strategies) =>
    strategies.find((s) => s.positionIds.includes(positionId))
  );

// Memoized selectors for strategy rules
export const selectStrategyRulesByPortfolioAndType = (
  portfolio: PortfolioName,
  strategyType: StrategyType
) =>
  createSelector([selectAllStrategyRules], (rules) =>
    rules.filter((r) => r.portfolio === portfolio && r.strategyType === strategyType)
  );

export const selectEnabledStrategyRules = createSelector([selectAllStrategyRules], (rules) =>
  rules.filter((r) => r.enabled)
);

export const selectStrategyRulesByPortfolio = (portfolio: PortfolioName) =>
  createSelector([selectAllStrategyRules], (rules) =>
    rules.filter((r) => r.portfolio === portfolio)
  );

// Check if an alert is dismissed
export const selectIsAlertDismissed = (alertId: string) =>
  createSelector([selectDismissedAlerts], (dismissed) => dismissed.includes(alertId));

export default strategiesSlice.reducer;
