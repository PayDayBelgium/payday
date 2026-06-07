import type { Position, PortfolioName } from '../../types';
import type {
  DomainEvent,
  PositionOpenedPayload,
  PositionEditedPayload,
  PositionClosedPayload,
  PositionsPortfolioRenamedPayload,
  OptionRolledPayload,
  SpreadRolledPayload,
  OptionAssignedPayload,
} from './types';

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

interface CloseOneArgs {
  id: string;
  closeDate: string;
  closePrice?: number;
  closePremium?: number;
  realizedPnL?: number;
  notes?: string;
}

/**
 * Apply a single "close" mutation to one position in the array.
 * Keeps the existing notes-concatenation behavior from PositionClosed.
 * Returns a new array; leaves all other positions as-is (same reference).
 */
function closeOne(positions: Position[], args: CloseOneArgs): Position[] {
  const { id, closeDate, closePrice, closePremium, realizedPnL, notes } = args;
  return positions.map((p) => {
    if (p.id !== id) return p;
    const next: Position = { ...p, status: 'closed', closeDate };
    if (closePrice !== undefined) next.closePrice = closePrice;
    if (closePremium !== undefined) next.closePremium = closePremium;
    if (realizedPnL !== undefined) next.realizedPnL = realizedPnL;
    if (notes) {
      next.notes = p.notes ? `${p.notes}\n\nClose notes: ${notes}` : `Close notes: ${notes}`;
    }
    return next;
  });
}

// ---------------------------------------------------------------------------
// Projection
// ---------------------------------------------------------------------------

/**
 * Pure fold of a single domain event into the positions array.
 * Returns the same reference for events this projection does not own,
 * so callers can cheaply detect no-ops.
 */
export function applyPositionEvent(positions: Position[], event: DomainEvent): Position[] {
  switch (event.type) {
    case 'PositionOpened': {
      const { position } = event.payload as PositionOpenedPayload;
      return [...positions, position];
    }

    case 'PositionEdited': {
      const { position } = event.payload as PositionEditedPayload;
      return positions.map((p) => (p.id === position.id ? position : p));
    }

    case 'PositionClosed': {
      const payload = event.payload as PositionClosedPayload;
      return closeOne(positions, payload);
    }

    case 'PositionsPortfolioRenamed': {
      const { oldName, newName } = event.payload as PositionsPortfolioRenamedPayload;
      return positions.map((p) =>
        p.portfolio === oldName ? { ...p, portfolio: newName as PortfolioName } : p
      );
    }

    // -----------------------------------------------------------------------
    // Coupled-cluster composites
    // -----------------------------------------------------------------------

    case 'OptionRolled': {
      const { oldPositionId, closeDate, closePremium, realizedPnL, newPosition } =
        event.payload as OptionRolledPayload;
      const closed = closeOne(positions, { id: oldPositionId, closeDate, closePremium, realizedPnL });
      return [...closed, newPosition];
    }

    case 'SpreadRolled': {
      const { rollDate, legs } = event.payload as SpreadRolledPayload;
      let result = positions;
      for (const leg of legs) {
        result = closeOne(result, {
          id: leg.oldPositionId,
          closeDate: rollDate,
          closePremium: leg.closePremium,
          realizedPnL: leg.realizedPnL,
        });
      }
      return [...result, ...legs.map((l) => l.newPosition)];
    }

    case 'OptionAssigned': {
      const payload = event.payload as OptionAssignedPayload;

      if (payload.kind === 'put') {
        const { optionId, assignmentDate, optionRealizedPnL, newStock } = payload;
        const closed = closeOne(positions, {
          id: optionId,
          closeDate: assignmentDate,
          closePremium: 0,
          realizedPnL: optionRealizedPnL,
        });
        return [...closed, newStock];
      }

      // kind === 'call'
      const { optionId, assignmentDate, optionRealizedPnL, stockId, stockClose } = payload;

      // Close the option leg
      let result = closeOne(positions, {
        id: optionId,
        closeDate: assignmentDate,
        closePremium: 0,
        realizedPnL: optionRealizedPnL,
      });

      if (stockClose.fullClose === true) {
        // Full close: mark the stock position as closed
        result = closeOne(result, {
          id: stockId,
          closeDate: assignmentDate,
          closePrice: stockClose.closePrice,
          realizedPnL: stockClose.stockRealizedPnL,
          notes: 'Assigned from covered call',
        });
      } else {
        // Partial close: edit the stock position in-place (not closed)
        const { remainingShares, remainingCostBasis, remainingCurrentValue } = stockClose;
        result = result.map((p) => {
          if (p.id !== stockId) return p;
          return {
            ...p,
            shares: remainingShares,
            costBasis: remainingCostBasis,
            currentValue: remainingCurrentValue,
          } as Position;
        });
      }

      return result;
    }

    default:
      return positions;
  }
}
