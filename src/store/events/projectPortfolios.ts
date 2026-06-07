import type { Portfolio } from '../../types';
import type {
  DomainEvent,
  PortfolioCreatedPayload,
  PortfolioEditedPayload,
  PortfolioRenamedPayload,
  PortfolioDeletedPayload,
  PortfoliosReorderedPayload,
} from './types';

/**
 * Pure fold of a single domain event into the portfolios array.
 * Returns the same reference for events this projection does not own,
 * so callers can cheaply detect no-ops.
 */
export function applyPortfolioEvent(portfolios: Portfolio[], event: DomainEvent): Portfolio[] {
  switch (event.type) {
    case 'PortfolioCreated': {
      const { portfolio } = event.payload as PortfolioCreatedPayload;
      return [...portfolios, portfolio];
    }

    case 'PortfolioEdited': {
      const { portfolio } = event.payload as PortfolioEditedPayload;
      return portfolios.map((p) => (p.id === portfolio.id ? portfolio : p));
    }

    case 'PortfolioRenamed': {
      const { oldName, newName } = event.payload as PortfolioRenamedPayload;
      return portfolios.map((p) =>
        p.name === oldName ? { ...p, name: newName as Portfolio['name'] } : p
      );
    }

    case 'PortfolioDeleted': {
      const { id } = event.payload as PortfolioDeletedPayload;
      return portfolios.filter((p) => p.id !== id);
    }

    case 'PortfoliosReordered': {
      const { order } = event.payload as PortfoliosReorderedPayload;
      // Build an index for O(n) lookup.
      const indexById = new Map<string, number>(order.map((id, i) => [id, i]));
      // Partition: portfolios in the order array vs. those not mentioned.
      const inOrder: Portfolio[] = new Array(order.length);
      const tail: Portfolio[] = [];
      for (const p of portfolios) {
        const idx = indexById.get(p.id);
        if (idx !== undefined) {
          inOrder[idx] = p;
        } else {
          tail.push(p);
        }
      }
      // Compact inOrder (in case order contained ids that no longer exist).
      return [...inOrder.filter(Boolean), ...tail];
    }

    default:
      return portfolios;
  }
}
