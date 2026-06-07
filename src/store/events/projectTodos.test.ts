import { describe, it, expect } from 'vitest';
import { applyTodoEvent } from './projectTodos';
import type { Todo } from '../slices/todosSlice';
import type { DomainEvent } from './types';

function todo(id: string, overrides: Partial<Todo> = {}): Todo {
  return {
    id,
    text: 'Buy milk',
    completed: false,
    createdAt: '2026-06-07T10:00:00.000Z',
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

describe('applyTodoEvent', () => {
  it('TodoAdded appends the todo', () => {
    const t1 = todo('t1');
    const next = applyTodoEvent([], event('TodoAdded', { todo: t1 }));
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe('t1');
  });

  it('TodoEdited updates the text of the matching todo', () => {
    const initial = [todo('t1')];
    const next = applyTodoEvent(initial, event('TodoEdited', { id: 't1', text: 'Buy oat milk' }));
    expect(next[0].text).toBe('Buy oat milk');
    expect(next).toHaveLength(1);
  });

  it('TodoCompleted sets completed=true and completedAt', () => {
    const initial = [todo('t1')];
    const completedAt = '2026-06-07T11:00:00.000Z';
    const next = applyTodoEvent(initial, event('TodoCompleted', { id: 't1', completedAt }));
    expect(next[0].completed).toBe(true);
    expect(next[0].completedAt).toBe(completedAt);
  });

  it('TodoReopened sets completed=false and removes completedAt', () => {
    const initial = [todo('t1', { completed: true, completedAt: '2026-06-07T11:00:00.000Z' })];
    const next = applyTodoEvent(initial, event('TodoReopened', { id: 't1' }));
    expect(next[0].completed).toBe(false);
    expect(next[0].completedAt).toBeUndefined();
  });

  it('TodoDeleted removes the matching todo', () => {
    const initial = [todo('t1'), todo('t2')];
    const next = applyTodoEvent(initial, event('TodoDeleted', { id: 't1' }));
    expect(next.map((t) => t.id)).toEqual(['t2']);
  });

  it('ignores unrelated event types and returns same reference', () => {
    const initial = [todo('t1')];
    const next = applyTodoEvent(initial, event('PositionOpened', { position: {} }));
    expect(next).toBe(initial);
  });
});
