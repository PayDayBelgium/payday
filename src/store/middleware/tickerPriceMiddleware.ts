import type { Middleware } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { updatePositionLivePrice, addPriceAlert } from '../slices/positionsSlice';
import { addAlert } from '../slices/alertsSlice';
import type {
  Position,
  StockPosition,
  CallOption,
  PutOption,
  PriceAlert,
  PositionAlert,
} from '../../types';
import { formatNumber } from '../../utils/numberFormat';

// Helper to check if action is a ticker price update
const isTickerPriceUpdate = (action: any): boolean => {
  return action.type === 'tickers/updateTicker' || action.type === 'tickers/updateTickerPrice';
};

// Helper to get updated ticker info from action
const getTickerUpdateInfo = (action: any): { symbol: string; price: number } | null => {
  if (action.type === 'tickers/updateTicker') {
    const ticker = action.payload;
    if (ticker.currentPrice !== undefined) {
      return { symbol: ticker.symbol, price: ticker.currentPrice };
    }
  } else if (action.type === 'tickers/updateTickerPrice') {
    return { symbol: action.payload.symbol, price: action.payload.price };
  }
  return null;
};

// Check if an option is In The Money (ITM)
const isOptionITM = (option: CallOption | PutOption, currentPrice: number): boolean => {
  if (option.type === 'call') {
    // Call is ITM when stock price > strike price
    return currentPrice > option.strike;
  } else {
    // Put is ITM when stock price < strike price
    return currentPrice < option.strike;
  }
};

// Check if option just crossed strike price
const didCrossStrike = (
  option: CallOption | PutOption,
  oldPrice: number | undefined,
  newPrice: number
): boolean => {
  if (oldPrice === undefined) return false;

  const wasITM = isOptionITM(option, oldPrice);
  const isNowITM = isOptionITM(option, newPrice);

  return wasITM !== isNowITM;
};

export const tickerPriceMiddleware: Middleware = (store) => (next) => (action) => {
  // Only process ticker price updates
  if (!isTickerPriceUpdate(action)) {
    return next(action);
  }

  const updateInfo = getTickerUpdateInfo(action);
  if (!updateInfo) {
    return next(action);
  }

  const { symbol, price: newPrice } = updateInfo;

  // Get old price BEFORE the action is processed
  const stateBefore = store.getState() as RootState;
  const oldTicker = stateBefore.tickers.tickers.find(
    (t) => t.symbol.toUpperCase() === symbol.toUpperCase()
  );
  const oldPrice = oldTicker?.currentPrice;

  // Let the action pass through
  const result = next(action);

  // Get updated state
  const state = store.getState() as RootState;

  // Find all open positions for this ticker
  const positions = state.positions.positions.filter(
    (p) => p.ticker.toUpperCase() === symbol.toUpperCase() && p.status === 'open'
  );

  if (positions.length === 0) {
    return result;
  }

  // Process each position
  positions.forEach((position: Position) => {
    // 1. Update stock/ETF positions with new value
    if (position.type === 'stock' || position.type === 'etf') {
      const stockPosition = position as StockPosition;
      const newCurrentValue = stockPosition.shares * newPrice;

      // Update position with new current value and price
      store.dispatch(
        updatePositionLivePrice({
          id: stockPosition.id,
          currentPrice: newPrice,
          currentValue: newCurrentValue,
        })
      );

      // Check for 10% price change from purchase price
      const purchasePrice = stockPosition.purchasePrice;
      const priceChangePercent = ((newPrice - purchasePrice) / purchasePrice) * 100;

      // Check active price alert rules for this position
      const rules = state.positions.priceAlertRules.filter(
        (r) => r.positionId === position.id && r.isActive
      );

      rules.forEach((rule) => {
        let shouldTrigger = false;

        if (rule.type === 'price_increase' && priceChangePercent >= rule.percentage) {
          shouldTrigger = true;
        } else if (rule.type === 'price_decrease' && priceChangePercent <= -rule.percentage) {
          shouldTrigger = true;
        }

        if (shouldTrigger) {
          // Check if already triggered recently (within last hour)
          const existingAlerts = state.positions.priceAlerts.filter(
            (a) =>
              a.ruleId === rule.id &&
              new Date().getTime() - new Date(a.triggeredAt).getTime() < 3600000
          );

          if (existingAlerts.length === 0) {
            const alert: PriceAlert = {
              id: `price-alert-${position.id}-${Date.now()}`,
              ruleId: rule.id,
              positionId: position.id,
              ticker: symbol,
              triggeredAt: new Date().toISOString(),
              currentPrice: newPrice,
              purchasePrice: purchasePrice,
              changePercentage: priceChangePercent,
              message: `${symbol} is ${priceChangePercent > 0 ? 'gestegen' : 'gedaald'} met ${formatNumber(Math.abs(priceChangePercent), 1)}% tot $${formatNumber(newPrice, 2)}`,
              isRead: false,
              category: priceChangePercent > 0 ? 'opportunity' : 'alert',
              methods: rule.alertMethods,
            };

            store.dispatch(addPriceAlert(alert));
          }
        }
      });
    }

    // 2. Handle options - check for strike price crossing (alerts only)
    // Note: Option premiums are NOT automatically updated based on stock price
    // The premium depends on many factors (time value, volatility, etc.) and must be updated manually
    if (position.type === 'call' || position.type === 'put') {
      const option = position as CallOption | PutOption;

      // Check if strike price was crossed
      if (didCrossStrike(option, oldPrice, newPrice)) {
        const isNowITM = isOptionITM(option, newPrice);
        const direction =
          option.type === 'call' ? (isNowITM ? 'boven' : 'onder') : isNowITM ? 'onder' : 'boven';

        // Determine severity based on position type
        // Sold options becoming ITM is a warning/danger
        // Bought options becoming ITM is an opportunity
        const isSoldOption = option.action === 'sell';
        const severity = isSoldOption && isNowITM ? 'warning' : 'info';

        const alert: PositionAlert = {
          id: `strike-cross-${position.id}-${Date.now()}`,
          positionId: position.id,
          ticker: symbol,
          type: 'itm',
          severity: severity as 'warning' | 'info' | 'critical',
          message: `${symbol} ${option.type.toUpperCase()} $${option.strike} is nu ${isNowITM ? 'ITM' : 'OTM'} - prijs ${direction} strike ($${formatNumber(newPrice, 2)})`,
          actionable: true,
          suggestedAction:
            isNowITM && isSoldOption
              ? `Overweeg positie te sluiten of te rollen - ${option.contracts} contract(s) ${option.type} $${option.strike} exp ${option.expiration}`
              : undefined,
        };

        store.dispatch(addAlert(alert));
      }
    }
  });

  // Note: Portfolio value updates are handled by positionValueMiddleware
  // when updatePosition is dispatched above

  return result;
};
