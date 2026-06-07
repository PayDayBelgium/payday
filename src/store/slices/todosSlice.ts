import { createSlice } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { applyTodoEvent } from '../events/projectTodos';
import { appendEvents, replayEvents } from '../events/eventsSlice';
import type { DomainEvent } from '../events/types';

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

interface TodosState {
  todos: Todo[];
}

const initialState: TodosState = {
  todos: [],
};

const todosSlice = createSlice({
  name: 'todos',
  initialState,
  // All user-intent reducers (addTodo, toggleTodo, deleteTodo, editTodo, reopenTodo)
  // have been replaced by event-sourced commands in src/store/commands/todoCommands.ts.
  reducers: {},
  extraReducers: (builder) => {
    const fold = (state: TodosState, events: DomainEvent[]) => {
      for (const event of events) {
        state.todos = applyTodoEvent(state.todos, event);
      }
    };
    builder.addCase(appendEvents, (state, action) => fold(state, action.payload.events));
    builder.addCase(replayEvents, (state, action) => {
      state.todos = [];
      fold(state, action.payload);
    });
  },
});

// Selectors
export const selectActiveTodos = (state: RootState) =>
  state.todos.todos.filter((t) => !t.completed);

export const selectCompletedTodos = (state: RootState) =>
  state.todos.todos.filter((t) => t.completed);

export const selectAllTodos = (state: RootState) => state.todos.todos;

export default todosSlice.reducer;
