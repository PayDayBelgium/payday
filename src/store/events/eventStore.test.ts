import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createEventStore, isSeqConflictError } from './eventStore';
import type { DomainEvent } from './types';

function ev(seq: number, id = `id-${seq}`): DomainEvent<'PositionClosed'> {
  return {
    id,
    seq,
    type: 'PositionClosed',
    payload: { id: `p${seq}`, closeDate: '2026-06-07' },
    timestamp: '2026-06-07T10:00:00.000Z',
    actor: 'tester',
    schemaVersion: 1,
  };
}

describe('eventStore', () => {
  beforeEach(async () => {
    const store = createEventStore('test-user');
    await store.clear();
  });

  it('appends and loads events in seq order', async () => {
    const store = createEventStore('test-user');
    await store.appendMany([ev(1), ev(2)]);
    await store.appendMany([ev(3)]);

    const all = await store.loadAll();
    expect(all.map((e) => e.seq)).toEqual([1, 2, 3]);
    expect((all[0] as DomainEvent<'PositionClosed'>).payload.id).toBe('p1');
  });

  it('isolates events per user (db name)', async () => {
    const a = createEventStore('user-a');
    const b = createEventStore('user-b');
    await a.clear();
    await b.clear();

    await a.appendMany([ev(1)]);
    expect((await a.loadAll()).length).toBe(1);
    expect((await b.loadAll()).length).toBe(0);
  });

  it('reports a clean write as not conflict-recovered', async () => {
    const store = createEventStore('test-user');
    const outcome = await store.appendMany([ev(0)]);
    expect(outcome.conflictRecovered).toBe(false);
    expect(outcome.events.map((e) => e.seq)).toEqual([0]);
  });

  it('re-stamps and retries on a seq conflict instead of dropping events', async () => {
    // Tab A writes seqs 0 and 1.
    const tabA = createEventStore('test-user');
    await tabA.appendMany([ev(0), ev(1)]);

    // Tab B (stale in-memory nextSeq) stamps the same seqs again.
    const tabB = createEventStore('test-user');
    const outcome = await tabB.appendMany([ev(0, 'dup-a'), ev(1, 'dup-b')]);

    expect(outcome.conflictRecovered).toBe(true);
    expect(outcome.events.map((e) => e.seq)).toEqual([2, 3]);
    expect(outcome.events.map((e) => e.id)).toEqual(['dup-a', 'dup-b']);

    const all = await tabA.loadAll();
    expect(all.map((e) => e.seq)).toEqual([0, 1, 2, 3]);
    expect(all.map((e) => e.id)).toEqual(['id-0', 'id-1', 'dup-a', 'dup-b']);
  });

  it('keeps re-stamping when consecutive batches conflict', async () => {
    const tabA = createEventStore('test-user');
    await tabA.appendMany([ev(0), ev(1), ev(2)]);

    // A stale batch that overlaps mid-log conflicts too (keyPath collision on 2).
    const tabB = createEventStore('test-user');
    const outcome = await tabB.appendMany([ev(2, 'dup-c')]);

    expect(outcome.conflictRecovered).toBe(true);
    expect(outcome.events.map((e) => e.seq)).toEqual([3]);
    expect((await tabA.loadAll()).map((e) => e.seq)).toEqual([0, 1, 2, 3]);
  });

  describe('Web Locks integration', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('serializes writes through navigator.locks when available', async () => {
      const requestedNames: string[] = [];
      const request = vi.fn(
        (name: string, cb: () => Promise<unknown>): Promise<unknown> => {
          requestedNames.push(name);
          return Promise.resolve().then(cb);
        }
      );
      vi.stubGlobal('navigator', { locks: { request } });

      const store = createEventStore('lock-user');
      await store.clear();
      await store.appendMany([ev(0)]);

      expect(request).toHaveBeenCalledTimes(1);
      expect(requestedNames).toEqual(['payday-events-lock-user']);
      expect((await store.loadAll()).map((e) => e.seq)).toEqual([0]);
    });

    it('falls back to a direct write when navigator.locks is unavailable', async () => {
      vi.stubGlobal('navigator', {});

      const store = createEventStore('no-lock-user');
      await store.clear();
      const outcome = await store.appendMany([ev(0)]);

      expect(outcome.conflictRecovered).toBe(false);
      expect((await store.loadAll()).map((e) => e.seq)).toEqual([0]);
    });
  });
});

describe('isSeqConflictError', () => {
  it('detects a ConstraintError (key conflict on add)', () => {
    expect(isSeqConflictError(new DOMException('key exists', 'ConstraintError'))).toBe(true);
  });

  it('detects an AbortError (conflict surfaced via the aborted transaction)', () => {
    expect(isSeqConflictError(new DOMException('aborted', 'AbortError'))).toBe(true);
  });

  it('rejects other errors', () => {
    expect(isSeqConflictError(new DOMException('quota', 'QuotaExceededError'))).toBe(false);
    expect(isSeqConflictError(new Error('boom'))).toBe(false);
    expect(isSeqConflictError(undefined)).toBe(false);
    expect(isSeqConflictError('ConstraintError')).toBe(false);
  });
});
