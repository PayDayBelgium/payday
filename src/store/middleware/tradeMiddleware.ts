import type { Middleware, UnknownAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { addTrade } from '../slices/tradesSlice';
import type { Trade, Position, StockPosition, CallOption, PutOption } from '../../types';

type ClosePositionAction = UnknownAction & {
  type: 'positions/closePosition';
  payload: {
    id: string;
    closeDate: string;
    closePrice?: number;
    closePremium?: number;
    realizedPnL?: number;
    notes?: string;
  };
};

/**
 * Middleware to automatically create trade records when positions are closed
 * Only creates trades when a position is closed (complete trade cycle)
 */
export const tradeMiddleware: Middleware = (store) => (next) => (action) => {
  // Get state before action for position data
  const stateBefore = store.getState() as RootState;

  const result = next(action);

  // Handle position closing - this creates a complete trade record
  const a = action as UnknownAction;
  if (a.type === 'positions/closePosition') {
    const closeAction = a as ClosePositionAction;
    const position = stateBefore.positions.positions.find((p) => p.id === closeAction.payload.id);
    if (position) {
      const trade = createTradeFromPosition(position, closeAction.payload);
      if (trade) {
        store.dispatch(addTrade(trade));
      }
    }
  }

  return result;
};

/**
 * Creates a Trade record from a closed position
 * A Trade represents a complete trade cycle (open to close)
 */
function createTradeFromPosition(position: Position, closePayload: any): Trade | null {
  if (position.type === 'stock' || position.type === 'etf') {
    const stockPos = position as StockPosition;
    const exitPrice = closePayload.closePrice || stockPos.currentPrice;
    const realizedPnL = (exitPrice - stockPos.purchasePrice) * stockPos.shares;

    return {
      id: `trade-${position.id}-${Date.now()}`,
      ticker: position.ticker,
      portfolio: position.portfolio,
      strategy: position.type === 'etf' ? 'ETF' : 'Aandelen',
      openDate: position.openDate,
      closeDate: closePayload.closeDate,
      entryPrice: stockPos.purchasePrice,
      exitPrice: exitPrice,
      quantity: stockPos.shares,
      commission: 0,
      fees: 0,
      realizedPnL: closePayload.realizedPnL ?? realizedPnL,
      notes: closePayload.notes || position.notes,
    };
  }

  if (position.type === 'call' || position.type === 'put') {
    const option = position as CallOption | PutOption;
    const isSell = option.action === 'sell';
    const exitPremium = closePayload.closePremium || 0;

    // For sold options: profit = entry - exit (premium received - premium paid to close)
    // For bought options: profit = exit - entry (premium received - premium paid)
    const realizedPnL = isSell
      ? (option.premium - exitPremium) * option.contracts * 100
      : (exitPremium - option.premium) * option.contracts * 100;

    return {
      id: `trade-${position.id}-${Date.now()}`,
      ticker: position.ticker,
      portfolio: position.portfolio,
      strategy: isSell
        ? option.type === 'call'
          ? 'Covered Calls'
          : 'Cash Secured Puts'
        : option.type === 'call'
          ? 'Long Calls'
          : 'Long Puts',
      openDate: position.openDate,
      closeDate: closePayload.closeDate,
      entryPrice: option.premium,
      exitPrice: exitPremium,
      quantity: option.contracts,
      commission: 0,
      fees: 0,
      realizedPnL: closePayload.realizedPnL ?? realizedPnL,
      notes: closePayload.notes || position.notes,
      tags: [`${option.type}`, `$${option.strike}`, option.expiration],
    };
  }

  return null;
}
