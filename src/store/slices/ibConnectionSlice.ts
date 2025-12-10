import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface IBConnectionState {
  status: ConnectionStatus;
  error: string | null;
  lastConnected: string | null;
  autoReconnect: boolean;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

const initialState: IBConnectionState = {
  status: 'disconnected',
  error: null,
  lastConnected: null,
  autoReconnect: true,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
};

const ibConnectionSlice = createSlice({
  name: 'ibConnection',
  initialState,
  reducers: {
    setConnecting: (state) => {
      state.status = 'connecting';
      state.error = null;
    },
    setConnected: (state) => {
      state.status = 'connected';
      state.error = null;
      state.lastConnected = new Date().toISOString();
      state.reconnectAttempts = 0;
    },
    setDisconnected: (state) => {
      state.status = 'disconnected';
      state.error = null;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.status = 'error';
      state.error = action.payload;
    },
    incrementReconnectAttempts: (state) => {
      state.reconnectAttempts += 1;
    },
    resetReconnectAttempts: (state) => {
      state.reconnectAttempts = 0;
    },
    setAutoReconnect: (state, action: PayloadAction<boolean>) => {
      state.autoReconnect = action.payload;
    },
  },
});

export const {
  setConnecting,
  setConnected,
  setDisconnected,
  setError,
  incrementReconnectAttempts,
  resetReconnectAttempts,
  setAutoReconnect,
} = ibConnectionSlice.actions;

export default ibConnectionSlice.reducer;
