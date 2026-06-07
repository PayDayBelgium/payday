import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor } from '../events/eventsSlice';
import positionsReducer from '../slices/positionsSlice';
import todosReducer, { selectAllTodos } from '../slices/todosSlice';
import { addTodo, editTodo, toggleTodo, reopenTodo, deleteTodo } from './todoCommands';
import type { Todo } from '../slices/todosSlice';
import type { AppDispatch } from '../index';

// The commit thunk captures positionsBefore from the positions slice, so the
// mini store must include positionsReducer even though these tests don't touch positions.
function makeStore() {
  return configureStore({
    reducer: { events: eventsReducer, positions: positionsReducer, todos: todosReducer },
  });
}

function makeTodo(id: string, text = 'Test todo'): Todo {
  return {
    id,
    text,
    completed: false,
    createdAt: '2026-06-07T10:00:00.000Z',
  };
}

const TS = '2026-06-07T10:00:00.000Z';
const TS2 = '2026-06-07T11:00:00.000Z';

describe('todo commands', () => {
  it('addTodo emits TodoAdded and updates the projection', () => {
    const store = makeStore();
    // Mini test store's dispatch lacks the global thunk overload; cast to AppDispatch.
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('alice'));

    const t1 = makeTodo('t1', 'Buy milk');
    dispatch(addTodo(t1, TS));

    const todos = selectAllTodos(store.getState() as any);
    expect(todos).toHaveLength(1);
    expect(todos[0].id).toBe('t1');
    expect(todos[0].text).toBe('Buy milk');

    const log = (store.getState() as any).events.log;
    expect(log[0].type).toBe('TodoAdded');
    expect(log[0].actor).toBe('alice');
    expect(log[0].seq).toBe(0);
  });

  it('editTodo emits TodoEdited and updates the text', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    const t1 = makeTodo('t1', 'Buy milk');
    dispatch(addTodo(t1, TS));
    dispatch(editTodo('t1', 'Buy oat milk', TS2));

    const todos = selectAllTodos(store.getState() as any);
    expect(todos[0].text).toBe('Buy oat milk');

    const log = (store.getState() as any).events.log;
    expect(log[1].type).toBe('TodoEdited');
  });

  it('toggleTodo emits TodoCompleted when todo is active', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    const t1 = makeTodo('t1');
    dispatch(addTodo(t1, TS));
    dispatch(toggleTodo('t1', TS2));

    const todos = selectAllTodos(store.getState() as any);
    expect(todos[0].completed).toBe(true);
    expect(todos[0].completedAt).toBe(TS2);

    const log = (store.getState() as any).events.log;
    expect(log[1].type).toBe('TodoCompleted');
  });

  it('toggleTodo emits TodoReopened when todo is already completed', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    const t1 = makeTodo('t1');
    dispatch(addTodo(t1, TS));
    dispatch(toggleTodo('t1', TS2)); // complete it
    dispatch(toggleTodo('t1', TS2)); // reopen it

    const todos = selectAllTodos(store.getState() as any);
    expect(todos[0].completed).toBe(false);
    expect(todos[0].completedAt).toBeUndefined();

    const log = (store.getState() as any).events.log;
    expect(log[2].type).toBe('TodoReopened');
  });

  it('reopenTodo emits TodoReopened directly', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    const t1 = makeTodo('t1');
    dispatch(addTodo(t1, TS));
    dispatch(toggleTodo('t1', TS2)); // complete it
    dispatch(reopenTodo('t1', TS2));

    const todos = selectAllTodos(store.getState() as any);
    expect(todos[0].completed).toBe(false);

    const log = (store.getState() as any).events.log;
    expect(log[2].type).toBe('TodoReopened');
  });

  it('full add → complete → reopen → delete flow', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    const t1 = makeTodo('t1', 'Sweep the floor');
    dispatch(addTodo(t1, TS));
    dispatch(toggleTodo('t1', TS2));   // complete
    dispatch(reopenTodo('t1', TS2));   // reopen
    dispatch(deleteTodo('t1', TS2));   // delete

    const todos = selectAllTodos(store.getState() as any);
    expect(todos).toHaveLength(0);

    const log = (store.getState() as any).events.log;
    expect(log.map((e: any) => e.type)).toEqual([
      'TodoAdded',
      'TodoCompleted',
      'TodoReopened',
      'TodoDeleted',
    ]);
  });
});
