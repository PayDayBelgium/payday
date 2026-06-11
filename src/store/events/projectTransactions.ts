import type {
  PortfolioTransaction,
  Position,
  StockPosition,
  CallOption,
  PutOption,
} from '../../types';
import type {
  DomainEvent,
  CashEventPayload,
  PositionOpenedPayload,
  PositionClosedPayload,
  OptionRolledPayload,
  SpreadRolledPayload,
  OptionAssignedPayload,
  PortfolioRenamedPayload,
} from './types';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Minimal shape needed to construct a PortfolioTransaction. */
interface TxnArgs {
  id: string;
  portfolio: string;
  date: string;
  type: PortfolioTransaction['type'];
  amount: number;
  description: string;
  relatedPositionId?: string;
  createdAt: string;
}

function makeTxn(args: TxnArgs): PortfolioTransaction {
  return {
    id: args.id,
    portfolio: args.portfolio,
    date: args.date,
    type: args.type,
    amount: args.amount,
    description: args.description,
    relatedPositionId: args.relatedPositionId,
    createdAt: args.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

/**
 * Transaction-ledger projection.
 *
 * Folds a single domain event into the `PortfolioTransaction[]` array.
 * Returns the same reference for events this projection does not own,
 * so callers can cheaply detect no-ops.
 *
 * Design rules:
 * - EXACTLY ONE ledger line per relevant event (no double-counting).
 * - Roll/assignment composite events are the sole source of their ledger line;
 *   the standalone PositionOpened/Closed events that they would have superseded
 *   are NOT emitted when a composite is used (enforced at command level).
 * - id = `txn-${event.id}` for all events (cash events already carry their own
 *   payload id but we use the event id for determinism parity with other projections).
 * - createdAt = event.timestamp.
 *
 * @param transactions - The current accumulated ledger (immutable fold).
 * @param event        - The domain event to apply.
 * @param positionsBefore - Positions state BEFORE this event is applied
 *                          (needed for PositionClosed to look up the open position).
 */
export function applyTransactionEvent(
  transactions: PortfolioTransaction[],
  event: DomainEvent,
  positionsBefore: Position[]
): PortfolioTransaction[] {
  const txnId = `txn-${event.id}`;
  const createdAt = event.timestamp;

  switch (event.type) {
    // -----------------------------------------------------------------------
    // Cash events — direct first-class ledger entries
    // -----------------------------------------------------------------------

    case 'CashDeposited': {
      const p = event.payload as CashEventPayload;
      return [
        ...transactions,
        makeTxn({
          id: txnId,
          portfolio: p.portfolio,
          date: p.date,
          type: 'deposit',
          amount: p.amount,
          description: p.description ?? 'Deposit',
          createdAt,
        }),
      ];
    }

    case 'CashWithdrawn': {
      const p = event.payload as CashEventPayload;
      // Store positive magnitude; the cash-balance sum subtracts withdrawals.
      return [
        ...transactions,
        makeTxn({
          id: txnId,
          portfolio: p.portfolio,
          date: p.date,
          type: 'withdrawal',
          amount: p.amount,
          description: p.description ?? 'Withdrawal',
          createdAt,
        }),
      ];
    }

    case 'FeeCharged': {
      const p = event.payload as CashEventPayload;
      return [
        ...transactions,
        makeTxn({
          id: txnId,
          portfolio: p.portfolio,
          date: p.date,
          type: 'fee',
          amount: -Math.abs(p.amount),
          description: p.description ?? 'Fee',
          createdAt,
        }),
      ];
    }

    case 'DividendReceived': {
      const p = event.payload as CashEventPayload;
      return [
        ...transactions,
        makeTxn({
          id: txnId,
          portfolio: p.portfolio,
          date: p.date,
          type: 'dividend',
          amount: p.amount,
          description: p.description ?? 'Dividend',
          createdAt,
        }),
      ];
    }

    case 'ValueAdjusted': {
      const p = event.payload as CashEventPayload;
      return [
        ...transactions,
        makeTxn({
          id: txnId,
          portfolio: p.portfolio,
          date: p.date,
          type: 'adjustment',
          amount: p.amount, // signed as given
          description: p.description ?? 'Value adjustment',
          createdAt,
        }),
      ];
    }

    // -----------------------------------------------------------------------
    // PositionOpened — standalone open; one ledger line per position type
    // -----------------------------------------------------------------------

    case 'PositionOpened': {
      const { position } = event.payload as PositionOpenedPayload;

      if (position.type === 'stock' || position.type === 'etf') {
        const stock = position as StockPosition;
        return [
          ...transactions,
          makeTxn({
            id: txnId,
            portfolio: position.portfolio,
            date: position.openDate,
            type: 'position_buy',
            // costBasis = shares * purchasePrice (positive); amount is negative (cash outflow)
            amount: -stock.costBasis,
            description: `Buy ${stock.shares} × ${position.ticker}`,
            relatedPositionId: position.id,
            createdAt,
          }),
        ];
      }

      if (position.type === 'call' || position.type === 'put') {
        const option = position as CallOption | PutOption;
        if (option.action === 'sell') {
          return [
            ...transactions,
            makeTxn({
              id: txnId,
              portfolio: position.portfolio,
              date: position.openDate,
              type: 'premium_collected',
              amount: Math.abs(option.costBasis),
              description: `Premium collected — ${option.type.toUpperCase()} ${option.strike} ${option.expiration}`,
              relatedPositionId: position.id,
              createdAt,
            }),
          ];
        }
        // action === 'buy'
        return [
          ...transactions,
          makeTxn({
            id: txnId,
            portfolio: position.portfolio,
            date: position.openDate,
            type: 'premium_paid',
            amount: -Math.abs(option.costBasis),
            description: `Premium paid — ${option.type.toUpperCase()} ${option.strike} ${option.expiration}`,
            relatedPositionId: position.id,
            createdAt,
          }),
        ];
      }

      // All other position types (LEAP, spread, covered-call, etc.) that are not
      // modelled individually here: no ledger entry for now (projection is a no-op).
      return transactions;
    }

    // -----------------------------------------------------------------------
    // PositionClosed — standalone close (NOT part of a roll/assignment)
    // -----------------------------------------------------------------------

    case 'PositionClosed': {
      const payload = event.payload as PositionClosedPayload;
      const position = positionsBefore.find((p) => p.id === payload.id);
      if (!position) return transactions; // missing position → unchanged

      if (position.type === 'stock' || position.type === 'etf') {
        const stock = position as StockPosition;
        const proceeds = (payload.closePrice ?? 0) * stock.shares;
        return [
          ...transactions,
          makeTxn({
            id: txnId,
            portfolio: position.portfolio,
            date: payload.closeDate,
            type: 'position_sell',
            amount: proceeds,
            description: `Sell ${stock.shares} × ${position.ticker}`,
            relatedPositionId: position.id,
            createdAt,
          }),
        ];
      }

      if (position.type === 'call' || position.type === 'put') {
        const option = position as CallOption | PutOption;
        let amount: number;
        if (option.action === 'buy') {
          // Long option closed: receive the current premium
          amount = (payload.closePremium ?? 0) * option.contracts * 100;
        } else {
          // Short option closed: pay the premium to buy back
          amount = -((payload.closePremium ?? 0) * option.contracts * 100);
        }
        return [
          ...transactions,
          makeTxn({
            id: txnId,
            portfolio: position.portfolio,
            date: payload.closeDate,
            type: 'position_sell',
            amount,
            description: `Close ${option.type.toUpperCase()} ${option.strike} ${option.expiration}`,
            relatedPositionId: position.id,
            createdAt,
          }),
        ];
      }

      // Other position types — no ledger entry modelled yet
      return transactions;
    }

    // -----------------------------------------------------------------------
    // Composite roll / assignment events — each produces EXACTLY ONE line
    // -----------------------------------------------------------------------

    case 'OptionRolled': {
      const { newPosition, netCashFlow, closeDate } = event.payload as OptionRolledPayload;
      return [
        ...transactions,
        makeTxn({
          id: txnId,
          portfolio: newPosition.portfolio,
          date: closeDate,
          type: 'option_roll',
          amount: netCashFlow,
          description: `Roll ${newPosition.ticker} option`,
          relatedPositionId: newPosition.id,
          createdAt,
        }),
      ];
    }

    case 'SpreadRolled': {
      const { rollDate, legs, netCashFlow } = event.payload as SpreadRolledPayload;
      const firstLeg = legs[0];
      return [
        ...transactions,
        makeTxn({
          id: txnId,
          portfolio: firstLeg.newPosition.portfolio,
          date: rollDate,
          type: 'option_roll',
          amount: netCashFlow,
          description: `Roll ${firstLeg.newPosition.ticker} spread`,
          relatedPositionId: firstLeg.newPosition.id,
          createdAt,
        }),
      ];
    }

    case 'OptionAssigned': {
      const payload = event.payload as OptionAssignedPayload;

      if (payload.kind === 'put') {
        // Put assigned: stock is bought at the GROSS cost (strike × shares).
        // The premium was already credited at open via premium_collected, so
        // booking effectiveCost (= strike × shares − premium) here would count
        // the premium twice. Gross = effectiveCost + optionRealizedPnL, where
        // optionRealizedPnL = |costBasis| = the premium kept.
        const grossCost = payload.effectiveCost + payload.optionRealizedPnL;
        return [
          ...transactions,
          makeTxn({
            id: txnId,
            portfolio: payload.portfolio,
            date: payload.assignmentDate,
            type: 'position_buy',
            amount: -grossCost,
            description: `Put assignment — ${payload.newStock.ticker} @ ${payload.assignmentPrice}`,
            relatedPositionId: payload.newStock.id,
            createdAt,
          }),
        ];
      }

      // kind === 'call': stock called away. Cash received is the gross stock
      // proceeds (strike × shares) only — the premium was already credited at
      // open via premium_collected, so adding premiumReceived here would
      // double-count it.
      const calledOption = positionsBefore.find((p) => p.id === payload.optionId);
      const calledTicker = calledOption?.ticker ?? payload.portfolio;
      return [
        ...transactions,
        makeTxn({
          id: txnId,
          portfolio: payload.portfolio,
          date: payload.assignmentDate,
          type: 'position_sell',
          amount: payload.totalProceeds,
          description: `Call assignment — ${calledTicker} stock sold`,
          relatedPositionId: payload.optionId,
          createdAt,
        }),
      ];
    }

    // -----------------------------------------------------------------------
    // PortfolioRenamed — rewrite the portfolio ref on every matching transaction
    // -----------------------------------------------------------------------

    case 'PortfolioRenamed': {
      const { oldName, newName } = event.payload as PortfolioRenamedPayload;
      const renamed = transactions.map((t) =>
        t.portfolio === oldName ? { ...t, portfolio: newName } : t
      );
      // Return same reference if nothing changed (cheap no-op detection).
      return renamed.some((t, i) => t !== transactions[i]) ? renamed : transactions;
    }

    // -----------------------------------------------------------------------
    // All other events — not a ledger concern
    // -----------------------------------------------------------------------

    default:
      return transactions;
  }
}
