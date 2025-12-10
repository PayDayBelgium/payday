import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { TradingRule } from '../../types';

interface RulesState {
  rules: TradingRule[];
}

const initialState: RulesState = {
  rules: [
    {
      id: 'dte-warning-2weeks',
      name: 'Warn 2 weeks before expiration',
      type: 'dte-warning',
      enabled: true,
      parameters: { days: 14, severity: 'warning' },
    },
    {
      id: 'dte-critical-1week',
      name: 'Critical alert 1 week before expiration',
      type: 'dte-warning',
      enabled: true,
      parameters: { days: 7, severity: 'critical' },
    },
    {
      id: 'profit-target-80',
      name: 'Suggest close at 80% profit',
      type: 'profit-target',
      enabled: true,
      parameters: { percentage: 80 },
    },
    {
      id: 'leap-expiration-3months',
      name: 'Warn when LEAP expires in 3 months',
      type: 'dte-warning',
      enabled: true,
      parameters: { days: 90, severity: 'warning', positionType: 'leap' },
    },
  ],
};

const rulesSlice = createSlice({
  name: 'rules',
  initialState,
  reducers: {
    addRule: (state, action: PayloadAction<TradingRule>) => {
      state.rules.push(action.payload);
    },
    updateRule: (state, action: PayloadAction<TradingRule>) => {
      const index = state.rules.findIndex((r) => r.id === action.payload.id);
      if (index !== -1) {
        state.rules[index] = action.payload;
      }
    },
    removeRule: (state, action: PayloadAction<string>) => {
      state.rules = state.rules.filter((r) => r.id !== action.payload);
    },
    toggleRule: (state, action: PayloadAction<string>) => {
      const rule = state.rules.find((r) => r.id === action.payload);
      if (rule) {
        rule.enabled = !rule.enabled;
      }
    },
  },
});

export const { addRule, updateRule, removeRule, toggleRule } = rulesSlice.actions;

export default rulesSlice.reducer;
