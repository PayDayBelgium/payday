# Event-sourcing follow-ups: backup/restore + derived equity series

Two deferred items from the event-sourcing refactor, now implemented.

## 1. Backup / restore around the event log

The event log (IndexedDB, per user) is the source of truth, so the backup IS the log.

**Backup (v2 format):**
```ts
interface BackupData {
  version: string;          // '2.0.0'
  timestamp: string;
  events: DomainEvent[];    // the full per-user log (= state.events.log)
  nonEventSourced: {        // slices NOT rebuilt from events
    userProgress?: unknown;
    community?: unknown;
    mentorship?: unknown;
  };
}
```
`createBackup(state)` reads `state.events.log` + the three non-ES slices. (auth/adminAuth are session
state — intentionally excluded, as before.)

**Restore (async):** `restoreFromBackup(backup)` —
1. resolve the per-user event store: `createEventStore(localStorage['payday-current-user'] ?? undefined)`.
2. `await es.clear(); await es.appendMany(backup.events);`
3. `dispatch(replayEvents(backup.events))` (rebuilds all projections immediately).
4. restore the non-ES slices via their hydrate reducers if available (skip gracefully otherwise).
5. The Header already navigates to `/` (full reload) afterwards → boot replays from IndexedDB →
   the restore survives reload (the bug is fixed).

**Legacy v1 backups** (old `data: {...derived...}` shape, no `events`) cannot be replayed; restore
detects the missing `events` field and surfaces a clear error toast ("backup too old"). No v1→event
synthesis (the refactor was a clean start; there is no production v1 data to preserve).

`loadPortfoliosSnapshot` and the other `loadX` reducers used by the old restore can be removed.

## 2. Derived equity time-series

`dailyData` was manual snapshots (DailyRoutineForm). Per the approved decision it becomes a DERIVED
**realized** equity curve — historical mark-to-market is not reconstructable without historical
prices, which we do not store.

**`selectEquitySeries` selector** (memoized) builds `DailyPortfolioData[]` per portfolio from the
transaction ledger:
- Order each portfolio's transactions by `date`.
- `runningCash = portfolio.initialCapital`; for each transaction apply the cash rule
  (`withdrawal` → `-= amount`; everything else → `+= amount`).
- Emit a point per date: `{ date, portfolio, totalValue: runningCash, cash: runningCash,
  dailyPnL: runningCash - prevPointCash, weeklyPnL: 0 }`.
- Append a final "today" point using the live `portfolio.currentValue` so the curve ends at the
  true current (mark-to-market) value.
This is the realized account-value curve (steps on realized events, ends at live value).

**Wiring:** Dashboard and PortfolioDetail consume `selectEquitySeries` instead of
`state.portfolios.dailyData`. `selectPortfolioSummaries` derives weekly/yearly returns from the same
series. The dead `dailyData` array, `selectDailyData`, the `loadPortfoliosSnapshot` dailyData field,
and the unused `DailyRoutineForm` are removed. Chart empty-state guards already handle no data.

Note: this curve is realized-only; that is the documented, accepted limitation.
