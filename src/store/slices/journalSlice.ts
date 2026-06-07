import { createSlice, createSelector } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { JournalEntry, JournalGoal } from '../../types';
import type { RootState } from '../index';
import { applyJournalEvent } from '../events/projectJournal';
import { appendEvents, replayEvents } from '../events/eventsSlice';
import type { DomainEvent } from '../events/types';

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
    // All user-intent reducers (addEntry, updateEntry, deleteEntry, addGoal,
    // updateGoal, deleteGoal, completeGoal) have been replaced by event-sourced
    // commands in src/store/commands/journalCommands.ts.

    /**
     * Runtime-only: update the derived currentValue of a goal (e.g. when
     * portfolio value changes). This is NOT event-sourced because currentValue
     * is derived from live portfolio state and recomputed on render — logging
     * every portfolio tick would pollute the event log with meaningless noise.
     * Auto-completion (when target is reached) is also handled here because it
     * is a direct consequence of the derived progress update.
     */
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
  extraReducers: (builder) => {
    const fold = (state: JournalState, events: DomainEvent[]) => {
      let next: JournalState = { entries: state.entries, goals: state.goals };
      for (const event of events) {
        next = applyJournalEvent(next, event);
      }
      state.entries = next.entries;
      state.goals = next.goals;
    };
    builder.addCase(appendEvents, (state, action) => fold(state, action.payload.events));
    builder.addCase(replayEvents, (state, action) => {
      state.entries = [];
      state.goals = [];
      fold(state, action.payload);
    });
  },
});

export const { updateGoalProgress } = journalSlice.actions;

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
