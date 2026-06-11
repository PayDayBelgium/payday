import { createSlice, createSelector } from '@reduxjs/toolkit';
import type { PortfolioName } from '../../types';
import { appendEvents, replayEvents } from '../events/eventsSlice';
import { applyWheelEvent, emptyWheelsProjection } from '../events/projectWheels';
import type { WheelsProjectionState } from '../events/projectWheels';
import type { DomainEvent } from '../events/types';

type WheelsState = WheelsProjectionState;

const initialState: WheelsState = emptyWheelsProjection();

const wheelsSlice = createSlice({
  name: 'wheels',
  initialState,
  reducers: {
    // All raw intent reducers removed — wheels are now exclusively derived from
    // the domain event log via appendEvents / replayEvents extraReducers below.
  },
  extraReducers: (builder) => {
    builder.addCase(appendEvents, (state, action) => {
      let projection: WheelsProjectionState = {
        wheels: state.wheels,
        openSoldOptions: state.openSoldOptions,
      };
      for (const event of action.payload.events as DomainEvent[]) {
        projection = applyWheelEvent(projection, event);
      }
      state.wheels = projection.wheels;
      state.openSoldOptions = projection.openSoldOptions;
    });
    builder.addCase(replayEvents, (state, action) => {
      let projection = emptyWheelsProjection();
      for (const event of action.payload as DomainEvent[]) {
        projection = applyWheelEvent(projection, event);
      }
      state.wheels = projection.wheels;
      state.openSoldOptions = projection.openSoldOptions;
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
