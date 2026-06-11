/**
 * Roll / assignment commands — coupled-cluster orchestration.
 *
 * Each command reads current state, computes a composite event payload (matching
 * the formulas from the existing PortfolioView / CampaignView handlers exactly),
 * and emits a SINGLE event. The projections (projectPositions, projectWheels,
 * projectTransactions) derive all downstream state from that event.
 *
 * These are ADDITIVE — the old handlers are not removed here.
 */

import type { AppDispatch, RootState } from '../index';
import { commit } from '../events/eventsSlice';
import { createEvent } from '../events/types';
import type { CallOption, PutOption, StockPosition } from '../../types';
import type { AssignmentLotClose } from '../events/types';
import { uuid } from '../../utils/uuid';

// ---------------------------------------------------------------------------
// Input types
// ---------------------------------------------------------------------------

export interface RollOptionInput {
  positionId: string;
  closePremium: number;
  closeDate: string;
  newContracts: number;
  newStrike: number;
  newExpiration: string;
  newPremium: number;
  notes?: string;
}

export interface RollSpreadInput {
  rollDate: string;
  longLegId: string;
  shortLegId: string;
  longLeg: {
    closePremium: number;
    newStrike: number;
    newExpiration: string;
    newPremium: number;
  };
  shortLeg: {
    closePremium: number;
    newStrike: number;
    newExpiration: string;
    newPremium: number;
  };
  notes?: string;
}

export interface RecordAssignmentInput {
  optionId: string;
  assignmentDate: string;
  assignmentPrice: number;
  notes?: string;
}

// ---------------------------------------------------------------------------
// rollOption
// ---------------------------------------------------------------------------

/**
 * Roll a single option (call or put, long or short).
 *
 * Emits `OptionRolled` with formulas matching PortfolioView.handleRollOption
 * and CampaignView.handleRollOption exactly:
 *
 * sell (short):
 *   closeValue   = -(closePremium * contracts * 100)
 *   realizedPnL  = -(closePremium * contracts * 100) - costBasis
 *   openValue    = newPremium * newContracts * 100
 *   newCostBasis = -openValue
 *   currentValue = newCostBasis
 *
 * buy (long):
 *   closeValue   = closePremium * contracts * 100
 *   realizedPnL  = closeValue - costBasis
 *   openValue    = -(newPremium * newContracts * 100)
 *   newCostBasis = Math.abs(openValue)
 *   currentValue = newCostBasis
 *
 * netCashFlow = closeValue + openValue
 */
export const rollOption =
  (input: RollOptionInput, ts: string) =>
  (dispatch: AppDispatch, getState: () => RootState): void => {
    const {
      positionId,
      closePremium,
      closeDate,
      newContracts,
      newStrike,
      newExpiration,
      newPremium,
      notes,
    } = input;
    const state = getState();
    const positions = state.positions.positions;
    const position = positions.find((p) => p.id === positionId);

    if (!position) {
      throw new Error(`rollOption: position not found: ${positionId}`);
    }

    // Guard: position must be a call or put option
    if (position.type !== 'call' && position.type !== 'put') {
      throw new Error(`rollOption: position ${positionId} is not a call or put`);
    }

    const option = position as CallOption | PutOption;
    const { contracts, costBasis, action } = option;
    const mult = 100;

    // --- Compute close values ---
    let closeValue: number;
    let realizedPnL: number;
    let openValue: number;
    let newCostBasis: number;

    if (action === 'sell') {
      // Short option: buy back to close
      closeValue = -(closePremium * contracts * mult);
      realizedPnL = closeValue - costBasis; // = -(closePremium*contracts*100) - costBasis
      // Open new short: receive premium
      openValue = newPremium * newContracts * mult;
      newCostBasis = -openValue; // negative for short
    } else {
      // Long option: sell to close
      closeValue = closePremium * contracts * mult;
      realizedPnL = closeValue - costBasis;
      // Open new long: pay premium
      openValue = -(newPremium * newContracts * mult);
      newCostBasis = Math.abs(openValue); // positive for long
    }

    const netCashFlow = closeValue + openValue;

    // Cash-secured put: the rolled position must keep reserving collateral for
    // the NEW strike, otherwise calculatePortfolioFreeCash releases the full
    // collateral after every roll. Break-even follows the wizard formula for a
    // short put (strike - premium). Covered calls are deliberately untouched.
    const isShortPut = option.type === 'put' && action === 'sell';

    // --- Build new position (copy identity fields from old, update option fields) ---
    const newPosition: CallOption | PutOption = {
      id: `pos-${uuid()}`,
      type: option.type,
      ticker: option.ticker,
      name: option.name,
      portfolio: option.portfolio,
      action: option.action,
      strike: newStrike,
      expiration: newExpiration,
      contracts: newContracts,
      premium: newPremium,
      costBasis: newCostBasis,
      currentValue: newCostBasis,
      cashReserved: isShortPut ? newStrike * newContracts * 100 : undefined,
      breakEven: isShortPut ? newStrike - newPremium : undefined,
      status: 'open',
      openDate: closeDate,
      notes: notes ?? undefined,
      strategy: option.strategy,
      // Preserve linking
      wheelId: option.wheelId,
      underlyingId: option.underlyingId,
    };

    dispatch(
      commit([
        createEvent(
          'OptionRolled',
          {
            oldPositionId: positionId,
            closeDate,
            closePremium,
            realizedPnL,
            newPosition,
            netCashFlow,
          },
          ts
        ),
      ])
    );
  };

// ---------------------------------------------------------------------------
// rollSpread
// ---------------------------------------------------------------------------

/**
 * Roll a two-leg spread (long + short option pair).
 *
 * Emits `SpreadRolled` with formulas matching PortfolioView.handleRollSpread:
 *
 *   longCloseValue   = longLeg.closePremium * longContracts * 100
 *   longRealizedPnL  = longCloseValue - longCostBasis
 *
 *   shortCloseValue  = -(shortLeg.closePremium * shortContracts * 100)
 *   shortRealizedPnL = -shortCloseValue - shortCostBasis
 *
 *   new long:   costBasis = longLeg.newPremium * longContracts * 100  (positive)
 *               currentValue = costBasis
 *   new short:  costBasis = -(shortLeg.newPremium * shortContracts * 100)  (negative)
 *               currentValue = costBasis
 *               cashReserved = |newShortStrike - newLongStrike| * shortContracts * 100
 *
 *   netCashFlow = longCloseValue + shortCloseValue - longNewCostBasis + shortNewCostBasis
 *
 * Note: netCashFlow uses |shortNewCostBasis| (shortNewCostBasis is negative, so
 * `+ shortNewCostBasis` subtracts the new short premium, which is correct for a debit
 * or adds when credit > debit — matching the handler's arithmetic exactly).
 */
export const rollSpread =
  (input: RollSpreadInput, ts: string) =>
  (dispatch: AppDispatch, getState: () => RootState): void => {
    const {
      rollDate,
      longLegId,
      shortLegId,
      longLeg: longInput,
      shortLeg: shortInput,
      notes,
    } = input;
    const state = getState();
    const positions = state.positions.positions;

    const longLegPos = positions.find((p) => p.id === longLegId);
    const shortLegPos = positions.find((p) => p.id === shortLegId);

    if (!longLegPos) throw new Error(`rollSpread: long leg not found: ${longLegId}`);
    if (!shortLegPos) throw new Error(`rollSpread: short leg not found: ${shortLegId}`);

    if (longLegPos.type !== 'call' && longLegPos.type !== 'put') {
      throw new Error(`rollSpread: long leg ${longLegId} is not a call or put`);
    }
    if (shortLegPos.type !== 'call' && shortLegPos.type !== 'put') {
      throw new Error(`rollSpread: short leg ${shortLegId} is not a call or put`);
    }

    const longLeg = longLegPos as CallOption | PutOption;
    const shortLeg = shortLegPos as CallOption | PutOption;
    const mult = 100;

    // --- Close existing legs ---
    const longCloseValue = longInput.closePremium * longLeg.contracts * mult;
    const longRealizedPnL = longCloseValue - longLeg.costBasis;

    const shortCloseValue = -(shortInput.closePremium * shortLeg.contracts * mult);
    const shortRealizedPnL = -shortCloseValue - shortLeg.costBasis;

    // --- New position cost bases ---
    const longNewCostBasis = longInput.newPremium * longLeg.contracts * mult;
    const shortNewCostBasis = -(shortInput.newPremium * shortLeg.contracts * mult);

    // Net cash flow matching PortfolioView exactly:
    // longCloseValue + shortCloseValue - (longNewPremium*longContracts*100) + (shortNewPremium*shortContracts*100)
    const netCashFlow =
      longCloseValue +
      shortCloseValue -
      longInput.newPremium * longLeg.contracts * mult +
      shortInput.newPremium * shortLeg.contracts * mult;

    // --- Build new positions ---
    const newLong: CallOption | PutOption = {
      id: `pos-${uuid()}`,
      type: longLeg.type,
      ticker: longLeg.ticker,
      name: longLeg.name,
      portfolio: longLeg.portfolio,
      action: 'buy',
      strike: longInput.newStrike,
      expiration: longInput.newExpiration,
      contracts: longLeg.contracts,
      premium: longInput.newPremium,
      costBasis: longNewCostBasis,
      currentValue: longNewCostBasis,
      status: 'open',
      openDate: rollDate,
      notes: notes ?? undefined,
    };

    const newShort: CallOption | PutOption = {
      id: `pos-${uuid()}`,
      type: shortLeg.type,
      ticker: shortLeg.ticker,
      name: shortLeg.name,
      portfolio: shortLeg.portfolio,
      action: 'sell',
      strike: shortInput.newStrike,
      expiration: shortInput.newExpiration,
      contracts: shortLeg.contracts,
      premium: shortInput.newPremium,
      costBasis: shortNewCostBasis,
      currentValue: shortNewCostBasis,
      cashReserved:
        Math.abs(shortInput.newStrike - longInput.newStrike) * shortLeg.contracts * mult,
      status: 'open',
      openDate: rollDate,
      notes: notes ?? undefined,
    };

    dispatch(
      commit([
        createEvent(
          'SpreadRolled',
          {
            rollDate,
            legs: [
              {
                oldPositionId: longLegId,
                closePremium: longInput.closePremium,
                realizedPnL: longRealizedPnL,
                newPosition: newLong,
              },
              {
                oldPositionId: shortLegId,
                closePremium: shortInput.closePremium,
                realizedPnL: shortRealizedPnL,
                newPosition: newShort,
              },
            ],
            netCashFlow,
          },
          ts
        ),
      ])
    );
  };

// ---------------------------------------------------------------------------
// recordAssignment
// ---------------------------------------------------------------------------

/**
 * Record an option assignment (put→stock or call→stock called away).
 *
 * Emits `OptionAssigned` matching the formulas from PortfolioView.handleAssignment
 * and CampaignView.handleAssignment exactly.
 *
 * PUT assigned (unchanged):
 *   shares           = contracts * 100
 *   optionRealizedPnL = Math.abs(costBasis)   (premium kept)
 *   effectiveCost    = strike * shares - Math.abs(costBasis)
 *   newStock.costBasis = effectiveCost
 *   newStock.purchasePrice = effectiveCost / shares
 *   newStock.currentPrice  = assignmentPrice
 *   newStock.currentValue  = shares * assignmentPrice
 *
 * CALL assigned — FIFO across all open lots of the same ticker+portfolio:
 *   Gather ALL open stock/ETF lots sorted FIFO (oldest openDate first, then id).
 *   Remove exactly `shares = contracts * 100` shares across lots in order.
 *   avgCost = totalCostBasis / totalShares (GAK / weighted average over all open lots).
 *   aggregate stockRealizedPnL = strike * shares − avgCost * shares  (GAK P&L)
 *   totalProceeds = strike * shares
 *   optionRealizedPnL = premiumReceived = |costBasis|
 *
 *   Per lot a `AssignmentLotClose` entry is added to `lotCloses`.
 *   Full lot close: { stockId, fullClose: true, sharesSold, closePrice, lotCostBasisForShares }
 *   Partial lot close: adds remainingShares, remainingCostBasis, remainingCurrentValue.
 *
 *   The old fields (`stockId`, `stockClose`) are populated with representative values
 *   for type-level backward-compat; projection consumers MUST branch on `lotCloses` first.
 *
 *   Guard: throws if totalShares < shares.
 */
export const recordAssignment =
  (input: RecordAssignmentInput, ts: string) =>
  (dispatch: AppDispatch, getState: () => RootState): void => {
    const { optionId, assignmentDate, assignmentPrice, notes } = input;
    const state = getState();
    const positions = state.positions.positions;

    const optionPos = positions.find((p) => p.id === optionId);
    if (!optionPos) throw new Error(`recordAssignment: option not found: ${optionId}`);

    if (optionPos.type !== 'call' && optionPos.type !== 'put') {
      throw new Error(`recordAssignment: position ${optionId} is not a call or put`);
    }

    const option = optionPos as CallOption | PutOption;
    const { contracts, costBasis, strike, ticker, portfolio, wheelId, type: optType } = option;
    const mult = 100;
    const shares = contracts * mult;

    if (optType === 'put') {
      // --- PUT assigned → stock bought ---
      const optionRealizedPnL = Math.abs(costBasis);
      const effectiveCost = strike * shares - Math.abs(costBasis);

      const newStock: StockPosition = {
        id: `stock-${uuid()}`,
        type: 'stock',
        ticker,
        name: option.name,
        portfolio,
        status: 'open',
        shares,
        costBasis: effectiveCost,
        purchasePrice: effectiveCost / shares,
        currentPrice: assignmentPrice,
        currentValue: shares * assignmentPrice,
        optionsSupported: true,
        openDate: assignmentDate,
        notes: notes ?? undefined,
        wheelId,
      };

      dispatch(
        commit([
          createEvent(
            'OptionAssigned',
            {
              kind: 'put',
              optionId,
              assignmentDate,
              assignmentPrice,
              optionRealizedPnL,
              newStock,
              effectiveCost,
              portfolio,
              wheelId,
            },
            ts
          ),
        ])
      );
    } else {
      // --- CALL assigned → stock called away (FIFO across all lots) ---
      // Scope to the option's own portfolio: the same ticker may be held in
      // multiple portfolios, and we must close covered stock in THIS one only.

      // 1. Gather ALL open stock/ETF lots for this ticker + portfolio.
      const lots = positions.filter(
        (p): p is StockPosition =>
          (p.type === 'stock' || p.type === 'etf') &&
          p.ticker.toUpperCase() === ticker.toUpperCase() &&
          p.portfolio === portfolio &&
          p.status === 'open' &&
          'shares' in p
      );

      if (!lots.length) {
        throw new Error(
          `recordAssignment: no open stock position found for call assignment on ${ticker}`
        );
      }

      // 2. FIFO sort: oldest openDate first, then by id as tie-break.
      lots.sort((a, b) => {
        const dateA = a.openDate ?? '';
        const dateB = b.openDate ?? '';
        if (dateA !== dateB) return dateA < dateB ? -1 : 1;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
      });

      // 3. Compute aggregate totals for GAK (gewogen gemiddelde kostprijs).
      const totalShares = lots.reduce((sum, l) => sum + l.shares, 0);
      const totalCostBasis = lots.reduce((sum, l) => sum + l.costBasis, 0);

      if (totalShares < shares) {
        throw new Error(
          `recordAssignment: insufficient open shares for call assignment on ${ticker}` +
            ` (need ${shares}, have ${totalShares})`
        );
      }

      const avgCost = totalCostBasis / totalShares;

      // 4. Compute proceeds and P&L.
      const optionRealizedPnL = Math.abs(costBasis);
      const premiumReceived = Math.abs(costBasis);
      const totalProceeds = strike * shares;
      // GAK P&L: use weighted average cost, not per-lot cost.
      const aggregateStockRealizedPnL = strike * shares - avgCost * shares;

      // 5. FIFO loop — remove exactly `shares` across lots.
      let remaining = shares;
      const lotCloses: AssignmentLotClose[] = [];

      for (const lot of lots) {
        if (remaining <= 0) break;

        const perShareCost = lot.costBasis / lot.shares;
        const perShareValue = lot.currentValue / lot.shares;

        if (lot.shares <= remaining) {
          // Full close of this lot.
          lotCloses.push({
            stockId: lot.id,
            fullClose: true,
            sharesSold: lot.shares,
            closePrice: strike,
            lotCostBasisForShares: perShareCost * lot.shares,
          });
          remaining -= lot.shares;
        } else {
          // Partial close — only `remaining` shares taken from this lot.
          const sold = remaining;
          const remainingShares = lot.shares - sold;
          lotCloses.push({
            stockId: lot.id,
            fullClose: false,
            sharesSold: sold,
            closePrice: strike,
            lotCostBasisForShares: perShareCost * sold,
            remainingShares,
            remainingCostBasis: perShareCost * remainingShares,
            remainingCurrentValue: perShareValue * remainingShares,
          });
          remaining = 0;
        }
      }

      // 6. Populate legacy `stockClose` from the first lot for type-compat.
      //    New-path consumers branch on `lotCloses` first so this is never read
      //    by the projections for new events, but it must be type-valid.
      const firstLc = lotCloses[0];
      const legacyStockClose = firstLc.fullClose
        ? {
            fullClose: true as const,
            closePrice: strike,
            stockRealizedPnL: aggregateStockRealizedPnL,
          }
        : {
            fullClose: false as const,
            remainingShares: firstLc.remainingShares!,
            remainingCostBasis: firstLc.remainingCostBasis!,
            remainingCurrentValue: firstLc.remainingCurrentValue!,
            stockRealizedPnL: aggregateStockRealizedPnL,
          };

      dispatch(
        commit([
          createEvent(
            'OptionAssigned',
            {
              kind: 'call',
              optionId,
              assignmentDate,
              optionRealizedPnL,
              // Legacy representative stockId (first lot).
              stockId: firstLc.stockId,
              portfolio,
              totalProceeds,
              premiumReceived,
              wheelId,
              // Legacy stockClose — kept for type-compat; new readers ignore it.
              stockClose: legacyStockClose,
              // New multi-lot fields.
              lotCloses,
              sharesSold: shares,
              stockRealizedPnL: aggregateStockRealizedPnL,
            },
            ts
          ),
        ])
      );
    }
  };
