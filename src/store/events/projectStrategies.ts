import type { TradingStrategy, StrategyRule } from '../../types';
import type {
  DomainEvent,
  TradingStrategyCreatedPayload,
  TradingStrategyUpdatedPayload,
  TradingStrategyDeletedPayload,
  PositionLinkedToStrategyPayload,
  PositionUnlinkedFromStrategyPayload,
  StrategyPositionsSetPayload,
  PortfolioStrategiesClearedPayload,
  StrategyRuleCreatedPayload,
  StrategyRuleUpdatedPayload,
  StrategyRuleDeletedPayload,
  StrategyRuleToggledPayload,
  PortfolioRenamedPayload,
} from './types';

export interface StrategiesState {
  strategies: TradingStrategy[];
  strategyRules: StrategyRule[];
}

/**
 * Pure fold of a single domain event into the strategies/strategyRules state.
 * Returns the same reference for events this projection does not own,
 * so callers can cheaply detect no-ops.
 *
 * Note: dismissedAlerts is intentionally NOT folded here — it is UI-ephemeral
 * runtime state that resets on reload (acceptable). It remains as a runtime
 * reducer in strategiesSlice.
 */
export function applyStrategiesEvent(state: StrategiesState, event: DomainEvent): StrategiesState {
  switch (event.type) {
    case 'TradingStrategyCreated': {
      const { strategy } = event.payload as TradingStrategyCreatedPayload;
      return { ...state, strategies: [...state.strategies, strategy] };
    }

    case 'TradingStrategyUpdated': {
      const { strategy } = event.payload as TradingStrategyUpdatedPayload;
      return {
        ...state,
        strategies: state.strategies.map((s) => (s.id === strategy.id ? strategy : s)),
      };
    }

    case 'TradingStrategyDeleted': {
      const { id } = event.payload as TradingStrategyDeletedPayload;
      return { ...state, strategies: state.strategies.filter((s) => s.id !== id) };
    }

    case 'PositionLinkedToStrategy': {
      const { strategyId, positionId } = event.payload as PositionLinkedToStrategyPayload;
      return {
        ...state,
        strategies: state.strategies.map((s) => {
          if (s.id !== strategyId) return s;
          if (s.positionIds.includes(positionId)) return s; // idempotent
          return {
            ...s,
            positionIds: [...s.positionIds, positionId],
            updatedAt: event.timestamp,
          };
        }),
      };
    }

    case 'PositionUnlinkedFromStrategy': {
      const { strategyId, positionId } = event.payload as PositionUnlinkedFromStrategyPayload;
      return {
        ...state,
        strategies: state.strategies.map((s) => {
          if (s.id !== strategyId) return s;
          return {
            ...s,
            positionIds: s.positionIds.filter((id) => id !== positionId),
            updatedAt: event.timestamp,
          };
        }),
      };
    }

    case 'StrategyPositionsSet': {
      const { strategyId, positionIds } = event.payload as StrategyPositionsSetPayload;
      return {
        ...state,
        strategies: state.strategies.map((s) => {
          if (s.id !== strategyId) return s;
          return { ...s, positionIds, updatedAt: event.timestamp };
        }),
      };
    }

    case 'PortfolioStrategiesCleared': {
      const { portfolio } = event.payload as PortfolioStrategiesClearedPayload;
      return {
        ...state,
        strategies: state.strategies.filter((s) => s.portfolio !== portfolio),
      };
    }

    case 'StrategyRuleCreated': {
      const { rule } = event.payload as StrategyRuleCreatedPayload;
      return { ...state, strategyRules: [...state.strategyRules, rule] };
    }

    case 'StrategyRuleUpdated': {
      const { rule } = event.payload as StrategyRuleUpdatedPayload;
      return {
        ...state,
        strategyRules: state.strategyRules.map((r) => (r.id === rule.id ? rule : r)),
      };
    }

    case 'StrategyRuleDeleted': {
      const { id } = event.payload as StrategyRuleDeletedPayload;
      return { ...state, strategyRules: state.strategyRules.filter((r) => r.id !== id) };
    }

    case 'StrategyRuleToggled': {
      const { id } = event.payload as StrategyRuleToggledPayload;
      return {
        ...state,
        strategyRules: state.strategyRules.map((r) =>
          r.id === id ? { ...r, enabled: !r.enabled } : r
        ),
      };
    }

    // Both TradingStrategy and StrategyRule carry a `portfolio: PortfolioName` field.
    case 'PortfolioRenamed': {
      const { oldName, newName } = event.payload as PortfolioRenamedPayload;
      const renamedStrategies = state.strategies.map((s) =>
        s.portfolio === oldName ? { ...s, portfolio: newName } : s
      );
      const renamedRules = state.strategyRules.map((r) =>
        r.portfolio === oldName ? { ...r, portfolio: newName } : r
      );
      const strategiesChanged = renamedStrategies.some((s, i) => s !== state.strategies[i]);
      const rulesChanged = renamedRules.some((r, i) => r !== state.strategyRules[i]);
      if (!strategiesChanged && !rulesChanged) return state;
      return {
        strategies: strategiesChanged ? renamedStrategies : state.strategies,
        strategyRules: rulesChanged ? renamedRules : state.strategyRules,
      };
    }

    default:
      return state;
  }
}
