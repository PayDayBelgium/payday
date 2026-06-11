import type { AppDispatch } from '../index';
import { commit } from '../events/eventsSlice';
import { createEvent } from '../events/types';
import type { Portfolio } from '../../types';

/** Create a new portfolio. Emits PortfolioCreated. */
export const createPortfolio =
  (portfolio: Portfolio, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('PortfolioCreated', { portfolio }, timestamp)]));

/** Edit an existing portfolio (full replacement). Emits PortfolioEdited. */
export const editPortfolio = (portfolio: Portfolio, timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(commit([createEvent('PortfolioEdited', { portfolio }, timestamp)]));

/** Rename a portfolio. Emits PortfolioRenamed. */
export const renamePortfolio =
  (oldName: string, newName: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('PortfolioRenamed', { oldName, newName }, timestamp)]));

/** Delete a portfolio by id. Emits PortfolioDeleted. */
export const deletePortfolio = (id: string, timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(commit([createEvent('PortfolioDeleted', { id }, timestamp)]));

/** Reorder portfolios. Emits PortfoliosReordered. */
export const reorderPortfolios = (order: string[], timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(commit([createEvent('PortfoliosReordered', { order }, timestamp)]));
