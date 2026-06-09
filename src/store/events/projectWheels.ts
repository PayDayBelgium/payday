import type { WheelCampaign } from '../../types';
import type {
  DomainEvent,
  WheelCampaignStartedPayload,
  WheelEditedPayload,
  WheelClosedPayload,
  WheelDeletedPayload,
  PositionOpenedPayload,
  OptionAssignedPayload,
  OptionAssignedCallPayload,
  PortfolioRenamedPayload,
} from './types';

/**
 * Pure fold of a single domain event into the wheels array.
 *
 * Derives phase, cycles, and premium/PnL totals from position-open and
 * assignment events so that the projection stays in sync with the runtime
 * behaviour reproduced by wheelsSlice + the option wizard handlers.
 *
 * NOTE: For a *partial* call-assignment (`stockClose.fullClose === false`) the
 * OptionAssignedCallPayload carries a `stockRealizedPnL` field equal to the P&L
 * on the shares called away. Both PortfolioView and CampaignView book this value
 * to the wheel via `updateWheelPremium({ realizedPnL: stockRealizedPnL })` even
 * for partial closes, so the projection adds it to `totalRealizedPnL` here.
 * Only the remaining shares (not yet called away) retain their un-realised cost
 * basis; that portion is captured on any subsequent call-assignment event.
 */
export function applyWheelEvent(wheels: WheelCampaign[], event: DomainEvent): WheelCampaign[] {
  switch (event.type) {
    case 'WheelCampaignStarted': {
      const { wheel } = event.payload as WheelCampaignStartedPayload;
      return [...wheels, wheel];
    }

    case 'WheelEdited': {
      const { wheel } = event.payload as WheelEditedPayload;
      return wheels.map((w) => (w.id === wheel.id ? wheel : w));
    }

    case 'WheelClosed': {
      const { id, endDate } = event.payload as WheelClosedPayload;
      return wheels.map((w) =>
        w.id === id ? { ...w, status: 'completed', phase: 'completed', endDate } : w
      );
    }

    case 'WheelDeleted': {
      const { id } = event.payload as WheelDeletedPayload;
      return wheels.filter((w) => w.id !== id);
    }

    case 'PositionOpened': {
      const { position } = event.payload as PositionOpenedPayload;
      // Only accrue premium for wheel-linked, sold options (call or put).
      if (
        !('wheelId' in position) ||
        !position.wheelId ||
        (position.type !== 'call' && position.type !== 'put') ||
        !('action' in position) ||
        position.action !== 'sell'
      ) {
        return wheels;
      }
      const premiumReceived = Math.abs(position.costBasis);
      const wheelId = position.wheelId;
      const updated = wheels.map((w) =>
        w.id === wheelId
          ? { ...w, totalPremiumCollected: w.totalPremiumCollected + premiumReceived }
          : w
      );
      // If no wheel matched, return same ref (avoid spurious re-renders).
      return updated.some((w, i) => w !== wheels[i]) ? updated : wheels;
    }

    case 'OptionAssigned': {
      const payload = event.payload as OptionAssignedPayload;

      if (!payload.wheelId) {
        // Not wheel-linked — nothing to fold.
        return wheels;
      }

      const wheelId = payload.wheelId;

      if (payload.kind === 'put') {
        // Put assigned → stock acquired. Transition wheel phase to 'stock'.
        const updated = wheels.map((w) =>
          w.id === wheelId ? { ...w, phase: 'stock' as const } : w
        );
        return updated.some((w, i) => w !== wheels[i]) ? updated : wheels;
      }

      if (payload.kind === 'call') {
        const callPayload = payload as OptionAssignedCallPayload;
        // Call assigned → stock called away. Increment cycle, return to 'csp' phase.
        // Dual-path: new events carry aggregate stockRealizedPnL at top level;
        // old events carry it inside stockClose (both full and partial variants).
        const stockRealizedPnL = callPayload.lotCloses
          ? (callPayload.stockRealizedPnL ?? 0)
          : callPayload.stockClose.stockRealizedPnL;
        const updated = wheels.map((w) =>
          w.id === wheelId
            ? {
                ...w,
                cycles: w.cycles + 1,
                phase: 'csp' as const,
                totalRealizedPnL: w.totalRealizedPnL + stockRealizedPnL,
              }
            : w
        );
        return updated.some((w, i) => w !== wheels[i]) ? updated : wheels;
      }

      return wheels;
    }

    case 'PortfolioRenamed': {
      const { oldName, newName } = event.payload as PortfolioRenamedPayload;
      const renamed = wheels.map((w) =>
        w.portfolio === oldName ? { ...w, portfolio: newName } : w
      );
      return renamed.some((w, i) => w !== wheels[i]) ? renamed : wheels;
    }

    default:
      return wheels;
  }
}
