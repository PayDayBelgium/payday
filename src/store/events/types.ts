import type { Position, PriceAlertRule, Trade, PortfolioName, TradingRule, JournalEntry, JournalGoal, TradingStrategy, StrategyRule } from '../../types';
import type { Todo } from '../slices/todosSlice';
import { uuid } from '../../utils/uuid';

/** Current event schema version. Bump + add an upcaster when payloads change. */
export const EVENT_SCHEMA_VERSION = 1;

/** All domain-event type names handled in Phase 1 + Phase 2. */
export type DomainEventType =
  | 'PositionOpened'
  | 'PositionClosed'
  | 'PositionEdited'
  | 'PositionsPortfolioRenamed'
  | 'PriceAlertRuleCreated'
  | 'PriceAlertRuleUpdated'
  | 'PriceAlertRuleDeleted'
  | 'PriceAlertRuleToggled'
  | 'TodoAdded'
  | 'TodoEdited'
  | 'TodoCompleted'
  | 'TodoReopened'
  | 'TodoDeleted'
  | 'TradingRuleCreated'
  | 'TradingRuleUpdated'
  | 'TradingRuleDeleted'
  | 'TradingRuleToggled'
  | 'JournalEntryWritten'
  | 'JournalEntryEdited'
  | 'JournalEntryDeleted'
  | 'GoalCreated'
  | 'GoalEdited'
  | 'GoalDeleted'
  | 'GoalCompleted'
  // --- Phase 2: strategies aggregate ---
  | 'TradingStrategyCreated'
  | 'TradingStrategyUpdated'
  | 'TradingStrategyDeleted'
  | 'PositionLinkedToStrategy'
  | 'PositionUnlinkedFromStrategy'
  | 'StrategyPositionsSet'
  | 'PortfolioStrategiesCleared'
  | 'StrategyRuleCreated'
  | 'StrategyRuleUpdated'
  | 'StrategyRuleDeleted'
  | 'StrategyRuleToggled';

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

// --- Phase 2 payloads: todos ---
export interface TodoAddedPayload {
  todo: Todo;
}
export interface TodoEditedPayload {
  id: string;
  text: string;
}
export interface TodoCompletedPayload {
  id: string;
  completedAt: string;
}
export interface TodoReopenedPayload {
  id: string;
}
export interface TodoDeletedPayload {
  id: string;
}

// --- Phase 2 payloads: trading rules ---
export interface TradingRuleCreatedPayload {
  rule: TradingRule;
}
export interface TradingRuleUpdatedPayload {
  rule: TradingRule;
}
export interface TradingRuleDeletedPayload {
  id: string;
}
export interface TradingRuleToggledPayload {
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
  TodoAdded: TodoAddedPayload;
  TodoEdited: TodoEditedPayload;
  TodoCompleted: TodoCompletedPayload;
  TodoReopened: TodoReopenedPayload;
  TodoDeleted: TodoDeletedPayload;
  TradingRuleCreated: TradingRuleCreatedPayload;
  TradingRuleUpdated: TradingRuleUpdatedPayload;
  TradingRuleDeleted: TradingRuleDeletedPayload;
  TradingRuleToggled: TradingRuleToggledPayload;
  JournalEntryWritten: JournalEntryWrittenPayload;
  JournalEntryEdited: JournalEntryEditedPayload;
  JournalEntryDeleted: JournalEntryDeletedPayload;
  GoalCreated: GoalCreatedPayload;
  GoalEdited: GoalEditedPayload;
  GoalDeleted: GoalDeletedPayload;
  GoalCompleted: GoalCompletedPayload;
  // --- Phase 2: strategies ---
  TradingStrategyCreated: TradingStrategyCreatedPayload;
  TradingStrategyUpdated: TradingStrategyUpdatedPayload;
  TradingStrategyDeleted: TradingStrategyDeletedPayload;
  PositionLinkedToStrategy: PositionLinkedToStrategyPayload;
  PositionUnlinkedFromStrategy: PositionUnlinkedFromStrategyPayload;
  StrategyPositionsSet: StrategyPositionsSetPayload;
  PortfolioStrategiesCleared: PortfolioStrategiesClearedPayload;
  StrategyRuleCreated: StrategyRuleCreatedPayload;
  StrategyRuleUpdated: StrategyRuleUpdatedPayload;
  StrategyRuleDeleted: StrategyRuleDeletedPayload;
  StrategyRuleToggled: StrategyRuleToggledPayload;
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

// --- Phase 2 payloads: journal ---
export interface JournalEntryWrittenPayload {
  entry: JournalEntry;
}
export interface JournalEntryEditedPayload {
  entry: JournalEntry;
}
export interface JournalEntryDeletedPayload {
  id: string;
}
export interface GoalCreatedPayload {
  goal: JournalGoal;
}
export interface GoalEditedPayload {
  goal: JournalGoal;
}
export interface GoalDeletedPayload {
  id: string;
}
export interface GoalCompletedPayload {
  id: string;
  completedAt: string;
}

// --- Phase 2 payloads: strategies ---
export interface TradingStrategyCreatedPayload {
  strategy: TradingStrategy;
}
export interface TradingStrategyUpdatedPayload {
  strategy: TradingStrategy;
}
export interface TradingStrategyDeletedPayload {
  id: string;
}
export interface PositionLinkedToStrategyPayload {
  strategyId: string;
  positionId: string;
}
export interface PositionUnlinkedFromStrategyPayload {
  strategyId: string;
  positionId: string;
}
export interface StrategyPositionsSetPayload {
  strategyId: string;
  positionIds: string[];
}
export interface PortfolioStrategiesClearedPayload {
  portfolio: string;
}
export interface StrategyRuleCreatedPayload {
  rule: StrategyRule;
}
export interface StrategyRuleUpdatedPayload {
  rule: StrategyRule;
}
export interface StrategyRuleDeletedPayload {
  id: string;
}
export interface StrategyRuleToggledPayload {
  id: string;
}

// Re-export domain aliases used by payloads for convenience.
export type { Position, PriceAlertRule, Trade, PortfolioName, Todo, TradingRule, JournalEntry, JournalGoal, TradingStrategy, StrategyRule };
