import type { AppDispatch, RootState } from '../index';
import { commit } from '../events/eventsSlice';
import { createEvent } from '../events/types';
import type { PositionClosedPayload } from '../events/types';
import type { Position } from '../../types';

/** Open a new position. Emits PositionOpened. */
export const openPosition = (position: Position, timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(commit([createEvent('PositionOpened', { position }, timestamp)]));

/** Close an existing position. Emits PositionClosed (trades project from it). */
export const closePosition =
  (payload: PositionClosedPayload, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('PositionClosed', payload, timestamp)]));

/** Edit an existing position (full replacement). Emits PositionEdited. */
export const editPosition = (position: Position, timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(commit([createEvent('PositionEdited', { position }, timestamp)]));

/** Rename a portfolio key across all positions. Emits PositionsPortfolioRenamed. */
export const renamePortfolioPositions =
  (oldName: string, newName: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('PositionsPortfolioRenamed', { oldName, newName }, timestamp)]));

// Re-export RootState so callers importing from commands get the type.
export type { RootState };
