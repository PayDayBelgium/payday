import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderHook } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import positionsReducer from '../store/slices/positionsSlice';
import portfoliosReducer from '../store/slices/portfoliosSlice';
import tickersReducer, { loadTickers } from '../store/slices/tickersSlice';
import userProgressReducer from '../store/slices/userProgressSlice';
import eventsReducer, { appendEvents } from '../store/events/eventsSlice';
import { useAlerts } from './useAlerts';
import {
  getSharedAlertEvaluationCount,
  clearSharedAlertEvaluationCache,
} from '../utils/sharedAlertEvaluation';
import { invalidateAlertConfigCache } from '../utils/alertEvaluator';
import type { Portfolio, Position } from '../types';
import type { DomainEvent } from '../store/events/types';

const rootReducer = combineReducers({
  positions: positionsReducer,
  portfolios: portfoliosReducer,
  tickers: tickersReducer,
  userProgress: userProgressReducer,
  events: eventsReducer,
});

const makeStore = () =>
  configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }),
  });

const soonExpiration = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10);

const portfolio: Portfolio = {
  id: 'pf1',
  name: 'Test',
  logo: '',
  pricePerContract: 100,
  strategy: '',
  hasOptions: true,
  strategies: [],
  currency: 'EUR',
  initialCapital: 10000,
  currentValue: 10000,
} as Portfolio;

const shortPut: Position = {
  id: 'p1',
  ticker: 'XYZ',
  portfolio: 'Test',
  openDate: '2026-01-01',
  status: 'open',
  type: 'put',
  action: 'sell',
  strike: 100,
  expiration: soonExpiration,
  contracts: 1,
  costBasis: -200,
  currentValue: -50,
  cashReserved: 2000,
} as unknown as Position;

const makeEvent = (id: string, seq: number, type: DomainEvent['type'], payload: unknown): DomainEvent =>
  ({
    id,
    seq,
    type,
    payload,
    timestamp: '2026-01-01T00:00:00.000Z',
    actor: 'test',
    schemaVersion: 1,
  }) as DomainEvent;

describe('useAlerts shared evaluation', () => {
  beforeEach(() => {
    localStorage.clear();
    clearSharedAlertEvaluationCache();
    invalidateAlertConfigCache();
  });

  it('runs the evaluator ONCE for multiple mounted hook instances on the same store', () => {
    const store = makeStore();
    store.dispatch(
      appendEvents({
        events: [
          makeEvent('e-pf', 0, 'PortfolioCreated', { portfolio }),
          makeEvent('e-pos', 1, 'PositionOpened', { position: shortPut }),
        ],
        positionsBefore: [],
      })
    );
    store.dispatch(
      loadTickers([
        {
          symbol: 'XYZ',
          name: 'XYZ Corp',
          type: 'stock',
          optionsAvailable: true,
          miniContractsAvailable: false,
          currentPrice: 110,
        },
      ])
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const before = getSharedAlertEvaluationCount();
    const first = renderHook(() => useAlerts(), { wrapper });
    const second = renderHook(() => useAlerts(), { wrapper });
    const third = renderHook(() => useAlerts(), { wrapper });

    // The expiring short put produces at least one alert, so the evaluation is non-trivial.
    expect(first.result.current.alerts.length).toBeGreaterThan(0);
    // All instances share the exact same evaluation result...
    expect(second.result.current.alerts).toBe(first.result.current.alerts);
    expect(third.result.current.alerts).toBe(first.result.current.alerts);
    // ...because the evaluator body ran exactly once across the three mounts.
    expect(getSharedAlertEvaluationCount() - before).toBe(1);
  });
});
