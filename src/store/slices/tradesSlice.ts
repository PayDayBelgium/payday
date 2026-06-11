import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Trade } from '../../types';
import { appendEvents, replayEvents } from '../events/eventsSlice';
import { applyTradeEvent } from '../events/projectTrades';
import { applyPositionEvent } from '../events/projectPositions';
import type { DomainEvent } from '../events/types';
import type { Position } from '../../types';

interface TradesState {
  trades: Trade[];
  filter: {
    ticker?: string;
    portfolio?: string;
    strategy?: string;
    dateRange?: { start: string; end: string };
  };
}

const initialState: TradesState = {
  trades: [],
  filter: {},
};

const tradesSlice = createSlice({
  name: 'trades',
  initialState,
  reducers: {
    updateTrade: (state, action: PayloadAction<Trade>) => {
      const index = state.trades.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.trades[index] = action.payload;
      }
    },
    removeTrade: (state, action: PayloadAction<string>) => {
      state.trades = state.trades.filter((t) => t.id !== action.payload);
    },
    setFilter: (state, action: PayloadAction<TradesState['filter']>) => {
      state.filter = action.payload;
    },
    clearFilter: (state) => {
      state.filter = {};
    },
    loadTrades: (state, action: PayloadAction<Trade[]>) => {
      state.trades = action.payload;
    },
  },
  extraReducers: (builder) => {
    const fold = (state: TradesState, events: DomainEvent[], positionsSeed: Position[]) => {
      let positions = positionsSeed;
      for (const event of events) {
        // trades use positions as they were BEFORE this event is applied
        state.trades = applyTradeEvent(state.trades, event, positions);
        positions = applyPositionEvent(positions, event);
      }
    };
    builder.addCase(appendEvents, (state, action) => {
      fold(state, action.payload.events, action.payload.positionsBefore);
    });
    builder.addCase(replayEvents, (state, action) => {
      state.trades = [];
      fold(state, action.payload, []);
    });
  },
});

export const { updateTrade, removeTrade, setFilter, clearFilter, loadTrades } = tradesSlice.actions;

export default tradesSlice.reducer;
