import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import positionsReducer from '../../store/slices/positionsSlice';
import userProgressReducer, { unlockLevel } from '../../store/slices/userProgressSlice';
import { GroupedStockList } from './GroupedStockList';
import i18n from '../../i18n/config'; // initialize i18n so t() resolves

const ccTitle = () => i18n.t('widgetsB.coveredCallsPossibleTitle');
import type { StockPosition, Portfolio } from '../../types';

// A coverable lot: 100 shares, no sold calls → computeCoveredCallCapacity allows a CC.
const stock = (): StockPosition =>
  ({
    id: 's1',
    type: 'stock',
    ticker: 'AAPL',
    name: 'Apple',
    portfolio: 'Main',
    status: 'open',
    shares: 100,
    costBasis: 15000,
    purchasePrice: 150,
    currentPrice: 160,
    currentValue: 16000,
    openDate: '2026-01-01',
    optionsSupported: true,
    miniContractsSupported: false,
  }) as unknown as StockPosition;

const portfolio = (): Portfolio =>
  ({ id: 'p1', name: 'Main', hasOptions: true } as unknown as Portfolio);

function makeStore(unlockMedior: boolean) {
  const store = configureStore({
    reducer: { positions: positionsReducer, userProgress: userProgressReducer },
  });
  if (unlockMedior) store.dispatch(unlockLevel('medior'));
  return store;
}

function renderList(unlockMedior: boolean) {
  return render(
    <Provider store={makeStore(unlockMedior)}>
      <GroupedStockList
        positions={[stock()]}
        alerts={[]}
        allPortfolios={[portfolio()]}
        onEditPosition={() => {}}
      />
    </Provider>
  );
}

describe('GroupedStockList — covered-call opportunity gating', () => {
  it('hides the CC badge on green slope (beginner: covered_calls locked)', () => {
    renderList(false);
    // The covered-call opportunity badge must not appear before covered_calls is unlocked.
    expect(screen.queryByTitle(ccTitle())).toBeNull();
  });

  it('shows the CC badge once covered_calls is unlocked (medior)', () => {
    renderList(true);
    expect(screen.queryByTitle(ccTitle())).not.toBeNull();
  });
});
