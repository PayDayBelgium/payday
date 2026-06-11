import type { CallOption, Position, PutOption, WheelCampaign } from '../../types';
import type {
  DomainEvent,
  WheelCampaignStartedPayload,
  WheelEditedPayload,
  WheelClosedPayload,
  WheelDeletedPayload,
  PositionOpenedPayload,
  PositionEditedPayload,
  PositionClosedPayload,
  OptionRolledPayload,
  OptionAssignedPayload,
  OptionAssignedCallPayload,
  PortfolioRenamedPayload,
} from './types';

/**
 * Wheels projection state.
 *
 * Besides the wheels themselves, the fold keeps a small bookkeeping index of
 * open wheel-linked SOLD options (id → wheelId). It is needed because the
 * `PositionClosed` payload carries only the position id — without the index a
 * buyback of a wheel-linked option could not be attributed to its wheel. The
 * index is rebuilt from the event log on every replay, so it also corrects
 * historical wheel stats (same approach as the assignment-cash fix).
 */
export interface WheelsProjectionState {
  wheels: WheelCampaign[];
  /** Open wheel-linked sold option ids → wheelId. */
  openSoldOptions: Record<string, string>;
}

/** Fresh, empty projection state (start of a replay). */
export function emptyWheelsProjection(): WheelsProjectionState {
  return { wheels: [], openSoldOptions: {} };
}

/** A wheel-linked sold option, narrowed: wheelId is guaranteed present. */
type WheelSoldOption = (CallOption | PutOption) & { wheelId: string };

/**
 * Narrows a position to a wheel-linked SOLD option (call or put with action
 * 'sell' and a wheelId), or undefined. Wheel premium/P&L accounting tracks
 * sold options only — long options never accrue.
 */
function asWheelSoldOption(position: Position): WheelSoldOption | undefined {
  if (
    (position.type === 'call' || position.type === 'put') &&
    position.action === 'sell' &&
    position.wheelId
  ) {
    return position as WheelSoldOption;
  }
  return undefined;
}

/**
 * Add premium / realized P&L deltas to one wheel.
 * Returns the SAME array reference when no wheel matched or both deltas are 0,
 * so callers can cheaply detect no-ops.
 */
function addToWheel(
  wheels: WheelCampaign[],
  wheelId: string,
  delta: { premium?: number; realizedPnL?: number }
): WheelCampaign[] {
  const premium = delta.premium ?? 0;
  const realizedPnL = delta.realizedPnL ?? 0;
  if (premium === 0 && realizedPnL === 0) return wheels;
  const next = wheels.map((w) =>
    w.id === wheelId
      ? {
          ...w,
          totalPremiumCollected: w.totalPremiumCollected + premium,
          totalRealizedPnL: w.totalRealizedPnL + realizedPnL,
        }
      : w
  );
  return next.some((w, i) => w !== wheels[i]) ? next : wheels;
}

/** Shallow-copy the index without one key; same reference when the key is absent. */
function withoutKey(index: Record<string, string>, key: string): Record<string, string> {
  if (!(key in index)) return index;
  const next = { ...index };
  delete next[key];
  return next;
}

/**
 * Pure fold of a single domain event into the wheels projection.
 *
 * Derives phase, cycles, and premium/PnL totals from position-open, roll,
 * close (buyback) and assignment events so that the projection stays in sync
 * with the runtime behaviour reproduced by wheelsSlice + the option wizard
 * handlers. Returns the same state reference for no-ops.
 *
 * Accounting conventions:
 * - `totalPremiumCollected` accrues when a sold option is OPENED (or the new
 *   leg of a roll is opened). A buyback never books negative premium — its
 *   cost is captured in `totalRealizedPnL` via the close's realizedPnL.
 * - `totalRealizedPnL` accrues on buyback (PositionClosed), on the closed leg
 *   of a roll (OptionRolled), and on the stock leg of a call assignment.
 *
 * NOTE: For a *partial* call-assignment (`stockClose.fullClose === false`) the
 * OptionAssignedCallPayload carries a `stockRealizedPnL` field equal to the P&L
 * on the shares called away. Both PortfolioView and CampaignView book this value
 * to the wheel via `updateWheelPremium({ realizedPnL: stockRealizedPnL })` even
 * for partial closes, so the projection adds it to `totalRealizedPnL` here.
 * Only the remaining shares (not yet called away) retain their un-realised cost
 * basis; that portion is captured on any subsequent call-assignment event.
 */
export function applyWheelEvent(
  state: WheelsProjectionState,
  event: DomainEvent
): WheelsProjectionState {
  const { wheels, openSoldOptions } = state;

  switch (event.type) {
    case 'WheelCampaignStarted': {
      const { wheel } = event.payload as WheelCampaignStartedPayload;
      return { ...state, wheels: [...wheels, wheel] };
    }

    case 'WheelEdited': {
      const { wheel } = event.payload as WheelEditedPayload;
      const next = wheels.map((w) => (w.id === wheel.id ? wheel : w));
      return next.some((w, i) => w !== wheels[i]) ? { ...state, wheels: next } : state;
    }

    case 'WheelClosed': {
      const { id, endDate } = event.payload as WheelClosedPayload;
      const next = wheels.map((w) =>
        w.id === id ? { ...w, status: 'completed' as const, phase: 'completed' as const, endDate } : w
      );
      return next.some((w, i) => w !== wheels[i]) ? { ...state, wheels: next } : state;
    }

    case 'WheelDeleted': {
      const { id } = event.payload as WheelDeletedPayload;
      const next = wheels.filter((w) => w.id !== id);
      // Dangling openSoldOptions entries for the deleted wheel are harmless:
      // a later close simply finds no wheel to book to.
      return next.length !== wheels.length ? { ...state, wheels: next } : state;
    }

    case 'PositionOpened': {
      const { position } = event.payload as PositionOpenedPayload;
      // Only accrue premium for wheel-linked, sold options (call or put).
      const sold = asWheelSoldOption(position);
      if (!sold) return state;
      const premiumReceived = Math.abs(sold.costBasis);
      return {
        wheels: addToWheel(wheels, sold.wheelId, { premium: premiumReceived }),
        openSoldOptions: { ...openSoldOptions, [sold.id]: sold.wheelId },
      };
    }

    case 'PositionEdited': {
      // Premium totals are NOT restated on edit (matches runtime behaviour),
      // but the index must follow wheel-link changes so a later buyback books
      // to the right wheel (or none).
      const { position } = event.payload as PositionEditedPayload;
      const wheelId =
        position.status === 'open' ? asWheelSoldOption(position)?.wheelId : undefined;
      if (openSoldOptions[position.id] === wheelId) return state;
      const nextIndex = wheelId
        ? { ...openSoldOptions, [position.id]: wheelId }
        : withoutKey(openSoldOptions, position.id);
      return nextIndex === openSoldOptions ? state : { ...state, openSoldOptions: nextIndex };
    }

    case 'PositionClosed': {
      // Buyback of a wheel-linked sold option: book the realized P&L to the
      // wheel. totalPremiumCollected stays untouched — premium is collected
      // when the option is SOLD (PositionOpened/OptionRolled); the buyback
      // cost is already inside realizedPnL.
      const payload = event.payload as PositionClosedPayload;
      const wheelId = openSoldOptions[payload.id];
      if (!wheelId) return state;
      return {
        wheels: addToWheel(wheels, wheelId, { realizedPnL: payload.realizedPnL ?? 0 }),
        openSoldOptions: withoutKey(openSoldOptions, payload.id),
      };
    }

    case 'OptionRolled': {
      // Roll of a wheel-linked sold option: the old leg's realized P&L is
      // booked, and the new leg's premium accrues (it is a fresh sell).
      const payload = event.payload as OptionRolledPayload;
      const newSold = asWheelSoldOption(payload.newPosition);
      // rollOption preserves wheelId on the new position; fall back to the
      // index for robustness against logs where the link came from an edit.
      const wheelId = newSold?.wheelId ?? openSoldOptions[payload.oldPositionId];
      if (!wheelId) return state;
      let nextIndex = withoutKey(openSoldOptions, payload.oldPositionId);
      if (newSold) {
        nextIndex = { ...nextIndex, [newSold.id]: newSold.wheelId };
      }
      return {
        wheels: addToWheel(wheels, wheelId, {
          premium: newSold ? Math.abs(newSold.costBasis) : 0,
          realizedPnL: payload.realizedPnL,
        }),
        openSoldOptions: nextIndex,
      };
    }

    case 'OptionAssigned': {
      const payload = event.payload as OptionAssignedPayload;
      // The assigned option is closed — drop it from the buyback index so a
      // (bogus) later PositionClosed cannot double-book.
      const nextIndex = withoutKey(openSoldOptions, payload.optionId);

      if (!payload.wheelId) {
        // Not wheel-linked — nothing to fold into the wheels themselves.
        return nextIndex === openSoldOptions ? state : { ...state, openSoldOptions: nextIndex };
      }

      const wheelId = payload.wheelId;

      if (payload.kind === 'put') {
        // Put assigned → stock acquired. Transition wheel phase to 'stock'.
        const next = wheels.map((w) =>
          w.id === wheelId ? { ...w, phase: 'stock' as const } : w
        );
        const nextWheels = next.some((w, i) => w !== wheels[i]) ? next : wheels;
        return nextWheels === wheels && nextIndex === openSoldOptions
          ? state
          : { wheels: nextWheels, openSoldOptions: nextIndex };
      }

      // kind === 'call'
      const callPayload = payload as OptionAssignedCallPayload;
      // Call assigned → stock called away. Increment cycle, return to 'csp' phase.
      // Dual-path: new events carry aggregate stockRealizedPnL at top level;
      // old events carry it inside stockClose (both full and partial variants).
      const stockRealizedPnL = callPayload.lotCloses
        ? (callPayload.stockRealizedPnL ?? 0)
        : callPayload.stockClose.stockRealizedPnL;
      const next = wheels.map((w) =>
        w.id === wheelId
          ? {
              ...w,
              cycles: w.cycles + 1,
              phase: 'csp' as const,
              totalRealizedPnL: w.totalRealizedPnL + stockRealizedPnL,
            }
          : w
      );
      const nextWheels = next.some((w, i) => w !== wheels[i]) ? next : wheels;
      return nextWheels === wheels && nextIndex === openSoldOptions
        ? state
        : { wheels: nextWheels, openSoldOptions: nextIndex };
    }

    case 'PortfolioRenamed': {
      const { oldName, newName } = event.payload as PortfolioRenamedPayload;
      const renamed = wheels.map((w) =>
        w.portfolio === oldName ? { ...w, portfolio: newName } : w
      );
      return renamed.some((w, i) => w !== wheels[i]) ? { ...state, wheels: renamed } : state;
    }

    default:
      return state;
  }
}
