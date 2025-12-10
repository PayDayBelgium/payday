import type { PriceAlert } from '../types';

/**
 * Generate mock price alerts for testing
 * This will be replaced by actual alert generation logic later
 */
export const generateMockAlerts = (): PriceAlert[] => {
  return [
    {
      id: 'alert-1',
      ruleId: 'rule-1',
      positionId: 'mock-position-id', // This should match an actual position
      ticker: 'GMC',
      triggeredAt: new Date().toISOString(),
      currentPrice: 20.0,
      purchasePrice: 30.0,
      changePercentage: -33.33,
      message: 'Prijs is gedaald met meer dan 10% - Huidige prijs: $20.00 (was $30.00)',
      isRead: false,
      category: 'alert',
      methods: ['dashboard'],
    },
    {
      id: 'alert-2',
      ruleId: 'rule-2',
      positionId: 'mock-position-id', // This should match an actual position
      ticker: 'GMC',
      triggeredAt: new Date().toISOString(),
      currentPrice: 20.0,
      purchasePrice: 30.0,
      changePercentage: -33.33,
      message: 'Verlies limiet bereikt: positie staat nu -33.33% onder aankoopprijs',
      isRead: false,
      category: 'alert',
      methods: ['dashboard'],
    },
    {
      id: 'opportunity-1',
      ruleId: 'rule-3',
      positionId: 'mock-position-id', // This should match an actual position
      ticker: 'GMC',
      triggeredAt: new Date().toISOString(),
      currentPrice: 20.0,
      purchasePrice: 30.0,
      changePercentage: 15.0,
      message: 'Mogelijkheid om covered call te schrijven: prijs is gestabiliseerd na daling',
      isRead: false,
      category: 'opportunity',
      methods: ['dashboard'],
    },
  ];
};
