---
name: payday-coverage-rules
description: The domain rules for linking covered calls and PMCC calls to their parent position (stock shares or a LEAPS) in payday-web, and for computing coverage and write-opportunities. Use this whenever you touch covered-call / PMCC logic, campaign detection, the coverage allocator, opportunity/alert evaluation, or the option wizards — these rules are easy to get subtly wrong and produce double-counted or phantom opportunities.
---

# Coverage & linking rules (covered call / PMCC)

The single source of truth for "which short call is covered by what" is the deterministic allocator in `src/utils/coverageAllocation.ts`. Both `campaignDetector.ts` and `alertEvaluator.ts` consume it so coverage and opportunities stay consistent. If you add a new consumer (a strategy page, an export, the AI), route it through the allocator too — do not re-derive coverage with ad-hoc heuristics, because divergent heuristics are exactly what caused double-counted / phantom opportunities.

## The allocation rules

Per ticker + portfolio, `allocateCallCoverage({ stocks, leaps, shortCalls, currentPrice })` assigns **each open short call to exactly one parent**, or marks it uncovered (naked):

1. **Explicit `underlyingId` wins.** If a short call already points at a stock lot or a LEAPS, honour it.
2. **Stocks before LEAPS.** Fill stock capacity (`floor(totalShares / sharesPerContract)`, 10 for mini contracts else 100) first, then LEAPS capacity (`leaps.contracts`).
3. **A call that cannot cover any LEAPS gets priority on the stock.** "Cannot cover a LEAPS" = its strike ≤ every LEAPS strike. Giving it the stock first avoids leaving it needlessly naked.
4. **PMCC requires strike > LEAPS strike.** A short call can only cover a LEAPS if its strike is above the LEAPS strike (otherwise the diagonal locks in a loss).
5. **Tight-capacity tie-break ("logical" choice):** prefer calls with strike ≥ the parent's break-even, then the one closest to ~15% out-of-the-money (`currentPrice * 1.15`); without a price, closest to break-even; then oldest first, then id.

Break-even: for a stock group it is the weighted cost basis per share; for a LEAPS it is `breakEven ?? strike + premium`.

## Suggesting a strike

`suggestCoveredCallStrike(breakEven, currentPrice)` returns the rounded `max(breakEven, currentPrice * 1.15)` — aim ~15% OTM, but never below break-even (you don't want to cap below your cost). Use this for opportunity messages / AI suggestions, not a hard requirement.

## Persisting the link at creation

`pickParentForNewShortCall(group, newCall)` returns the `underlyingId` a new short call should get (stock representative lot id, or a LEAPS id), or `null` (naked). The option wizards call this automatically so new covered calls are explicitly linked and visible. A covered call is a short call: store it as `action: 'sell'` (the wizard normalizes the `'covered-call'` action).

## Where coverage shows up

- `campaignDetector.ts` builds CC/PMCC campaigns from the allocation (coverage `x/y`, `hasOpportunity`).
- `alertEvaluator.ts` (`evaluateStockCoveredCallOpportunities`, `evaluateLeapsOpportunities`) emits opportunities from free capacity — same allocator, so no phantom/duplicate opportunities.
- `PortfolioView.tsx` resolves each short call's real parent via the allocator and shows it in the "collateral" column of `OptionRow`.

## When changing this

`coverageAllocation.ts` has full unit tests (`coverageAllocation.test.ts`) and `campaignDetector.test.ts` locks the dedup behaviour. Run them. Add cases for any new rule. See also [[payday-domain]] for the position model and [[payday-business-audit]] for level gating.
