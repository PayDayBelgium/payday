import type { StrategyRule, StrategyType, PortfolioName } from '../types';

export const getDefaultStocksETFsRules = (portfolio: PortfolioName): StrategyRule[] => {
  const timestamp = new Date().toISOString();

  return [
    // Alert: 10% waarde daling
    {
      id: `stocks-etfs-alert-decline-${Date.now()}`,
      strategyType: 'stocks-etfs',
      portfolio,
      name: 'Prijs Gedaald met 10%',
      description: 'Waarschuwing wanneer de prijs met 10% daalt ten opzichte van de aankoopprijs',
      category: 'alert',
      trigger: 'price_decrease',
      enabled: true,
      parameters: {
        percentage: 10,
      },
      actions: {
        showOnDashboard: true,
        showOnPortfolioOverview: true,
        showInList: true,
        notification: false,
      },
      createdAt: timestamp,
    },
    // Opportunity: 10% waarde stijging
    {
      id: `stocks-etfs-opp-increase-${Date.now() + 1}`,
      strategyType: 'stocks-etfs',
      portfolio,
      name: 'Prijs Gestegen met 10%',
      description: 'Kans om te verkopen wanneer de prijs met 10% stijgt ten opzichte van de aankoopprijs',
      category: 'opportunity',
      trigger: 'price_increase',
      enabled: true,
      parameters: {
        percentage: 10,
      },
      actions: {
        showOnDashboard: true,
        showOnPortfolioOverview: true,
        showInList: true,
        notification: false,
      },
      createdAt: timestamp,
    },
    // Alert: 20% waarde daling
    {
      id: `stocks-etfs-alert-decline-20-${Date.now() + 2}`,
      strategyType: 'stocks-etfs',
      portfolio,
      name: 'Prijs Gedaald met 20%',
      description: 'Belangrijke waarschuwing bij 20% daling - overweeg stop loss',
      category: 'alert',
      trigger: 'price_decrease',
      enabled: true,
      parameters: {
        percentage: 20,
      },
      actions: {
        showOnDashboard: true,
        showOnPortfolioOverview: true,
        showInList: true,
        notification: true,
      },
      createdAt: timestamp,
    },
    // Opportunity: 20% waarde stijging
    {
      id: `stocks-etfs-opp-increase-20-${Date.now() + 3}`,
      strategyType: 'stocks-etfs',
      portfolio,
      name: 'Prijs Gestegen met 20%',
      description: 'Goede kans om winst te nemen bij 20% stijging',
      category: 'opportunity',
      trigger: 'price_increase',
      enabled: true,
      parameters: {
        percentage: 20,
      },
      actions: {
        showOnDashboard: true,
        showOnPortfolioOverview: true,
        showInList: true,
        notification: false,
      },
      createdAt: timestamp,
    },
  ];
};

export const getDefaultRulesForStrategy = (
  strategyType: StrategyType,
  portfolio: PortfolioName
): StrategyRule[] => {
  switch (strategyType) {
    case 'stocks-etfs':
      return getDefaultStocksETFsRules(portfolio);
    // Add more strategies as needed
    default:
      return [];
  }
};
