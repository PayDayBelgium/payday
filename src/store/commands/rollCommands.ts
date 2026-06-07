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
    const { positionId, closePremium, closeDate, newContracts, newStrike, newExpiration, newPremium, notes } = input;
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
    const { rollDate, longLegId, shortLegId, longLeg: longInput, shortLeg: shortInput, notes } = input;
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
 * PUT assigned:
 *   shares           = contracts * 100
 *   optionRealizedPnL = Math.abs(costBasis)   (premium kept)
 *   effectiveCost    = strike * shares - Math.abs(costBasis)
 *   newStock.costBasis = effectiveCost
 *   newStock.purchasePrice = effectiveCost / shares
 *   newStock.currentPrice  = assignmentPrice
 *   newStock.currentValue  = shares * assignmentPrice
 *
 * CALL assigned (full: stock.shares <= shares):
 *   totalProceeds    = strike * shares
 *   stockCostBasis   = (stock.costBasis / stock.shares) * shares
 *   stockRealizedPnL = totalProceeds - stockCostBasis
 *   stockClose = { fullClose: true, closePrice: strike, stockRealizedPnL }
 *
 * CALL assigned (partial: stock.shares > shares):
 *   remainingShares       = stock.shares - shares
 *   remainingCostBasis    = (stock.costBasis / stock.shares) * remainingShares
 *   remainingCurrentValue = remainingShares * (stock.currentValue / stock.shares)
 *   stockRealizedPnL      = totalProceeds - (stock.costBasis / stock.shares) * shares
 *   stockClose = { fullClose: false, remainingShares, remainingCostBasis,
 *                  remainingCurrentValue, stockRealizedPnL }
 *
 * NOTE: Both current handlers book stockRealizedPnL to the wheel via
 * updateWheelPremium for BOTH full and partial closes. We carry stockRealizedPnL
 * in the partial stockClose variant so the wheel projection can match this.
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
        miniContractsSupported: false,
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
      // --- CALL assigned → stock called away ---
      // Scope to the option's own portfolio: the same ticker may be held open in
      // multiple portfolios, and we must close the covered stock in THIS one.
      const stockPos = positions.find(
        (p) =>
          (p.type === 'stock' || p.type === 'etf') &&
          p.ticker.toUpperCase() === ticker.toUpperCase() &&
          p.portfolio === portfolio &&
          p.status === 'open'
      );

      if (!stockPos || !('shares' in stockPos)) {
        throw new Error(
          `recordAssignment: no open stock position found for call assignment on ${ticker}`
        );
      }

      const stock = stockPos as StockPosition;
      const optionRealizedPnL = Math.abs(costBasis);
      const premiumReceived = Math.abs(costBasis);
      const totalProceeds = strike * shares;
      const stockCostBasisForShares = (stock.costBasis / stock.shares) * shares;
      const stockRealizedPnL = totalProceeds - stockCostBasisForShares;

      if (stock.shares <= shares) {
        // Full close
        dispatch(
          commit([
            createEvent(
              'OptionAssigned',
              {
                kind: 'call',
                optionId,
                assignmentDate,
                optionRealizedPnL,
                stockId: stock.id,
                portfolio,
                totalProceeds,
                premiumReceived,
                wheelId,
                stockClose: {
                  fullClose: true as const,
                  closePrice: strike,
                  stockRealizedPnL,
                },
              },
              ts
            ),
          ])
        );
      } else {
        // Partial close
        const remainingShares = stock.shares - shares;
        const remainingCostBasis = (stock.costBasis / stock.shares) * remainingShares;
        const remainingCurrentValue = remainingShares * (stock.currentValue / stock.shares);

        dispatch(
          commit([
            createEvent(
              'OptionAssigned',
              {
                kind: 'call',
                optionId,
                assignmentDate,
                optionRealizedPnL,
                stockId: stock.id,
                portfolio,
                totalProceeds,
                premiumReceived,
                wheelId,
                stockClose: {
                  fullClose: false as const,
                  remainingShares,
                  remainingCostBasis,
                  remainingCurrentValue,
                  stockRealizedPnL,
                },
              },
              ts
            ),
          ])
        );
      }
    }
  };
