import i18n from '../i18n/config';
import { getDaysToExpiration } from './dateHelpers';
import { getCurrencySymbol } from './currency';
import { formatNumber } from './numberFormat';
import { isKaChingEligible, isLEAPS } from './campaignDetector';
import { isSpreadLeg, getSpreadId } from './spreadHelpers';
import { calculateOptionUnrealizedPnL } from './pnlCalculations';
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

// ---------------------------------------------------------------------------
// Config caches.
//
// Both configs live in localStorage and used to be re-read and JSON-parsed on
// EVERY alert evaluation — which runs on every price tick. They only change
// when a settings screen writes them, so the parsed results are cached at
// module level and every writer calls invalidateAlertConfigCache(). The shared
// evaluation memo includes getAlertConfigVersion() in its input set so a
// config change forces a re-evaluation.
// ---------------------------------------------------------------------------
let cachedSystemAlertConfig: SystemAlertConfig | null = null;
let cachedStrategyRules: StrategyRule[] | null = null;
let alertConfigVersion = 0;

/** Monotonic version bumped on every config invalidation (memo cache key input). */
export const getAlertConfigVersion = (): number => alertConfigVersion;

/** Drop the cached configs. Call this after writing any alert/strategy-rule config. */
export const invalidateAlertConfigCache = (): void => {
  cachedSystemAlertConfig = null;
  cachedStrategyRules = null;
  alertConfigVersion++;
};

// Get system alert configuration from localStorage or use defaults
export const getSystemAlertConfig = (): SystemAlertConfig => {
  if (cachedSystemAlertConfig) return cachedSystemAlertConfig;

  let config = defaultSystemAlertConfig;
  const saved = localStorage.getItem('system-alert-config');
  if (saved) {
    try {
      config = { ...defaultSystemAlertConfig, ...JSON.parse(saved) };
    } catch {
      config = defaultSystemAlertConfig;
    }
  }
  cachedSystemAlertConfig = config;
  return config;
};

// Save system alert configuration
export const saveSystemAlertConfig = (config: SystemAlertConfig): void => {
  localStorage.setItem('system-alert-config', JSON.stringify(config));
  invalidateAlertConfigCache();
};

// Get strategy rules from localStorage. Rules are global (not per-portfolio).
export const getPortfolioStrategyRules = (): StrategyRule[] => {
  if (cachedStrategyRules) return cachedStrategyRules;

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

  cachedStrategyRules = allRules;
  return allRules;
};

// Get all strategy rules (global rules, not per-portfolio)
export const getAllStrategyRules = (): StrategyRule[] => {
  return getPortfolioStrategyRules();
};

// ---------------------------------------------------------------------------
// Ticker lookup.
//
// The evaluators used to call `tickers.find(...)` inside per-position loops —
// O(positions × tickers) per evaluation. This helper builds a symbol→Ticker
// map ONCE per tickers array (cached by array identity; redux produces a new
// array whenever tickers change) and serves O(1) lookups. Like Array.find, the
// FIRST ticker wins when symbols collide, so results are identical.
// ---------------------------------------------------------------------------
const tickerMapCache = new WeakMap<Ticker[], Map<string, Ticker>>();

const findTicker = (tickers: Ticker[] | undefined, symbol: string): Ticker | undefined => {
  if (!tickers) return undefined;
  let map = tickerMapCache.get(tickers);
  if (!map) {
    map = new Map();
    for (const t of tickers) {
      const key = t.symbol.toUpperCase();
      if (!map.has(key)) map.set(key, t);
    }
    tickerMapCache.set(tickers, map);
  }
  return map.get(symbol.toUpperCase());
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
          const tickerData = findTicker(tickers, option.ticker);
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
  findTicker(tickers, ticker)?.currentPrice;

// Evaluate naked short call alerts (uncovered short calls per the shared
// coverage allocator). This is an ALERT, not an opportunity: it flags
// unlimited risk on an EXISTING position, so it is always shown and must
// never be filtered by opportunityGating. Wheel-linked short calls are
// excluded by buildCallCoverageGroups, consistent with the CC evaluators
// (they belong to their wheel campaign).
export const evaluateNakedCallAlerts = (
  positions: Position[],
  dismissedAlerts: Set<string>,
  portfolioFilter?: string,
  tickers?: Ticker[]
): AlertItem[] => {
  const alerts: AlertItem[] = [];

  for (const g of buildCallCoverageGroups(positions, portfolioFilter)) {
    if (g.shortCalls.length === 0) continue;

    const price = priceFor(tickers, g.ticker);
    const alloc = allocateCallCoverage({
      stocks: g.stocks,
      leaps: g.leaps,
      shortCalls: g.shortCalls,
      currentPrice: price,
    });

    for (const call of alloc.uncovered) {
      const alertId = `naked-call-alert-${call.id}`;
      if (dismissedAlerts.has(alertId)) continue;

      alerts.push({
        id: alertId,
        ticker: g.ticker,
        portfolio: g.portfolio,
        message: i18n.t('safetyRails.nakedCallAlert', {
          ticker: g.ticker,
          strike: call.strike,
          contracts: call.contracts,
        }),
        type: 'alert',
        rule: {
          id: 'naked-call-alert',
          strategyType: 'options',
          portfolio: g.portfolio,
          name: 'Naked Call Alert',
          description: 'Alert for short calls not covered by shares or a LEAPS',
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

  return alerts;
};

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
      const tickerData = findTicker(tickers, put.ticker);
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
        const tickerData = findTicker(tickers, put.ticker);
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

// Evaluate call position alerts (stock price above strike of a short call).
// Mirror of evaluatePutPositionAlerts: an ITM short call is the assignment
// risk for covered-call/PMCC writers. ALERT, not opportunity: always shown,
// never filtered by opportunityGating.
export const evaluateCallPositionAlerts = (
  positions: Position[],
  dismissedAlerts: Set<string>,
  portfolioFilter?: string,
  tickers?: Ticker[]
): AlertItem[] => {
  const alerts: AlertItem[] = [];

  // Filter call options (exclude spread legs - spread itself handles alerts)
  const callOptions = positions.filter(
    (p) =>
      p.status === 'open' &&
      p.type === 'call' &&
      (!portfolioFilter || p.portfolio === portfolioFilter) &&
      !isSpreadLeg(p)
  ) as CallOption[];

  callOptions.forEach((call) => {
    // For short calls: alert if stock price is above strike (ITM)
    if (call.action !== 'sell') return;

    const alertId = `call-position-alert-${call.id}`;
    if (dismissedAlerts.has(alertId)) return;

    const tickerData = findTicker(tickers, call.ticker);
    const currentPrice = tickerData?.currentPrice;

    // Check if call is ITM (stock price above strike)
    if (currentPrice && currentPrice > call.strike) {
      const intrinsicValue = (currentPrice - call.strike) * call.contracts * 100;

      alerts.push({
        id: alertId,
        ticker: call.ticker,
        portfolio: call.portfolio,
        message: i18n.t('safetyRails.itmCallAlert', {
          price: formatNumber(currentPrice, 2),
          strike: call.strike,
          intrinsic: formatNumber(intrinsicValue, 2),
        }),
        type: 'alert',
        rule: {
          id: 'call-position-alert',
          strategyType: 'options',
          portfolio: call.portfolio,
          name: 'Call Position Alert',
          description: 'Alert when the stock price rises above the strike of a short call',
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
        const tickerData = findTicker(tickers, firstLeg.ticker);
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
    const tickerData = findTicker(tickers, shortLeg.ticker);
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
    const tickerData = findTicker(tickers, shortLeg.ticker);
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

    // Timezone-safe DTE (local start-of-day); new Date('YYYY-MM-DD') parses as
    // UTC midnight and skipped tomorrow-expiring spreads for most of the day.
    const daysToExpiration = getDaysToExpiration(firstLeg.expiration);

    // Skip expired spreads
    if (daysToExpiration <= 0) return;

    // Find short and long legs
    const shortLeg = legs.find((leg) => leg.action === 'sell');
    const longLeg = legs.find((leg) => leg.action === 'buy');

    if (!shortLeg || !longLeg) return;

    // Calculate spread metrics. Classify credit/debit by net premium (like
    // calculateSpreadSummary): strike order is inverted for call credit
    // spreads, where the LOWER strike call is sold.
    const spreadWidth = Math.abs(shortLeg.strike - longLeg.strike);
    const isCredit = shortLeg.premium > longLeg.premium;
    const netPremium = Math.abs(shortLeg.premium - longLeg.premium) * shortLeg.contracts * 100;

    // Net value to close the spread (legs are stored signed: shorts negative)
    const totalCurrentValue = legs.reduce((sum, leg) => sum + (leg.currentValue ?? 0), 0);

    // Sum per-leg P&L via the shared helper, which handles signed storage
    const totalPnL = legs.reduce(
      (sum, leg) =>
        sum +
        calculateOptionUnrealizedPnL({
          action: leg.action,
          costBasis: leg.costBasis,
          currentValue: leg.currentValue ?? 0,
        }),
      0
    );

    const maxProfit = isCredit
      ? netPremium // Credit spread: max profit is the net premium received
      : spreadWidth * shortLeg.contracts * 100 - netPremium; // Debit spread

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
    // Timezone-safe DTE (local start-of-day); see the spread loop above.
    const daysToExpiration = getDaysToExpiration(option.expiration);

    // Skip expired options
    if (daysToExpiration <= 0) return;

    const isBuy = option.action === 'buy';
    const costBasis = option.costBasis;
    const currentValue = option.currentValue ?? 0;

    // costBasis/currentValue are stored signed (negative for shorts);
    // the shared helper handles both conventions correctly.
    const pnl = calculateOptionUnrealizedPnL({ action: option.action, costBasis, currentValue });
    const isProfitable = pnl > 0;

    // Profit percentage relative to premium paid (long) or received (short)
    const profitPercent = costBasis !== 0 ? (pnl / Math.abs(costBasis)) * 100 : 0;

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
  const callPositionAlerts = evaluateCallPositionAlerts(
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
  const nakedCallAlerts = evaluateNakedCallAlerts(
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
      ...callPositionAlerts,
      ...putSpreadAlerts,
      ...callSpreadAlerts,
      ...nakedCallAlerts,
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
