import { describe, it, expect } from 'vitest';
import { createEvent } from './types';
import type { PositionOpenedPayload } from './types';

describe('createEvent', () => {
  it('builds an unsequenced event with id, type, payload, timestamp, schemaVersion', () => {
    const payload: PositionOpenedPayload = { position: { id: 'x' } as any };
    const ev = createEvent('PositionOpened', payload, '2026-06-07T10:00:00.000Z');

    expect(ev.id).toMatch(/[0-9a-f-]{36}/i);
    expect(ev.type).toBe('PositionOpened');
    expect(ev.payload).toBe(payload);
    expect(ev.timestamp).toBe('2026-06-07T10:00:00.000Z');
    expect(ev.schemaVersion).toBe(1);
    // seq and actor are stamped later by the commit thunk
    expect('seq' in ev).toBe(false);
    expect('actor' in ev).toBe(false);
  });
});
