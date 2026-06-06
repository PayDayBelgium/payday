import { describe, it, expect } from 'vitest';
import {
  calculateOptionUnrealizedPnL,
  calculateOptionRealizedPnL,
  calculateStockUnrealizedPnL,
  calculateStockRealizedPnL,
  calculatePnLPercentage,
  calculateRollPnL,
  calculateCampaignTotalPnL,
  calculateCostBasis,
  calculateCurrentValue,
} from './pnlCalculations';

describe('pnlCalculations', () => {
  describe('calculateOptionUnrealizedPnL', () => {
    it('long option: profit when current value exceeds cost basis', () => {
      expect(calculateOptionUnrealizedPnL({ action: 'buy', costBasis: 500, currentValue: 800 })).toBe(300);
    });

    it('long option: loss when current value drops below cost basis', () => {
      expect(calculateOptionUnrealizedPnL({ action: 'buy', costBasis: 500, currentValue: 200 })).toBe(-300);
    });

    it('short option: profit when current liability is smaller than premium received', () => {
      // premium received 500 (costBasis -500), current liability 200 (currentValue -200) -> +300
      expect(calculateOptionUnrealizedPnL({ action: 'sell', costBasis: -500, currentValue: -200 })).toBe(300);
    });

    it('short option: loss when liability grows beyond premium received', () => {
      expect(calculateOptionUnrealizedPnL({ action: 'sell', costBasis: -500, currentValue: -800 })).toBe(-300);
    });
  });

  describe('calculateOptionRealizedPnL', () => {
    it('long option sold to close returns close value minus cost basis', () => {
      // close 2.00 * 1 * 100 = 200, costBasis 150 -> +50
      expect(
        calculateOptionRealizedPnL({ action: 'buy', costBasis: 150, closePremium: 2, contracts: 1 })
      ).toBe(50);
    });

    it('short option bought back to close returns premium received minus close cost', () => {
      // premium received 300 (costBasis -300), buy back 1.00 * 2 * 100 = 200 -> +100
      expect(
        calculateOptionRealizedPnL({ action: 'sell', costBasis: -300, closePremium: 1, contracts: 2 })
      ).toBe(100);
    });
  });

  describe('stock P&L', () => {
    it('unrealized = current value - cost basis', () => {
      expect(calculateStockUnrealizedPnL({ costBasis: 1000, currentValue: 1250 })).toBe(250);
    });

    it('realized = close price * shares - cost basis', () => {
      expect(calculateStockRealizedPnL({ costBasis: 1000, closePrice: 12, shares: 100 })).toBe(200);
    });
  });

  describe('calculatePnLPercentage', () => {
    it('uses absolute cost basis as denominator', () => {
      expect(calculatePnLPercentage(300, -500)).toBe(60);
    });

    it('returns 0 when cost basis is 0 (no division by zero)', () => {
      expect(calculatePnLPercentage(100, 0)).toBe(0);
    });
  });

  describe('calculateCostBasis / calculateCurrentValue sign conventions', () => {
    it('long position has positive cost basis and value', () => {
      expect(calculateCostBasis({ action: 'buy', premium: 2, contracts: 1 })).toBe(200);
      expect(calculateCurrentValue({ action: 'buy', currentPremium: 3, contracts: 1 })).toBe(300);
    });

    it('short position has negative cost basis and value (credit / liability)', () => {
      expect(calculateCostBasis({ action: 'sell', premium: 2, contracts: 1 })).toBe(-200);
      expect(calculateCurrentValue({ action: 'sell', currentPremium: 3, contracts: 1 })).toBe(-300);
    });
  });

  describe('calculateRollPnL', () => {
    it('equals the realized P&L of closing the old leg', () => {
      expect(
        calculateRollPnL({ action: 'sell', oldCostBasis: -300, closePremium: 1, contracts: 1 })
      ).toBe(200);
    });
  });

  describe('calculateCampaignTotalPnL', () => {
    it('sums realized P&L with unrealized P&L of active options', () => {
      const total = calculateCampaignTotalPnL({
        totalRealizedPnL: 100,
        activeOptions: [
          { action: 'sell', costBasis: -500, currentValue: -200 }, // +300
          { action: 'buy', costBasis: 500, currentValue: 450 }, // -50
        ],
      });
      expect(total).toBe(350);
    });
  });
});
