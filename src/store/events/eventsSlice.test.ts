import { describe, it, expect } from 'vitest';
import reducer, { appendEvents, replayEvents, setActor } from './eventsSlice';
import type { DomainEvent } from './types';

function ev(seq: number): DomainEvent<'PriceAlertRuleDeleted'> {
  return {
    id: `id-${seq}`,
    seq,
    type: 'PriceAlertRuleDeleted',
    payload: { id: `r${seq}` },
    timestamp: '2026-06-07T10:00:00.000Z',
    actor: 'tester',
    schemaVersion: 1,
  };
}

describe('eventsSlice', () => {
  it('appendEvents pushes events and advances nextSeq', () => {
    let s = reducer(undefined, { type: '@@init' });
    s = reducer(s, appendEvents({ events: [ev(0), ev(1)], positionsBefore: [] }));
    expect(s.log).toHaveLength(2);
    expect(s.nextSeq).toBe(2);
  });

  it('replayEvents replaces the log and sets nextSeq from the last event', () => {
    let s = reducer(undefined, { type: '@@init' });
    s = reducer(s, replayEvents([ev(0), ev(1), ev(2)]));
    expect(s.log).toHaveLength(3);
    expect(s.nextSeq).toBe(3);
  });

  it('setActor stores the actor used for stamping', () => {
    let s = reducer(undefined, { type: '@@init' });
    s = reducer(s, setActor('alice'));
    expect(s.actor).toBe('alice');
  });
});
