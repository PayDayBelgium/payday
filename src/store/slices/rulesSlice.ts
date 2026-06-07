import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { TradingRule } from '../../types';
import { applyRuleEvent } from '../events/projectRules';
import { appendEvents, replayEvents } from '../events/eventsSlice';
import type { DomainEvent } from '../events/types';

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
  // All user-intent reducers (addRule, updateRule, removeRule, toggleRule)
  // have been replaced by event-sourced commands in src/store/commands/ruleCommands.ts.
  reducers: {},
  extraReducers: (builder) => {
    const fold = (state: RulesState, events: DomainEvent[]) => {
      for (const event of events) {
        state.rules = applyRuleEvent(state.rules, event);
      }
    };
    builder.addCase(appendEvents, (state, action) => fold(state, action.payload.events));
    builder.addCase(replayEvents, (state, action) => {
      state.rules = [];
      fold(state, action.payload);
    });
  },
});

// Selectors
export const selectRules = (state: RootState) => state.rules.rules;
export const selectEnabledRules = (state: RootState) =>
  state.rules.rules.filter((r) => r.enabled);

export default rulesSlice.reducer;
