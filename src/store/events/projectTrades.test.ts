import { describe, it, expect } from 'vitest';
import { applyTradeEvent } from './projectTrades';
import type { Position } from '../../types';
import type { DomainEvent } from './types';

const sellCall = (id: string): Position =>
  ({
    id,
    type: 'call',
    action: 'sell',
    ticker: 'AAPL',
    portfolio: 'Main',
    status: 'open',
    openDate: '2026-01-01',
    strike: 200,
    expiration: '2026-03-20',
    contracts: 1,
    premium: 3,
  }) as unknown as Position;

const sellPut = (id: string): Position =>
  ({
    id,
    type: 'put',
    action: 'sell',
    ticker: 'AAPL',
    portfolio: 'Main',
    status: 'open',
    openDate: '2026-01-01',
    strike: 180,
    expiration: '2026-03-20',
    contracts: 2,
    premium: 2,
  }) as unknown as Position;

const stock = (id: string): Position =>
  ({
    id,
    type: 'stock',
    ticker: 'AAPL',
    portfolio: 'Main',
    status: 'open',
    openDate: '2026-01-01',
    purchasePrice: 170,
    shares: 100,
    currentPrice: 185,
  }) as unknown as Position;

function makeEvent(type: string, payload: unknown): DomainEvent {
  return {
    id: 'evt-1',
    seq: 1,
    type,
    payload,
    timestamp: '2026-02-01T00:00:00Z',
    actor: 'test',
    schemaVersion: 1,
  } as DomainEvent;
}

function closed(id: string, payload: Record<string, unknown>): DomainEvent {
  return makeEvent('PositionClosed', { id, ...payload });
}

describe('applyTradeEvent', () => {
  it('creates a trade from a closed sold call with computed realizedPnL', () => {
    const next = applyTradeEvent([], closed('p1', { closeDate: '2026-02-01', closePremium: 1 }), [
      sellCall('p1'),
    ]);
    expect(next).toHaveLength(1);
    expect(next[0].ticker).toBe('AAPL');
    expect(next[0].strategy).toBe('Covered Calls');
    // (3 - 1) * 1 * 100 = 200
    expect(next[0].realizedPnL).toBe(200);
  });

  it('prefers an explicit realizedPnL from the payload', () => {
    const next = applyTradeEvent([], closed('p1', { closeDate: '2026-02-01', realizedPnL: 42 }), [
      sellCall('p1'),
    ]);
    expect(next[0].realizedPnL).toBe(42);
  });

  it('ignores non-close events and unknown positions', () => {
    expect(applyTradeEvent([], closed('missing', { closeDate: 'x' }), [])).toEqual([]);
  });

  describe('OptionRolled', () => {
    it('produces one trade for the rolled option with the payload realizedPnL', () => {
      const event = makeEvent('OptionRolled', {
        oldPositionId: 'opt-1',
        closeDate: '2026-02-15',
        closePremium: 1.5,
        realizedPnL: 150,
        newPosition: sellCall('opt-2'),
        netCashFlow: 150,
      });
      const next = applyTradeEvent([], event, [sellCall('opt-1')]);
      expect(next).toHaveLength(1);
      expect(next[0].ticker).toBe('AAPL');
      expect(next[0].realizedPnL).toBe(150);
      expect(next[0].closeDate).toBe('2026-02-15');
      expect(next[0].id).toBe('trade-evt-1');
    });

    it('skips when oldPositionId is not in positionsBefore', () => {
      const event = makeEvent('OptionRolled', {
        oldPositionId: 'ghost',
        closeDate: '2026-02-15',
        closePremium: 0,
        realizedPnL: 0,
        newPosition: sellCall('opt-2'),
        netCashFlow: 0,
      });
      expect(applyTradeEvent([], event, [])).toEqual([]);
    });
  });

  describe('SpreadRolled', () => {
    it('produces two trades, one per leg, with suffixed ids', () => {
      const event = makeEvent('SpreadRolled', {
        rollDate: '2026-02-20',
        legs: [
          {
            oldPositionId: 'long-1',
            closePremium: 2,
            realizedPnL: -50,
            newPosition: sellCall('long-2'),
          },
          {
            oldPositionId: 'short-1',
            closePremium: 1,
            realizedPnL: 120,
            newPosition: sellCall('short-2'),
          },
        ],
        netCashFlow: 70,
      });
      const next = applyTradeEvent([], event, [sellCall('long-1'), sellCall('short-1')]);
      expect(next).toHaveLength(2);
      expect(next[0].id).toBe('trade-evt-1-0');
      expect(next[1].id).toBe('trade-evt-1-1');
      expect(next[0].realizedPnL).toBe(-50);
      expect(next[1].realizedPnL).toBe(120);
    });

    it('skips a leg that is not in positionsBefore', () => {
      const event = makeEvent('SpreadRolled', {
        rollDate: '2026-02-20',
        legs: [
          {
            oldPositionId: 'long-1',
            closePremium: 2,
            realizedPnL: -50,
            newPosition: sellCall('long-2'),
          },
          {
            oldPositionId: 'ghost',
            closePremium: 1,
            realizedPnL: 120,
            newPosition: sellCall('short-2'),
          },
        ],
        netCashFlow: 70,
      });
      const next = applyTradeEvent([], event, [sellCall('long-1')]);
      expect(next).toHaveLength(1);
      expect(next[0].id).toBe('trade-evt-1-0');
    });
  });

  describe('OptionAssigned put', () => {
    it('produces one trade for the put option', () => {
      const event = makeEvent('OptionAssigned', {
        kind: 'put',
        optionId: 'put-1',
        assignmentDate: '2026-03-20',
        assignmentPrice: 180,
        optionRealizedPnL: 400,
        newStock: stock('stk-new'),
        effectiveCost: 35600,
        portfolio: 'Main',
      });
      const next = applyTradeEvent([], event, [sellPut('put-1')]);
      expect(next).toHaveLength(1);
      expect(next[0].id).toBe('trade-evt-1-option');
      expect(next[0].closeDate).toBe('2026-03-20');
      expect(next[0].realizedPnL).toBe(400);
      expect(next[0].exitPrice).toBe(0); // closePremium = 0
    });
  });

  describe('OptionAssigned call (full close)', () => {
    it('produces two trades: option + stock', () => {
      const event = makeEvent('OptionAssigned', {
        kind: 'call',
        optionId: 'call-1',
        assignmentDate: '2026-03-20',
        optionRealizedPnL: 300,
        stockId: 'stk-1',
        portfolio: 'Main',
        totalProceeds: 20300,
        premiumReceived: 300,
        stockClose: { fullClose: true, closePrice: 200, stockRealizedPnL: 3000 },
      });
      const next = applyTradeEvent([], event, [sellCall('call-1'), stock('stk-1')]);
      expect(next).toHaveLength(2);
      const optTrade = next.find((t) => t.id === 'trade-evt-1-option');
      const stkTrade = next.find((t) => t.id === 'trade-evt-1-stock');
      expect(optTrade).toBeDefined();
      expect(optTrade!.realizedPnL).toBe(300);
      expect(stkTrade).toBeDefined();
      expect(stkTrade!.realizedPnL).toBe(3000);
      expect(stkTrade!.exitPrice).toBe(200);
    });
  });

  describe('OptionAssigned call (partial close)', () => {
    it('produces only the option trade when fullClose is false', () => {
      const event = makeEvent('OptionAssigned', {
        kind: 'call',
        optionId: 'call-1',
        assignmentDate: '2026-03-20',
        optionRealizedPnL: 300,
        stockId: 'stk-1',
        portfolio: 'Main',
        totalProceeds: 10150,
        premiumReceived: 150,
        stockClose: {
          fullClose: false,
          remainingShares: 50,
          remainingCostBasis: 8500,
          remainingCurrentValue: 9250,
          stockRealizedPnL: 1500,
        },
      });
      const next = applyTradeEvent([], event, [sellCall('call-1'), stock('stk-1')]);
      expect(next).toHaveLength(1);
      expect(next[0].id).toBe('trade-evt-1-option');
      expect(next[0].realizedPnL).toBe(300);
    });
  });

  // -------------------------------------------------------------------------
  // NEW PATH: lotCloses present → ONE aggregate stock trade + ONE option trade
  // -------------------------------------------------------------------------

  describe('OptionAssigned call (new-path: lotCloses)', () => {
    it('new-path full close → ONE option trade + ONE aggregate stock trade', () => {
      // Single lot, fully closed. lotCloses present → new path.
      const evt = makeEvent('OptionAssigned', {
        kind: 'call',
        optionId: 'call-1',
        assignmentDate: '2026-03-20',
        optionRealizedPnL: 300,
        stockId: 'stk-1',
        portfolio: 'Main',
        totalProceeds: 20000,
        premiumReceived: 300,
        stockClose: { fullClose: true, closePrice: 200, stockRealizedPnL: 3000 }, // legacy
        lotCloses: [
          {
            stockId: 'stk-1',
            fullClose: true,
            sharesSold: 100,
            closePrice: 200,
            lotCostBasisForShares: 17000,
          },
        ],
        sharesSold: 100,
        stockRealizedPnL: 3000,
      });
      const positionsBefore = [sellCall('call-1'), stock('stk-1')];
      const next = applyTradeEvent([], evt, positionsBefore);

      expect(next).toHaveLength(2);
      const optTrade = next.find((t) => t.id === 'trade-evt-1-option');
      const stkTrade = next.find((t) => t.id === 'trade-evt-1-stock');
      expect(optTrade).toBeDefined();
      expect(optTrade!.realizedPnL).toBe(300);
      expect(stkTrade).toBeDefined();
      expect(stkTrade!.quantity).toBe(100);
      expect(stkTrade!.realizedPnL).toBe(3000);
      expect(stkTrade!.exitPrice).toBe(200); // totalProceeds / sharesSold = 20000/100
    });

    it('new-path multi-lot partial → ONE option trade + ONE aggregate stock trade (quantity = sharesSold)', () => {
      // Two lots: lot1(99sh) fully consumed + lot2(50sh) partially consumed (1 share).
      const lot1Pos = {
        ...stock('lot-1'),
        shares: 99,
        costBasis: 9900,
        openDate: '2026-01-01',
      } as unknown as Position;
      const lot2Pos = {
        ...stock('lot-2'),
        shares: 50,
        costBasis: 11000,
        openDate: '2026-02-01',
      } as unknown as Position;

      const evt = makeEvent('OptionAssigned', {
        kind: 'call',
        optionId: 'call-1',
        assignmentDate: '2026-03-20',
        optionRealizedPnL: 300,
        stockId: 'lot-1',
        portfolio: 'Main',
        totalProceeds: 31000,
        premiumReceived: 300,
        stockClose: { fullClose: true, closePrice: 310, stockRealizedPnL: 10000 }, // legacy
        lotCloses: [
          {
            stockId: 'lot-1',
            fullClose: true,
            sharesSold: 99,
            closePrice: 310,
            lotCostBasisForShares: 9900,
          },
          {
            stockId: 'lot-2',
            fullClose: false,
            sharesSold: 1,
            closePrice: 310,
            lotCostBasisForShares: 220,
            remainingShares: 49,
            remainingCostBasis: 10780,
            remainingCurrentValue: 11270,
          },
        ],
        sharesSold: 100,
        stockRealizedPnL: 10000,
      });

      const positionsBefore = [sellCall('call-1'), lot1Pos, lot2Pos];
      const next = applyTradeEvent([], evt, positionsBefore);

      expect(next).toHaveLength(2);
      const stkTrade = next.find((t) => t.id === 'trade-evt-1-stock')!;
      expect(stkTrade).toBeDefined();
      // Aggregate: sharesSold = 100, realizedPnL = 10000 (from stockRealizedPnL)
      expect(stkTrade.quantity).toBe(100);
      expect(stkTrade.realizedPnL).toBe(10000);
      expect(stkTrade.strategy).toBe('Aandelen'); // lot1 type=stock
    });

    it('backward-compat: old full-close event (no lotCloses) → option + stock trade (unchanged)', () => {
      const evt = makeEvent('OptionAssigned', {
        kind: 'call',
        optionId: 'call-1',
        assignmentDate: '2026-03-20',
        optionRealizedPnL: 300,
        stockId: 'stk-1',
        portfolio: 'Main',
        totalProceeds: 20300,
        premiumReceived: 300,
        stockClose: { fullClose: true, closePrice: 200, stockRealizedPnL: 3000 },
        // No lotCloses — old event
      });
      const next = applyTradeEvent([], evt, [sellCall('call-1'), stock('stk-1')]);
      expect(next).toHaveLength(2);
      const stkTrade = next.find((t) => t.id === 'trade-evt-1-stock');
      expect(stkTrade!.realizedPnL).toBe(3000);
    });

    it('backward-compat: old partial-close event (no lotCloses) → only option trade (unchanged)', () => {
      const evt = makeEvent('OptionAssigned', {
        kind: 'call',
        optionId: 'call-1',
        assignmentDate: '2026-03-20',
        optionRealizedPnL: 300,
        stockId: 'stk-1',
        portfolio: 'Main',
        totalProceeds: 10150,
        premiumReceived: 150,
        stockClose: {
          fullClose: false,
          remainingShares: 50,
          remainingCostBasis: 8500,
          remainingCurrentValue: 9250,
          stockRealizedPnL: 1500,
        },
        // No lotCloses — old event
      });
      const next = applyTradeEvent([], evt, [sellCall('call-1'), stock('stk-1')]);
      expect(next).toHaveLength(1);
      expect(next[0].id).toBe('trade-evt-1-option');
    });
  });
});
