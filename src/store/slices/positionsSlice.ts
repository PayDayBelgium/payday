import { createSlice, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Position, PortfolioName, PriceAlertRule, PriceAlert } from '../../types';
import type { RootState } from '../index';
import { groupHoldings } from '../../utils/holdings';
import { applyPositionEvent } from '../events/projectPositions';
import { appendEvents, replayEvents } from '../events/eventsSlice';
import { applyPriceAlertRuleEvent } from '../events/projectPriceAlertRules';
import type { DomainEvent } from '../events/types';

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
          /**
           * Optional live price per share. Provided by tickerPriceMiddleware when it
           * batches a price tick across stock/ETF positions, so a single batched
           * dispatch carries everything updatePositionLivePrice used to set.
           */
          currentPrice?: number;
        }>
      >
    ) => {
      action.payload.forEach(({ id, currentValue, currentPrice }) => {
        const position = state.positions.find((p) => p.id === id);
        if (position) {
          // Structural cast: not every Position variant declares these live fields.
          const target = position as { currentValue?: number; currentPrice?: number };
          target.currentValue = currentValue;
          if (currentPrice !== undefined) {
            target.currentPrice = currentPrice;
          }
        }
      });
    },
    /** Live-price tick: update currentPrice + currentValue on a stock/ETF position. */
    updatePositionLivePrice: (
      state,
      action: PayloadAction<{ id: string; currentPrice: number; currentValue: number }>
    ) => {
      const position = state.positions.find((p) => p.id === action.payload.id);
      if (position) {
        (position as any).currentPrice = action.payload.currentPrice;
        (position as any).currentValue = action.payload.currentValue;
      }
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
    setSelectedPortfolio: (state, action: PayloadAction<PortfolioName | null>) => {
      state.selectedPortfolio = action.payload;
    },
    setSelectedStrategy: (state, action: PayloadAction<string | null>) => {
      state.selectedStrategy = action.payload;
    },
    loadPositions: (state, action: PayloadAction<Position[]>) => {
      state.positions = action.payload;
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
  },
  extraReducers: (builder) => {
    const fold = (state: PositionsState, events: DomainEvent[]) => {
      for (const event of events) {
        state.positions = applyPositionEvent(state.positions, event);
        state.priceAlertRules = applyPriceAlertRuleEvent(state.priceAlertRules, event);
      }
    };
    builder.addCase(appendEvents, (state, action) => fold(state, action.payload.events));
    builder.addCase(replayEvents, (state, action) => {
      state.positions = [];
      state.priceAlertRules = [];
      fold(state, action.payload);
    });
  },
});

export const {
  updatePositionValue,
  updateMultiplePositionValues,
  updatePositionLivePrice,
  updateOptionPremium,
  setSelectedPortfolio,
  setSelectedStrategy,
  loadPositions,
  addPriceAlert,
  markPriceAlertAsRead,
  deletePriceAlert,
  clearReadAlerts,
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

// Memoized selector: per-ticker Holdings (aggregated lots + covered-call capacity).
// Ticker prices are threaded in so the capacity allocator uses the same
// price-aware tie-break as campaignDetector/alertEvaluator (dashboard parity).
export const selectHoldingsByPortfolio = (portfolioName: PortfolioName) =>
  createSelector(
    [selectPositions, (state: RootState) => state.tickers.tickers],
    (positions, tickers) => groupHoldings(positions, portfolioName, tickers)
  );

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
