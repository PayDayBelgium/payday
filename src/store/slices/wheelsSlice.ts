import { createSlice, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { WheelCampaign, PortfolioName } from '../../types';

interface WheelsState {
  wheels: WheelCampaign[];
}

const initialState: WheelsState = {
  wheels: [],
};

const wheelsSlice = createSlice({
  name: 'wheels',
  initialState,
  reducers: {
    addWheel: (state, action: PayloadAction<WheelCampaign>) => {
      state.wheels.push(action.payload);
    },
    updateWheel: (state, action: PayloadAction<WheelCampaign>) => {
      const index = state.wheels.findIndex((w) => w.id === action.payload.id);
      if (index !== -1) {
        state.wheels[index] = action.payload;
      }
    },
    removeWheel: (state, action: PayloadAction<string>) => {
      state.wheels = state.wheels.filter((w) => w.id !== action.payload);
    },
    updateWheelPhase: (state, action: PayloadAction<{
      id: string;
      phase: 'csp' | 'stock' | 'completed';
    }>) => {
      const wheel = state.wheels.find((w) => w.id === action.payload.id);
      if (wheel) {
        wheel.phase = action.payload.phase;
        wheel.updatedAt = new Date().toISOString();
        if (action.payload.phase === 'completed') {
          wheel.status = 'completed';
          wheel.endDate = new Date().toISOString().split('T')[0];
        }
      }
    },
    incrementWheelCycle: (state, action: PayloadAction<string>) => {
      const wheel = state.wheels.find((w) => w.id === action.payload);
      if (wheel) {
        wheel.cycles += 1;
        wheel.updatedAt = new Date().toISOString();
      }
    },
    updateWheelPremium: (state, action: PayloadAction<{
      id: string;
      premiumCollected: number;
      realizedPnL: number;
    }>) => {
      const wheel = state.wheels.find((w) => w.id === action.payload.id);
      if (wheel) {
        wheel.totalPremiumCollected += action.payload.premiumCollected;
        wheel.totalRealizedPnL += action.payload.realizedPnL;
        wheel.updatedAt = new Date().toISOString();
      }
    },
    loadWheels: (state, action: PayloadAction<WheelCampaign[]>) => {
      state.wheels = action.payload;
    },
    updateWheelPortfolioName: (state, action: PayloadAction<{ oldName: string; newName: string }>) => {
      const { oldName, newName } = action.payload;
      // Update portfolio name in all wheels
      state.wheels = state.wheels.map((wheel) =>
        wheel.portfolio === oldName ? { ...wheel, portfolio: newName as PortfolioName } : wheel
      );
    },
  },
});

export const {
  addWheel,
  updateWheel,
  removeWheel,
  updateWheelPhase,
  incrementWheelCycle,
  updateWheelPremium,
  loadWheels,
  updateWheelPortfolioName,
} = wheelsSlice.actions;

// Selectors
export const selectAllWheels = (state: { wheels: WheelsState }) => state.wheels.wheels;

export const selectWheelsByPortfolio = createSelector(
  [selectAllWheels, (_: any, portfolioName: PortfolioName) => portfolioName],
  (wheels, portfolioName) => wheels.filter((w) => w.portfolio === portfolioName)
);

export const selectActiveWheels = createSelector(
  [selectAllWheels],
  (wheels) => wheels.filter((w) => w.status === 'active')
);

export const selectWheelById = createSelector(
  [selectAllWheels, (_: any, wheelId: string) => wheelId],
  (wheels, wheelId) => wheels.find((w) => w.id === wheelId)
);

export const selectWheelsByTicker = createSelector(
  [selectAllWheels, (_: any, ticker: string) => ticker],
  (wheels, ticker) => wheels.filter((w) => w.ticker.toUpperCase() === ticker.toUpperCase())
);

export default wheelsSlice.reducer;
