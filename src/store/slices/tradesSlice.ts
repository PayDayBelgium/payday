import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Trade } from '../../types';

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
    addTrade: (state, action: PayloadAction<Trade>) => {
      state.trades.push(action.payload);
    },
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
});

export const { addTrade, updateTrade, removeTrade, setFilter, clearFilter, loadTrades } =
  tradesSlice.actions;

export default tradesSlice.reducer;
