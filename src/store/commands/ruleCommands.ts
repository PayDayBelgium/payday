import type { AppDispatch } from '../index';
import { commit } from '../events/eventsSlice';
import { createEvent } from '../events/types';
import type { TradingRule } from '../../types';

/**
 * Create a new trading rule. The caller is responsible for constructing the
 * full TradingRule (with id) so the event payload is fully deterministic.
 * Emits TradingRuleCreated.
 */
export const createRule = (rule: TradingRule, timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(commit([createEvent('TradingRuleCreated', { rule }, timestamp)]));

/**
 * Replace all fields of an existing trading rule. Emits TradingRuleUpdated.
 */
export const updateRule = (rule: TradingRule, timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(commit([createEvent('TradingRuleUpdated', { rule }, timestamp)]));

/**
 * Delete a trading rule by id. Emits TradingRuleDeleted.
 */
export const deleteRule = (id: string, timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(commit([createEvent('TradingRuleDeleted', { id }, timestamp)]));

/**
 * Toggle a trading rule's enabled flag. Emits TradingRuleToggled.
 */
export const toggleRule = (id: string, timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(commit([createEvent('TradingRuleToggled', { id }, timestamp)]));
