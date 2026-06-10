import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor } from './eventsSlice';
import positionsReducer from '../slices/positionsSlice';
import tradesReducer from '../slices/tradesSlice';
import alertsReducer from '../slices/alertsSlice';
import { createEventPersistenceMiddleware } from './eventPersistenceMiddleware';
import { createEventStore, type EventStore } from './eventStore';
import { openPosition } from '../commands/positionCommands';
import type { DomainEvent } from './types';
import type { Position } from '../../types';
import type { AppDispatch } from '../index';

const stock = (id: string): Position =>
  ({ id, type: 'stock', ticker: 'AAPL', portfolio: 'Main', status: 'open', openDate: '2026-01-01', shares: 10, purchasePrice: 100 }) as unknown as Position;

const makeStore = (eventStore: EventStore) =>
  configureStore({
    reducer: {
      events: eventsReducer,
      positions: positionsReducer,
      trades: tradesReducer,
      alerts: alertsReducer,
    },
    middleware: (gdm) => gdm().concat(createEventPersistenceMiddleware(eventStore)),
  });

/** EventStore stub whose appendMany fails the first `failures` calls. */
const flakyEventStore = (failures: number): EventStore & { calls: number } => {
  const stub = {
    calls: 0,
    async appendMany(events: DomainEvent[]) {
      stub.calls += 1;
      if (stub.calls <= failures) {
        throw new DOMException('quota exceeded', 'QuotaExceededError');
      }
      return { events, conflictRecovered: false };
    },
    async loadAll() {
      return [];
    },
    async clear() {},
  };
  return stub;
};

/** EventStore stub that reports a recovered seq conflict, re-stamped from `fromSeq`. */
const conflictEventStore = (fromSeq: number): EventStore => ({
  async appendMany(events: DomainEvent[]) {
    return {
      events: events.map((e, i) => ({ ...e, seq: fromSeq + i })),
      conflictRecovered: true,
    };
  },
  async loadAll() {
    return [];
  },
  async clear() {},
});

describe('eventPersistenceMiddleware', () => {
  beforeEach(async () => {
    await createEventStore('mw-test').clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes committed events to the IndexedDB store', async () => {
    const eventStore = createEventStore('mw-test');
    const store = makeStore(eventStore);
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('alice'));
    dispatch(openPosition(stock('p1'), '2026-06-07T10:00:00.000Z'));

    // allow the async write to settle
    await new Promise((r) => setTimeout(r, 0));

    const persisted = await eventStore.loadAll();
    expect(persisted.map((e) => e.type)).toEqual(['PositionOpened']);
  });

  it('retries once on a transient failure without alerting the user', async () => {
    const eventStore = flakyEventStore(1); // first write fails, retry succeeds
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = makeStore(eventStore);
    const dispatch = store.dispatch as AppDispatch;
    dispatch(openPosition(stock('p1'), '2026-06-07T10:00:00.000Z'));

    await vi.waitFor(() => expect(eventStore.calls).toBe(2));

    expect(store.getState().alerts.alerts).toEqual([]);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('surfaces a persistent write failure as console.error + a critical alert', async () => {
    const eventStore = flakyEventStore(Number.POSITIVE_INFINITY);
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = makeStore(eventStore);
    const dispatch = store.dispatch as AppDispatch;
    dispatch(openPosition(stock('p1'), '2026-06-07T10:00:00.000Z'));

    await vi.waitFor(() => {
      expect(store.getState().alerts.alerts).toHaveLength(1);
    });

    const alert = store.getState().alerts.alerts[0];
    expect(alert.id).toBe('event-log-write-failure');
    expect(alert.type).toBe('persistence-failure');
    expect(alert.severity).toBe('critical');
    expect(alert.message).toBeTruthy();
    expect(alert.suggestedAction).toBeTruthy();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('persist'),
      expect.any(DOMException)
    );
    // initial attempt + exactly one retry — the reducer path is never blocked
    expect(eventStore.calls).toBe(2);
  });

  it('fast-forwards nextSeq and warns the user after a recovered multi-tab conflict', async () => {
    const store = makeStore(conflictEventStore(40));
    const dispatch = store.dispatch as AppDispatch;
    dispatch(openPosition(stock('p1'), '2026-06-07T10:00:00.000Z'));

    await vi.waitFor(() => {
      expect(store.getState().alerts.alerts).toHaveLength(1);
    });

    const alert = store.getState().alerts.alerts[0];
    expect(alert.id).toBe('event-log-seq-conflict');
    expect(alert.type).toBe('sync-conflict');
    expect(alert.severity).toBe('warning');
    expect(alert.message).toBeTruthy();
    expect(alert.suggestedAction).toBeTruthy();
    // openPosition commits one event, re-stamped to seq 40 → next commit uses 41.
    expect(store.getState().events.nextSeq).toBe(41);
  });

  it('does not dispatch conflict bookkeeping on a clean write', async () => {
    const store = makeStore(flakyEventStore(0));
    const dispatch = store.dispatch as AppDispatch;
    dispatch(openPosition(stock('p1'), '2026-06-07T10:00:00.000Z'));
    const nextSeqAfterCommit = store.getState().events.nextSeq;

    await new Promise((r) => setTimeout(r, 0));

    expect(store.getState().alerts.alerts).toEqual([]);
    expect(store.getState().events.nextSeq).toBe(nextSeqAfterCommit);
  });

  it('does not stack duplicate failure alerts on repeated failures', async () => {
    const eventStore = flakyEventStore(Number.POSITIVE_INFINITY);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const store = makeStore(eventStore);
    const dispatch = store.dispatch as AppDispatch;
    dispatch(openPosition(stock('p1'), '2026-06-07T10:00:00.000Z'));
    dispatch(openPosition(stock('p2'), '2026-06-07T10:01:00.000Z'));

    await vi.waitFor(() => expect(eventStore.calls).toBe(4));

    expect(store.getState().alerts.alerts).toHaveLength(1);
  });
});
