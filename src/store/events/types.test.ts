import { describe, it, expect } from 'vitest';
import { createEvent } from './types';
import type {
  PositionOpenedPayload,
  CashEventPayload,
  OptionRolledPayload,
  OptionAssignedPayload,
} from './types';

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

  it('builds a CashDeposited event with the correct shape', () => {
    const payload: CashEventPayload = {
      id: 'cash-1',
      portfolio: 'MyPortfolio',
      amount: 5000,
      date: '2026-06-07',
      description: 'Initial deposit',
    };
    const ts = '2026-06-07T09:00:00.000Z';
    const ev = createEvent('CashDeposited', payload, ts);

    expect(ev.id).toMatch(/[0-9a-f-]{36}/i);
    expect(ev.type).toBe('CashDeposited');
    expect(ev.payload).toBe(payload);
    expect(ev.payload.amount).toBe(5000);
    expect(ev.payload.portfolio).toBe('MyPortfolio');
    expect(ev.timestamp).toBe(ts);
    expect(ev.schemaVersion).toBe(1);
    expect('seq' in ev).toBe(false);
    expect('actor' in ev).toBe(false);
  });

  it('builds an OptionRolled event with the correct shape', () => {
    const payload: OptionRolledPayload = {
      oldPositionId: 'opt-old-1',
      closeDate: '2026-06-07',
      closePremium: 1.5,
      realizedPnL: 75,
      newPosition: { id: 'opt-new-1' } as any,
      netCashFlow: -50,
    };
    const ts = '2026-06-07T11:00:00.000Z';
    const ev = createEvent('OptionRolled', payload, ts);

    expect(ev.id).toMatch(/[0-9a-f-]{36}/i);
    expect(ev.type).toBe('OptionRolled');
    expect(ev.payload).toBe(payload);
    expect(ev.payload.oldPositionId).toBe('opt-old-1');
    expect(ev.payload.netCashFlow).toBe(-50);
    expect(ev.timestamp).toBe(ts);
    expect(ev.schemaVersion).toBe(1);
    expect('seq' in ev).toBe(false);
    expect('actor' in ev).toBe(false);
  });

  it('builds an OptionAssigned (put kind) event with the correct shape', () => {
    const payload: OptionAssignedPayload = {
      kind: 'put',
      optionId: 'opt-put-1',
      assignmentDate: '2026-06-07',
      assignmentPrice: 45,
      optionRealizedPnL: 120,
      newStock: { id: 'stock-1' } as any,
      effectiveCost: 4380,
      portfolio: 'MyPortfolio',
      wheelId: 'wheel-1',
    };
    const ts = '2026-06-07T12:00:00.000Z';
    const ev = createEvent('OptionAssigned', payload, ts);

    expect(ev.type).toBe('OptionAssigned');
    expect(ev.payload.kind).toBe('put');
    expect(ev.payload.optionId).toBe('opt-put-1');
    expect(ev.schemaVersion).toBe(1);
    expect('seq' in ev).toBe(false);
  });

  it('builds an OptionAssigned (call kind, full close) event with the correct shape', () => {
    const payload: OptionAssignedPayload = {
      kind: 'call',
      optionId: 'opt-call-1',
      assignmentDate: '2026-06-07',
      optionRealizedPnL: 200,
      stockId: 'stock-2',
      portfolio: 'MyPortfolio',
      totalProceeds: 4800,
      premiumReceived: 200,
      wheelId: 'wheel-2',
      stockClose: { fullClose: true, closePrice: 48, stockRealizedPnL: 800 },
    };
    const ts = '2026-06-07T13:00:00.000Z';
    const ev = createEvent('OptionAssigned', payload, ts);

    expect(ev.type).toBe('OptionAssigned');
    expect(ev.payload.kind).toBe('call');
    if (ev.payload.kind === 'call') {
      expect(ev.payload.stockClose.fullClose).toBe(true);
      if (ev.payload.stockClose.fullClose) {
        expect(ev.payload.stockClose.closePrice).toBe(48);
      }
    }
    expect(ev.schemaVersion).toBe(1);
    expect('seq' in ev).toBe(false);
  });
});
