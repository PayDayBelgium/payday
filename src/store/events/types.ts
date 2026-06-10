import type { Position, PriceAlertRule, Trade, PortfolioName, TradingRule, JournalEntry, JournalGoal, TradingStrategy, StrategyRule, Ticker, Portfolio, WheelCampaign } from '../../types';
import type { Todo } from '../slices/todosSlice';
import { uuid } from '../../utils/uuid';

/** Current event schema version. Bump + add an upcaster when payloads change. */
export const EVENT_SCHEMA_VERSION = 1;

/**
 * All domain-event type names handled in Phase 1 + Phase 2.
 * Kept as a runtime const array (the type is derived from it) so untrusted
 * input — e.g. a restored backup file — can be checked against the known set.
 */
export const DOMAIN_EVENT_TYPES = [
  'PositionOpened',
  'PositionClosed',
  'PositionEdited',
  'PositionsPortfolioRenamed',
  'PriceAlertRuleCreated',
  'PriceAlertRuleUpdated',
  'PriceAlertRuleDeleted',
  'PriceAlertRuleToggled',
  'TodoAdded',
  'TodoEdited',
  'TodoCompleted',
  'TodoReopened',
  'TodoDeleted',
  'TradingRuleCreated',
  'TradingRuleUpdated',
  'TradingRuleDeleted',
  'TradingRuleToggled',
  'JournalEntryWritten',
  'JournalEntryEdited',
  'JournalEntryDeleted',
  'GoalCreated',
  'GoalEdited',
  'GoalDeleted',
  'GoalCompleted',
  // --- Phase 2: strategies aggregate ---
  'TradingStrategyCreated',
  'TradingStrategyUpdated',
  'TradingStrategyDeleted',
  'PositionLinkedToStrategy',
  'PositionUnlinkedFromStrategy',
  'StrategyPositionsSet',
  'PortfolioStrategiesCleared',
  'StrategyRuleCreated',
  'StrategyRuleUpdated',
  'StrategyRuleDeleted',
  'StrategyRuleToggled',
  // --- Phase 2: tickers aggregate ---
  'TickerAdded',
  'TickerUpdated',
  'TickerRenamed',
  'TickerRemoved',
  'AddedToWatchlist',
  'RemovedFromWatchlist',
  // --- Coupled cluster: portfolio entities ---
  'PortfolioCreated',
  'PortfolioEdited',
  'PortfolioRenamed',
  'PortfolioDeleted',
  'PortfoliosReordered',
  // --- Coupled cluster: cash intents ---
  'CashDeposited',
  'CashWithdrawn',
  'FeeCharged',
  'DividendReceived',
  'ValueAdjusted',
  // --- Coupled cluster: wheels ---
  'WheelCampaignStarted',
  'WheelEdited',
  'WheelClosed',
  'WheelDeleted',
  // --- Coupled cluster: roll / assignment composites ---
  'OptionRolled',
  'SpreadRolled',
  'OptionAssigned',
] as const;

export type DomainEventType = (typeof DOMAIN_EVENT_TYPES)[number];

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
  // --- Phase 2: tickers ---
  TickerAdded: TickerAddedPayload;
  TickerUpdated: TickerUpdatedPayload;
  TickerRenamed: TickerRenamedPayload;
  TickerRemoved: TickerRemovedPayload;
  AddedToWatchlist: AddedToWatchlistPayload;
  RemovedFromWatchlist: RemovedFromWatchlistPayload;
  // --- Coupled cluster: portfolio entities ---
  PortfolioCreated: PortfolioCreatedPayload;
  PortfolioEdited: PortfolioEditedPayload;
  PortfolioRenamed: PortfolioRenamedPayload;
  PortfolioDeleted: PortfolioDeletedPayload;
  PortfoliosReordered: PortfoliosReorderedPayload;
  // --- Coupled cluster: cash intents ---
  CashDeposited: CashEventPayload;
  CashWithdrawn: CashEventPayload;
  FeeCharged: CashEventPayload;
  DividendReceived: CashEventPayload;
  ValueAdjusted: CashEventPayload;
  // --- Coupled cluster: wheels ---
  WheelCampaignStarted: WheelCampaignStartedPayload;
  WheelEdited: WheelEditedPayload;
  WheelClosed: WheelClosedPayload;
  WheelDeleted: WheelDeletedPayload;
  // --- Coupled cluster: roll / assignment composites ---
  OptionRolled: OptionRolledPayload;
  SpreadRolled: SpreadRolledPayload;
  OptionAssigned: OptionAssignedPayload;
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

// --- Phase 2 payloads: tickers ---
export interface TickerAddedPayload {
  ticker: Ticker;
}
export interface TickerUpdatedPayload {
  ticker: Partial<Ticker> & { symbol: string };
}
export interface TickerRenamedPayload {
  symbol: string;
  name: string;
}
export interface TickerRemovedPayload {
  symbol: string;
}
export interface AddedToWatchlistPayload {
  ticker: Ticker;
}
export interface RemovedFromWatchlistPayload {
  symbol: string;
}

// --- Coupled cluster payloads: portfolio entities ---
export interface PortfolioCreatedPayload {
  portfolio: Portfolio;
}
export interface PortfolioEditedPayload {
  portfolio: Portfolio;
}
export interface PortfolioRenamedPayload {
  oldName: string;
  newName: string;
}
export interface PortfolioDeletedPayload {
  id: string;
}
export interface PortfoliosReorderedPayload {
  /** Portfolio ids in the new display order. */
  order: string[];
}

// --- Coupled cluster payloads: cash intents ---
/** Shared payload shape for all first-class cash-intent events. */
export interface CashEventPayload {
  id: string;
  portfolio: PortfolioName;
  amount: number;
  date: string;
  description?: string;
}

// --- Coupled cluster payloads: wheels ---
export interface WheelCampaignStartedPayload {
  wheel: WheelCampaign;
}
export interface WheelEditedPayload {
  wheel: WheelCampaign;
}
export interface WheelClosedPayload {
  id: string;
  endDate: string;
}
export interface WheelDeletedPayload {
  id: string;
}

// --- Coupled cluster payloads: roll / assignment composites ---
export interface OptionRolledPayload {
  oldPositionId: string;
  closeDate: string;
  closePremium: number;
  realizedPnL: number;
  newPosition: Position;
  netCashFlow: number;
}

export interface SpreadRolledPayload {
  rollDate: string;
  legs: Array<{
    oldPositionId: string;
    closePremium: number;
    realizedPnL: number;
    newPosition: Position;
  }>;
  netCashFlow: number;
}

/** Put-assignment: option exercised, stock is bought at the strike. */
export interface OptionAssignedPutPayload {
  kind: 'put';
  optionId: string;
  assignmentDate: string;
  assignmentPrice: number;
  optionRealizedPnL: number;
  newStock: Position;
  effectiveCost: number;
  portfolio: PortfolioName;
  wheelId?: string;
}

/**
 * Describes a single lot that is (fully or partially) closed during a
 * multi-lot FIFO call assignment.  Present only on new-path events
 * (`OptionAssignedCallPayload.lotCloses`).
 */
export interface AssignmentLotClose {
  /** The position id of the stock/ETF lot. */
  stockId: string;
  /** True when the entire lot is consumed; false when only part is called away. */
  fullClose: boolean;
  /** Remaining shares after partial assignment — only when `!fullClose`. */
  remainingShares?: number;
  /** Remaining cost basis after partial assignment — only when `!fullClose`. */
  remainingCostBasis?: number;
  /** Remaining current value after partial assignment — only when `!fullClose`. */
  remainingCurrentValue?: number;
  /** Number of shares removed from THIS lot. */
  sharesSold: number;
  /** The price per share at which shares were called away (= strike). */
  closePrice: number;
  /** Pro-rata cost basis for the shares removed: (lot.costBasis / lot.shares) * sharesSold. */
  lotCostBasisForShares: number;
}

/** Call-assignment: stock is called away; full or partial close. */
export interface OptionAssignedCallPayload {
  kind: 'call';
  optionId: string;
  assignmentDate: string;
  optionRealizedPnL: number;
  /**
   * Representative lot id.  Required for backward-compat (old events have only this field).
   * New-path consumers MUST check `lotCloses` first and fall back to `stockClose` otherwise.
   */
  stockId: string;
  portfolio: PortfolioName;
  totalProceeds: number;
  premiumReceived: number;
  wheelId?: string;
  stockClose:
    | { fullClose: true; closePrice: number; stockRealizedPnL: number }
    | {
        fullClose: false;
        remainingShares: number;
        remainingCostBasis: number;
        remainingCurrentValue: number;
        /**
         * The realized P&L on the shares called away (partial call-assignment).
         * Both PortfolioView and CampaignView book this to the wheel via
         * updateWheelPremium({ realizedPnL: stockRealizedPnL }) even on a partial
         * close, so we carry it here so the wheel projection can match that behaviour.
         */
        stockRealizedPnL: number;
      };

  // ---------------------------------------------------------------------------
  // New-path fields (additive — absent on old persisted events).
  // Consumers MUST branch: if (payload.lotCloses) { new path } else { old path }.
  // ---------------------------------------------------------------------------

  /**
   * Per-lot FIFO close instructions.  Present only on events produced by the
   * new multi-lot recordAssignment path.  When absent, fall back to `stockClose`.
   */
  lotCloses?: AssignmentLotClose[];
  /** Aggregate shares sold across all lots (= contracts * 100).  New-path only. */
  sharesSold?: number;
  /**
   * Aggregate GAK realized P&L on the called-away shares.
   * Formula: strike * sharesSold − avgCost * sharesSold
   * where avgCost = totalCostBasis / totalShares over ALL open lots.
   * New-path only.
   */
  stockRealizedPnL?: number;
}

/** Discriminated union payload for OptionAssigned events. */
export type OptionAssignedPayload = OptionAssignedPutPayload | OptionAssignedCallPayload;

// Re-export domain aliases used by payloads for convenience.
export type { Position, PriceAlertRule, Trade, PortfolioName, Todo, TradingRule, JournalEntry, JournalGoal, TradingStrategy, StrategyRule, Ticker, Portfolio, WheelCampaign };
