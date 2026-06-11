import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor } from '../events/eventsSlice';
import positionsReducer from '../slices/positionsSlice';
import {
  createPortfolio,
  editPortfolio,
  renamePortfolio,
  deletePortfolio,
  reorderPortfolios,
} from './portfolioCommands';
import { deposit, withdraw, chargeFee, recordDividend, adjustValue } from './cashCommands';
import { startWheelCampaign, editWheel, closeWheel, deleteWheel } from './wheelCommands';
import type { Portfolio, WheelCampaign } from '../../types';
import type { AppDispatch } from '../index';

// commit reads getState().positions.positions — include positionsReducer.
function makeStore() {
  return configureStore({
    reducer: { events: eventsReducer, positions: positionsReducer },
  });
}

function getLog(state: any): any[] {
  return state.events.log;
}

const TS = '2026-06-07T10:00:00.000Z';
const TS2 = '2026-06-07T11:00:00.000Z';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePortfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  return {
    id: 'p1',
    name: 'Test Portfolio',
    logo: '',
    pricePerContract: 1,
    strategy: 'Wheel',
    hasOptions: true,
    strategies: [],
    currency: 'EUR',
    initialCapital: 10000,
    currentValue: 10000,
    ...overrides,
  };
}

function makeWheel(overrides: Partial<WheelCampaign> = {}): WheelCampaign {
  return {
    id: 'w1',
    ticker: 'AAPL',
    portfolio: 'Test Portfolio',
    phase: 'csp',
    targetContracts: 1,
    startDate: '2026-01-01',
    status: 'active',
    totalPremiumCollected: 0,
    totalRealizedPnL: 0,
    cycles: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// portfolioCommands
// ---------------------------------------------------------------------------

describe('portfolioCommands', () => {
  it('createPortfolio emits PortfolioCreated with the portfolio payload', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('alice'));

    const portfolio = makePortfolio();
    dispatch(createPortfolio(portfolio, TS));

    const log = getLog(store.getState());
    expect(log).toHaveLength(1);
    expect(log[0].type).toBe('PortfolioCreated');
    expect(log[0].payload.portfolio.id).toBe('p1');
    expect(log[0].actor).toBe('alice');
    expect(log[0].seq).toBe(0);
  });

  it('editPortfolio emits PortfolioEdited with the updated portfolio', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createPortfolio(makePortfolio(), TS));
    const edited = makePortfolio({ name: 'Renamed Portfolio' });
    dispatch(editPortfolio(edited, TS2));

    const log = getLog(store.getState());
    expect(log[1].type).toBe('PortfolioEdited');
    expect(log[1].payload.portfolio.name).toBe('Renamed Portfolio');
  });

  it('renamePortfolio emits PortfolioRenamed with oldName and newName', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(renamePortfolio('Old Name', 'New Name', TS));

    const log = getLog(store.getState());
    expect(log[0].type).toBe('PortfolioRenamed');
    expect(log[0].payload.oldName).toBe('Old Name');
    expect(log[0].payload.newName).toBe('New Name');
  });

  it('deletePortfolio emits PortfolioDeleted with the portfolio id', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(deletePortfolio('p1', TS));

    const log = getLog(store.getState());
    expect(log[0].type).toBe('PortfolioDeleted');
    expect(log[0].payload.id).toBe('p1');
  });

  it('reorderPortfolios emits PortfoliosReordered with the order array', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(reorderPortfolios(['p3', 'p1', 'p2'], TS));

    const log = getLog(store.getState());
    expect(log[0].type).toBe('PortfoliosReordered');
    expect(log[0].payload.order).toEqual(['p3', 'p1', 'p2']);
  });

  it('full lifecycle emits events in correct sequence', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(createPortfolio(makePortfolio(), TS));
    dispatch(editPortfolio(makePortfolio({ name: 'Edited' }), TS2));
    dispatch(renamePortfolio('Test Portfolio', 'Final Name', TS2));
    dispatch(reorderPortfolios(['p1'], TS2));
    dispatch(deletePortfolio('p1', TS2));

    const types = getLog(store.getState()).map((e: any) => e.type);
    expect(types).toEqual([
      'PortfolioCreated',
      'PortfolioEdited',
      'PortfolioRenamed',
      'PortfoliosReordered',
      'PortfolioDeleted',
    ]);
  });
});

// ---------------------------------------------------------------------------
// cashCommands
// ---------------------------------------------------------------------------

const CASH_INPUT = {
  portfolio: 'Test Portfolio' as const,
  amount: 500,
  date: '2026-06-07',
  description: 'Test',
};

describe('cashCommands', () => {
  it('deposit emits CashDeposited with a generated id and correct payload', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(deposit(CASH_INPUT, TS));

    const log = getLog(store.getState());
    expect(log[0].type).toBe('CashDeposited');
    expect(log[0].payload.id).toBeTruthy();
    expect(log[0].payload.portfolio).toBe('Test Portfolio');
    expect(log[0].payload.amount).toBe(500);
    expect(log[0].payload.date).toBe('2026-06-07');
    expect(log[0].payload.description).toBe('Test');
  });

  it('withdraw emits CashWithdrawn with a generated id', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(withdraw(CASH_INPUT, TS));

    const log = getLog(store.getState());
    expect(log[0].type).toBe('CashWithdrawn');
    expect(log[0].payload.id).toBeTruthy();
  });

  it('chargeFee emits FeeCharged with a generated id', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(chargeFee({ portfolio: 'Test Portfolio', amount: 1.5, date: '2026-06-07' }, TS));

    const log = getLog(store.getState());
    expect(log[0].type).toBe('FeeCharged');
    expect(log[0].payload.id).toBeTruthy();
    expect(log[0].payload.amount).toBe(1.5);
    // description is optional — should be undefined when not provided
    expect(log[0].payload.description).toBeUndefined();
  });

  it('recordDividend emits DividendReceived with a generated id', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(recordDividend(CASH_INPUT, TS));

    const log = getLog(store.getState());
    expect(log[0].type).toBe('DividendReceived');
    expect(log[0].payload.id).toBeTruthy();
  });

  it('adjustValue emits ValueAdjusted with a generated id', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(adjustValue(CASH_INPUT, TS));

    const log = getLog(store.getState());
    expect(log[0].type).toBe('ValueAdjusted');
    expect(log[0].payload.id).toBeTruthy();
  });

  it('each cash command generates a unique id', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(deposit(CASH_INPUT, TS));
    dispatch(withdraw(CASH_INPUT, TS2));

    const log = getLog(store.getState());
    expect(log[0].payload.id).not.toBe(log[1].payload.id);
  });

  it('amount passes through as given (sign semantics owned by ledger projection)', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(withdraw({ portfolio: 'Test Portfolio', amount: 200, date: '2026-06-07' }, TS));

    const log = getLog(store.getState());
    // Amount is NOT negated by the command — the projection handles sign conventions.
    expect(log[0].payload.amount).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// wheelCommands
// ---------------------------------------------------------------------------

describe('wheelCommands', () => {
  it('startWheelCampaign emits WheelCampaignStarted with the wheel payload', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('bob'));

    const wheel = makeWheel();
    dispatch(startWheelCampaign(wheel, TS));

    const log = getLog(store.getState());
    expect(log[0].type).toBe('WheelCampaignStarted');
    expect(log[0].payload.wheel.id).toBe('w1');
    expect(log[0].payload.wheel.ticker).toBe('AAPL');
    expect(log[0].actor).toBe('bob');
    expect(log[0].seq).toBe(0);
  });

  it('editWheel emits WheelEdited with the updated wheel', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(startWheelCampaign(makeWheel(), TS));
    const edited = makeWheel({ notes: 'Updated notes', totalPremiumCollected: 150 });
    dispatch(editWheel(edited, TS2));

    const log = getLog(store.getState());
    expect(log[1].type).toBe('WheelEdited');
    expect(log[1].payload.wheel.notes).toBe('Updated notes');
    expect(log[1].payload.wheel.totalPremiumCollected).toBe(150);
  });

  it('closeWheel emits WheelClosed with id and endDate', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(startWheelCampaign(makeWheel(), TS));
    dispatch(closeWheel('w1', '2026-06-07', TS2));

    const log = getLog(store.getState());
    expect(log[1].type).toBe('WheelClosed');
    expect(log[1].payload.id).toBe('w1');
    expect(log[1].payload.endDate).toBe('2026-06-07');
  });

  it('deleteWheel emits WheelDeleted with the wheel id', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(startWheelCampaign(makeWheel(), TS));
    dispatch(deleteWheel('w1', TS2));

    const log = getLog(store.getState());
    expect(log[1].type).toBe('WheelDeleted');
    expect(log[1].payload.id).toBe('w1');
  });

  it('full lifecycle emits events in correct sequence', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;

    dispatch(startWheelCampaign(makeWheel(), TS));
    dispatch(editWheel(makeWheel({ notes: 'edit' }), TS2));
    dispatch(closeWheel('w1', '2026-06-07', TS2));
    dispatch(deleteWheel('w1', TS2));

    const types = getLog(store.getState()).map((e: any) => e.type);
    expect(types).toEqual(['WheelCampaignStarted', 'WheelEdited', 'WheelClosed', 'WheelDeleted']);
  });
});
