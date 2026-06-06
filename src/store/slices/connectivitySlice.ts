import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { ConnectionStatus } from '../../types';

interface ConnectivityState {
  status: ConnectionStatus;
  url: string;
  subscribedTickers: string[];
  optionsSubscribed: boolean;
  lastConnected: string | null;
  lastError: string | null;
}

const initialState: ConnectivityState = {
  status: 'disconnected',
  url: 'ws://localhost:5000/ws/prices',
  subscribedTickers: [],
  optionsSubscribed: false,
  lastConnected: null,
  lastError: null,
};

const connectivitySlice = createSlice({
  name: 'connectivity',
  initialState,
  reducers: {
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.status = action.payload;
      if (action.payload === 'connected') {
        state.lastConnected = new Date().toISOString();
        state.lastError = null;
      }
    },
    setConnectionError: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.lastError = action.payload;
    },
    setWebSocketUrl: (state, action: PayloadAction<string>) => {
      state.url = action.payload;
    },
    addSubscribedTickers: (state, action: PayloadAction<string[]>) => {
      const newTickers = action.payload.map((t) => t.toUpperCase());
      state.subscribedTickers = [...new Set([...state.subscribedTickers, ...newTickers])];
    },
    removeSubscribedTickers: (state, action: PayloadAction<string[]>) => {
      const toRemove = action.payload.map((t) => t.toUpperCase());
      state.subscribedTickers = state.subscribedTickers.filter((t) => !toRemove.includes(t));
    },
    clearSubscribedTickers: (state) => {
      state.subscribedTickers = [];
    },
    setOptionsSubscribed: (state, action: PayloadAction<boolean>) => {
      state.optionsSubscribed = action.payload;
    },
    resetConnectivity: () => initialState,
  },
});

export const {
  setConnectionStatus,
  setConnectionError,
  setWebSocketUrl,
  addSubscribedTickers,
  removeSubscribedTickers,
  clearSubscribedTickers,
  setOptionsSubscribed,
  resetConnectivity,
} = connectivitySlice.actions;

// Selectors
export const selectConnectionStatus = (state: RootState) => state.connectivity.status;
export const selectWebSocketUrl = (state: RootState) => state.connectivity.url;
export const selectSubscribedTickers = (state: RootState) => state.connectivity.subscribedTickers;
export const selectOptionsSubscribed = (state: RootState) => state.connectivity.optionsSubscribed;
export const selectLastConnected = (state: RootState) => state.connectivity.lastConnected;
export const selectLastError = (state: RootState) => state.connectivity.lastError;
export const selectIsConnected = (state: RootState) => state.connectivity.status === 'connected';

export default connectivitySlice.reducer;
