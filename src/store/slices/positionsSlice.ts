import { createSlice, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Position, PortfolioName, PriceAlertRule, PriceAlert } from '../../types';
import type { RootState } from '../index';
import { groupHoldings } from '../../utils/holdings';

interface PositionsState {
  positions: Position[];
  priceAlertRules: PriceAlertRule[];
  priceAlerts: PriceAlert[];
  selectedPortfolio: PortfolioName | null;
  selectedStrategy: string | null;
}

const initialState: PositionsState = {
  positions: [],
  priceAlertRules: [],
  priceAlerts: [],
  selectedPortfolio: null,
  selectedStrategy: null,
};

const positionsSlice = createSlice({
  name: 'positions',
  initialState,
  reducers: {
    addPosition: (state, action: PayloadAction<Position>) => {
      state.positions.push(action.payload);
    },
    updatePosition: (state, action: PayloadAction<Position>) => {
      const index = state.positions.findIndex((p) => p.id === action.payload.id);
      if (index !== -1) {
        const updatedPosition = { ...action.payload };

        // Ensure price values don't go below 0 for stocks/ETFs
        if (updatedPosition.type === 'stock' || updatedPosition.type === 'etf') {
          const stockPos = updatedPosition as any;
          if (stockPos.currentPrice !== undefined && stockPos.currentPrice < 0) {
            stockPos.currentPrice = 0;
          }
          if (stockPos.currentValue !== undefined && stockPos.currentValue < 0) {
            stockPos.currentValue = 0;
          }
        }

        // For options, currentValue can be negative (short positions are liabilities)
        // but the absolute value shouldn't exceed a reasonable threshold
        // We only ensure it doesn't go to extreme negative values
        if (updatedPosition.type === 'call' || updatedPosition.type === 'put') {
          const optionPos = updatedPosition as any;
          // For long options (buy), currentValue should be >= 0
          if (
            optionPos.action === 'buy' &&
            optionPos.currentValue !== undefined &&
            optionPos.currentValue < 0
          ) {
            optionPos.currentValue = 0;
          }
          // For short options (sell), currentValue is negative (liability)
          // Ensure it doesn't become positive (which would be incorrect)
          if (
            optionPos.action === 'sell' &&
            optionPos.currentValue !== undefined &&
            optionPos.currentValue > 0
          ) {
            optionPos.currentValue = 0;
          }
        }

        state.positions[index] = updatedPosition;
      }
    },
    removePosition: (state, action: PayloadAction<string>) => {
      state.positions = state.positions.filter((p) => p.id !== action.payload);
    },
    updatePositionValue: (
      state,
      action: PayloadAction<{
        id: string;
        currentValue: number;
      }>
    ) => {
      const position = state.positions.find((p) => p.id === action.payload.id);
      if (position) {
        (position as any).currentValue = action.payload.currentValue;
      }
    },
    updateMultiplePositionValues: (
      state,
      action: PayloadAction<
        Array<{
          id: string;
          currentValue: number;
        }>
      >
    ) => {
      action.payload.forEach(({ id, currentValue }) => {
        const position = state.positions.find((p) => p.id === id);
        if (position) {
          (position as any).currentValue = currentValue;
        }
      });
    },
    // Update option premium and delta by matching symbol, strike, expiration, and optionType
    updateOptionPremium: (
      state,
      action: PayloadAction<{
        symbol: string;
        strike: number;
        expiration: string;
        optionType: 'call' | 'put';
        premium: number;
        delta?: number;
      }>
    ) => {
      const { symbol, strike, expiration, optionType, premium, delta } = action.payload;

      // Find matching option positions
      state.positions.forEach((position) => {
        if (
          (position.type === 'call' || position.type === 'put') &&
          position.ticker.toUpperCase() === symbol.toUpperCase() &&
          position.type === optionType &&
          position.status === 'open'
        ) {
          const optionPos = position as any;
          // Check strike and expiration match
          if (optionPos.strike === strike && optionPos.expiration === expiration) {
            // Calculate new currentValue based on action (buy/sell)
            const contracts = optionPos.contracts || 1;
            const multiplier = 100; // Standard option multiplier

            if (optionPos.action === 'buy') {
              // Long option: positive value
              optionPos.currentValue = premium * contracts * multiplier;
            } else {
              // Short option: negative value (liability)
              optionPos.currentValue = -(premium * contracts * multiplier);
            }

            // Update delta if provided
            if (delta !== undefined) {
              optionPos.delta = delta;
            }
          }
        }
      });
    },
    closePosition: (
      state,
      action: PayloadAction<{
        id: string;
        closeDate: string;
        closePrice?: number;
        closePremium?: number;
        realizedPnL?: number;
        notes?: string;
      }>
    ) => {
      const position = state.positions.find((p) => p.id === action.payload.id);
      if (position) {
        position.status = 'closed';
        position.closeDate = action.payload.closeDate;

        // Add close details (fields now declared on BasePosition).
        if (action.payload.closePrice !== undefined) {
          position.closePrice = action.payload.closePrice;
        }
        if (action.payload.closePremium !== undefined) {
          position.closePremium = action.payload.closePremium;
        }
        if (action.payload.realizedPnL !== undefined) {
          position.realizedPnL = action.payload.realizedPnL;
        }
        if (action.payload.notes) {
          position.notes = position.notes
            ? `${position.notes}\n\nClose notes: ${action.payload.notes}`
            : `Close notes: ${action.payload.notes}`;
        }
      }
    },
    setSelectedPortfolio: (state, action: PayloadAction<PortfolioName | null>) => {
      state.selectedPortfolio = action.payload;
    },
    setSelectedStrategy: (state, action: PayloadAction<string | null>) => {
      state.selectedStrategy = action.payload;
    },
    loadPositions: (state, action: PayloadAction<Position[]>) => {
      state.positions = action.payload;
    },
    // Price Alert Rule actions
    addPriceAlertRule: (state, action: PayloadAction<PriceAlertRule>) => {
      state.priceAlertRules.push(action.payload);
    },
    updatePriceAlertRule: (state, action: PayloadAction<PriceAlertRule>) => {
      const index = state.priceAlertRules.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.priceAlertRules[index] = action.payload;
      }
    },
    deletePriceAlertRule: (state, action: PayloadAction<string>) => {
      state.priceAlertRules = state.priceAlertRules.filter((r) => r.id !== action.payload);
      // Also remove associated alerts
      state.priceAlerts = state.priceAlerts.filter((a) => a.ruleId !== action.payload);
    },
    togglePriceAlertRule: (state, action: PayloadAction<string>) => {
      const rule = state.priceAlertRules.find((r) => r.id === action.payload);
      if (rule) {
        rule.isActive = !rule.isActive;
      }
    },
    // Price Alert actions
    addPriceAlert: (state, action: PayloadAction<PriceAlert>) => {
      state.priceAlerts.push(action.payload);
    },
    markPriceAlertAsRead: (state, action: PayloadAction<string>) => {
      const alert = state.priceAlerts.find((a) => a.id === action.payload);
      if (alert) {
        alert.isRead = true;
      }
    },
    deletePriceAlert: (state, action: PayloadAction<string>) => {
      state.priceAlerts = state.priceAlerts.filter((a) => a.id !== action.payload);
    },
    clearReadAlerts: (state) => {
      state.priceAlerts = state.priceAlerts.filter((a) => !a.isRead);
    },
    updatePortfolioName: (state, action: PayloadAction<{ oldName: string; newName: string }>) => {
      const { oldName, newName } = action.payload;
      // Update portfolio name in all positions
      state.positions = state.positions.map((pos) =>
        pos.portfolio === oldName ? { ...pos, portfolio: newName as PortfolioName } : pos
      );
    },
  },
});

export const {
  addPosition,
  updatePosition,
  updatePositionValue,
  updateMultiplePositionValues,
  updateOptionPremium,
  removePosition,
  closePosition,
  setSelectedPortfolio,
  setSelectedStrategy,
  loadPositions,
  addPriceAlertRule,
  updatePriceAlertRule,
  deletePriceAlertRule,
  togglePriceAlertRule,
  addPriceAlert,
  markPriceAlertAsRead,
  deletePriceAlert,
  clearReadAlerts,
  updatePortfolioName,
} = positionsSlice.actions;

// Base Selectors
export const selectPositions = (state: RootState) => state.positions.positions;
export const selectSelectedPortfolio = (state: RootState) => state.positions.selectedPortfolio;
export const selectSelectedStrategy = (state: RootState) => state.positions.selectedStrategy;
export const selectPriceAlertRules = (state: RootState) => state.positions.priceAlertRules;
export const selectPriceAlerts = (state: RootState) => state.positions.priceAlerts;

// Memoized selector for active positions only
export const selectActivePositions = createSelector([selectPositions], (positions) =>
  positions.filter((p) => p.status === 'open')
);

// Memoized selector for positions by portfolio (factory function)
export const makeSelectPositionsByPortfolio = () =>
  createSelector(
    [selectPositions, (_state: RootState, portfolioName: PortfolioName) => portfolioName],
    (positions, portfolioName) => positions.filter((p) => p.portfolio === portfolioName)
  );

// Simple selector for positions by portfolio (for backward compatibility)
export const selectPositionsByPortfolio = (portfolioName: PortfolioName) =>
  createSelector([selectPositions], (positions) =>
    positions.filter((p) => p.portfolio === portfolioName)
  );

// Memoized selector for positions by type (factory function)
export const makeSelectPositionsByType = () =>
  createSelector([selectPositions, (_state: RootState, type: string) => type], (positions, type) =>
    positions.filter((p) => p.type === type)
  );

// Simple selector for positions by type (for backward compatibility)
export const selectPositionsByType = (type: string) =>
  createSelector([selectPositions], (positions) => positions.filter((p) => p.type === type));

// Memoized selector for positions by portfolio and type
export const selectPositionsByPortfolioAndType = (portfolioName: PortfolioName, type: string) =>
  createSelector([selectPositions], (positions) =>
    positions.filter((p) => p.portfolio === portfolioName && p.type === type)
  );

// Memoized selector for open positions by portfolio
export const selectOpenPositionsByPortfolio = (portfolioName: PortfolioName) =>
  createSelector([selectPositions], (positions) =>
    positions.filter((p) => p.portfolio === portfolioName && p.status === 'open')
  );

// Memoized selector: per-ticker Holdings (aggregated lots + covered-call capacity)
export const selectHoldingsByPortfolio = (portfolioName: PortfolioName) =>
  createSelector([selectPositions], (positions) => groupHoldings(positions, portfolioName));

// Price Alert Rule selectors
export const selectAllPriceAlertRules = (state: RootState) => state.positions.priceAlertRules;

export const selectPriceAlertRulesByPosition = (positionId: string) =>
  createSelector([selectPriceAlertRules], (rules) =>
    rules.filter((r) => r.positionId === positionId)
  );

export const selectActivePriceAlertRules = createSelector([selectPriceAlertRules], (rules) =>
  rules.filter((r) => r.isActive)
);

// Price Alert selectors
export const selectAllPriceAlerts = (state: RootState) => state.positions.priceAlerts;

export const selectPriceAlertsByPosition = (positionId: string) =>
  createSelector([selectPriceAlerts], (alerts) =>
    alerts.filter((a) => a.positionId === positionId)
  );

export const selectUnreadPriceAlerts = createSelector([selectPriceAlerts], (alerts) =>
  alerts.filter((a) => !a.isRead)
);

export const selectUnreadPriceAlertsCount = createSelector(
  [selectPriceAlerts],
  (alerts) => alerts.filter((a) => !a.isRead).length
);

export default positionsSlice.reducer;
