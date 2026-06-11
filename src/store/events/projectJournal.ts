import type { JournalEntry, JournalGoal } from '../../types';
import type {
  DomainEvent,
  JournalEntryWrittenPayload,
  JournalEntryEditedPayload,
  JournalEntryDeletedPayload,
  GoalCreatedPayload,
  GoalEditedPayload,
  GoalDeletedPayload,
  GoalCompletedPayload,
  PortfolioRenamedPayload,
} from './types';

export interface JournalState {
  entries: JournalEntry[];
  goals: JournalGoal[];
}

/**
 * Pure fold of a single domain event into the journal state.
 * Returns the same reference for events this projection does not own,
 * so callers can cheaply detect no-ops.
 *
 * Note: updateGoalProgress is intentionally NOT event-sourced — it tracks
 * derived portfolio-value progress that is recomputed at runtime in
 * GoalsOverview. Folding it would pollute the log with frequent derived updates.
 */
export function applyJournalEvent(state: JournalState, event: DomainEvent): JournalState {
  switch (event.type) {
    case 'JournalEntryWritten': {
      const { entry } = event.payload as JournalEntryWrittenPayload;
      // Preserve prepend order (mirrors original addEntry behaviour).
      return { ...state, entries: [entry, ...state.entries] };
    }

    case 'JournalEntryEdited': {
      const { entry } = event.payload as JournalEntryEditedPayload;
      return {
        ...state,
        entries: state.entries.map((e) => (e.id === entry.id ? entry : e)),
      };
    }

    case 'JournalEntryDeleted': {
      const { id } = event.payload as JournalEntryDeletedPayload;
      return { ...state, entries: state.entries.filter((e) => e.id !== id) };
    }

    case 'GoalCreated': {
      const { goal } = event.payload as GoalCreatedPayload;
      return { ...state, goals: [...state.goals, goal] };
    }

    case 'GoalEdited': {
      const { goal } = event.payload as GoalEditedPayload;
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === goal.id ? goal : g)),
      };
    }

    case 'GoalDeleted': {
      const { id } = event.payload as GoalDeletedPayload;
      return { ...state, goals: state.goals.filter((g) => g.id !== id) };
    }

    case 'GoalCompleted': {
      const { id, completedAt } = event.payload as GoalCompletedPayload;
      return {
        ...state,
        goals: state.goals.map((g) => (g.id === id ? { ...g, completed: true, completedAt } : g)),
      };
    }

    // JournalEntry has an optional `portfolio` field; JournalGoal does not.
    // Only rename entries — goals are portfolio-agnostic.
    case 'PortfolioRenamed': {
      const { oldName, newName } = event.payload as PortfolioRenamedPayload;
      const renamedEntries = state.entries.map((e) =>
        e.portfolio === oldName ? { ...e, portfolio: newName } : e
      );
      const changed = renamedEntries.some((e, i) => e !== state.entries[i]);
      if (!changed) return state;
      return { ...state, entries: renamedEntries };
    }

    default:
      return state;
  }
}
