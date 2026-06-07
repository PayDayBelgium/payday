import type { Position, PriceAlertRule, Trade, PortfolioName } from '../../types';
import { uuid } from '../../utils/uuid';

/** Current event schema version. Bump + add an upcaster when payloads change. */
export const EVENT_SCHEMA_VERSION = 1;

/** All domain-event type names handled in Phase 1. */
export type DomainEventType =
  | 'PositionOpened'
  | 'PositionClosed'
  | 'PositionEdited'
  | 'PositionsPortfolioRenamed'
  | 'PriceAlertRuleCreated'
  | 'PriceAlertRuleUpdated'
  | 'PriceAlertRuleDeleted'
  | 'PriceAlertRuleToggled';

// --- Phase 1 payloads ---
export interface PositionOpenedPayload {
  position: Position;
}
export interface PositionClosedPayload {
  id: string;
  closeDate: string;
  closePrice?: number;
  closePremium?: number;
  realizedPnL?: number;
  notes?: string;
}
export interface PositionEditedPayload {
  position: Position;
}
export interface PositionsPortfolioRenamedPayload {
  oldName: string;
  newName: string;
}
export interface PriceAlertRuleCreatedPayload {
  rule: PriceAlertRule;
}
export interface PriceAlertRuleUpdatedPayload {
  rule: PriceAlertRule;
}
export interface PriceAlertRuleDeletedPayload {
  id: string;
}
export interface PriceAlertRuleToggledPayload {
  id: string;
}

/** Maps each event type to its payload shape. */
export interface DomainEventPayloads {
  PositionOpened: PositionOpenedPayload;
  PositionClosed: PositionClosedPayload;
  PositionEdited: PositionEditedPayload;
  PositionsPortfolioRenamed: PositionsPortfolioRenamedPayload;
  PriceAlertRuleCreated: PriceAlertRuleCreatedPayload;
  PriceAlertRuleUpdated: PriceAlertRuleUpdatedPayload;
  PriceAlertRuleDeleted: PriceAlertRuleDeletedPayload;
  PriceAlertRuleToggled: PriceAlertRuleToggledPayload;
}

/** A persisted domain event (has seq + actor). */
export interface DomainEvent<T extends DomainEventType = DomainEventType> {
  id: string;
  seq: number;
  type: T;
  payload: DomainEventPayloads[T];
  timestamp: string;
  actor: string;
  schemaVersion: number;
}

/** An event before the store stamps seq + actor (output of createEvent). */
export type UnsequencedEvent<T extends DomainEventType = DomainEventType> = Omit<
  DomainEvent<T>,
  'seq' | 'actor'
>;

/**
 * Build an unsequenced event. `seq` and `actor` are stamped by the commit thunk.
 * `timestamp` is injected (not read from the clock here) so callers stay testable.
 */
export function createEvent<T extends DomainEventType>(
  type: T,
  payload: DomainEventPayloads[T],
  timestamp: string
): UnsequencedEvent<T> {
  return {
    id: uuid(),
    type,
    payload,
    timestamp,
    schemaVersion: EVENT_SCHEMA_VERSION,
  };
}

// Re-export domain aliases used by payloads for convenience.
export type { Position, PriceAlertRule, Trade, PortfolioName };
