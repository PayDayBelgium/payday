import { createSlice, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { TradingStrategy, PortfolioName, StrategyRule, StrategyType } from '../../types';
import type { RootState } from '../index';
import { applyStrategiesEvent } from '../events/projectStrategies';
import { appendEvents, replayEvents } from '../events/eventsSlice';
import type { DomainEvent } from '../events/types';

interface StrategiesState {
  strategies: TradingStrategy[];
  strategyRules: StrategyRule[];
  dismissedAlerts: string[]; // IDs of dismissed strategy alerts (UI-ephemeral, not event-sourced)
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
    // All strategy / strategyRule intent reducers (addStrategy, updateStrategy,
    // deleteStrategy, addPositionToStrategy, removePositionFromStrategy,
    // setStrategyPositions, clearPortfolioStrategies, addStrategyRule,
    // updateStrategyRule, deleteStrategyRule, toggleStrategyRule) have been
    // replaced by event-sourced commands in src/store/commands/strategyCommands.ts.

    /**
     * Runtime-only: load strategies from a backup restore.
     * Deferred until the backup/restore path is fully event-sourced.
     * Kept as a harmless runtime reducer so backupActions.ts continues to work.
     */
    loadStrategies: (state, action: PayloadAction<TradingStrategy[]>) => {
      state.strategies = action.payload;
    },

    /**
     * Runtime-only: load strategy rules from a backup restore.
     * Deferred until the backup/restore path is fully event-sourced.
     * Kept as a harmless runtime reducer so backupActions.ts continues to work.
     */
    loadStrategyRules: (state, action: PayloadAction<StrategyRule[]>) => {
      state.strategyRules = action.payload;
    },

    /**
     * Runtime-only: dismiss a strategy alert by ID.
     * dismissedAlerts is UI-ephemeral — it is not event-sourced because alert
     * dismissals are transient UI state that should reset on reload (acceptable).
     */
    dismissStrategyAlert: (state, action: PayloadAction<string>) => {
      if (!state.dismissedAlerts.includes(action.payload)) {
        state.dismissedAlerts.push(action.payload);
      }
    },

    /** Runtime-only: clear all dismissed alerts. */
    clearDismissedAlerts: (state) => {
      state.dismissedAlerts = [];
    },

    /** Runtime-only: clear dismissed alerts for a specific portfolio. */
    clearPortfolioDismissedAlerts: (state, action: PayloadAction<string>) => {
      // Remove alerts that contain the portfolio name in their ID
      state.dismissedAlerts = state.dismissedAlerts.filter((id) => !id.includes(action.payload));
    },
  },
  extraReducers: (builder) => {
    const fold = (state: StrategiesState, events: DomainEvent[]) => {
      let next = { strategies: state.strategies, strategyRules: state.strategyRules };
      for (const event of events) {
        next = applyStrategiesEvent(next, event);
      }
      state.strategies = next.strategies;
      state.strategyRules = next.strategyRules;
      // dismissedAlerts is left untouched on append — it is runtime-only state.
    };
    builder.addCase(appendEvents, (state, action) => fold(state, action.payload.events));
    builder.addCase(replayEvents, (state, action) => {
      // On cold-boot replay: reset both projected arrays and dismissedAlerts
      // (dismissedAlerts is not persisted after removing 'strategies' from the
      // whitelist, so an empty reset is the correct starting point anyway).
      state.strategies = [];
      state.strategyRules = [];
      state.dismissedAlerts = [];
      fold(state, action.payload);
    });
  },
});

export const {
  loadStrategies,
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
