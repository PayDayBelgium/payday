# Event-sourced financial core — design

**Date:** 2026-06-07
**Status:** Approved (brainstorm) — pending spec review before planning
**Scope:** Refactor the financial-core data model of `payday-web` to event sourcing.

## Motivation

Three drivers (in priority order):

1. **Audit & history** — a complete, immutable record of everything that happened.
2. **Untangle derived data** — eliminate the recurring drift problems (`currentValue`,
   coverage, campaign totals, the manual transaction ledger) by deriving everything
   deterministically from events instead of mutating stored copies.
3. **Sync / multi-device readiness** — events are easier to replicate/merge than mutated
   state. We prepare for this now; we do **not** build a backend yet.

Time-travel / undo-redo is **not** a requirement (kept out to limit complexity).

## Scope

Event-sourced (financial core): `positions`, `trades`, `portfolios`, `wheels`,
`strategies`, `tickers`, `rules`, `journal`, `todos`.

Stays classic Redux (not event-sourced): `auth`, `adminAuth`, `alerts` (ephemeral),
`ibConnection`, `connectivity`, `userProgress`, `community`, `mentorship`.

## Key decisions

| Decision | Choice |
|---|---|
| Event granularity | **Domain intents** (`PositionOpened`, `OptionRolled`, …), not generic CRUD |
| State model | **B — only the event log is persisted; projections are rebuilt by replay** |
| Existing data | **Clean start** — bump persist version, ignore/wipe old persisted state |
| Orchestration | Roll/assignment logic **fully moved** out of `PortfolioView` into commands |
| Storage | **IndexedDB, dedicated append-only event store** (`idb` wrapper), one record per event |

## Architecture

### 1. The event log (single source of truth)

```ts
interface DomainEvent<T = unknown> {
  id: string;            // uuid — replaces Date.now() ids, sync-safe
  seq: number;           // monotonic per-store ordering
  type: DomainEventType; // e.g. 'PositionOpened'
  payload: T;            // event-specific, fully typed via a discriminated union
  timestamp: string;     // ISO
  actor: string;         // username — for future multi-user/sync
  schemaVersion: number; // upcasting later
}
```

Events are immutable. Corrections are **new** events (`PositionEdited`) or compensating
events — never an edit/delete of an existing event.

**Storage:** a dedicated IndexedDB object store (one record per event, keyed by `seq`),
accessed through a thin wrapper (`idb`). The event log is **not** in `redux-persist`.
`redux-persist` continues to persist only the non-financial slices listed above.

A runtime `eventsSlice` holds the working in-memory log + `nextSeq` (source for the audit
timeline and for replay). Reducers: `appendEvent` / `appendEvents` (multiple events appended
atomically for commands that emit more than one).

### 2. Event catalogue (domain intents)

| Aggregate | Events |
|---|---|
| Positions | `PositionOpened`, `PositionClosed`, `PositionEdited`, `OptionRolled`, `OptionAssigned`, `PriceAlertRule{Created,Updated,Deleted,Toggled}` |
| Cash / Portfolio | `PortfolioCreated/Renamed/Deleted/Reordered`, `CashDeposited`, `CashWithdrawn`, `FeeCharged`, `DividendReceived`, `ValueAdjusted` |
| Wheels | `WheelCampaignStarted`, `WheelClosed`, `WheelEdited`, `WheelDeleted` |
| Strategies | `TradingStrategy{Created,Renamed,Deleted}`, `Position{Linked,Unlinked}ToStrategy`, `StrategyRule{Created,Updated,Deleted,Toggled}` |
| Rules | `TradingRule{Created,Updated,Deleted,Toggled}` |
| Journal | `JournalEntry{Written,Edited,Deleted}`, `Goal{Created,Edited,Deleted,Completed}` |
| Todos | `Todo{Added,Edited,Completed,Reopened,Deleted}` |
| Tickers | `TickerAdded/Removed/Renamed`, `AddedToWatchlist`, `RemovedFromWatchlist` |

### 3. What becomes a projection (not an event) — the core of "untangle derived data"

The following are currently double-bookkept by hand (mostly in `PortfolioView`) and become
**derived projections**, removing the drift sources:

- **Transaction ledger** (`position_buy/sell`, `premium_collected`, `option_roll`) — derived
  from position/roll/assignment events plus the explicit cash events.
- **Trades** — derived from `PositionClosed`.
- **Wheel phase / cycles / premium & P&L totals** — derived from the position and
  `OptionAssigned` events linked via `wheelId`. Only "campaign started/closed/edited/deleted"
  remains an intent.
- **Portfolio `currentValue`, goal progress** — projection / memoized selector.
- **Daily / equity time-series** (was `addDailyData`) — derived from the event log, **not** an
  event. Caveat: a pure projection can only reconstruct the **realized** equity curve
  (deposits, withdrawals, premiums collected, realized P&L from closes) — all deterministic
  from events. Historical *mark-to-market* values cannot be derived because live prices are
  runtime/non-persisted. For the financial-audit goal (realized) this is exactly right; if a
  historical mark-to-market curve is ever needed, it would require either price-snapshot events
  or a separate price-history store (out of scope).
- **Live prices** (ticker `currentPrice`, option marks from the WebSocket) — stay **runtime,
  non-persisted** state. Selectors combine projected positions + live prices to compute value.
  This is what finally removes the `currentValue` drift class of bugs.

### 4. Command layer (`src/store/commands/`)

The **only** way to mutate financial state. A command:

1. Validates the intent (including level-gating via `policy`).
2. Builds one or more `DomainEvent`s.
3. Dispatches `appendEvents`.
4. Returns the created event(s) or a typed error (invalid → no event emitted).

UI calls commands, never raw slice actions. `rollOption()` and `recordAssignment()` each emit
a **single** domain event and replace the multi-dispatch sequences currently inlined in
`PortfolioView` (which becomes thin).

### 5. Projections

Each financial slice keeps its shape and selectors, but its reducer becomes a pure **fold**:
via `extraReducers` it matches `appendEvent(s)` and folds the event types it owns.

- **Runtime:** command → append event → the same event is folded live into the projections
  (no full replay per action).
- **Cold start:** `replayEvents(store)` loads the full log from IndexedDB and folds it into all
  projections before the UI renders.

Determinism is a hard invariant: `replay(events)` must equal the incrementally-folded state.

### 6. Store wiring

- `redux-persist` whitelist: remove the financial-core slices, keep the non-financial ones.
  The event log lives in IndexedDB, not in `redux-persist`.
- `createAppStore(username)` becomes async-aware: create store → rehydrate non-financial via
  `redux-persist` → load events from IndexedDB → `replayEvents` → render.
- `eventPersistenceMiddleware` writes each appended event to IndexedDB.
- A `uuid` utility replaces all `Date.now()`-based id generation for events; entity ids are
  derived from / carried by their originating event for stability across replay and sync.
- Persist version bumped → clean start wipes old persisted financial state.

### 7. Error handling & versioning

- Commands validate before emitting; invalid input returns an error and emits nothing.
- Events are append-only and immutable.
- `schemaVersion` on every event; upcasters handle future schema changes (none needed now due
  to the clean start).

## Incremental rollout (aggregate by aggregate, even under model B)

Each phase keeps the app working and green; a slice "flips" from persisted to event-sourced
once its events, command(s) and projection are in place and tested.

1. **Foundation + pilot:** event types, `eventsSlice`, IndexedDB event store + persistence
   middleware, command infrastructure, `replayEvents` bootstrap, projection mechanism, uuid
   util, persist/store-wiring changes — proven on **positions + trades** (close = trade
   projection).
2. **Portfolios + cash / transaction-ledger projection.**
3. **Wheels** (phase / cycles / totals derived from linked position events).
4. **Rolls + assignments** — move orchestration out of `PortfolioView` into commands.
5. **Strategies, rules, journal, todos, tickers.**

## Testing

- **Projection tests:** given an event sequence → expected state (the sweet spot of ES).
- **Command tests:** given input + current projected state → expected event(s) + validation /
  gating behaviour.
- **Replay-determinism test:** `replay(events)` === incrementally-folded state.
- Existing pure-util tests (`pnlCalculations`, `calculatePortfolioFreeCash`,
  `parseProposedChange`, …) remain unchanged.
- Finish each phase with `npm run typecheck && npm test && npm run lint`.

## Out of scope (explicitly)

- Backend / server-side event store — deferred; the event shape (uuid, seq, actor, timestamp,
  schemaVersion) keeps this open for later ingestion.
- Snapshots for replay performance — YAGNI for a single client-side user; the log is designed
  to be snapshot-friendly when needed.
- Time-travel / undo-redo UI.
- Migration of existing persisted data (clean start).
- Non-financial slices.

## Known issues / follow-ups (deferred to a later phase)

- **Backup/restore is not event-sourcing-aware.** `restoreFromBackup`
  (`src/store/actions/backupActions.ts`, reachable via the Header restore button)
  restores positions/trades by dispatching `loadPositions` / `trades/loadTrades`,
  which set projection state directly without writing to the IndexedDB event log.
  Because positions/trades are now rebuilt from the log on boot, a restored backup is
  **wiped on the next reload**. Deferred to Phase 2, where backup/restore must be
  redesigned around the event log (e.g. export/import the event log itself, or
  synthesize `PositionOpened` events on restore). Until then, treat financial
  backup/restore as non-functional.

## Resolved during review

- Non-financial slices (`userProgress`, `community`, `mentorship`, …) stay classic — confirmed.
  The event-sourcing focus is the financial audit data.
- Daily snapshots are a **derived time-series projection**, not an event (realized equity
  curve; see the projection section for the mark-to-market caveat).
