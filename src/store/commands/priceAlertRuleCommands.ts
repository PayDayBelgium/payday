import type { AppDispatch } from '../index';
import { commit } from '../events/eventsSlice';
import { createEvent } from '../events/types';
import type { PriceAlertRule } from '../../types';

export const createPriceAlertRule =
  (rule: PriceAlertRule, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('PriceAlertRuleCreated', { rule }, timestamp)]));

export const updatePriceAlertRule =
  (rule: PriceAlertRule, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('PriceAlertRuleUpdated', { rule }, timestamp)]));

export const deletePriceAlertRule = (id: string, timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(commit([createEvent('PriceAlertRuleDeleted', { id }, timestamp)]));

export const togglePriceAlertRule = (id: string, timestamp: string) => (dispatch: AppDispatch) =>
  dispatch(commit([createEvent('PriceAlertRuleToggled', { id }, timestamp)]));
