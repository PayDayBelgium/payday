import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { PositionAlert } from '../../types';

interface AlertsState {
  alerts: PositionAlert[];
  dismissed: string[];
}

const initialState: AlertsState = {
  alerts: [],
  dismissed: [],
};

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    addAlert: (state, action: PayloadAction<PositionAlert>) => {
      const exists = state.alerts.some((a) => a.id === action.payload.id);
      if (!exists) {
        state.alerts.push(action.payload);
      }
    },
    removeAlert: (state, action: PayloadAction<string>) => {
      state.alerts = state.alerts.filter((a) => a.id !== action.payload);
    },
    dismissAlert: (state, action: PayloadAction<string>) => {
      state.dismissed.push(action.payload);
      state.alerts = state.alerts.filter((a) => a.id !== action.payload);
    },
    clearDismissed: (state) => {
      state.dismissed = [];
    },
    generateAlerts: (state, action: PayloadAction<PositionAlert[]>) => {
      state.alerts = action.payload.filter((alert) => !state.dismissed.includes(alert.id));
    },
  },
});

export const { addAlert, removeAlert, dismissAlert, clearDismissed, generateAlerts } =
  alertsSlice.actions;

export default alertsSlice.reducer;
