import { createSlice, createSelector } from '@reduxjs/toolkit';
import type { WheelCampaign, PortfolioName } from '../../types';
import { appendEvents, replayEvents } from '../events/eventsSlice';
import { applyWheelEvent } from '../events/projectWheels';
import type { DomainEvent } from '../events/types';

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
    // All raw intent reducers removed — wheels are now exclusively derived from
    // the domain event log via appendEvents / replayEvents extraReducers below.
  },
  extraReducers: (builder) => {
    builder.addCase(appendEvents, (state, action) => {
      for (const event of action.payload.events as DomainEvent[]) {
        state.wheels = applyWheelEvent(state.wheels, event);
      }
    });
    builder.addCase(replayEvents, (state, action) => {
      state.wheels = [];
      for (const event of action.payload as DomainEvent[]) {
        state.wheels = applyWheelEvent(state.wheels, event);
      }
    });
  },
});

// No actions to export (all intent reducers have been removed).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _actions = wheelsSlice.actions; // kept for RTK slice completeness

// Selectors
export const selectAllWheels = (state: { wheels: WheelsState }) => state.wheels.wheels;

export const selectWheelsByPortfolio = createSelector(
  [selectAllWheels, (_: any, portfolioName: PortfolioName) => portfolioName],
  (wheels, portfolioName) => wheels.filter((w) => w.portfolio === portfolioName)
);

export const selectActiveWheels = createSelector([selectAllWheels], (wheels) =>
  wheels.filter((w) => w.status === 'active')
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
