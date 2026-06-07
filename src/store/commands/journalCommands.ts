import type { AppDispatch } from '../index';
import { commit } from '../events/eventsSlice';
import { createEvent } from '../events/types';
import type { JournalEntry, JournalGoal } from '../../types';

/**
 * Write a new journal entry (prepended to the top of the list).
 * Caller is responsible for constructing the full JournalEntry (with id, createdAt).
 * Emits JournalEntryWritten.
 */
export const writeEntry =
  (entry: JournalEntry, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('JournalEntryWritten', { entry }, timestamp)]));

/**
 * Edit an existing journal entry. The caller provides the full updated entry.
 * Emits JournalEntryEdited.
 */
export const editEntry =
  (entry: JournalEntry, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('JournalEntryEdited', { entry }, timestamp)]));

/**
 * Delete a journal entry by id. Emits JournalEntryDeleted.
 */
export const deleteEntry =
  (id: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('JournalEntryDeleted', { id }, timestamp)]));

/**
 * Create a new goal. Caller is responsible for constructing the full
 * JournalGoal (with id, createdAt). Emits GoalCreated.
 */
export const createGoal =
  (goal: JournalGoal, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('GoalCreated', { goal }, timestamp)]));

/**
 * Edit an existing goal. The caller provides the full updated goal.
 * Emits GoalEdited.
 */
export const editGoal =
  (goal: JournalGoal, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('GoalEdited', { goal }, timestamp)]));

/**
 * Delete a goal by id. Emits GoalDeleted.
 */
export const deleteGoal =
  (id: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('GoalDeleted', { id }, timestamp)]));

/**
 * Explicitly complete a goal (user-driven). Emits GoalCompleted.
 * Note: auto-completion triggered by portfolio progress is handled at runtime
 * in journalSlice's updateGoalProgress reducer — those completions are derived
 * from live portfolio state and are NOT event-sourced to avoid log pollution.
 */
export const completeGoal =
  (id: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('GoalCompleted', { id, completedAt: timestamp }, timestamp)]));
