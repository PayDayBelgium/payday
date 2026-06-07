import type {
  Trade,
  Position,
  StockPosition,
  CallOption,
  PutOption,
} from '../../types';
import type { DomainEvent, PositionClosedPayload } from './types';

/**
 * Build a Trade from a closed position (lifted from the former tradeMiddleware).
 * The trade id is derived from the close event so replays are deterministic.
 */
function buildTrade(
  position: Position,
  close: PositionClosedPayload,
  eventId: string
): Trade | null {
  if (position.type === 'stock' || position.type === 'etf') {
    const stockPos = position as StockPosition;
    const exitPrice = close.closePrice ?? stockPos.currentPrice ?? stockPos.purchasePrice;
    const realizedPnL = (exitPrice - stockPos.purchasePrice) * stockPos.shares;
    return {
      id: `trade-${eventId}`,
      ticker: position.ticker,
      portfolio: position.portfolio,
      strategy: position.type === 'etf' ? 'ETF' : 'Aandelen',
      openDate: position.openDate,
      closeDate: close.closeDate,
      entryPrice: stockPos.purchasePrice,
      exitPrice,
      quantity: stockPos.shares,
      commission: 0,
      fees: 0,
      realizedPnL: close.realizedPnL ?? realizedPnL,
      notes: close.notes ?? position.notes,
    };
  }

  if (position.type === 'call' || position.type === 'put') {
    const option = position as CallOption | PutOption;
    const isSell = option.action === 'sell';
    const exitPremium = close.closePremium ?? 0;
    const realizedPnL = isSell
      ? (option.premium - exitPremium) * option.contracts * 100
      : (exitPremium - option.premium) * option.contracts * 100;
    return {
      id: `trade-${eventId}`,
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
      closeDate: close.closeDate,
      entryPrice: option.premium,
      exitPrice: exitPremium,
      quantity: option.contracts,
      commission: 0,
      fees: 0,
      realizedPnL: close.realizedPnL ?? realizedPnL,
      notes: close.notes ?? position.notes,
      tags: [`${option.type}`, `$${option.strike}`, option.expiration],
    };
  }

  return null;
}

/**
 * Trades are a projection of PositionClosed events. `positionsBefore` is the
 * positions projection state *before* this event is folded (the open position).
 */
export function applyTradeEvent(
  trades: Trade[],
  event: DomainEvent,
  positionsBefore: Position[]
): Trade[] {
  if (event.type !== 'PositionClosed') return trades;
  const payload = event.payload as PositionClosedPayload;
  const position = positionsBefore.find((p) => p.id === payload.id);
  if (!position) return trades;
  const trade = buildTrade(position, payload, event.id);
  return trade ? [...trades, trade] : trades;
}
