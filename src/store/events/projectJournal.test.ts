import { describe, it, expect } from 'vitest';
import { applyJournalEvent } from './projectJournal';
import type { JournalState } from './projectJournal';
import type { JournalEntry, JournalGoal } from '../../types';
import type { DomainEvent } from './types';

// --- Helpers ---

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
    targetValue: 100,
    createdAt: '2026-01-01T00:00:00.000Z',
    completed: false,
    ...overrides,
  };
}

function event<T extends DomainEvent['type']>(type: T, payload: unknown): DomainEvent {
  return {
    id: 'e',
    seq: 0,
    type,
    payload,
    timestamp: 't',
    actor: 'a',
    schemaVersion: 1,
  } as DomainEvent;
}

function empty(): JournalState {
  return { entries: [], goals: [] };
}

// --- Entry fold tests ---

describe('applyJournalEvent — entries', () => {
  it('JournalEntryWritten prepends entry to the list', () => {
    const e1 = makeEntry('e1');
    const e2 = makeEntry('e2');
    let state = applyJournalEvent(empty(), event('JournalEntryWritten', { entry: e1 }));
    state = applyJournalEvent(state, event('JournalEntryWritten', { entry: e2 }));
    expect(state.entries).toHaveLength(2);
    // Second write should appear first (prepend)
    expect(state.entries[0].id).toBe('e2');
    expect(state.entries[1].id).toBe('e1');
  });

  it('JournalEntryEdited replaces the matching entry', () => {
    const e1 = makeEntry('e1');
    const initial: JournalState = { entries: [e1, makeEntry('e2')], goals: [] };
    const updated = makeEntry('e1', { title: 'Updated title' });
    const next = applyJournalEvent(initial, event('JournalEntryEdited', { entry: updated }));
    expect(next.entries[0].title).toBe('Updated title');
    expect(next.entries[1].id).toBe('e2'); // unchanged
  });

  it('JournalEntryEdited is a no-op for unknown id', () => {
    const initial: JournalState = { entries: [makeEntry('e1')], goals: [] };
    const next = applyJournalEvent(initial, event('JournalEntryEdited', { entry: makeEntry('x') }));
    expect(next.entries).toHaveLength(1);
    expect(next.entries[0].id).toBe('e1');
  });

  it('JournalEntryDeleted removes the matching entry', () => {
    const initial: JournalState = { entries: [makeEntry('e1'), makeEntry('e2')], goals: [] };
    const next = applyJournalEvent(initial, event('JournalEntryDeleted', { id: 'e1' }));
    expect(next.entries.map((e) => e.id)).toEqual(['e2']);
  });

  it('JournalEntryDeleted is a no-op for unknown id', () => {
    const initial: JournalState = { entries: [makeEntry('e1')], goals: [] };
    const next = applyJournalEvent(initial, event('JournalEntryDeleted', { id: 'x' }));
    expect(next.entries).toHaveLength(1);
  });
});

// --- Goal fold tests ---

describe('applyJournalEvent — goals', () => {
  it('GoalCreated appends goal to the list', () => {
    const g1 = makeGoal('g1');
    const g2 = makeGoal('g2');
    let state = applyJournalEvent(empty(), event('GoalCreated', { goal: g1 }));
    state = applyJournalEvent(state, event('GoalCreated', { goal: g2 }));
    expect(state.goals.map((g) => g.id)).toEqual(['g1', 'g2']);
  });

  it('GoalEdited replaces the matching goal', () => {
    const g1 = makeGoal('g1');
    const initial: JournalState = { entries: [], goals: [g1, makeGoal('g2')] };
    const updated = makeGoal('g1', { title: 'New title', targetValue: 999 });
    const next = applyJournalEvent(initial, event('GoalEdited', { goal: updated }));
    expect(next.goals[0].title).toBe('New title');
    expect(next.goals[0].targetValue).toBe(999);
    expect(next.goals[1].id).toBe('g2');
  });

  it('GoalDeleted removes the matching goal', () => {
    const initial: JournalState = { entries: [], goals: [makeGoal('g1'), makeGoal('g2')] };
    const next = applyJournalEvent(initial, event('GoalDeleted', { id: 'g1' }));
    expect(next.goals.map((g) => g.id)).toEqual(['g2']);
  });

  it('GoalCompleted marks the goal completed and sets completedAt', () => {
    const g1 = makeGoal('g1', { completed: false });
    const initial: JournalState = { entries: [], goals: [g1, makeGoal('g2')] };
    const completedAt = '2026-06-07T12:00:00.000Z';
    const next = applyJournalEvent(initial, event('GoalCompleted', { id: 'g1', completedAt }));
    expect(next.goals[0].completed).toBe(true);
    expect(next.goals[0].completedAt).toBe(completedAt);
    expect(next.goals[1].completed).toBe(false); // unchanged
  });

  it('GoalCompleted is a no-op for unknown id', () => {
    const g1 = makeGoal('g1', { completed: false });
    const initial: JournalState = { entries: [], goals: [g1] };
    const next = applyJournalEvent(initial, event('GoalCompleted', { id: 'x', completedAt: 't' }));
    expect(next.goals[0].completed).toBe(false);
  });
});

// --- Cross-slice and default tests ---

describe('applyJournalEvent — cross-slice', () => {
  it('ignores unrelated event types and returns same reference', () => {
    const initial: JournalState = { entries: [makeEntry('e1')], goals: [makeGoal('g1')] };
    const next = applyJournalEvent(initial, event('PositionOpened', { position: {} }));
    expect(next).toBe(initial);
  });

  it('entry events do not touch goals', () => {
    const initial: JournalState = { entries: [], goals: [makeGoal('g1')] };
    const next = applyJournalEvent(
      initial,
      event('JournalEntryWritten', { entry: makeEntry('e1') })
    );
    expect(next.goals).toBe(initial.goals);
  });

  it('goal events do not touch entries', () => {
    const initial: JournalState = { entries: [makeEntry('e1')], goals: [] };
    const next = applyJournalEvent(initial, event('GoalCreated', { goal: makeGoal('g1') }));
    expect(next.entries).toBe(initial.entries);
  });
});
