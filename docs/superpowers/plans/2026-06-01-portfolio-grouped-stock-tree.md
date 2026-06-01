# Grouped Stock Tree on Portfolio Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show stocks/ETFs on the portfolio page as an expandable per-ticker tree with average cost (GAK) in the header, by reusing the existing `GroupedStockList` component inside `PortfolioView`.

**Architecture:** Render `GroupedStockList` once for all of the portfolio's open stock/ETF lots, and exclude stock/ETF positions from `PortfolioView`'s existing strategy-grouped rendering so they don't appear twice. Options/spreads are untouched. No new data model — `GroupedStockList` already provides grouping, GAK, per-lot detail, and the CC badge.

**Tech Stack:** React 19, Redux Toolkit, TypeScript, Vite.

Spec: `docs/superpowers/specs/2026-05-31-portfolio-grouped-stock-tree-design.md`

**Branch:** `feature/portfolio-grouped-stock-tree` (already created).

---

## File Structure

- Modify: `src/components/widgets/PortfolioView.tsx` — the only file. Add imports + a price-alerts selector, compute the portfolio's stock/ETF lots, exclude stock/ETF from the `groupedAllPositions` memo, and render a single `GroupedStockList` block in the positions area.

No new files. `GroupedStockList.tsx` is reused unchanged.

---

## Reference: exact prop wiring (from the working usage in `StocksETFsStrategy.tsx:311-318`)

```tsx
<GroupedStockList
  positions={allPositions}            // StockPosition[]
  alerts={allPriceAlerts}             // useAppSelector(selectAllPriceAlerts)
  strategyAlertsMap={positionStrategyAlerts}   // optional — we omit it on the portfolio page
  allPortfolios={allPortfolios}       // the portfolios array
  onEditPosition={handleEditPosition}
  onDismissStrategyAlert={handleDismissStrategyAlert}  // optional — we omit it
/>
```

`GroupedStockListProps` (from `GroupedStockList.tsx:20-27`): `positions: StockPosition[]`, `alerts: PriceAlert[]`, `strategyAlertsMap?`, `allPortfolios: Portfolio[]`, `onEditPosition: (position: StockPosition) => void`, `onDismissStrategyAlert?`. Required: `positions`, `alerts`, `allPortfolios`, `onEditPosition`.

Facts about `PortfolioView.tsx` (verified, line numbers as of 2026-06-01 — confirm by reading surrounding code):
- It already has: `const portfolios = useAppSelector((state) => state.portfolios.portfolios);` (line ~71), `const tickers = useAppSelector(selectAllTickers);` (line ~70), `setPositionToView` (state setter, line ~107), `positions` prop (already filtered to this portfolio by the caller `PortfolioDetail.tsx`).
- `groupedAllPositions` memo opens at line ~503 with a `groupBy === 'none'` early return (line ~505) and an `else` branch that builds `groups` from `filteredPositions.forEach(...)` (line ~511).
- The positions list renders via `Object.entries(groupedAllPositions).map(...)` at line ~1550, preceded by an options table column-header row (ends ~line 1547, the `Actions` header) and a `{/* Grouped Positions */}` comment (line ~1549).
- The standalone-position renderer has an `isStockOrETF` branch rendering `<StockRow>` (lines ~2226-2278). After this change stocks never reach it (they're excluded from `groupedAllPositions`), so that branch becomes dead but harmless — leave it.

---

## Task 1: Integrate GroupedStockList into PortfolioView

**Files:**
- Modify: `src/components/widgets/PortfolioView.tsx`

Do all steps, then commit once (each intermediate step alone would leave stocks either duplicated or missing; commit only after the whole task type-checks).

- [ ] **Step 1: Add imports**

At the top of `PortfolioView.tsx`, add the component import and the price-alerts selector. Find the existing import of `selectAllTickers` / the `positionsSlice` imports and the widget imports, and add:

```ts
import { GroupedStockList } from './GroupedStockList';
```

Add `selectAllPriceAlerts` to the existing import from `../../store/slices/positionsSlice` (there is already an import from that module for selectors/actions — add the name to it). If no such import line exists, add:

```ts
import { selectAllPriceAlerts } from '../../store/slices/positionsSlice';
```

Ensure `StockPosition`, `PriceAlert`, and `Portfolio` types are imported from `../../types` (StockPosition is already imported; add `PriceAlert` if missing — it is the type of the `alerts` prop).

- [ ] **Step 2: Select price alerts**

Near the other `useAppSelector` calls (around line ~70-72), add:

```ts
const priceAlerts = useAppSelector(selectAllPriceAlerts);
```

- [ ] **Step 3: Compute the portfolio's stock/ETF lots**

Add a memo near the other derived data (e.g., just after the `groupedAllPositions` memo, around line ~499 or wherever other `useMemo`s live). `positions` is already scoped to this portfolio by the caller:

```ts
// Open stock/ETF lots for this portfolio — rendered as a grouped, expandable tree
const stockLots = useMemo(
  () =>
    positions.filter(
      (p): p is StockPosition =>
        (p.type === 'stock' || p.type === 'etf') && p.status === 'open'
    ),
  [positions]
);
```

- [ ] **Step 4: Exclude stock/ETF from the strategy-grouped rendering**

In the `groupedAllPositions` memo (opens ~line 503), exclude stock/ETF positions so they are not rendered again by the strategy groups. At the very top of the memo body, before the `if (groupBy === 'none')` check, add a filtered list and use it in BOTH branches.

Change:

```ts
  const groupedAllPositions = useMemo(() => {
    if (groupBy === 'none') {
      return { 'Alle Posities': filteredPositions };
    }

    const groups: Record<string, Position[]> = {};
    const processedSpreadIds = new Set<string>();

    filteredPositions.forEach(position => {
```

to:

```ts
  const groupedAllPositions = useMemo(() => {
    // Stocks/ETFs are rendered separately by GroupedStockList — keep them out of the
    // strategy/expiry/ticker grouping so they don't appear twice.
    const nonStockPositions = filteredPositions.filter(
      p => p.type !== 'stock' && p.type !== 'etf'
    );

    if (groupBy === 'none') {
      return { 'Alle Posities': nonStockPositions };
    }

    const groups: Record<string, Position[]> = {};
    const processedSpreadIds = new Set<string>();

    nonStockPositions.forEach(position => {
```

Leave the rest of the memo body and its dependency array unchanged (it still depends on `filteredPositions`).

- [ ] **Step 5: Render the grouped stock tree block**

Render a single `GroupedStockList` for `stockLots`, placed at the top of the positions area — above the options table column-header row and the `{/* Grouped Positions */}` map (around line ~1540, just before the column-header `<div>`). Read the JSX there to find the start of the column-header row block and insert immediately before it:

```tsx
{stockLots.length > 0 && (
  <div className="mb-4">
    <GroupedStockList
      positions={stockLots}
      alerts={priceAlerts}
      allPortfolios={portfolios}
      onEditPosition={(position) => setPositionToView(position)}
    />
  </div>
)}
```

Intent: the stock/ETF tree appears as its own block at the top of the portfolio positions list; the options/spreads table (with its column header) follows below. If the exact insertion point is ambiguous, place it as the first child inside the scrollable positions container so stocks render first. Verify placement visually in Task 3.

- [ ] **Step 6: Type-check**

Run: `npx tsc -b`
Expected: no errors. (If `PriceAlert` or `selectAllPriceAlerts` is reported missing, fix the import from `../../types` / `../../store/slices/positionsSlice` respectively.)

- [ ] **Step 7: Commit**

```bash
git add src/components/widgets/PortfolioView.tsx
git commit -m "feat: grouped stock tree (with GAK) on portfolio page via GroupedStockList"
```

---

## Task 2: Build gate

- [ ] **Step 1: Unit tests still pass**

Run: `npm test`
Expected: 13/13 passing (no tests were changed; this confirms nothing regressed).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: `tsc -b` clean and Vite build succeeds.

- [ ] **Step 3: Lint — no new errors in PortfolioView.tsx**

Run: `npx eslint src/components/widgets/PortfolioView.tsx`
Compare the issue count against the base commit:
```bash
git stash --include-untracked 2>/dev/null; git checkout main -- src/components/widgets/PortfolioView.tsx 2>/dev/null
npx eslint src/components/widgets/PortfolioView.tsx | grep -cE 'error|warning'   # base count
git checkout HEAD -- src/components/widgets/PortfolioView.tsx; git stash pop 2>/dev/null
npx eslint src/components/widgets/PortfolioView.tsx | grep -cE 'error|warning'   # head count
```
Expected: head count ≤ base count. If a new unused import (e.g. an unused selector) was introduced, remove it.

- [ ] **Step 4: Commit any lint fix**

```bash
git add -A
git commit -m "chore: lint fix for portfolio grouped stock tree" || echo "nothing to commit"
```

---

## Task 3: Visual verification (Playwright MCP if available, else manual)

Per project memory: visually verify UI changes before claiming done.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (http://localhost:3000)

- [ ] **Step 2: Verify the grouped tree on the portfolio page**

1. Open a portfolio that has stock positions (create one and buy stocks if needed).
2. Buy 80 TSLA, then 20 TSLA (two separate buys).
3. Open the portfolio page (the "Portfolio" tab in `PortfolioDetail`).
4. Confirm TSLA appears as **one expandable group** (chevron) with the **average price (GAK)** in the header, expanding to the 80 + 20 lots.
5. Confirm stocks appear **only once** (not also as flat rows below) and that **options/spreads are unchanged**.
6. Confirm the group "S" sell button opens the sell modal, and clicking a lot opens the view/detail.

- [ ] **Step 3: Screenshot key states**

Capture the collapsed group (showing GAK) and the expanded group (showing 80 + 20). If Playwright MCP is unavailable, ask the user to confirm visually.

- [ ] **Step 4: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "fix: portfolio grouped stock tree visual adjustments" || echo "nothing to commit"
```

---

## Self-Review Notes (for the implementer)

- This is a UI integration with no new pure logic, so there are no new unit tests; the safety net is type-check + build + visual verification.
- The single most important visual check is **no double-render**: stocks must appear in the `GroupedStockList` tree and NOT also as flat `StockRow`s. Step 4 of Task 1 (excluding stock/ETF from `groupedAllPositions`) is what prevents the duplicate — if you see duplicates, that exclusion didn't take effect in the active `groupBy` branch.
- The `isStockOrETF` branch in the standalone renderer (~line 2226) is now dead; leaving it is fine.
- Line numbers are anchors from 2026-06-01; if shifted, locate the equivalent block by its surrounding code.
