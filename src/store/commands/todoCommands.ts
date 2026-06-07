import type { AppDispatch, RootState } from '../index';
import { commit } from '../events/eventsSlice';
import { createEvent } from '../events/types';
import type { Todo } from '../slices/todosSlice';

/**
 * Add a new todo item. The caller is responsible for constructing the full
 * Todo (id, createdAt) so the event payload is fully deterministic.
 * Emits TodoAdded.
 */
export const addTodo =
  (todo: Todo, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('TodoAdded', { todo }, timestamp)]));

/**
 * Edit the text of an existing todo. Emits TodoEdited.
 */
export const editTodo =
  (id: string, text: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('TodoEdited', { id, text }, timestamp)]));

/**
 * Toggle a todo between completed and active.
 * Reads current state: if the todo is already completed → emits TodoReopened,
 * otherwise → emits TodoCompleted { id, completedAt: timestamp }.
 */
export const toggleTodo =
  (id: string, timestamp: string) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const todos = getState().todos.todos;
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    if (todo.completed) {
      dispatch(commit([createEvent('TodoReopened', { id }, timestamp)]));
    } else {
      dispatch(commit([createEvent('TodoCompleted', { id, completedAt: timestamp }, timestamp)]));
    }
  };

/**
 * Reopen a completed todo explicitly. Emits TodoReopened.
 */
export const reopenTodo =
  (id: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('TodoReopened', { id }, timestamp)]));

/**
 * Delete a todo. Emits TodoDeleted.
 */
export const deleteTodo =
  (id: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('TodoDeleted', { id }, timestamp)]));
