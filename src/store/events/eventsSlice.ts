import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../index';
import type { DomainEvent, UnsequencedEvent } from './types';
import type { Position } from '../../types';

interface EventsState {
  log: DomainEvent[];
  nextSeq: number;
  actor: string;
}

/**
 * appendEvents carries the positions snapshot from *before* this commit so the
 * trades projection (which needs positions-before each close) can fold without
 * reading another slice. Captured by the commit thunk.
 */
export interface AppendEventsPayload {
  events: DomainEvent[];
  positionsBefore: Position[];
}

const initialState: EventsState = {
  log: [],
  nextSeq: 0,
  actor: 'local',
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    /** Runtime append of newly committed (already stamped) events. */
    appendEvents: (state, action: PayloadAction<AppendEventsPayload>) => {
      for (const e of action.payload.events) {
        state.log.push(e);
      }
      state.nextSeq = state.log.length ? state.log[state.log.length - 1].seq + 1 : state.nextSeq;
    },
    /** Cold-boot replace of the whole log (projections fold the same action). */
    replayEvents: (state, action: PayloadAction<DomainEvent[]>) => {
      state.log = action.payload;
      state.nextSeq = action.payload.length
        ? action.payload[action.payload.length - 1].seq + 1
        : 0;
    },
    setActor: (state, action: PayloadAction<string>) => {
      state.actor = action.payload;
    },
  },
});

export const { appendEvents, replayEvents, setActor } = eventsSlice.actions;

/**
 * Stamp `seq` + `actor` onto unsequenced events and dispatch them as one
 * atomic append. Projections (extraReducers) and the persistence middleware
 * both observe the resulting `appendEvents` action. The positions-before
 * snapshot is captured here so the trades projection stays slice-independent.
 */
export const commit =
  (events: UnsequencedEvent[]) =>
  (dispatch: AppDispatch, getState: () => RootState): DomainEvent[] => {
    const { nextSeq, actor } = getState().events;
    const positionsBefore = getState().positions.positions;
    const stamped: DomainEvent[] = events.map((e, i) => ({
      ...e,
      seq: nextSeq + i,
      actor,
    })) as DomainEvent[];
    dispatch(appendEvents({ events: stamped, positionsBefore }));
    return stamped;
  };

// Selectors
export const selectEventLog = (state: RootState) => state.events.log;

export default eventsSlice.reducer;
