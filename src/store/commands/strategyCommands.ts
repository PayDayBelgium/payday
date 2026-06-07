import type { AppDispatch } from '../index';
import { commit } from '../events/eventsSlice';
import { createEvent } from '../events/types';
import type { TradingStrategy, StrategyRule } from '../../types';

/**
 * Create a new trading strategy. The caller is responsible for constructing the
 * full TradingStrategy (with id, createdAt). Emits TradingStrategyCreated.
 */
export const createStrategy =
  (strategy: TradingStrategy, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('TradingStrategyCreated', { strategy }, timestamp)]));

/**
 * Replace all fields of an existing trading strategy. The caller provides the
 * full updated TradingStrategy. `updatedAt` should be set by the caller to the
 * current timestamp. Emits TradingStrategyUpdated.
 */
export const updateStrategy =
  (strategy: TradingStrategy, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('TradingStrategyUpdated', { strategy }, timestamp)]));

/**
 * Delete a trading strategy by id. Emits TradingStrategyDeleted.
 */
export const deleteStrategy =
  (id: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('TradingStrategyDeleted', { id }, timestamp)]));

/**
 * Link a position to a strategy. Idempotent (fold ignores duplicate links).
 * Emits PositionLinkedToStrategy.
 */
export const linkPositionToStrategy =
  (strategyId: string, positionId: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(
      commit([createEvent('PositionLinkedToStrategy', { strategyId, positionId }, timestamp)])
    );

/**
 * Unlink a position from a strategy. Emits PositionUnlinkedFromStrategy.
 */
export const unlinkPositionFromStrategy =
  (strategyId: string, positionId: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(
      commit([
        createEvent('PositionUnlinkedFromStrategy', { strategyId, positionId }, timestamp),
      ])
    );

/**
 * Replace the full positionIds list for a strategy. Emits StrategyPositionsSet.
 */
export const setStrategyPositions =
  (strategyId: string, positionIds: string[], timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(
      commit([createEvent('StrategyPositionsSet', { strategyId, positionIds }, timestamp)])
    );

/**
 * Remove all strategies belonging to a portfolio. Emits PortfolioStrategiesCleared.
 */
export const clearPortfolioStrategies =
  (portfolio: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(
      commit([createEvent('PortfolioStrategiesCleared', { portfolio }, timestamp)])
    );

/**
 * Create a new strategy rule. The caller is responsible for constructing the full
 * StrategyRule (with id). Emits StrategyRuleCreated.
 */
export const createStrategyRule =
  (rule: StrategyRule, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('StrategyRuleCreated', { rule }, timestamp)]));

/**
 * Replace all fields of an existing strategy rule. Emits StrategyRuleUpdated.
 */
export const updateStrategyRule =
  (rule: StrategyRule, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('StrategyRuleUpdated', { rule }, timestamp)]));

/**
 * Delete a strategy rule by id. Emits StrategyRuleDeleted.
 */
export const deleteStrategyRule =
  (id: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('StrategyRuleDeleted', { id }, timestamp)]));

/**
 * Toggle a strategy rule's enabled flag. Emits StrategyRuleToggled.
 */
export const toggleStrategyRule =
  (id: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('StrategyRuleToggled', { id }, timestamp)]));
