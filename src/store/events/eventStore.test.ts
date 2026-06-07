import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEventStore } from './eventStore';
import type { DomainEvent } from './types';

function ev(seq: number): DomainEvent<'PositionClosed'> {
  return {
    id: `id-${seq}`,
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
});
