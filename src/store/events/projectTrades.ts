import type {
  Trade,
  Position,
  StockPosition,
  CallOption,
  PutOption,
} from '../../types';
import type {
  DomainEvent,
  PositionClosedPayload,
  OptionRolledPayload,
  SpreadRolledPayload,
  OptionAssignedPayload,
} from './types';

/**
 * Build a Trade from a closed position (lifted from the former tradeMiddleware).
 * `tradeId` is the full id to use for the produced trade (caller ensures uniqueness).
 */
function buildTrade(
  position: Position,
  close: PositionClosedPayload,
  tradeId: string
): Trade | null {
  if (position.type === 'stock' || position.type === 'etf') {
    const stockPos = position as StockPosition;
    const exitPrice = close.closePrice ?? stockPos.currentPrice ?? stockPos.purchasePrice;
    const realizedPnL = (exitPrice - stockPos.purchasePrice) * stockPos.shares;
    return {
      id: `trade-${tradeId}`,
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
      id: `trade-${tradeId}`,
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
 * Trades are a projection of PositionClosed and composite roll/assignment events.
 * `positionsBefore` is the positions projection state *before* this event is folded
 * (so the positions being closed are still present).
 */
export function applyTradeEvent(
  trades: Trade[],
  event: DomainEvent,
  positionsBefore: Position[]
): Trade[] {
  const byId = (id: string) => positionsBefore.find((p) => p.id === id);

  if (event.type === 'PositionClosed') {
    const payload = event.payload as PositionClosedPayload;
    const position = byId(payload.id);
    if (!position) return trades;
    const trade = buildTrade(position, payload, event.id);
    return trade ? [...trades, trade] : trades;
  }

  if (event.type === 'OptionRolled') {
    const payload = event.payload as OptionRolledPayload;
    const position = byId(payload.oldPositionId);
    if (!position) return trades;
    const trade = buildTrade(
      position,
      { id: payload.oldPositionId, closeDate: payload.closeDate, closePremium: payload.closePremium, realizedPnL: payload.realizedPnL },
      event.id
    );
    return trade ? [...trades, trade] : trades;
  }

  if (event.type === 'SpreadRolled') {
    const payload = event.payload as SpreadRolledPayload;
    const newTrades: Trade[] = [];
    payload.legs.forEach((leg, index) => {
      const position = byId(leg.oldPositionId);
      if (!position) return;
      const trade = buildTrade(
        position,
        { id: leg.oldPositionId, closeDate: payload.rollDate, closePremium: leg.closePremium, realizedPnL: leg.realizedPnL },
        `${event.id}-${index}`
      );
      if (trade) newTrades.push(trade);
    });
    return newTrades.length > 0 ? [...trades, ...newTrades] : trades;
  }

  if (event.type === 'OptionAssigned') {
    const payload = event.payload as OptionAssignedPayload;
    const newTrades: Trade[] = [];

    if (payload.kind === 'put') {
      const position = byId(payload.optionId);
      if (position) {
        const trade = buildTrade(
          position,
          { id: payload.optionId, closeDate: payload.assignmentDate, closePremium: 0, realizedPnL: payload.optionRealizedPnL },
          `${event.id}-option`
        );
        if (trade) newTrades.push(trade);
      }
    } else {
      // kind === 'call'
      const optionPosition = byId(payload.optionId);
      if (optionPosition) {
        const trade = buildTrade(
          optionPosition,
          { id: payload.optionId, closeDate: payload.assignmentDate, closePremium: 0, realizedPnL: payload.optionRealizedPnL },
          `${event.id}-option`
        );
        if (trade) newTrades.push(trade);
      }

      if (payload.lotCloses) {
        // -----------------------------------------------------------------------
        // NEW PATH — multi-lot FIFO: emit exactly ONE aggregate stock trade.
        // Build it directly from the payload (do NOT look up a single lot).
        // -----------------------------------------------------------------------
        const sharesSold = payload.sharesSold ?? payload.lotCloses.reduce((s, lc) => s + lc.sharesSold, 0);
        const strike = payload.lotCloses[0].closePrice; // all lot closes use the same strike
        const exitPrice = sharesSold > 0 ? payload.totalProceeds / sharesSold : strike;
        const aggregateRealizedPnL = payload.stockRealizedPnL ?? 0;

        // Determine strategy from the first matching lot in positionsBefore.
        const firstLotId = payload.lotCloses[0].stockId;
        const firstLotPos = byId(firstLotId);
        const stockStrategy: Trade['strategy'] = firstLotPos?.type === 'etf' ? 'ETF' : 'Aandelen';

        // Use the earliest lot's openDate for the aggregate trade openDate.
        let earliestOpenDate: string | undefined;
        for (const lc of payload.lotCloses) {
          const lotPos = byId(lc.stockId);
          if (lotPos?.openDate) {
            if (!earliestOpenDate || lotPos.openDate < earliestOpenDate) {
              earliestOpenDate = lotPos.openDate;
            }
          }
        }

        const aggregateTrade: Trade = {
          id: `trade-${event.id}-stock`,
          ticker: optionPosition?.ticker ?? payload.portfolio,
          portfolio: payload.portfolio,
          strategy: stockStrategy,
          openDate: earliestOpenDate ?? payload.assignmentDate,
          closeDate: payload.assignmentDate,
          // Derive the entry price from the GAK realized P&L so the trade record is
          // internally consistent: (exitPrice - entryPrice) * quantity === realizedPnL.
          // This equals the weighted-average cost (GAK) over the whole holding.
          entryPrice: sharesSold > 0 ? exitPrice - aggregateRealizedPnL / sharesSold : 0,
          exitPrice,
          quantity: sharesSold,
          commission: 0,
          fees: 0,
          realizedPnL: aggregateRealizedPnL,
        };
        newTrades.push(aggregateTrade);
      } else if (payload.stockClose.fullClose === true) {
        // -----------------------------------------------------------------------
        // OLD PATH — backward-compat: single-lot full close only.
        // UNCHANGED from original — must stay verbatim for old event replay.
        // -----------------------------------------------------------------------
        const stockPosition = byId(payload.stockId);
        if (stockPosition) {
          const trade = buildTrade(
            stockPosition,
            { id: payload.stockId, closeDate: payload.assignmentDate, closePrice: payload.stockClose.closePrice, realizedPnL: payload.stockClose.stockRealizedPnL },
            `${event.id}-stock`
          );
          if (trade) newTrades.push(trade);
        }
      }
    }

    return newTrades.length > 0 ? [...trades, ...newTrades] : trades;
  }

  return trades;
}
