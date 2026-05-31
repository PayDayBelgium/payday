# Per-ticker Share Grouping & Covered-Call Eligibility — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Covered-call eligibility works on the *aggregate* shares of a ticker (e.g. 80 + 20 = 100) instead of per individual buy-lot, using only *free* (uncovered) shares and excluding spread legs.

**Architecture:** A pure helper (`coveredCallEligibility.ts`) computes covered-call capacity from a ticker's lots + sold calls. A pure grouping util (`holdings.ts`) turns a portfolio's open positions into per-ticker `Holding` objects (using the helper). A memoized Redux selector (`selectHoldingsByPortfolio`) wraps the grouping util and replaces the two duplicated inline groupings. All ~8 per-lot eligibility checks switch to these shared sources.

**Tech Stack:** React 19, Redux Toolkit, TypeScript, Vite. New: Vitest for unit tests.

Spec: `docs/superpowers/specs/2026-05-31-covered-call-share-grouping-design.md`

**Branch:** `feature/covered-call-share-grouping` (already created).

---

## File Structure

- Create: `src/utils/coveredCallEligibility.ts` — pure capacity calc (one ticker).
- Create: `src/utils/coveredCallEligibility.test.ts` — unit tests.
- Create: `src/utils/holdings.ts` — `Holding` type + `groupHoldings()` (pure grouping per ticker).
- Create: `src/utils/holdings.test.ts` — unit tests.
- Create: `vitest.config.ts` — test config.
- Modify: `package.json` — add vitest devDep + test scripts.
- Modify: `src/store/slices/positionsSlice.ts` — add `selectHoldingsByPortfolio`.
- Modify (call sites): `GroupedStockList.tsx`, `PortfolioView.tsx`, `CallOptionWizard.tsx`, `StocksETFsStrategy.tsx`, `StockETFCard.tsx`, `StockRow.tsx`, `alertEvaluator.ts`, `campaignDetector.ts`.

---

## Task 1: Set up Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest@^2`
Expected: `vitest` added to devDependencies, no errors.

- [ ] **Step 2: Add test scripts to `package.json`**

In the `"scripts"` block, add the two test lines:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
})
```

- [ ] **Step 4: Create a temporary smoke test to confirm the runner works**

Create `src/utils/_smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('vitest smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 5: Run the smoke test**

Run: `npm test`
Expected: PASS, 1 test passed.

- [ ] **Step 6: Delete the smoke test and commit**

```bash
rm src/utils/_smoke.test.ts
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: add vitest test runner"
```

---

## Task 2: Pure covered-call capacity helper

**Files:**
- Create: `src/utils/coveredCallEligibility.ts`
- Test: `src/utils/coveredCallEligibility.test.ts`

Reference types (already exist in `src/types/index.ts`):
- `StockPosition` has `shares: number`, `costBasis`, `currentValue`, `optionsSupported`, `miniContractsSupported`, `ticker`, `portfolio`, `status`.
- `CallOption` has `type: 'call'`, `action: 'buy' | 'sell'`, `contracts: number`, `ticker`, `portfolio`, `status`, optional `notes`.
- `isSpreadLeg(position)` from `src/utils/spreadHelpers.ts` returns true if the position's `notes` contain a `Spread ID:` marker.

- [ ] **Step 1: Write the failing test**

Create `src/utils/coveredCallEligibility.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { computeCoveredCallCapacity } from './coveredCallEligibility'
import type { StockPosition, CallOption } from '../types'

const lot = (shares: number, over: Partial<StockPosition> = {}): StockPosition => ({
  id: `lot-${Math.round(shares)}-${over.id ?? ''}`,
  type: 'stock',
  ticker: 'TSLA',
  portfolio: 'Test',
  openDate: '2026-01-01',
  status: 'open',
  shares,
  costBasis: shares * 10,
  purchasePrice: 10,
  currentPrice: 10,
  currentValue: shares * 10,
  optionsSupported: true,
  miniContractsSupported: false,
  ...over,
})

const soldCall = (contracts: number, over: Partial<CallOption> = {}): CallOption => ({
  id: `cc-${contracts}-${over.id ?? ''}`,
  type: 'call',
  action: 'sell',
  ticker: 'TSLA',
  portfolio: 'Test',
  openDate: '2026-01-01',
  status: 'open',
  strike: 100,
  expiration: '2026-06-19',
  contracts,
  premium: 2,
  costBasis: -200 * contracts,
  currentValue: -200 * contracts,
  ...over,
})

describe('computeCoveredCallCapacity', () => {
  it('aggregates split lots: 80 + 20 = 100 → 1 free contract', () => {
    const cap = computeCoveredCallCapacity([lot(80, { id: 'a' }), lot(20, { id: 'b' })], [])
    expect(cap.totalShares).toBe(100)
    expect(cap.maxContracts).toBe(1)
    expect(cap.freeContracts).toBe(1)
    expect(cap.canWriteCoveredCall).toBe(true)
  })

  it('only 80 shares → 0 contracts, cannot write', () => {
    const cap = computeCoveredCallCapacity([lot(80)], [])
    expect(cap.maxContracts).toBe(0)
    expect(cap.canWriteCoveredCall).toBe(false)
  })

  it('250 shares with 1 active covered call → 1 free contract', () => {
    const cap = computeCoveredCallCapacity([lot(250)], [soldCall(1)])
    expect(cap.maxContracts).toBe(2)
    expect(cap.coveredContracts).toBe(1)
    expect(cap.freeContracts).toBe(1)
    expect(cap.canWriteCoveredCall).toBe(true)
  })

  it('100 shares fully covered → 0 free, cannot write', () => {
    const cap = computeCoveredCallCapacity([lot(100)], [soldCall(1)])
    expect(cap.freeContracts).toBe(0)
    expect(cap.canWriteCoveredCall).toBe(false)
  })

  it('excludes spread-leg sold calls from covered contracts', () => {
    const spreadShort = soldCall(1, { id: 'spread', notes: 'Spread ID: spread-123' })
    const cap = computeCoveredCallCapacity([lot(100)], [spreadShort])
    expect(cap.coveredContracts).toBe(0)
    expect(cap.freeContracts).toBe(1)
    expect(cap.canWriteCoveredCall).toBe(true)
  })

  it('mini contracts: 20 shares → 2 contracts', () => {
    const cap = computeCoveredCallCapacity([lot(20, { miniContractsSupported: true })], [])
    expect(cap.sharesPerContract).toBe(10)
    expect(cap.maxContracts).toBe(2)
    expect(cap.canWriteCoveredCall).toBe(true)
  })

  it('respects optionsSupported=false', () => {
    const cap = computeCoveredCallCapacity([lot(100, { optionsSupported: false })], [])
    expect(cap.canWriteCoveredCall).toBe(false)
  })

  it('empty lots → safe zero', () => {
    const cap = computeCoveredCallCapacity([], [])
    expect(cap.totalShares).toBe(0)
    expect(cap.maxContracts).toBe(0)
    expect(cap.canWriteCoveredCall).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/utils/coveredCallEligibility.test.ts`
Expected: FAIL — "Failed to resolve import" / `computeCoveredCallCapacity is not a function`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/coveredCallEligibility.ts`:

```ts
import type { StockPosition, CallOption } from '../types';
import { isSpreadLeg } from './spreadHelpers';

export interface CoveredCallCapacity {
  totalShares: number;
  sharesPerContract: number; // 10 for mini, otherwise 100
  maxContracts: number;
  coveredContracts: number;
  freeContracts: number;
  optionsSupported: boolean;
  canWriteCoveredCall: boolean;
}

/**
 * Compute covered-call capacity for ONE ticker within ONE portfolio.
 *
 * @param lots Open stock/ETF lots of the same ticker (e.g. an 80-share and a 20-share buy).
 * @param soldCalls Open sold calls of the SAME ticker+portfolio. Spread legs are
 *                  filtered out internally — a spread's short call is covered by its
 *                  long leg, not by shares.
 */
export function computeCoveredCallCapacity(
  lots: StockPosition[],
  soldCalls: CallOption[],
): CoveredCallCapacity {
  const totalShares = lots.reduce((sum, lot) => sum + lot.shares, 0);

  // Derived from the ticker; lots of the same ticker are consistent.
  const miniSupported = lots[0]?.miniContractsSupported ?? false;
  const optionsSupported = lots.length > 0 && lots.every(lot => lot.optionsSupported);
  const sharesPerContract = miniSupported ? 10 : 100;

  const maxContracts = Math.floor(totalShares / sharesPerContract);

  const coveredContracts = soldCalls
    .filter(call => !isSpreadLeg(call))
    .reduce((sum, call) => sum + (call.contracts || 0), 0);

  const freeContracts = Math.max(0, maxContracts - coveredContracts);
  const canWriteCoveredCall = optionsSupported && freeContracts >= 1;

  return {
    totalShares,
    sharesPerContract,
    maxContracts,
    coveredContracts,
    freeContracts,
    optionsSupported,
    canWriteCoveredCall,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/utils/coveredCallEligibility.test.ts`
Expected: PASS — 8 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/utils/coveredCallEligibility.ts src/utils/coveredCallEligibility.test.ts
git commit -m "feat: pure covered-call capacity helper (free shares, excl. spreads)"
```

---

## Task 3: Pure per-ticker grouping util

**Files:**
- Create: `src/utils/holdings.ts`
- Test: `src/utils/holdings.test.ts`

This produces the `Holding` objects that replace the two inline groupings. It is pure (no Redux) so it can be unit-tested and reused by the selector.

- [ ] **Step 1: Write the failing test**

Create `src/utils/holdings.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { groupHoldings } from './holdings'
import type { StockPosition, CallOption, Position } from '../types'

const lot = (shares: number, over: Partial<StockPosition> = {}): StockPosition => ({
  id: `lot-${over.id ?? shares}`,
  type: 'stock',
  ticker: 'TSLA',
  portfolio: 'Test',
  openDate: '2026-01-01',
  status: 'open',
  shares,
  costBasis: shares * 10,
  purchasePrice: 10,
  currentPrice: 12,
  currentValue: shares * 12,
  optionsSupported: true,
  miniContractsSupported: false,
  name: 'Tesla',
  ...over,
})

const soldCall = (contracts: number, over: Partial<CallOption> = {}): CallOption => ({
  id: `cc-${over.id ?? contracts}`,
  type: 'call',
  action: 'sell',
  ticker: 'TSLA',
  portfolio: 'Test',
  openDate: '2026-01-01',
  status: 'open',
  strike: 100,
  expiration: '2026-06-19',
  contracts,
  premium: 2,
  costBasis: -200 * contracts,
  currentValue: -200 * contracts,
  ...over,
})

describe('groupHoldings', () => {
  it('groups two lots of the same ticker into one holding of 100 shares', () => {
    const positions: Position[] = [lot(80, { id: 'a' }), lot(20, { id: 'b' })]
    const holdings = groupHoldings(positions, 'Test')
    expect(holdings).toHaveLength(1)
    const h = holdings[0]
    expect(h.ticker).toBe('TSLA')
    expect(h.totalShares).toBe(100)
    expect(h.lots).toHaveLength(2)
    expect(h.canWriteCoveredCall).toBe(true)
    expect(h.freeContracts).toBe(1)
  })

  it('computes average cost across lots', () => {
    const positions: Position[] = [
      lot(80, { id: 'a', costBasis: 800 }),
      lot(20, { id: 'b', costBasis: 400 }),
    ]
    const h = groupHoldings(positions, 'Test')[0]
    expect(h.totalCostBasis).toBe(1200)
    expect(h.averageCost).toBe(12) // 1200 / 100
  })

  it('subtracts existing covered calls from free contracts', () => {
    const positions: Position[] = [lot(100, { id: 'a' }), soldCall(1)]
    const h = groupHoldings(positions, 'Test')[0]
    expect(h.coveredContracts).toBe(1)
    expect(h.freeContracts).toBe(0)
    expect(h.canWriteCoveredCall).toBe(false)
  })

  it('ignores closed positions and other portfolios', () => {
    const positions: Position[] = [
      lot(100, { id: 'a' }),
      lot(100, { id: 'closed', status: 'closed' }),
      lot(100, { id: 'other', portfolio: 'Other' }),
    ]
    const holdings = groupHoldings(positions, 'Test')
    expect(holdings).toHaveLength(1)
    expect(holdings[0].totalShares).toBe(100)
  })

  it('sorts lots oldest first', () => {
    const positions: Position[] = [
      lot(20, { id: 'new', openDate: '2026-03-01' }),
      lot(80, { id: 'old', openDate: '2026-01-01' }),
    ]
    const h = groupHoldings(positions, 'Test')[0]
    expect(h.lots[0].id).toBe('lot-old')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/utils/holdings.test.ts`
Expected: FAIL — cannot resolve `./holdings` / `groupHoldings is not a function`.

- [ ] **Step 3: Write the implementation**

Create `src/utils/holdings.ts`:

```ts
import type { Position, StockPosition, CallOption, PortfolioName } from '../types';
import { computeCoveredCallCapacity } from './coveredCallEligibility';

export interface Holding {
  ticker: string;
  name?: string;
  type: 'stock' | 'etf';
  lots: StockPosition[]; // individual buy transactions, oldest first
  totalShares: number;
  totalCostBasis: number;
  averageCost: number;
  totalValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  optionsSupported: boolean;
  miniContractsSupported: boolean;
  // Covered-call capacity (from computeCoveredCallCapacity):
  coveredContracts: number;
  maxContracts: number;
  freeContracts: number;
  canWriteCoveredCall: boolean;
}

/**
 * Group a portfolio's open stock/ETF positions into one Holding per ticker.
 * Covered-call capacity is computed per ticker from the aggregated lots and the
 * portfolio's open sold calls for that ticker.
 */
export function groupHoldings(positions: Position[], portfolio: PortfolioName): Holding[] {
  const openInPortfolio = positions.filter(
    p => p.portfolio === portfolio && p.status === 'open'
  );

  const stockLots = openInPortfolio.filter(
    (p): p is StockPosition => p.type === 'stock' || p.type === 'etf'
  );

  const soldCalls = openInPortfolio.filter(
    (p): p is CallOption => p.type === 'call' && (p as CallOption).action === 'sell'
  );

  const byTicker = new Map<string, StockPosition[]>();
  for (const lot of stockLots) {
    const list = byTicker.get(lot.ticker) ?? [];
    list.push(lot);
    byTicker.set(lot.ticker, list);
  }

  const holdings: Holding[] = [];
  for (const [ticker, lots] of byTicker) {
    const sorted = [...lots].sort(
      (a, b) => new Date(a.openDate).getTime() - new Date(b.openDate).getTime()
    );
    const tickerSoldCalls = soldCalls.filter(c => c.ticker === ticker);
    const capacity = computeCoveredCallCapacity(sorted, tickerSoldCalls);

    const totalCostBasis = sorted.reduce((sum, l) => sum + l.costBasis, 0);
    const totalValue = sorted.reduce((sum, l) => sum + l.currentValue, 0);
    const profitLoss = totalValue - totalCostBasis;

    holdings.push({
      ticker,
      name: sorted[0]?.name,
      type: sorted[0]?.type ?? 'stock',
      lots: sorted,
      totalShares: capacity.totalShares,
      totalCostBasis,
      averageCost: capacity.totalShares > 0 ? totalCostBasis / capacity.totalShares : 0,
      totalValue,
      profitLoss,
      profitLossPercentage: totalCostBasis > 0 ? (profitLoss / totalCostBasis) * 100 : 0,
      optionsSupported: capacity.optionsSupported,
      miniContractsSupported: sorted[0]?.miniContractsSupported ?? false,
      coveredContracts: capacity.coveredContracts,
      maxContracts: capacity.maxContracts,
      freeContracts: capacity.freeContracts,
      canWriteCoveredCall: capacity.canWriteCoveredCall,
    });
  }

  return holdings;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/utils/holdings.test.ts`
Expected: PASS — 5 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/utils/holdings.ts src/utils/holdings.test.ts
git commit -m "feat: pure per-ticker holdings grouping util"
```

---

## Task 4: Add `selectHoldingsByPortfolio` selector

**Files:**
- Modify: `src/store/slices/positionsSlice.ts` (add after `selectOpenPositionsByPortfolio`, around line 290)

- [ ] **Step 1: Add the import for `groupHoldings`**

At the top of `src/store/slices/positionsSlice.ts`, near the other imports, add:

```ts
import { groupHoldings } from '../../utils/holdings';
```

- [ ] **Step 2: Add the selector**

After the `selectOpenPositionsByPortfolio` selector (ends ~line 290), add:

```ts
// Memoized selector: per-ticker Holdings (aggregated lots + covered-call capacity)
export const selectHoldingsByPortfolio = (portfolioName: PortfolioName) =>
  createSelector(
    [selectPositions],
    (positions) => groupHoldings(positions, portfolioName)
  );
```

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/store/slices/positionsSlice.ts
git commit -m "feat: selectHoldingsByPortfolio selector"
```

---

## Task 5: Wire `GroupedStockList` to the shared capacity (CC badge)

**Files:**
- Modify: `src/components/widgets/GroupedStockList.tsx`

The component already groups by ticker (lines ~66-113) and builds `TickerGroup` objects with `totalShares` and `positions`. The minimal, low-risk change here is to fix the covered-call badge to use the aggregate via the shared helper, instead of per-lot `pos.shares`.

- [ ] **Step 1: Import the helper**

Near the top imports of `GroupedStockList.tsx`, add:

```ts
import { computeCoveredCallCapacity } from '../../utils/coveredCallEligibility';
import type { CallOption, StockPosition } from '../../types';
```

(If `StockPosition`/`CallOption` are already imported, don't duplicate.)

- [ ] **Step 2: Replace the per-lot badge check**

Find (currently lines ~229-232):

```ts
            const canWriteCoveredCalls = portfolioSupportsOptions && group.positions.some(pos => {
              const minShares = pos.miniContractsSupported ? 10 : 100;
              return pos.shares >= minShares && pos.optionsSupported;
            });
```

Replace with (aggregate across the ticker's lots, minus existing covered calls):

```ts
            const groupSoldCalls = positions.filter(
              (p): p is CallOption =>
                p.type === 'call' &&
                (p as CallOption).action === 'sell' &&
                p.status === 'open' &&
                p.portfolio === group.positions[0].portfolio &&
                p.ticker === group.ticker
            );
            const ccCapacity = computeCoveredCallCapacity(
              group.positions as StockPosition[],
              groupSoldCalls
            );
            const canWriteCoveredCalls = portfolioSupportsOptions && ccCapacity.canWriteCoveredCall;
```

Note: `positions` is the component's full positions prop already in scope (used at line 66). `group.positions` are the ticker's stock lots.

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/widgets/GroupedStockList.tsx
git commit -m "fix: GroupedStockList CC badge uses aggregate free shares"
```

---

## Task 6: Wire `PortfolioView` to the shared capacity

**Files:**
- Modify: `src/components/widgets/PortfolioView.tsx` (lines ~405-422)

- [ ] **Step 1: Import the helper**

Near the top imports of `PortfolioView.tsx`, add (skip any already imported):

```ts
import { computeCoveredCallCapacity } from '../../utils/coveredCallEligibility';
import type { CallOption, StockPosition } from '../../types';
```

- [ ] **Step 2: Replace the per-lot eligibility block**

Find (currently lines ~407-422):

```ts
          const existingCoveredCalls = positions.filter(pos =>
            pos.type === 'call' &&
            'action' in pos && pos.action === 'sell' &&
            pos.ticker === stock.ticker &&
            pos.status === 'open'
          );

          // Always allow CC if enough shares (100+ standard, 10+ for mini contracts)
          const minShares = stock.miniContractsSupported ? 10 : 100;
          const canWriteCoveredCalls = stock.shares >= minShares;

          if (!canWriteCoveredCalls) return false;

          const coveredCallContracts = existingCoveredCalls.reduce((sum, cc: any) => sum + (cc.contracts || 0), 0);
          const contractsNeeded = Math.floor(stock.shares / (stock.miniContractsSupported ? 10 : 100));
          return coveredCallContracts < contractsNeeded;
```

Replace with (aggregate all lots of this ticker, exclude spread legs, use free contracts):

```ts
          const tickerLots = positions.filter(
            (p): p is StockPosition =>
              (p.type === 'stock' || p.type === 'etf') &&
              p.status === 'open' &&
              p.portfolio === stock.portfolio &&
              p.ticker === stock.ticker
          );
          const tickerSoldCalls = positions.filter(
            (p): p is CallOption =>
              p.type === 'call' &&
              (p as CallOption).action === 'sell' &&
              p.status === 'open' &&
              p.portfolio === stock.portfolio &&
              p.ticker === stock.ticker
          );
          const ccCapacity = computeCoveredCallCapacity(tickerLots, tickerSoldCalls);
          return ccCapacity.canWriteCoveredCall;
```

Note: `stock` is the current grouped item in this `.filter`/`.forEach`; `positions` is in scope. Keep surrounding code unchanged. If `stock` is typed loosely (`as any`), the new `stock.portfolio`/`stock.ticker` access still works.

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/widgets/PortfolioView.tsx
git commit -m "fix: PortfolioView CC eligibility uses aggregate free shares"
```

---

## Task 7: Fix the covered-call wizard eligibility (the user's blocker)

**Files:**
- Modify: `src/components/modals/CallOptionWizard.tsx` (lines ~137-164)

The wizard's `eligibleUnderlyings.stocks` must contain **one entry per ticker** (with aggregated shares) instead of per-lot positions, so a ticker split as 80 + 20 still appears.

- [ ] **Step 1: Import grouping**

In `CallOptionWizard.tsx` imports, add:

```ts
import { groupHoldings, type Holding } from '../../utils/holdings';
```

- [ ] **Step 2: Replace the eligible-stocks computation**

Find (currently lines ~138-161):

```ts
  const eligibleUnderlyings = useMemo(() => {
    const portfolioPositions = allPositions.filter(p => p.portfolio === portfolio.name && p.status === 'open');

    // Stocks/ETFs with >= 100 shares
    const eligibleStocks = portfolioPositions.filter(p => {
      if (p.type !== 'stock' && p.type !== 'etf') return false;
      const stock = p as StockPosition;
      return stock.shares >= 100;
    });

    // LEAPs: long calls with expiry > 3 months (90 days)
    const today = new Date();
    const threeMonthsFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const eligibleLeaps = portfolioPositions.filter(p => {
      if (p.type !== 'call') return false;
      const call = p as CallOption;
      if (call.action !== 'buy') return false;
      const expiry = new Date(call.expiration);
      return expiry > threeMonthsFromNow;
    });

    return { stocks: eligibleStocks, leaps: eligibleLeaps };
  }, [allPositions, portfolio.name]);
```

Replace with (group stocks per ticker; keep LEAP logic unchanged):

```ts
  const eligibleUnderlyings = useMemo(() => {
    const portfolioPositions = allPositions.filter(p => p.portfolio === portfolio.name && p.status === 'open');

    // Stocks/ETFs aggregated per ticker, with >= 1 free (uncovered) contract
    const eligibleStocks: Holding[] = groupHoldings(allPositions, portfolio.name)
      .filter(h => h.canWriteCoveredCall);

    // LEAPs: long calls with expiry > 3 months (90 days)
    const today = new Date();
    const threeMonthsFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

    const eligibleLeaps = portfolioPositions.filter(p => {
      if (p.type !== 'call') return false;
      const call = p as CallOption;
      if (call.action !== 'buy') return false;
      const expiry = new Date(call.expiration);
      return expiry > threeMonthsFromNow;
    });

    return { stocks: eligibleStocks, leaps: eligibleLeaps };
  }, [allPositions, portfolio.name]);
```

- [ ] **Step 3: Fix downstream consumers of `eligibleUnderlyings.stocks`**

`eligibleUnderlyings.stocks` is now `Holding[]` (was `StockPosition[]`). Search the file for every use of `eligibleUnderlyings.stocks` and the rendering of the underlying-selection step. For each place that read a stock's `.shares`, use `.totalShares`; that read `.id`/`.ticker`/`.name`, use `.ticker`/`.name`. The `hasCoveredCallEligible` boolean (line ~164) stays correct (`.length > 0`).

Run to locate them:

Run: `npx tsc -b`
Expected: TypeScript errors pointing at each property mismatch on `eligibleUnderlyings.stocks` (e.g. "Property 'shares' does not exist on type 'Holding'"). Fix each by mapping to the `Holding` field:
- `stock.shares` → `holding.totalShares`
- `stock.id` (used only for display keys) → `holding.ticker`
- `stock.name` → `holding.name`
- `stock.ticker` → `holding.ticker`

Repeat `npx tsc -b` until clean. If `StockPosition` import becomes unused, remove it.

- [ ] **Step 4: Cap contracts to free contracts in the wizard**

When the user selects a covered-call underlying stock, the entered contract count must not exceed that holding's `freeContracts`. Locate where `selectedUnderlying` is set for a covered call (the underlying-selection step) and where the short-leg/long-leg `contracts` input is handled for `action === 'covered-call'`.

Add a derived max and clamp. Near the other `useMemo`s, add:

```ts
  const maxCoveredCallContracts = useMemo(() => {
    if (action !== 'covered-call' || !selectedTicker) return Infinity;
    const holding = eligibleUnderlyings.stocks.find(h => h.ticker === selectedTicker.symbol);
    return holding ? holding.freeContracts : Infinity;
  }, [action, selectedTicker, eligibleUnderlyings.stocks]);
```

In the contracts input handler for the covered-call leg (the `setLongLeg`/`setShortLeg` updater that sets `contracts`), clamp the value:

```ts
    const requested = parseInt(value, 10) || 1;
    const contracts = Number.isFinite(maxCoveredCallContracts)
      ? Math.min(requested, maxCoveredCallContracts)
      : requested;
```

And render a hint near that input when clamped (use existing styling conventions in the file, e.g. a small helper `<p>`):

```tsx
    {action === 'covered-call' && Number.isFinite(maxCoveredCallContracts) && (
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Max {maxCoveredCallContracts} vrij contract{maxCoveredCallContracts === 1 ? '' : 'en'} beschikbaar
      </p>
    )}
```

> Implementation note: the exact variable name of the contracts field for covered calls (`longLeg.contracts` vs `shortLeg.contracts`) depends on how covered-call uses the legs in this file — inspect the covered-call branch of the details step and apply the clamp to whichever leg holds the sold-call contracts. Add `maxCoveredCallContracts` to the `steps` useMemo dependency array (the array ending ~line 1330).

- [ ] **Step 5: Type-check and build**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/modals/CallOptionWizard.tsx
git commit -m "fix: covered-call wizard aggregates shares per ticker + caps contracts to free"
```

---

## Task 8: Fix `StocksETFsStrategy` per-lot filter

**Files:**
- Modify: `src/pages/strategies/StocksETFsStrategy.tsx` (lines ~155-158)

- [ ] **Step 1: Inspect the usage**

Read lines ~140-170 of `StocksETFsStrategy.tsx` to see what the `pos.shares >= minShares` filter (lines 157-158) feeds. It is used to decide covered-call eligibility per lot.

- [ ] **Step 2: Replace with holdings-based eligibility**

Add the import:

```ts
import { selectHoldingsByPortfolio } from '../../store/slices/positionsSlice';
```

Add the selector usage near the component's other `useAppSelector` calls (use the page's current portfolio variable — match the existing name, commonly `portfolio` or `selectedPortfolio`):

```ts
  const holdings = useAppSelector(selectHoldingsByPortfolio(portfolio || ''));
```

Then replace the per-lot eligibility check (currently):

```ts
    const minShares = pos.miniContractsSupported ? 10 : 100;
    return pos.shares >= minShares && pos.optionsSupported;
```

with a lookup against the ticker's holding:

```ts
    const holding = holdings.find(h => h.ticker === pos.ticker);
    return holding?.canWriteCoveredCall ?? false;
```

If `pos`/this filter sits inside a `useMemo`, add `holdings` to its dependency array.

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/pages/strategies/StocksETFsStrategy.tsx
git commit -m "fix: StocksETFsStrategy CC eligibility uses per-ticker holdings"
```

---

## Task 9: Pass group eligibility into single-lot cards (`StockETFCard`, `StockRow`)

**Files:**
- Modify: `src/components/widgets/StockETFCard.tsx` (lines ~44-46)
- Modify: `src/components/widgets/StockRow.tsx` (lines ~53-56)

These render a single lot and cannot know the ticker total on their own. Add an optional prop that the parent (which has the holding) passes down; fall back to the old per-lot calc only when the prop is absent (keeps any other callers working).

- [ ] **Step 1: `StockETFCard` — add optional prop**

In the props interface of `StockETFCard.tsx`, add:

```ts
  /** Covered-call eligibility for the whole ticker group; overrides per-lot calc when provided. */
  canWriteCoveredCallsOverride?: boolean;
```

Add it to the destructured props, then change (currently lines ~44-46):

```ts
  const minShares = position.miniContractsSupported ? 10 : 100;
  const canWriteCoveredCalls = position.shares >= minShares && position.optionsSupported;
```

to:

```ts
  const minShares = position.miniContractsSupported ? 10 : 100;
  const canWriteCoveredCalls =
    canWriteCoveredCallsOverride ??
    (position.shares >= minShares && position.optionsSupported);
```

- [ ] **Step 2: `StockRow` — add optional prop**

In `StockRow.tsx` props interface, add the same optional prop:

```ts
  canWriteCoveredCallsOverride?: boolean;
```

Destructure it, then change (currently lines ~53-56):

```ts
  const minShares = position.miniContractsSupported ? 10 : 100;
  const canWriteCoveredCalls = position.shares >= minShares;
  const contractsNeeded = Math.floor(position.shares / (position.miniContractsSupported ? 10 : 100));
  const hasUncoveredShares = canWriteCoveredCalls && coveredCallContracts < contractsNeeded;
```

to:

```ts
  const minShares = position.miniContractsSupported ? 10 : 100;
  const canWriteCoveredCalls =
    canWriteCoveredCallsOverride ?? (position.shares >= minShares);
  const contractsNeeded = Math.floor(position.shares / (position.miniContractsSupported ? 10 : 100));
  const hasUncoveredShares = canWriteCoveredCalls && coveredCallContracts < contractsNeeded;
```

- [ ] **Step 3: Pass the override from parents**

Find where `StockETFCard` and `StockRow` are rendered. If the parent is `PortfolioView` (it renders `StockRow` around line ~2260) or `GroupedStockList`, pass the group's aggregate value. Example for the `StockRow` render in `PortfolioView.tsx` (~line 2250-2261): the grouped item already computes covered-call info — pass:

```tsx
                        canWriteCoveredCallsOverride={ccCapacity.canWriteCoveredCall}
```

using the `ccCapacity` computed in Task 6 (lift that calc to where the row is rendered if needed, or recompute via `computeCoveredCallCapacity` for that ticker). For any parent that does not have group context, leave the prop unset (the per-lot fallback applies).

- [ ] **Step 4: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/widgets/StockETFCard.tsx src/components/widgets/StockRow.tsx src/components/widgets/PortfolioView.tsx
git commit -m "fix: single-lot cards accept group covered-call eligibility override"
```

---

## Task 10: Fix the alert engine (`alertEvaluator`)

**Files:**
- Modify: `src/utils/alertEvaluator.ts` (function `evaluateStockCoveredCallOpportunities`, lines ~303-390)

Currently it iterates per stock lot and uses `Math.floor(stock.shares / sharesPerContract)`, so 80 + 20 each evaluate to 0 contracts. Aggregate per ticker.

- [ ] **Step 1: Import the helper**

At the top of `alertEvaluator.ts` (it already imports from `./spreadHelpers`), add:

```ts
import { computeCoveredCallCapacity } from './coveredCallEligibility';
```

- [ ] **Step 2: Aggregate per ticker before emitting opportunities**

In `evaluateStockCoveredCallOpportunities`, after the existing `stockPositions` and `soldCalls` filters (lines ~311-324), replace the per-stock loop (the `stockPositions.forEach(stock => { ... })` block, ~lines 327-389) so it iterates once **per ticker** instead of per lot. Build a ticker→lots map and use the shared helper:

```ts
  // Group stock lots by ticker+portfolio
  const groups = new Map<string, { lots: StockPosition[]; calls: CallOption[] }>();
  for (const stock of stockPositions) {
    const key = `${stock.portfolio}::${stock.ticker}`;
    const entry = groups.get(key) ?? {
      lots: [],
      calls: soldCalls.filter(sc => sc.ticker === stock.ticker && sc.portfolio === stock.portfolio),
    };
    entry.lots.push(stock);
    groups.set(key, entry);
  }

  for (const { lots, calls } of groups.values()) {
    const stock = lots[0];
    const capacity = computeCoveredCallCapacity(lots, calls);

    const hasExistingCalls = capacity.coveredContracts > 0;
    if (!capacity.optionsSupported && !hasExistingCalls) continue;

    const uncoveredContracts = capacity.freeContracts;
    if (uncoveredContracts <= 0) continue;

    const coveredContracts = capacity.coveredContracts;
    const totalShares = capacity.totalShares;

    const alertId = `stock-cc-opportunity-${stock.ticker}-${stock.portfolio}`;
    if (dismissedAlerts.has(alertId)) continue;

    let message = `Verkoop ${uncoveredContracts} covered call${uncoveredContracts > 1 ? 's' : ''} op ${stock.ticker} (${totalShares} aandelen)`;
    if (coveredContracts > 0) {
      message += `\n${coveredContracts} covered call${coveredContracts > 1 ? 's' : ''} actief`;
    }

    opportunities.push({
      id: alertId,
      ticker: stock.ticker,
      portfolio: stock.portfolio,
      message,
      type: 'opportunity',
      rule: {
        id: 'stock-cc-opportunity',
        strategyType: 'options',
        portfolio: stock.portfolio,
        name: 'Stock Covered Call Opportunity',
        description: 'Opportunity om covered calls te verkopen op aandelen positie',
        category: 'opportunity',
        trigger: 'time_based',
        enabled: true,
        parameters: {},
        // ... preserve any remaining fields from the original `rule` object below
      },
      // ... preserve any remaining fields from the original opportunity object below
    });
  }
```

> Important: open the original block first and copy the **full** `rule` object and the rest of the pushed opportunity object (everything after line ~377) verbatim into the new loop — only the loop structure, the `alertId` (now ticker+portfolio based), the contract counts, and the `message`/`totalShares` source change. Do not drop any fields.

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/alertEvaluator.ts
git commit -m "fix: stock covered-call alerts aggregate shares per ticker"
```

---

## Task 11: Fix `campaignDetector` per-lot check

**Files:**
- Modify: `src/utils/campaignDetector.ts` (line ~112)

- [ ] **Step 1: Inspect**

Read lines ~95-130 of `campaignDetector.ts` to see the context of `if (stock.shares >= 100)` (line ~112) — it gates whether a stock can start a covered-call campaign.

- [ ] **Step 2: Replace with aggregate**

If the surrounding code iterates per stock position, change the gate to aggregate that ticker's shares within the portfolio. Add (near the top of the function, using the positions array already in scope — match its variable name, e.g. `positions` or `allPositions`):

```ts
import { computeCoveredCallCapacity } from './coveredCallEligibility';
```

Replace `if (stock.shares >= 100) {` with a per-ticker aggregate:

```ts
    const tickerLots = allPositions.filter(
      (p): p is StockPosition =>
        (p.type === 'stock' || p.type === 'etf') &&
        p.status === 'open' &&
        p.portfolio === stock.portfolio &&
        p.ticker === stock.ticker
    );
    const tickerSoldCalls = allPositions.filter(
      (p): p is CallOption =>
        p.type === 'call' &&
        (p as CallOption).action === 'sell' &&
        p.status === 'open' &&
        p.portfolio === stock.portfolio &&
        p.ticker === stock.ticker
    );
    if (computeCoveredCallCapacity(tickerLots, tickerSoldCalls).maxContracts >= 1) {
```

> Match the positions-array variable name actually used in this file. Ensure `StockPosition`/`CallOption` are imported from `../types`. If the original used `stock.shares >= 100` purely for the `maxContracts >= 1` meaning, this preserves it on the aggregate. Keep the closing brace and body unchanged.

- [ ] **Step 3: Type-check**

Run: `npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/utils/campaignDetector.ts
git commit -m "fix: campaignDetector covered-call gate aggregates shares per ticker"
```

---

## Task 12: Full test + build gate

- [ ] **Step 1: Run all unit tests**

Run: `npm test`
Expected: PASS — all tests in `coveredCallEligibility.test.ts` and `holdings.test.ts` pass.

- [ ] **Step 2: Type-check + production build**

Run: `npm run build`
Expected: `tsc -b` clean, Vite build succeeds.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no new errors in the files touched by this plan.

- [ ] **Step 4: Commit any lint fixes**

```bash
git add -A
git commit -m "chore: lint fixes for covered-call grouping" || echo "nothing to commit"
```

---

## Task 13: Visual verification (Playwright MCP)

Per project memory: visually verify UI changes before claiming done.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (serves on http://localhost:3000)

- [ ] **Step 2: Reproduce the original scenario**

Using the Playwright MCP browser:
1. Open the app, select (or create) a portfolio that **has options** enabled.
2. Buy 80 shares of TSLA, then buy 20 shares of TSLA (two separate buys).
3. Open the stock list and confirm TSLA shows as **one row of 100 shares**, expandable to the 80 + 20 transactions, with the "CC mogelijk" badge visible.

- [ ] **Step 3: Verify the covered call now comes through**

4. Open the Call/Covered-Call wizard. Confirm **TSLA appears** as an eligible underlying showing 100 shares / 1 free contract.
5. Write 1 covered call on TSLA. Confirm it saves.

- [ ] **Step 4: Verify the free-shares guard**

6. Open the wizard again for TSLA. Confirm it now shows **0 free contracts** and TSLA is no longer offered as eligible (or the contract input is capped at 0/blocked).
7. Screenshot each key state.

- [ ] **Step 5: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "fix: covered calls work on aggregated 100-share ticker positions" || echo "nothing to commit"
```

---

## Self-Review Notes (for the implementer)

- The two `.test.ts` files are the safety net for the money logic; never weaken them to make a change pass — fix the code.
- Several call-site line numbers are anchors from 2026-05-31; if the file shifted, find the equivalent block by its surrounding code (the `shares >= 100` / `pos.shares` patterns).
- LEAP/PMCC covered-call route is intentionally untouched.
- Spread short legs must never count as covered calls — that is what `isSpreadLeg` guarantees inside `computeCoveredCallCapacity`.
