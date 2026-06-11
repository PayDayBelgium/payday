import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor } from '../events/eventsSlice';
import positionsReducer from '../slices/positionsSlice';
import journalReducer from '../slices/journalSlice';
import {
  writeEntry,
  editEntry,
  deleteEntry,
  createGoal,
  editGoal,
  deleteGoal,
  completeGoal,
} from './journalCommands';
import type { JournalEntry, JournalGoal } from '../../types';
import type { AppDispatch } from '../index';

// The commit thunk captures positionsBefore from the positions slice, so the
// mini store must include positionsReducer even though these tests don't touch positions.
function makeStore() {
  return configureStore({
    reducer: { events: eventsReducer, positions: positionsReducer, journal: journalReducer },
  });
}

function makeEntry(id: string, overrides: Partial<JournalEntry> = {}): JournalEntry {
  return {
    id,
    date: '2026-01-01',
    title: `Entry ${id}`,
    content: 'Test content',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeGoal(id: string, overrides: Partial<JournalGoal> = {}): JournalGoal {
  return {
    id,
    type: 'custom',
    title: `Goal ${id}`,
    targetValue: 1000,
    createdAt: '2026-01-01T00:00:00.000Z',
    completed: false,
    ...overrides,
  };
}

function getEntries(state: any): JournalEntry[] {
  return state.journal.entries;
}
function getGoals(state: any): JournalGoal[] {
  return state.journal.goals;
}
function getLog(state: any): any[] {
  return state.events.log;
}

const TS = '2026-06-07T10:00:00.000Z';
const TS2 = '2026-06-07T11:00:00.000Z';
const TS3 = '2026-06-07T12:00:00.000Z';

// --- Entry command tests ---

describe('journal entry commands', () => {
  it('writeEntry emits JournalEntryWritten and prepends to entries', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('alice'));

    const e1 = makeEntry('e1');
    const e2 = makeEntry('e2');
    dispatch(writeEntry(e1, TS));
    dispatch(writeEntry(e2, TS2));

    const entries = getEntries(store.getState());
    expect(entries).toHaveLength(2);
    // Prepend: e2 is first
    expect(entries[0].id).toBe('e2');
    expect(entries[1].id).toBe('e1');

    const log = getLog(store.getState());
    const evt = log.find(
      (e: any) => e.type === 'JournalEntryWritten' && e.payload.entry.id === 'e1'
    );
    expect(evt).toBeDefined();
    expect(evt.actor).toBe('alice');
  });

  it('editEntry emits JournalEntryEdited and replaces the entry', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    const e1 = makeEntry('e1');
    dispatch(writeEntry(e1, TS));

    const updated = makeEntry('e1', { title: 'Edited title', updatedAt: TS2 });
    dispatch(editEntry(updated, TS2));

    const entries = getEntries(store.getState());
    expect(entries[0].title).toBe('Edited title');
    expect(entries[0].updatedAt).toBe(TS2);

    const log = getLog(store.getState());
    expect(log.find((e: any) => e.type === 'JournalEntryEdited')).toBeDefined();
  });

  it('deleteEntry emits JournalEntryDeleted and removes the entry', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(writeEntry(makeEntry('e1'), TS));
    dispatch(writeEntry(makeEntry('e2'), TS2));
    dispatch(deleteEntry('e1', TS3));

    const entries = getEntries(store.getState());
    expect(entries.map((e: JournalEntry) => e.id)).toEqual(['e2']);

    const log = getLog(store.getState());
    expect(log.find((e: any) => e.type === 'JournalEntryDeleted')).toBeDefined();
  });

  it('full write → edit → delete entry flow emits correct event sequence', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(writeEntry(makeEntry('e1'), TS));
    dispatch(editEntry(makeEntry('e1', { title: 'Updated' }), TS2));
    dispatch(deleteEntry('e1', TS3));

    expect(getEntries(store.getState())).toHaveLength(0);

    const types = getLog(store.getState()).map((e: any) => e.type);
    expect(types).toContain('JournalEntryWritten');
    expect(types).toContain('JournalEntryEdited');
    expect(types).toContain('JournalEntryDeleted');
  });
});

// --- Goal command tests ---

describe('journal goal commands', () => {
  it('createGoal emits GoalCreated and appends the goal', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('bob'));

    const g1 = makeGoal('g1');
    const g2 = makeGoal('g2');
    dispatch(createGoal(g1, TS));
    dispatch(createGoal(g2, TS2));

    const goals = getGoals(store.getState());
    expect(goals.map((g: JournalGoal) => g.id)).toEqual(['g1', 'g2']);

    const log = getLog(store.getState());
    const evt = log.find((e: any) => e.type === 'GoalCreated' && e.payload.goal.id === 'g1');
    expect(evt).toBeDefined();
    expect(evt.actor).toBe('bob');
  });

  it('editGoal emits GoalEdited and replaces the goal', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createGoal(makeGoal('g1'), TS));
    const updated = makeGoal('g1', { title: 'New title', targetValue: 5000 });
    dispatch(editGoal(updated, TS2));

    const goals = getGoals(store.getState());
    expect(goals[0].title).toBe('New title');
    expect(goals[0].targetValue).toBe(5000);

    const log = getLog(store.getState());
    expect(log.find((e: any) => e.type === 'GoalEdited')).toBeDefined();
  });

  it('deleteGoal emits GoalDeleted and removes the goal', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createGoal(makeGoal('g1'), TS));
    dispatch(createGoal(makeGoal('g2'), TS2));
    dispatch(deleteGoal('g1', TS3));

    const goals = getGoals(store.getState());
    expect(goals.map((g: JournalGoal) => g.id)).toEqual(['g2']);

    const log = getLog(store.getState());
    expect(log.find((e: any) => e.type === 'GoalDeleted')).toBeDefined();
  });

  it('completeGoal emits GoalCompleted and marks the goal completed', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createGoal(makeGoal('g1'), TS));
    dispatch(completeGoal('g1', TS2));

    const goals = getGoals(store.getState());
    expect(goals[0].completed).toBe(true);
    expect(goals[0].completedAt).toBe(TS2);

    const log = getLog(store.getState());
    const evt = log.find((e: any) => e.type === 'GoalCompleted');
    expect(evt).toBeDefined();
    expect(evt.payload.id).toBe('g1');
    expect(evt.payload.completedAt).toBe(TS2);
  });

  it('full create → edit → complete → delete goal flow emits correct event sequence', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createGoal(makeGoal('g1'), TS));
    dispatch(editGoal(makeGoal('g1', { title: 'Edited' }), TS2));
    dispatch(completeGoal('g1', TS2));
    dispatch(deleteGoal('g1', TS3));

    expect(getGoals(store.getState())).toHaveLength(0);

    const types = getLog(store.getState()).map((e: any) => e.type);
    expect(types).toContain('GoalCreated');
    expect(types).toContain('GoalEdited');
    expect(types).toContain('GoalCompleted');
    expect(types).toContain('GoalDeleted');
  });
});
