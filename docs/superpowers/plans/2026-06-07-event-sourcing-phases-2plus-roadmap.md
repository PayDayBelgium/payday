# Event Sourcing — Phases 2+ roadmap (revised sequencing)

Phase 1 (positions, trades, priceAlertRules) is merged. This roadmap resequences the
remaining aggregates after discovering that **portfolio entities, the transaction ledger, and
wheel totals/phase are all coupled to roll/assignment flows** (the would-be "Phase 4"). A slice
cannot be half-event-sourced (mixing redux-persist + event replay causes duplicate/lost data on
reload), so coupled aggregates must be cut over together.

## Revised order

### Phase 2 — Independent aggregates (LOW risk, do first)
Pure CRUD-intent event sourcing, no coupling to rolls/assignments. Each follows the Phase 1
template (event types in `src/store/events/types.ts` → `projectXxx.ts` fold → `commands/xxx.ts`
→ slice `extraReducers` + remove raw intent reducers → remove from persist whitelist → sweep
call sites). Order:
1. **todos** — `Todo{Added,Edited,Completed,Reopened,Deleted}`.
2. **rules** — `TradingRule{Created,Updated,Deleted,Toggled}`.
3. **journal** — `JournalEntry{Written,Edited,Deleted}`, `Goal{Created,Edited,Deleted,Completed}`. (Goal progress: keep `currentValue` derived/runtime if driven by portfolio value; otherwise a `GoalProgressUpdated` event.)
4. **strategies** — `TradingStrategy{Created,Renamed,Deleted}`, `Position{Linked,Unlinked}ToStrategy`, `StrategyRule{Created,Updated,Deleted,Toggled}`. (`dismissedAlerts` is UI-ephemeral → keep runtime/non-persisted.)
5. **tickers** — `TickerAdded/Removed/Renamed`, `AddedToWatchlist`, `RemovedFromWatchlist`. (`currentPrice` stays runtime/non-persisted, like position currentValue.)

### Phase 3 — The coupled cluster (HIGH care, do together at the end)
`portfolios` + cash events + `wheels` + roll/assignment commands + the full transaction-ledger
projection + wheel totals/phase derivation. Done as one careful unit because:
- The transaction ledger's cash balance feeds `positionValueMiddleware`; `position_buy/sell`,
  `premium_*`, `option_roll` entries must be derived from position/roll/assignment events with
  amounts matching today's call-site computations (drift risk — needs equivalence tests).
- `WheelCampaign` phase/cycles/totals are updated from the assignment/roll handlers, so they can
  only be derived once `OptionAssigned`/`OptionRolled` events exist.
- Roll/assignment orchestration moves out of `PortfolioView` into `rollOption`/`recordAssignment`
  commands emitting single `OptionRolled`/`OptionAssigned` events.
- Cross-slice `PortfolioRenamed` cascade must also cover strategies + journal (currently missing).

This phase gets its own detailed plan (with equivalence tests) before implementation.

## Per-aggregate task pattern (Phase 2)
For each aggregate X: (a) add event types + payloads to `types.ts`; (b) `projectX.ts` pure fold + test; (c) `commands/xCommands.ts` + test; (d) wire slice `extraReducers` (appendEvents/replayEvents), remove raw intent reducers, keep runtime/UI reducers; (e) remove X from persist whitelist in `index.ts`; (f) compiler-driven call-site sweep; (g) green typecheck+test+lint. Replay determinism is covered by the existing invariant test plus per-fold tests.
