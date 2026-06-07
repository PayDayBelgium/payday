import { describe, it, expect } from 'vitest';
import { applyPositionEvent } from './projectPositions';
import type { Position } from '../../types';
import type { DomainEvent } from './types';

const stock = (id: string, portfolio = 'Main'): Position =>
  ({
    id,
    type: 'stock',
    ticker: 'AAPL',
    portfolio,
    status: 'open',
    openDate: '2026-01-01',
    shares: 10,
    purchasePrice: 100,
    costBasis: 1000,
    currentValue: 1100,
  }) as unknown as Position;

const option = (id: string, portfolio = 'Main'): Position =>
  ({
    id,
    type: 'covered-call',
    ticker: 'AAPL',
    portfolio,
    status: 'open',
    openDate: '2026-01-01',
    contracts: 1,
    strike: 110,
    expiration: '2026-03-21',
    costBasis: -120,
    currentValue: -80,
    premiumCollected: 120,
  }) as unknown as Position;

function event<T extends DomainEvent['type']>(type: T, payload: any): DomainEvent {
  return { id: 'e', seq: 0, type, payload, timestamp: 't', actor: 'a', schemaVersion: 1 } as DomainEvent;
}

describe('applyPositionEvent', () => {
  it('PositionOpened appends the position', () => {
    const next = applyPositionEvent([], event('PositionOpened', { position: stock('p1') }));
    expect(next.map((p) => p.id)).toEqual(['p1']);
  });

  it('PositionClosed marks the position closed and records close fields', () => {
    const opened = applyPositionEvent([], event('PositionOpened', { position: stock('p1') }));
    const next = applyPositionEvent(
      opened,
      event('PositionClosed', { id: 'p1', closeDate: '2026-02-01', realizedPnL: 50 })
    );
    expect(next[0].status).toBe('closed');
    expect(next[0].closeDate).toBe('2026-02-01');
    expect(next[0].realizedPnL).toBe(50);
  });

  it('PositionEdited replaces the position', () => {
    const opened = applyPositionEvent([], event('PositionOpened', { position: stock('p1') }));
    const edited = { ...(opened[0] as any), shares: 99 };
    const next = applyPositionEvent(opened, event('PositionEdited', { position: edited }));
    expect((next[0] as any).shares).toBe(99);
  });

  it('PositionsPortfolioRenamed rewrites the portfolio key', () => {
    const opened = applyPositionEvent([], event('PositionOpened', { position: stock('p1', 'Old') }));
    const next = applyPositionEvent(
      opened,
      event('PositionsPortfolioRenamed', { oldName: 'Old', newName: 'New' })
    );
    expect(next[0].portfolio).toBe('New');
  });

  it('PortfolioRenamed rewrites the portfolio key (unified rename)', () => {
    const p1 = stock('p1', 'Old');
    const p2 = stock('p2', 'Other');
    const opened = [p1, p2];
    const next = applyPositionEvent(
      opened,
      event('PortfolioRenamed', { oldName: 'Old', newName: 'New' })
    );
    expect(next[0].portfolio).toBe('New');
    expect(next[1].portfolio).toBe('Other'); // unrelated — unchanged
  });

  it('PortfolioRenamed is a no-op when no position matches oldName', () => {
    const opened = applyPositionEvent([], event('PositionOpened', { position: stock('p1', 'Main') }));
    const next = applyPositionEvent(
      opened,
      event('PortfolioRenamed', { oldName: 'DoesNotExist', newName: 'New' })
    );
    expect(next[0]).toBe(opened[0]);
  });

  it('ignores unrelated event types', () => {
    const opened = applyPositionEvent([], event('PositionOpened', { position: stock('p1') }));
    const next = applyPositionEvent(opened, event('PriceAlertRuleDeleted', { id: 'x' }));
    expect(next).toBe(opened);
  });

  // -------------------------------------------------------------------------
  // OptionRolled
  // -------------------------------------------------------------------------

  it('OptionRolled: closes old option and appends new position', () => {
    const initialPositions = [option('opt1')];
    const newOpt = option('opt2');
    const next = applyPositionEvent(
      initialPositions,
      event('OptionRolled', {
        oldPositionId: 'opt1',
        closeDate: '2026-02-15',
        closePremium: 0.5,
        realizedPnL: 70,
        newPosition: newOpt,
        netCashFlow: 30,
      })
    );

    // Old position is closed with correct close fields
    const closed = next.find((p) => p.id === 'opt1')!;
    expect(closed.status).toBe('closed');
    expect(closed.closeDate).toBe('2026-02-15');
    expect(closed.closePremium).toBe(0.5);
    expect(closed.realizedPnL).toBe(70);

    // New position is appended
    expect(next.find((p) => p.id === 'opt2')).toBeDefined();
    expect(next).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // SpreadRolled
  // -------------------------------------------------------------------------

  it('SpreadRolled: closes both legs and appends both new positions', () => {
    const longLeg = option('long1');
    const shortLeg = option('short1');
    const newLong = option('long2');
    const newShort = option('short2');

    const initialPositions = [longLeg, shortLeg];
    const next = applyPositionEvent(
      initialPositions,
      event('SpreadRolled', {
        rollDate: '2026-03-01',
        legs: [
          {
            oldPositionId: 'long1',
            closePremium: 1.2,
            realizedPnL: 80,
            newPosition: newLong,
          },
          {
            oldPositionId: 'short1',
            closePremium: 0.8,
            realizedPnL: -30,
            newPosition: newShort,
          },
        ],
        netCashFlow: 50,
      })
    );

    // Both old legs are closed
    const closedLong = next.find((p) => p.id === 'long1')!;
    expect(closedLong.status).toBe('closed');
    expect(closedLong.closeDate).toBe('2026-03-01');
    expect(closedLong.closePremium).toBe(1.2);
    expect(closedLong.realizedPnL).toBe(80);

    const closedShort = next.find((p) => p.id === 'short1')!;
    expect(closedShort.status).toBe('closed');
    expect(closedShort.closeDate).toBe('2026-03-01');
    expect(closedShort.closePremium).toBe(0.8);
    expect(closedShort.realizedPnL).toBe(-30);

    // Both new legs are appended
    expect(next.find((p) => p.id === 'long2')).toBeDefined();
    expect(next.find((p) => p.id === 'short2')).toBeDefined();
    expect(next).toHaveLength(4);
  });

  // -------------------------------------------------------------------------
  // OptionAssigned — put
  // -------------------------------------------------------------------------

  it('OptionAssigned put: closes option with realizedPnL and appends new stock', () => {
    const initialPositions = [option('opt1')];
    const newStk = stock('stk1');
    const next = applyPositionEvent(
      initialPositions,
      event('OptionAssigned', {
        kind: 'put',
        optionId: 'opt1',
        assignmentDate: '2026-04-01',
        assignmentPrice: 108,
        optionRealizedPnL: 120,
        newStock: newStk,
        effectiveCost: 10680,
        portfolio: 'Main',
      })
    );

    const closedOpt = next.find((p) => p.id === 'opt1')!;
    expect(closedOpt.status).toBe('closed');
    expect(closedOpt.closeDate).toBe('2026-04-01');
    expect(closedOpt.closePremium).toBe(0);
    expect(closedOpt.realizedPnL).toBe(120);

    // New stock appended
    expect(next.find((p) => p.id === 'stk1')).toBeDefined();
    expect(next).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // OptionAssigned — call full close
  // -------------------------------------------------------------------------

  it('OptionAssigned call full: closes option and fully closes stock', () => {
    const initialPositions = [option('opt1'), stock('stk1')];
    const next = applyPositionEvent(
      initialPositions,
      event('OptionAssigned', {
        kind: 'call',
        optionId: 'opt1',
        assignmentDate: '2026-04-15',
        optionRealizedPnL: 120,
        stockId: 'stk1',
        portfolio: 'Main',
        totalProceeds: 1100,
        premiumReceived: 120,
        stockClose: {
          fullClose: true,
          closePrice: 110,
          stockRealizedPnL: 200,
        },
      })
    );

    // Option is closed
    const closedOpt = next.find((p) => p.id === 'opt1')!;
    expect(closedOpt.status).toBe('closed');
    expect(closedOpt.closeDate).toBe('2026-04-15');
    expect(closedOpt.closePremium).toBe(0);
    expect(closedOpt.realizedPnL).toBe(120);

    // Stock is also fully closed
    const closedStk = next.find((p) => p.id === 'stk1')!;
    expect(closedStk.status).toBe('closed');
    expect(closedStk.closeDate).toBe('2026-04-15');
    expect(closedStk.closePrice).toBe(110);
    expect(closedStk.realizedPnL).toBe(200);
    expect(closedStk.notes).toContain('Assigned from covered call');

    expect(next).toHaveLength(2);
  });

  // -------------------------------------------------------------------------
  // OptionAssigned — call partial close
  // -------------------------------------------------------------------------

  it('OptionAssigned call partial: closes option and edits stock (not closed)', () => {
    const initialPositions = [option('opt1'), stock('stk1')];
    const next = applyPositionEvent(
      initialPositions,
      event('OptionAssigned', {
        kind: 'call',
        optionId: 'opt1',
        assignmentDate: '2026-04-15',
        optionRealizedPnL: 120,
        stockId: 'stk1',
        portfolio: 'Main',
        totalProceeds: 550,
        premiumReceived: 120,
        stockClose: {
          fullClose: false,
          remainingShares: 5,
          remainingCostBasis: 500,
          remainingCurrentValue: 550,
        },
      })
    );

    // Option is closed
    const closedOpt = next.find((p) => p.id === 'opt1')!;
    expect(closedOpt.status).toBe('closed');
    expect(closedOpt.closeDate).toBe('2026-04-15');
    expect(closedOpt.closePremium).toBe(0);
    expect(closedOpt.realizedPnL).toBe(120);

    // Stock is edited (still open) with reduced shares/costBasis/currentValue
    const editedStk = next.find((p) => p.id === 'stk1')!;
    expect(editedStk.status).toBe('open');
    expect(editedStk.closeDate).toBeUndefined();
    expect((editedStk as any).shares).toBe(5);
    expect((editedStk as any).costBasis).toBe(500);
    expect((editedStk as any).currentValue).toBe(550);

    expect(next).toHaveLength(2);
  });
});
