import { getDaysToExpiration } from './dateHelpers';
import { getCurrencySymbol } from './currency';
import { formatNumber } from './numberFormat';
import { isKaChingEligible, isLEAPS } from './campaignDetector';
import { isSpreadLeg, getSpreadId } from './spreadHelpers';
import { allocateCallCoverage, suggestCoveredCallStrike } from './coverageAllocation';
import type {
  Position,
  StockPosition,
  CallOption,
  PutOption,
  StrategyRule,
  Portfolio,
  Ticker,
} from '../types';

// Alert item interface
export interface AlertItem {
  id: string;
  ticker: string;
  portfolio: string;
  message: string;
  type: 'alert' | 'opportunity';
  rule?: StrategyRule;
}

// System alert types
export type SystemAlertType =
  | 'negative-cash'
  | 'expiring-option'
  | 'price-decrease'
  | 'price-increase';

// Configuration for system alerts
export interface SystemAlertConfig {
  expiringOptionDays: number; // Days before expiration to trigger alert
  enabled: boolean;
}

// Default system alert configuration
export const defaultSystemAlertConfig: SystemAlertConfig = {
  expiringOptionDays: 7,
  enabled: true,
};

// Get system alert configuration from localStorage or use defaults
export const getSystemAlertConfig = (): SystemAlertConfig => {
  const saved = localStorage.getItem('system-alert-config');
  if (saved) {
    try {
      return { ...defaultSystemAlertConfig, ...JSON.parse(saved) };
    } catch {
      return defaultSystemAlertConfig;
    }
  }
  return defaultSystemAlertConfig;
};

// Save system alert configuration
export const saveSystemAlertConfig = (config: SystemAlertConfig): void => {
  localStorage.setItem('system-alert-config', JSON.stringify(config));
};

// Get strategy rules from localStorage. Rules are global (not per-portfolio).
export const getPortfolioStrategyRules = (): StrategyRule[] => {
  const allRules: StrategyRule[] = [];

  // Load from global strategy type keys (not per-portfolio)
  const strategyTypes = ['stocks-etfs', 'options', 'general'];
  strategyTypes.forEach((strategyType) => {
    const saved = localStorage.getItem(`strategy-rules-${strategyType}`);
    if (saved) {
      try {
        const rules = JSON.parse(saved).filter((r: StrategyRule) => r.enabled);
        allRules.push(...rules);
      } catch (e) {
        console.error('Error parsing strategy rules:', e);
      }
    }
  });

  return allRules;
};

// Get all strategy rules (global rules, not per-portfolio)
export const getAllStrategyRules = (): StrategyRule[] => {
  return getPortfolioStrategyRules();
};

// Calculate portfolio free cash
export const calculatePortfolioFreeCash = (
  portfolio: Portfolio,
  positions: Position[]
): { totalCash: number; allocatedCash: number; freeCash: number } => {
  const portfolioPositions = positions.filter(
    (p) => p.portfolio === portfolio.name && p.status === 'open'
  );

  // Calculate long value (stocks, ETFs, bought options)
  const stockEtfValue = portfolioPositions
    .filter((p) => p.type === 'stock' || p.type === 'etf')
    .reduce((sum, pos) => sum + (pos.currentValue ?? 0), 0);

  const optionsLongValue = portfolioPositions
    .filter(
      (p) =>
        (p.type === 'call' || p.type === 'put') &&
        'action' in p &&
        (p as CallOption | PutOption).action === 'buy'
    )
    .reduce((sum, pos) => sum + Math.abs(pos.currentValue ?? 0), 0);

  const longValue = stockEtfValue + optionsLongValue;

  // Calculate short value (sold options)
  const shortValue = portfolioPositions
    .filter(
      (p) =>
        (p.type === 'call' || p.type === 'put') &&
        'action' in p &&
        (p as CallOption | PutOption).action === 'sell'
    )
    .reduce((sum, pos) => sum + Math.abs(pos.currentValue ?? 0), 0);

  // Cash = Total Value - Long + Short
  const totalCash = Math.max(0, portfolio.currentValue - longValue + shortValue);

  // Calculate allocated cash (collateral for CSPs and spreads)
  const allocatedCash = portfolioPositions.reduce((sum, pos) => {
    if (pos.type === 'put' && 'cashReserved' in pos && (pos as PutOption).cashReserved) {
      return sum + ((pos as PutOption).cashReserved || 0);
    }
    if (pos.type === 'spread' && 'collateral' in pos) {
      return sum + ((pos as any).collateral || 0);
    }
    return sum;
  }, 0);

  const freeCash = totalCash - allocatedCash;

  return { totalCash, allocatedCash, freeCash };
};

// Evaluate price-based alerts for stock/ETF positions
export const evaluatePriceAlerts = (
  positions: Position[],
  portfolioRules: StrategyRule[],
  dismissedAlerts: Set<string>,
  portfolioFilter?: string
): { alerts: AlertItem[]; opportunities: AlertItem[] } => {
  const alerts: AlertItem[] = [];
  const opportunities: AlertItem[] = [];

  // Filter to stock/ETF positions
  const stockETFPositions = positions.filter(
    (p) =>
      p.status === 'open' &&
      (p.type === 'stock' || p.type === 'etf') &&
      (!portfolioFilter || p.portfolio === portfolioFilter)
  ) as StockPosition[];

  stockETFPositions.forEach((position) => {
    const positionRules = portfolioRules.filter((r) => r.portfolio === position.portfolio);

    positionRules.forEach((rule) => {
      let triggered = false;
      let message = '';

      if (rule.trigger === 'price_decrease' && rule.parameters?.percentage) {
        const changePercent =
          ((position.currentPrice - position.purchasePrice) / position.purchasePrice) * 100;
        if (changePercent <= -rule.parameters.percentage) {
          triggered = true;
          message = `${position.ticker} is ${formatNumber(Math.abs(changePercent), 1)}% gedaald (drempel: -${rule.parameters.percentage}%)`;
        }
      } else if (rule.trigger === 'price_increase' && rule.parameters?.percentage) {
        const changePercent =
          ((position.currentPrice - position.purchasePrice) / position.purchasePrice) * 100;
        if (changePercent >= rule.parameters.percentage) {
          triggered = true;
          message = `${position.ticker} is ${formatNumber(changePercent, 1)}% gestegen (drempel: +${rule.parameters.percentage}%)`;
        }
      }

      if (triggered) {
        const alertId = `${position.id}-${rule.id}`;
        if (!dismissedAlerts.has(alertId)) {
          const item: AlertItem = {
            id: alertId,
            ticker: position.ticker,
            portfolio: position.portfolio,
            message,
            type: rule.category as 'alert' | 'opportunity',
            rule,
          };

          if (rule.category === 'alert') {
            alerts.push(item);
          } else {
            opportunities.push(item);
          }
        }
      }
    });
  });

  return { alerts, opportunities };
};

// Evaluate negative free cash alerts
export const evaluateNegativeCashAlerts = (
  portfolios: Portfolio[],
  positions: Position[],
  dismissedAlerts: Set<string>,
  portfolioFilter?: string
): AlertItem[] => {
  const alerts: AlertItem[] = [];

  const filteredPortfolios = portfolioFilter
    ? portfolios.filter((p) => p.name === portfolioFilter)
    : portfolios;

  filteredPortfolios.forEach((portfolio) => {
    const { freeCash } = calculatePortfolioFreeCash(portfolio, positions);

    if (freeCash < 0) {
      const alertId = `negative-cash-${portfolio.name}`;
      if (!dismissedAlerts.has(alertId)) {
        const currencySymbol = getCurrencySymbol(portfolio.currency);
        alerts.push({
          id: alertId,
          ticker: 'CASH',
          portfolio: portfolio.name,
          message: `Vrije cash is negatief: ${currencySymbol}${Math.abs(freeCash).toLocaleString('nl-NL', { minimumFractionDigits: 2 })}`,
          type: 'alert',
          rule: {
            id: 'negative-cash',
            strategyType: 'general',
            portfolio: portfolio.name,
            name: 'Negatieve vrije cash',
            description: 'Alert wanneer vrije cash negatief is',
            category: 'alert',
            trigger: 'price_decrease',
            enabled: true,
            parameters: {},
            actions: {
              showOnDashboard: true,
              showOnPortfolioOverview: true,
              showInList: true,
            },
            createdAt: new Date().toISOString(),
          },
        });
      }
    }
  });

  return alerts;
};

// Evaluate expiring options alerts
export const evaluateExpiringOptionsAlerts = (
  positions: Position[],
  dismissedAlerts: Set<string>,
  config: SystemAlertConfig = defaultSystemAlertConfig,
  portfolioFilter?: string,
  tickers?: Ticker[]
): AlertItem[] => {
  const alerts: AlertItem[] = [];

  if (!config.enabled) return alerts;

  const optionPositions = positions.filter(
    (p) =>
      p.status === 'open' &&
      (p.type === 'call' || p.type === 'put') &&
      (!portfolioFilter || p.portfolio === portfolioFilter) &&
      !isSpreadLeg(p) // Skip spread legs - spread itself handles alerts
  ) as (CallOption | PutOption)[];

  optionPositions.forEach((option) => {
    if (option.expiration) {
      const daysToExpire = getDaysToExpiration(option.expiration);

      if (daysToExpire <= config.expiringOptionDays && daysToExpire >= 0) {
        const alertId = `expiring-${option.id}`;
        if (!dismissedAlerts.has(alertId)) {
          const optionType = option.type === 'call' ? 'Call' : 'Put';
          const actionType = option.action === 'buy' ? 'Long' : 'Short';
          const urgency =
            daysToExpire === 0
              ? 'VANDAAG'
              : daysToExpire === 1
                ? 'MORGEN'
                : daysToExpire <= 3
                  ? 'binnenkort'
                  : 'deze week';

          // Get current ticker price if available
          const tickerData = tickers?.find(
            (t) => t.symbol.toUpperCase() === option.ticker.toUpperCase()
          );
          const currentPrice = tickerData?.currentPrice;
          const priceInfo = currentPrice ? `\nKoers: $${formatNumber(currentPrice, 2)}` : '';

          alerts.push({
            id: alertId,
            ticker: option.ticker,
            portfolio: option.portfolio,
            message: `${actionType} ${optionType} verloopt ${urgency} (${daysToExpire}d)\nStrike: $${option.strike}${priceInfo}`,
            type: 'alert',
            rule: {
              id: 'expiring-option',
              strategyType: 'options',
              portfolio: option.portfolio,
              name: 'Expirerende Optie',
              description: 'Alert voor opties die binnenkort expireren',
              category: 'alert',
              trigger: 'time_based',
              enabled: true,
              parameters: { days: config.expiringOptionDays },
              actions: {
                showOnDashboard: true,
                showOnPortfolioOverview: true,
                showInList: true,
              },
              createdAt: new Date().toISOString(),
            },
          });
        }
      }
    }
  });

  return alerts;
};

// Group open positions per ticker+portfolio for coverage allocation.
// Wheel-linked positions belong to their own wheel campaign and are excluded
// here, just like in campaignDetector.
interface CallCoverageGroup {
  ticker: string;
  portfolio: string;
  stocks: StockPosition[];
  leaps: CallOption[];
  shortCalls: CallOption[];
}

const buildCallCoverageGroups = (
  positions: Position[],
  portfolioFilter?: string
): CallCoverageGroup[] => {
  const groups = new Map<string, CallCoverageGroup>();
  const ensure = (ticker: string, portfolio: string): CallCoverageGroup => {
    const key = `${portfolio}::${ticker.toUpperCase()}`;
    let g = groups.get(key);
    if (!g) {
      g = { ticker: ticker.toUpperCase(), portfolio, stocks: [], leaps: [], shortCalls: [] };
      groups.set(key, g);
    }
    return g;
  };

  for (const p of positions) {
    if (p.status !== 'open') continue;
    if (portfolioFilter && p.portfolio !== portfolioFilter) continue;
    if ((p as { wheelId?: string }).wheelId) continue;
    if (p.type === 'stock' || p.type === 'etf') {
      ensure(p.ticker, p.portfolio).stocks.push(p as StockPosition);
    } else if (p.type === 'call') {
      const call = p as CallOption;
      if (isSpreadLeg(call)) continue;
      if (call.action === 'sell') {
        ensure(p.ticker, p.portfolio).shortCalls.push(call);
      } else if (call.action === 'buy' && isLEAPS(call)) {
        ensure(p.ticker, p.portfolio).leaps.push(call);
      }
    }
  }

  return [...groups.values()];
};

const priceFor = (tickers: Ticker[] | undefined, ticker: string): number | undefined =>
  tickers?.find((t) => t.symbol.toUpperCase() === ticker.toUpperCase())?.currentPrice;

// Evaluate stock covered call opportunities (via the shared coverage allocator)
export const evaluateStockCoveredCallOpportunities = (
  positions: Position[],
  dismissedAlerts: Set<string>,
  portfolioFilter?: string,
  tickers?: Ticker[]
): AlertItem[] => {
  const opportunities: AlertItem[] = [];

  for (const g of buildCallCoverageGroups(positions, portfolioFilter)) {
    if (g.stocks.length === 0) continue;

    const price = priceFor(tickers, g.ticker);
    const alloc = allocateCallCoverage({
      stocks: g.stocks,
      leaps: g.leaps,
      shortCalls: g.shortCalls,
      currentPrice: price,
    });
    const stock = alloc.stock;
    if (!stock || stock.capacity < 1) continue;

    const optionsSupported = g.stocks.every((s) => s.optionsSupported);
    if (!optionsSupported && stock.coveredContracts === 0) continue;

    const free = stock.freeContracts;
    if (free <= 0) continue;

    const alertId = `stock-cc-opportunity-${g.ticker}-${g.portfolio}`;
    if (dismissedAlerts.has(alertId)) continue;

    const totalShares = g.stocks.reduce((sum, lot) => sum + lot.shares, 0);
    let message = `Verkoop ${free} covered call${free > 1 ? 's' : ''} op ${g.ticker} (${totalShares} aandelen)`;
    if (stock.coveredContracts > 0) {
      message += `\n${stock.coveredContracts} covered call${stock.coveredContracts > 1 ? 's' : ''} actief`;
    }
    if (price && price > 0) {
      const target = suggestCoveredCallStrike(stock.breakEven, price);
      message += `\nRichtstrike ~$${formatNumber(target, 2)} (±15% OTM, ≥ break-even)`;
    }

    opportunities.push({
      id: alertId,
      ticker: g.ticker,
      portfolio: g.portfolio,
      message,
      type: 'opportunity',
      rule: {
        id: 'stock-cc-opportunity',
        strategyType: 'options',
        portfolio: g.portfolio,
        name: 'Stock Covered Call Opportunity',
        description: 'Opportunity om covered calls te verkopen op aandelen positie',
        category: 'opportunity',
        trigger: 'time_based',
        enabled: true,
        parameters: {},
        actions: {
          showOnDashboard: true,
          showOnPortfolioOverview: true,
          showInList: true,
        },
        createdAt: new Date().toISOString(),
      },
    });
  }

  return opportunities;
};

// Evaluate LEAPS without covered calls opportunities
export const evaluateLeapsOpportunities = (
  positions: Position[],
  dismissedAlerts: Set<string>,
  portfolioFilter?: string,
  tickers?: Ticker[]
): AlertItem[] => {
  const opportunities: AlertItem[] = [];

  for (const g of buildCallCoverageGroups(positions, portfolioFilter)) {
    if (g.leaps.length === 0) continue;

    const price = priceFor(tickers, g.ticker);
    const alloc = allocateCallCoverage({
      stocks: g.stocks,
      leaps: g.leaps,
      shortCalls: g.shortCalls,
      currentPrice: price,
    });

    for (const leap of g.leaps) {
      const leapAlloc = alloc.leaps.find((l) => l.parentId === leap.id);
      if (!leapAlloc) continue;

      const free = leapAlloc.freeContracts;
      if (free <= 0) continue;

      const alertId = `leaps-cc-opportunity-${leap.id}`;
      if (dismissedAlerts.has(alertId)) continue;

      let message = `PMCC: Verkoop ${free} covered call${free > 1 ? 's' : ''} op ${g.ticker} LEAPS (${leap.contracts} contracts @ $${leap.strike})`;
      if (leapAlloc.coveredContracts > 0) {
        message += `\n${leapAlloc.coveredContracts} covered call${leapAlloc.coveredContracts > 1 ? 's' : ''} actief`;
      }
      if (price && price > 0) {
        const target = suggestCoveredCallStrike(leapAlloc.breakEven, price);
        message += `\nRichtstrike ~$${formatNumber(target, 2)} (±15% OTM, ≥ LEAPS break-even)`;
      }

      opportunities.push({
        id: alertId,
        ticker: g.ticker,
        portfolio: g.portfolio,
        message,
        type: 'opportunity',
        rule: {
          id: 'leaps-cc-opportunity',
          strategyType: 'options',
          portfolio: g.portfolio,
          name: 'LEAPS Covered Call Opportunity',
          description: 'Opportunity om covered calls te verkopen op LEAPS posities',
          category: 'opportunity',
          trigger: 'time_based',
          enabled: true,
          parameters: {},
          actions: {
            showOnDashboard: true,
            showOnPortfolioOverview: true,
            showInList: true,
          },
          createdAt: new Date().toISOString(),
        },
      });
    }
  }

  return opportunities;
};

// Evaluate KaChing opportunities for long puts
export const evaluateKaChingOpportunities = (
  positions: Position[],
  dismissedAlerts: Set<string>,
  portfolioFilter?: string
): AlertItem[] => {
  const opportunities: AlertItem[] = [];

  // Filter long put options (exclude spread legs)
  const longPuts = positions.filter(
    (p) =>
      p.status === 'open' &&
      p.type === 'put' &&
      (p as PutOption).action === 'buy' &&
      (!portfolioFilter || p.portfolio === portfolioFilter) &&
      !isSpreadLeg(p) // Skip spread legs
  ) as PutOption[];

  // Check each long put for KaChing eligibility
  longPuts.forEach((put) => {
    if (isKaChingEligible(put)) {
      const alertId = `kaching-opportunity-${put.id}`;
      if (!dismissedAlerts.has(alertId)) {
        opportunities.push({
          id: alertId,
          ticker: put.ticker,
          portfolio: put.portfolio,
          message: `KaChing: Verkoop ${put.contracts} put(s) om inkomen te genereren uit deze long put`,
          type: 'opportunity',
          rule: {
            id: 'kaching-opportunity',
            strategyType: 'options',
            portfolio: put.portfolio,
            name: 'KaChing Opportunity',
            description: 'Opportunity om puts te verkopen op bestaande long put',
            category: 'opportunity',
            trigger: 'time_based',
            enabled: true,
            parameters: {},
            actions: {
              showOnDashboard: true,
              showOnPortfolioOverview: true,
              showInList: true,
            },
            createdAt: new Date().toISOString(),
          },
        });
      }
    }
  });

  return opportunities;
};

// Evaluate expiring short put opportunities (OTM puts expiring soon)
export const evaluateExpiringShortPutOpportunities = (
  positions: Position[],
  dismissedAlerts: Set<string>,
  config: SystemAlertConfig = defaultSystemAlertConfig,
  portfolioFilter?: string,
  tickers?: Ticker[]
): AlertItem[] => {
  const opportunities: AlertItem[] = [];

  if (!config.enabled) return opportunities;

  // Filter short put options (exclude spread legs)
  const shortPuts = positions.filter(
    (p) =>
      p.status === 'open' &&
      p.type === 'put' &&
      (p as PutOption).action === 'sell' &&
      (!portfolioFilter || p.portfolio === portfolioFilter) &&
      !isSpreadLeg(p)
  ) as PutOption[];

  shortPuts.forEach((put) => {
    if (!put.expiration) return;

    const daysToExpire = getDaysToExpiration(put.expiration);

    // Check if expiring within the configured days
    if (daysToExpire <= config.expiringOptionDays && daysToExpire >= 0) {
      // Get current ticker price
      const tickerData = tickers?.find((t) => t.symbol.toUpperCase() === put.ticker.toUpperCase());
      const currentPrice = tickerData?.currentPrice;

      // Only show opportunity if put is OTM (stock price above strike)
      if (currentPrice && currentPrice > put.strike) {
        const alertId = `expiring-short-put-opportunity-${put.id}`;
        if (!dismissedAlerts.has(alertId)) {
          const premiumReceived = Math.abs(put.costBasis);
          const currentValue = Math.abs(put.currentValue ?? 0);
          const profitPercent =
            premiumReceived > 0 ? ((premiumReceived - currentValue) / premiumReceived) * 100 : 0;

          const urgency =
            daysToExpire === 0
              ? 'VANDAAG'
              : daysToExpire === 1
                ? 'MORGEN'
                : daysToExpire <= 3
                  ? 'binnenkort'
                  : 'deze week';

          opportunities.push({
            id: alertId,
            ticker: put.ticker,
            portfolio: put.portfolio,
            message: `Short Put verloopt ${urgency} OTM (${daysToExpire}d)\nKoers $${formatNumber(currentPrice, 2)} > Strike $${put.strike}\nWinst: ${formatNumber(profitPercent, 0)}% - Laat expireren of verkoop nieuwe put`,
            type: 'opportunity',
            rule: {
              id: 'expiring-short-put-opportunity',
              strategyType: 'options',
              portfolio: put.portfolio,
              name: 'Expirerende Short Put OTM',
              description: 'Opportunity voor expirerende short put die OTM is',
              category: 'opportunity',
              trigger: 'time_based',
              enabled: true,
              parameters: { days: config.expiringOptionDays },
              actions: {
                showOnDashboard: true,
                showOnPortfolioOverview: true,
                showInList: true,
              },
              createdAt: new Date().toISOString(),
            },
          });
        }
      }
    }
  });

  return opportunities;
};

// Evaluate put position alerts (stock price below strike)
export const evaluatePutPositionAlerts = (
  positions: Position[],
  dismissedAlerts: Set<string>,
  portfolioFilter?: string,
  tickers?: Ticker[]
): AlertItem[] => {
  const alerts: AlertItem[] = [];

  // Filter put options (exclude spread legs - spread itself handles alerts)
  const putOptions = positions.filter(
    (p) =>
      p.status === 'open' &&
      p.type === 'put' &&
      (!portfolioFilter || p.portfolio === portfolioFilter) &&
      !isSpreadLeg(p) // Skip spread legs
  ) as PutOption[];

  putOptions.forEach((put) => {
    // For short puts: alert if stock price is below strike (ITM)
    if (put.action === 'sell') {
      const alertId = `put-position-alert-${put.id}`;
      if (!dismissedAlerts.has(alertId)) {
        // Get current ticker price
        const tickerData = tickers?.find(
          (t) => t.symbol.toUpperCase() === put.ticker.toUpperCase()
        );
        const currentPrice = tickerData?.currentPrice;

        // Check if put is ITM (stock price below strike)
        if (currentPrice && currentPrice < put.strike) {
          const intrinsicValue = (put.strike - currentPrice) * put.contracts * 100;

          alerts.push({
            id: alertId,
            ticker: put.ticker,
            portfolio: put.portfolio,
            message: `Short put is ITM: koers $${formatNumber(currentPrice, 2)} < strike $${put.strike}\nPotentieel verlies bij assignment: $${formatNumber(intrinsicValue, 2)}`,
            type: 'alert',
            rule: {
              id: 'put-position-alert',
              strategyType: 'options',
              portfolio: put.portfolio,
              name: 'Put Position Alert',
              description: 'Alert wanneer stock prijs onder strike van short put zakt',
              category: 'alert',
              trigger: 'time_based',
              enabled: true,
              parameters: {},
              actions: {
                showOnDashboard: true,
                showOnPortfolioOverview: true,
                showInList: true,
              },
              createdAt: new Date().toISOString(),
            },
          });
        }
      }
    }
  });

  return alerts;
};

// Evaluate expiring spread alerts
export const evaluateExpiringSpreadAlerts = (
  positions: Position[],
  dismissedAlerts: Set<string>,
  config: SystemAlertConfig = defaultSystemAlertConfig,
  portfolioFilter?: string,
  tickers?: Ticker[]
): AlertItem[] => {
  const alerts: AlertItem[] = [];

  if (!config.enabled) return alerts;

  // Filter options that are part of spreads
  const spreadOptions = positions.filter(
    (p) =>
      p.status === 'open' &&
      (p.type === 'call' || p.type === 'put') &&
      getSpreadId(p) !== null &&
      (!portfolioFilter || p.portfolio === portfolioFilter)
  ) as (CallOption | PutOption)[];

  // Group by spread ID
  const spreadGroups = new Map<string, (CallOption | PutOption)[]>();
  spreadOptions.forEach((option) => {
    const spreadId = getSpreadId(option);
    if (spreadId) {
      if (!spreadGroups.has(spreadId)) {
        spreadGroups.set(spreadId, []);
      }
      spreadGroups.get(spreadId)!.push(option);
    }
  });

  // Evaluate each spread for expiration
  spreadGroups.forEach((legs, spreadId) => {
    // Use the first leg's expiration (all legs should have same expiration)
    const firstLeg = legs[0];
    if (!firstLeg.expiration) return;

    const daysToExpire = getDaysToExpiration(firstLeg.expiration);

    if (daysToExpire <= config.expiringOptionDays && daysToExpire >= 0) {
      const alertId = `expiring-spread-${spreadId}`;
      if (!dismissedAlerts.has(alertId)) {
        const optionType = firstLeg.type === 'call' ? 'Call' : 'Put';
        const urgency =
          daysToExpire === 0
            ? 'VANDAAG'
            : daysToExpire === 1
              ? 'MORGEN'
              : daysToExpire <= 3
                ? 'binnenkort'
                : 'deze week';

        // Get current ticker price if available
        const tickerData = tickers?.find(
          (t) => t.symbol.toUpperCase() === firstLeg.ticker.toUpperCase()
        );
        const currentPrice = tickerData?.currentPrice;
        const priceInfo = currentPrice ? `\nKoers: $${formatNumber(currentPrice, 2)}` : '';

        // Get strike info from legs
        const strikes = legs.map((l) => l.strike).sort((a, b) => a - b);
        const strikeRange =
          strikes.length === 2 ? `$${strikes[0]}-$${strikes[1]}` : `$${strikes[0]}`;

        alerts.push({
          id: alertId,
          ticker: firstLeg.ticker,
          portfolio: firstLeg.portfolio,
          message: `${optionType} spread verloopt ${urgency} (${daysToExpire}d)\nStrike: ${strikeRange}${priceInfo}`,
          type: 'alert',
          rule: {
            id: 'expiring-spread',
            strategyType: 'options',
            portfolio: firstLeg.portfolio,
            name: 'Expirerende Spread',
            description: 'Alert voor spreads die binnenkort expireren',
            category: 'alert',
            trigger: 'time_based',
            enabled: true,
            parameters: { days: config.expiringOptionDays },
            actions: {
              showOnDashboard: true,
              showOnPortfolioOverview: true,
              showInList: true,
            },
            createdAt: new Date().toISOString(),
          },
        });
      }
    }
  });

  return alerts;
};

// Evaluate put spread alerts (stock price below short strike)
export const evaluatePutSpreadAlerts = (
  positions: Position[],
  dismissedAlerts: Set<string>,
  portfolioFilter?: string,
  tickers?: Ticker[]
): AlertItem[] => {
  const alerts: AlertItem[] = [];

  // Filter put options that are part of spreads
  const putOptions = positions.filter(
    (p) =>
      p.status === 'open' &&
      p.type === 'put' &&
      getSpreadId(p) !== null &&
      (!portfolioFilter || p.portfolio === portfolioFilter)
  ) as PutOption[];

  // Group puts by spread ID
  const spreadGroups = new Map<string, PutOption[]>();
  putOptions.forEach((put) => {
    const spreadId = getSpreadId(put);
    if (spreadId) {
      if (!spreadGroups.has(spreadId)) {
        spreadGroups.set(spreadId, []);
      }
      spreadGroups.get(spreadId)!.push(put);
    }
  });

  // Evaluate each spread
  spreadGroups.forEach((legs, spreadId) => {
    // Find short and long legs
    const shortLeg = legs.find((leg) => leg.action === 'sell');
    const longLeg = legs.find((leg) => leg.action === 'buy');

    if (!shortLeg || !longLeg) return;

    // Get current stock price
    const tickerData = tickers?.find(
      (t) => t.symbol.toUpperCase() === shortLeg.ticker.toUpperCase()
    );
    const currentPrice = tickerData?.currentPrice;

    if (!currentPrice) return;

    // Check if stock price is below short strike
    if (currentPrice < shortLeg.strike) {
      const alertId = `put-spread-alert-${spreadId}`;
      if (!dismissedAlerts.has(alertId)) {
        const spreadWidth = Math.abs(shortLeg.strike - longLeg.strike);
        const maxLoss = spreadWidth * shortLeg.contracts * 100;

        alerts.push({
          id: alertId,
          ticker: shortLeg.ticker,
          portfolio: shortLeg.portfolio,
          message: `Put spread in gevaar: koers $${formatNumber(currentPrice, 2)} < short strike $${shortLeg.strike}\nMax verlies: $${formatNumber(maxLoss, 2)} (breedte: $${spreadWidth})`,
          type: 'alert',
          rule: {
            id: 'put-spread-alert',
            strategyType: 'options',
            portfolio: shortLeg.portfolio,
            name: 'Put Spread Alert',
            description: 'Alert wanneer stock prijs onder short strike van put spread zakt',
            category: 'alert',
            trigger: 'time_based',
            enabled: true,
            parameters: {},
            actions: {
              showOnDashboard: true,
              showOnPortfolioOverview: true,
              showInList: true,
            },
            createdAt: new Date().toISOString(),
          },
        });
      }
    }
  });

  return alerts;
};

// Evaluate call spread alerts (stock price above short strike)
export const evaluateCallSpreadAlerts = (
  positions: Position[],
  dismissedAlerts: Set<string>,
  portfolioFilter?: string,
  tickers?: Ticker[]
): AlertItem[] => {
  const alerts: AlertItem[] = [];

  // Filter call options that are part of spreads
  const callOptions = positions.filter(
    (p) =>
      p.status === 'open' &&
      p.type === 'call' &&
      getSpreadId(p) !== null &&
      (!portfolioFilter || p.portfolio === portfolioFilter)
  ) as CallOption[];

  // Group calls by spread ID
  const spreadGroups = new Map<string, CallOption[]>();
  callOptions.forEach((call) => {
    const spreadId = getSpreadId(call);
    if (spreadId) {
      if (!spreadGroups.has(spreadId)) {
        spreadGroups.set(spreadId, []);
      }
      spreadGroups.get(spreadId)!.push(call);
    }
  });

  // Evaluate each spread
  spreadGroups.forEach((legs, spreadId) => {
    // Find short and long legs
    const shortLeg = legs.find((leg) => leg.action === 'sell');
    const longLeg = legs.find((leg) => leg.action === 'buy');

    if (!shortLeg || !longLeg) return;

    // Get current stock price
    const tickerData = tickers?.find(
      (t) => t.symbol.toUpperCase() === shortLeg.ticker.toUpperCase()
    );
    const currentPrice = tickerData?.currentPrice;

    if (!currentPrice) return;

    // Check if stock price is above short strike
    if (currentPrice > shortLeg.strike) {
      const alertId = `call-spread-alert-${spreadId}`;
      if (!dismissedAlerts.has(alertId)) {
        const spreadWidth = Math.abs(shortLeg.strike - longLeg.strike);
        const maxLoss = spreadWidth * shortLeg.contracts * 100;

        alerts.push({
          id: alertId,
          ticker: shortLeg.ticker,
          portfolio: shortLeg.portfolio,
          message: `Call spread in gevaar: koers $${formatNumber(currentPrice, 2)} > short strike $${shortLeg.strike}\nMax verlies: $${formatNumber(maxLoss, 2)} (breedte: $${spreadWidth})`,
          type: 'alert',
          rule: {
            id: 'call-spread-alert',
            strategyType: 'options',
            portfolio: shortLeg.portfolio,
            name: 'Call Spread Alert',
            description: 'Alert wanneer stock prijs boven short strike van call spread stijgt',
            category: 'alert',
            trigger: 'time_based',
            enabled: true,
            parameters: {},
            actions: {
              showOnDashboard: true,
              showOnPortfolioOverview: true,
              showInList: true,
            },
            createdAt: new Date().toISOString(),
          },
        });
      }
    }
  });

  return alerts;
};

// Evaluate profit opportunities (options with >= 80% profit)
export const evaluateProfitOpportunities = (
  positions: Position[],
  dismissedAlerts: Set<string>,
  portfolioFilter?: string
): AlertItem[] => {
  const opportunities: AlertItem[] = [];

  // First, handle spread profit opportunities
  const spreadOptions = positions.filter(
    (p) =>
      p.status === 'open' &&
      (p.type === 'call' || p.type === 'put') &&
      getSpreadId(p) !== null &&
      (!portfolioFilter || p.portfolio === portfolioFilter)
  ) as (CallOption | PutOption)[];

  // Group by spread ID
  const spreadGroups = new Map<string, (CallOption | PutOption)[]>();
  spreadOptions.forEach((option) => {
    const spreadId = getSpreadId(option);
    if (spreadId) {
      if (!spreadGroups.has(spreadId)) {
        spreadGroups.set(spreadId, []);
      }
      spreadGroups.get(spreadId)!.push(option);
    }
  });

  // Evaluate each spread for profit opportunity
  spreadGroups.forEach((legs, spreadId) => {
    if (legs.length !== 2) return;

    const firstLeg = legs[0];
    if (!firstLeg.expiration) return;

    const expDate = new Date(firstLeg.expiration);
    const now = new Date();
    const daysToExpiration = Math.floor(
      (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Skip expired spreads
    if (daysToExpiration <= 0) return;

    // Find short and long legs
    const shortLeg = legs.find((leg) => leg.action === 'sell');
    const longLeg = legs.find((leg) => leg.action === 'buy');

    if (!shortLeg || !longLeg) return;

    // Calculate spread metrics
    const spreadWidth = Math.abs(shortLeg.strike - longLeg.strike);
    const isCredit = shortLeg.strike > longLeg.strike; // Credit spread: sold higher strike

    // Calculate total cost basis (premium received/paid)
    const totalCostBasis = legs.reduce((sum, leg) => {
      return sum + (leg.action === 'sell' ? leg.costBasis : -leg.costBasis);
    }, 0);

    // Calculate current value
    const totalCurrentValue = legs.reduce((sum, leg) => {
      return sum + (leg.action === 'sell' ? (leg.currentValue ?? 0) : -(leg.currentValue ?? 0));
    }, 0);

    // Calculate P&L and max profit
    const totalPnL = totalCostBasis - totalCurrentValue;
    const maxProfit = isCredit
      ? totalCostBasis // Credit spread: max profit is premium received
      : spreadWidth * shortLeg.contracts * 100 - Math.abs(totalCostBasis); // Debit spread

    // Calculate profit percentage
    const profitPercent = maxProfit !== 0 ? (totalPnL / maxProfit) * 100 : 0;

    // Check if >= 80% of max profit reached
    if (totalPnL > 0 && profitPercent >= 80) {
      const alertId = `spread-profit-opportunity-${spreadId}`;
      if (!dismissedAlerts.has(alertId)) {
        const optionType = firstLeg.type === 'call' ? 'Call' : 'Put';
        const spreadType = isCredit ? 'credit' : 'debit';
        const closeValue = Math.abs(totalCurrentValue);

        opportunities.push({
          id: alertId,
          ticker: firstLeg.ticker,
          portfolio: firstLeg.portfolio,
          message: `${formatNumber(profitPercent, 0)}% van max winst op ${optionType} ${spreadType} spread\nSluitwaarde: $${formatNumber(closeValue, 2)}\nNog ${daysToExpiration}d tot expiratie`,
          type: 'opportunity',
          rule: {
            id: 'spread-profit-opportunity',
            strategyType: 'options',
            portfolio: firstLeg.portfolio,
            name: 'Spread Profit Opportunity',
            description: 'Opportunity om winst te nemen op spread positie',
            category: 'opportunity',
            trigger: 'time_based',
            enabled: true,
            parameters: {},
            actions: {
              showOnDashboard: true,
              showOnPortfolioOverview: true,
              showInList: true,
            },
            createdAt: new Date().toISOString(),
          },
        });
      }
    }
  });

  // Filter option positions (exclude spread legs)
  const optionPositions = positions.filter(
    (p) =>
      p.status === 'open' &&
      (p.type === 'call' || p.type === 'put') &&
      (!portfolioFilter || p.portfolio === portfolioFilter) &&
      !isSpreadLeg(p) // Skip spread legs
  ) as (CallOption | PutOption)[];

  optionPositions.forEach((option) => {
    const expDate = new Date(option.expiration);
    const now = new Date();
    const daysToExpiration = Math.floor(
      (expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Skip expired options
    if (daysToExpiration <= 0) return;

    const isBuy = option.action === 'buy';
    const costBasis = option.costBasis;
    const currentValue = option.currentValue ?? 0;

    // Calculate effective current value (negative for short positions)
    const effectiveCurrentValue = isBuy ? currentValue : -currentValue;
    const effectiveCostBasis = isBuy ? costBasis : -costBasis;

    // Calculate P&L
    const pnl = effectiveCurrentValue - effectiveCostBasis;
    const isProfitable = pnl > 0;

    // Calculate profit percentage based on cost basis
    const profitPercent = effectiveCostBasis !== 0 ? (pnl / Math.abs(effectiveCostBasis)) * 100 : 0;

    // Check if >= 80% profit
    if (isProfitable && profitPercent >= 80) {
      const alertId = `profit-opportunity-${option.id}`;
      if (!dismissedAlerts.has(alertId)) {
        const closeValue = Math.abs(currentValue);
        const optionType = option.type === 'call' ? 'Call' : 'Put';
        const actionType = isBuy ? 'Long' : 'Short';

        opportunities.push({
          id: alertId,
          ticker: option.ticker,
          portfolio: option.portfolio,
          message: isBuy
            ? `${formatNumber(profitPercent, 0)}% winst op ${actionType} ${optionType}\nVerkoopwaarde: $${formatNumber(closeValue, 2)}\nNog ${daysToExpiration}d tot expiratie`
            : `${formatNumber(profitPercent, 0)}% winst op ${actionType} ${optionType}\nTerugkoopwaarde: $${formatNumber(closeValue, 2)}\nNog ${daysToExpiration}d tot expiratie`,
          type: 'opportunity',
          rule: {
            id: 'profit-opportunity',
            strategyType: 'options',
            portfolio: option.portfolio,
            name: 'Profit Opportunity',
            description: 'Opportunity om winst te nemen op optie positie',
            category: 'opportunity',
            trigger: 'time_based',
            enabled: true,
            parameters: {},
            actions: {
              showOnDashboard: true,
              showOnPortfolioOverview: true,
              showInList: true,
            },
            createdAt: new Date().toISOString(),
          },
        });
      }
    }
  });

  return opportunities;
};

// Main function to evaluate all alerts for dashboard/widget
export const evaluateAllAlerts = (
  portfolios: Portfolio[],
  positions: Position[],
  dismissedAlerts: Set<string>,
  portfolioFilter?: string,
  tickers?: Ticker[]
): { alerts: AlertItem[]; opportunities: AlertItem[] } => {
  const config = getSystemAlertConfig();
  const allRules = getAllStrategyRules();

  // Evaluate price-based alerts
  const priceResults = evaluatePriceAlerts(positions, allRules, dismissedAlerts, portfolioFilter);

  // Evaluate system alerts
  const negativeCashAlerts = evaluateNegativeCashAlerts(
    portfolios,
    positions,
    dismissedAlerts,
    portfolioFilter
  );
  const expiringOptionsAlerts = evaluateExpiringOptionsAlerts(
    positions,
    dismissedAlerts,
    config,
    portfolioFilter,
    tickers
  );
  const expiringSpreadAlerts = evaluateExpiringSpreadAlerts(
    positions,
    dismissedAlerts,
    config,
    portfolioFilter,
    tickers
  );
  const putPositionAlerts = evaluatePutPositionAlerts(
    positions,
    dismissedAlerts,
    portfolioFilter,
    tickers
  );
  const putSpreadAlerts = evaluatePutSpreadAlerts(
    positions,
    dismissedAlerts,
    portfolioFilter,
    tickers
  );
  const callSpreadAlerts = evaluateCallSpreadAlerts(
    positions,
    dismissedAlerts,
    portfolioFilter,
    tickers
  );

  // Evaluate LEAPS opportunities
  const leapsOpportunities = evaluateLeapsOpportunities(
    positions,
    dismissedAlerts,
    portfolioFilter,
    tickers
  );

  // Evaluate stock covered call opportunities
  const stockCCOpportunities = evaluateStockCoveredCallOpportunities(
    positions,
    dismissedAlerts,
    portfolioFilter,
    tickers
  );

  // Evaluate KaChing opportunities
  const kaChingOpportunities = evaluateKaChingOpportunities(
    positions,
    dismissedAlerts,
    portfolioFilter
  );

  // Evaluate profit opportunities
  const profitOpportunities = evaluateProfitOpportunities(
    positions,
    dismissedAlerts,
    portfolioFilter
  );

  // Evaluate expiring short put opportunities (OTM)
  const expiringShortPutOpportunities = evaluateExpiringShortPutOpportunities(
    positions,
    dismissedAlerts,
    config,
    portfolioFilter,
    tickers
  );

  return {
    alerts: [
      ...priceResults.alerts,
      ...negativeCashAlerts,
      ...expiringOptionsAlerts,
      ...expiringSpreadAlerts,
      ...putPositionAlerts,
      ...putSpreadAlerts,
      ...callSpreadAlerts,
    ],
    opportunities: [
      ...priceResults.opportunities,
      ...leapsOpportunities,
      ...stockCCOpportunities,
      ...kaChingOpportunities,
      ...profitOpportunities,
      ...expiringShortPutOpportunities,
    ],
  };
};

// Alert item for tooltip display
export interface AlertTooltipItem {
  ticker: string;
  message: string;
}

// Get alert counts per portfolio (for PortfolioOverview)
export const getPortfolioAlertCounts = (
  portfolios: Portfolio[],
  positions: Position[],
  dismissedAlerts: Set<string>,
  tickers?: Ticker[]
): Record<
  string,
  {
    alerts: number;
    opportunities: number;
    alertItems: AlertTooltipItem[];
    opportunityItems: AlertTooltipItem[];
  }
> => {
  const result: Record<
    string,
    {
      alerts: number;
      opportunities: number;
      alertItems: AlertTooltipItem[];
      opportunityItems: AlertTooltipItem[];
    }
  > = {};

  // Initialize result for each portfolio
  portfolios.forEach((portfolio) => {
    result[portfolio.name] = { alerts: 0, opportunities: 0, alertItems: [], opportunityItems: [] };
  });

  // Get all alerts and opportunities
  const { alerts, opportunities } = evaluateAllAlerts(
    portfolios,
    positions,
    dismissedAlerts,
    undefined,
    tickers
  );

  // Count per portfolio
  alerts.forEach((alert) => {
    if (result[alert.portfolio]) {
      result[alert.portfolio].alerts++;
      result[alert.portfolio].alertItems.push({ ticker: alert.ticker, message: alert.message });
    }
  });

  opportunities.forEach((opp) => {
    if (result[opp.portfolio]) {
      result[opp.portfolio].opportunities++;
      result[opp.portfolio].opportunityItems.push({ ticker: opp.ticker, message: opp.message });
    }
  });

  return result;
};
