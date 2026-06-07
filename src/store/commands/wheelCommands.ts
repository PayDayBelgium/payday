import type { AppDispatch } from '../index';
import { commit } from '../events/eventsSlice';
import { createEvent } from '../events/types';
import type { WheelCampaign } from '../../types';

/** Start a new wheel campaign. Emits WheelCampaignStarted. */
export const startWheelCampaign =
  (wheel: WheelCampaign, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('WheelCampaignStarted', { wheel }, timestamp)]));

/** Edit an existing wheel campaign (full replacement). Emits WheelEdited. */
export const editWheel =
  (wheel: WheelCampaign, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('WheelEdited', { wheel }, timestamp)]));

/** Close a wheel campaign. Emits WheelClosed. */
export const closeWheel =
  (id: string, endDate: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('WheelClosed', { id, endDate }, timestamp)]));

/** Delete a wheel campaign. Emits WheelDeleted. */
export const deleteWheel =
  (id: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('WheelDeleted', { id }, timestamp)]));
