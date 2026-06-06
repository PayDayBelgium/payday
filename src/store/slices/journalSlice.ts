import { createSlice, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { JournalEntry, JournalGoal } from '../../types';
import type { RootState } from '../index';

interface JournalState {
  entries: JournalEntry[];
  goals: JournalGoal[];
}

const initialState: JournalState = {
  entries: [],
  goals: [],
};

const journalSlice = createSlice({
  name: 'journal',
  initialState,
  reducers: {
    // Entry actions
    addEntry: (state, action: PayloadAction<JournalEntry>) => {
      state.entries.unshift(action.payload);
    },
    updateEntry: (state, action: PayloadAction<JournalEntry>) => {
      const index = state.entries.findIndex((e) => e.id === action.payload.id);
      if (index !== -1) {
        state.entries[index] = {
          ...action.payload,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    deleteEntry: (state, action: PayloadAction<string>) => {
      state.entries = state.entries.filter((e) => e.id !== action.payload);
    },

    // Goal actions
    addGoal: (state, action: PayloadAction<JournalGoal>) => {
      state.goals.push(action.payload);
    },
    updateGoal: (state, action: PayloadAction<JournalGoal>) => {
      const index = state.goals.findIndex((g) => g.id === action.payload.id);
      if (index !== -1) {
        state.goals[index] = action.payload;
      }
    },
    deleteGoal: (state, action: PayloadAction<string>) => {
      state.goals = state.goals.filter((g) => g.id !== action.payload);
    },
    completeGoal: (state, action: PayloadAction<string>) => {
      const goal = state.goals.find((g) => g.id === action.payload);
      if (goal) {
        goal.completed = true;
        goal.completedAt = new Date().toISOString();
      }
    },
    updateGoalProgress: (state, action: PayloadAction<{ id: string; currentValue: number }>) => {
      const goal = state.goals.find((g) => g.id === action.payload.id);
      if (goal) {
        goal.currentValue = action.payload.currentValue;

        // Auto-complete if target reached
        if (goal.currentValue >= goal.targetValue && !goal.completed) {
          goal.completed = true;
          goal.completedAt = new Date().toISOString();
        }
      }
    },
  },
});

export const {
  addEntry,
  updateEntry,
  deleteEntry,
  addGoal,
  updateGoal,
  deleteGoal,
  completeGoal,
  updateGoalProgress,
} = journalSlice.actions;

// Base Selectors
export const selectJournalEntries = (state: RootState) => state.journal.entries;
export const selectJournalGoals = (state: RootState) => state.journal.goals;

// Memoized Selectors
export const selectActiveGoals = createSelector([selectJournalGoals], (goals) =>
  goals.filter((g) => !g.completed)
);

export const selectCompletedGoals = createSelector([selectJournalGoals], (goals) =>
  goals.filter((g) => g.completed)
);

export default journalSlice.reducer;
