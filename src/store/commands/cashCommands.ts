import type { AppDispatch } from '../index';
import { commit } from '../events/eventsSlice';
import { createEvent } from '../events/types';
import type { PortfolioName } from '../../types';
import { uuid } from '../../utils/uuid';

/** Shared input shape for all cash-intent commands. */
export interface CashCommandInput {
  portfolio: PortfolioName;
  amount: number;
  date: string;
  description?: string;
}

/** Record a cash deposit. Emits CashDeposited. */
export const deposit =
  (input: CashCommandInput, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(
      commit([
        createEvent('CashDeposited', { id: uuid(), ...input }, timestamp),
      ])
    );

/** Record a cash withdrawal. Emits CashWithdrawn. */
export const withdraw =
  (input: CashCommandInput, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(
      commit([
        createEvent('CashWithdrawn', { id: uuid(), ...input }, timestamp),
      ])
    );

/** Record a fee charge. Emits FeeCharged. */
export const chargeFee =
  (input: CashCommandInput, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(
      commit([
        createEvent('FeeCharged', { id: uuid(), ...input }, timestamp),
      ])
    );

/** Record a dividend received. Emits DividendReceived. */
export const recordDividend =
  (input: CashCommandInput, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(
      commit([
        createEvent('DividendReceived', { id: uuid(), ...input }, timestamp),
      ])
    );

/** Record a value adjustment. Emits ValueAdjusted. */
export const adjustValue =
  (input: CashCommandInput, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(
      commit([
        createEvent('ValueAdjusted', { id: uuid(), ...input }, timestamp),
      ])
    );
