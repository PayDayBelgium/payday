import type { Position, PortfolioName } from '../../types';
import type {
  DomainEvent,
  PositionOpenedPayload,
  PositionEditedPayload,
  PositionClosedPayload,
  PositionsPortfolioRenamedPayload,
} from './types';

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
      const { id, closeDate, closePrice, closePremium, realizedPnL, notes } =
        event.payload as PositionClosedPayload;
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

    case 'PositionsPortfolioRenamed': {
      const { oldName, newName } = event.payload as PositionsPortfolioRenamedPayload;
      return positions.map((p) =>
        p.portfolio === oldName ? { ...p, portfolio: newName as PortfolioName } : p
      );
    }

    default:
      return positions;
  }
}
