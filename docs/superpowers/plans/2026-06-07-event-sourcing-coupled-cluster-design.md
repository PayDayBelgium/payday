# Event Sourcing — Coupled Cluster (portfolios + cash + wheels + rolls/assignments + ledger)

Final phase of the event-sourcing refactor. Bundled because these aggregates are mutually
entangled: the transaction ledger feeds the cash balance, position/roll/assignment events feed the
ledger, and wheel phase/cycles/totals are driven by assignment/roll flows. A slice cannot be
half-event-sourced, so portfolios + wheels are cut over together with the roll/assignment commands.

**Guiding principle: reproduce current position/ledger behavior via events, and FIX the cash-sum
bug (decision below).** Equivalence tests assert the new event-driven flow yields the expected
`positions`, `transactions`, and `portfolio.currentValue` computed from the documented formulas
(with the corrected cash inclusion).

## DECISION: FIX the cash-sum bug (user-approved)
`positionValueMiddleware.calculatePortfolioValue` currently sums only `deposit, withdrawal,
adjustment, position_buy, position_sell, premium_collected, premium_paid` and IGNORES `option_roll`,
`dividend`, `fee`. **Fix it: include `option_roll`, `dividend`, `fee` in the cash balance.** This
intentionally changes portfolio values for portfolios that have rolls/dividends/fees (now correct).
Cash rule (so `cash += amount` works uniformly): store signed amounts —
deposit(+), dividend(+), position_sell(+), premium_collected(+); position_buy(−), premium_paid(−),
fee(−); adjustment(±), option_roll(± net). **Exception:** withdrawal keeps the existing
`cash -= amount` with a positive magnitude (do not change withdrawal behavior). Add `option_roll`,
`dividend`, `fee` to the sum loop accordingly. Cover with a unit test on `calculatePortfolioValue`.

## Event models

### Portfolio entities
- `PortfolioCreated { portfolio: Portfolio }`
- `PortfolioRenamed { oldName, newName }` — drives the cross-slice cascade (positions via existing
  `PositionsPortfolioRenamed` OR fold here; wheels; strategies; journal).
- `PortfolioEdited { portfolio: Portfolio }` (non-rename edits: logo, currency, initialCapital…)
- `PortfolioDeleted { id }`
- `PortfoliosReordered { order: string[] }` (ids in new order) — or keep reorder as runtime UI state.

### Cash intents (the only transactions that are first-class events)
- `CashDeposited { portfolio, amount, date, description?, id }`
- `CashWithdrawn { portfolio, amount, date, description?, id }`
- `FeeCharged { portfolio, amount, date, description?, id }`
- `DividendReceived { portfolio, amount, date, description?, id }`
- `ValueAdjusted { portfolio, amount, date, description?, id }`  (the `adjustment` type)

### Wheels
- `WheelCampaignStarted { wheel: WheelCampaign }` (the initial creation; the linked initial
  position is opened by a separate `PositionOpened`/`editPosition` as today).
- `WheelEdited { wheel }`, `WheelClosed { id, endDate }`, `WheelDeleted { id }`.
- Phase/cycles/totals: **derived** (see below) — no explicit per-update events.

### Roll / assignment (single events replacing the multi-dispatch handlers)
- `OptionRolled { oldPositionId, closeDate, closePremium, realizedPnL, newPosition: Position, netCashFlow }`
- `SpreadRolled { rollDate, legs: [{oldId, closePremium, realizedPnL, newPosition}], netCashFlow }`
- `OptionAssigned` (discriminated on `kind`):
  - put→stock: `{ kind:'put', optionId, assignmentDate, assignmentPrice, optionRealizedPnL, newStock: Position, effectiveCost, wheelId? }`
  - call→sale: `{ kind:'call', optionId, assignmentDate, optionRealizedPnL, stockId, stockClose:{ fullClose:boolean, closePrice, stockRealizedPnL } | { partial:true, remainingShares, remainingCostBasis, remainingCurrentValue }, totalProceeds, premiumReceived, wheelId? }`

These payloads carry everything the old handlers computed (formulas captured below), so the
projections reproduce identical positions + ledger entries.

## Exact formulas (the contract — from the current handlers)

### Single-option roll
- short (sell): `closeValue = -closePremium*contracts*100`; `realizedPnL = closePremium*contracts*100 - costBasis`; new `costBasis = -(newPremium*newContracts*100)`, `currentValue = costBasis`.
- long (buy): `closeValue = closePremium*contracts*100`; `realizedPnL = closeValue - costBasis`; new `costBasis = newPremium*newContracts*100`, `currentValue = costBasis`.
- `openValue = sell ? newPremium*newContracts*100 : -(newPremium*newContracts*100)`.
- `netCashFlow = closeValue + openValue`. Ledger: one `option_roll` amount=netCashFlow, relatedPositionId=newPos.id. Preserve wheelId/underlyingId.

### Spread roll
- long leg close: `longCloseValue = longClosePremium*contracts*100`; `longRealizedPnL = longCloseValue - longCostBasis`.
- short leg close: `shortCloseValue = -(shortClosePremium*contracts*100)`; `shortRealizedPnL = -shortCloseValue - shortCostBasis`.
- new long `costBasis = longNewPremium*contracts*100` (currentValue same); new short `costBasis = -(shortNewPremium*contracts*100)`, plus `cashReserved = |newShortStrike-newLongStrike|*contracts*100`.
- `netCashFlow = longCloseValue + shortCloseValue - longNewCostBasis + shortNewCostBasis`. Ledger: one `option_roll`.

### Put assigned → stock
- `shares = contracts*100`; option `realizedPnL = |costBasis|` (premium kept); option closed with closePremium=0.
- `effectiveCost = strike*shares - |costBasis|`; new stock `costBasis = effectiveCost`, `purchasePrice = effectiveCost/shares`, `currentPrice = assignmentPrice`, `currentValue = shares*assignmentPrice`, preserve wheelId.
- wheel (if linked): phase → 'stock'.
- Ledger: `position_buy` amount = `-effectiveCost`, relatedPositionId=newStock.id.

### Call assigned → stock called away
- `shares = contracts*100`; option `realizedPnL = |costBasis|`; option closed closePremium=0.
- full (stock.shares <= shares): `totalProceeds = strike*shares`; `stockCostBasis = costBasis/stock.shares*shares`; `stockRealizedPnL = totalProceeds - stockCostBasis`; close stock at closePrice=strike.
- partial: `remainingShares = stock.shares - shares`; `remainingCostBasis = costBasis/stock.shares*remainingShares`; `remainingCurrentValue = remainingShares*(currentValue/stock.shares)`; editPosition stock.
- wheel (if linked): incrementCycle; phase → 'csp'; totals += realizedPnL=stockRealizedPnL.
- Ledger: `position_sell` amount = `totalProceeds + premiumReceived` (premiumReceived=|costBasis|), relatedPositionId=option.id.

### Wizard/open & close ledger amounts (already emitted by position events; now DERIVED in the projection)
- stock/etf open → `position_buy` amount = `-costBasis` (costBasis=shares*purchasePrice).
- option open: sell → `premium_collected` = `|costBasis|`; buy → `premium_paid` = `-costBasis`. (Spreads: net, per current dynamic sign.)
- position close → `position_sell`: stock `closePrice*qty`; long option `closePremium*contracts*100`; short option `-(closePremium*contracts*100)`. (Spread close: sum of leg values.)

## Transaction-ledger projection (derived)
`state.portfolios.transactions` becomes a fold of:
- Cash events → deposit/withdrawal/fee/dividend/adjustment entries.
- `PositionOpened` → position_buy / premium_* (from payload position's costBasis/action/type).
- `PositionClosed` → position_sell / premium close (from close payload). NOTE: when a close is part
  of a roll/assignment, the OptionRolled/OptionAssigned event supersedes it — the projection must
  NOT double-count. Approach: roll/assignment emit ONE composite event each; the projection derives
  the ledger entry from that composite event and the underlying PositionOpened/Closed events it
  contains are folded for the POSITIONS projection but the LEDGER entry is taken from the composite
  (so a roll = one `option_roll` entry, not a close+open pair). Implementation: roll/assignment
  commands emit the composite event ONLY (the positions projection learns open/close from fields
  inside the composite), so there is exactly one source per ledger line. (See task plan for the
  exact event-to-projection wiring; this is the trickiest part and is covered by equivalence tests.)

The positions projection must also handle OptionRolled/OptionAssigned/SpreadRolled (apply the
close+open/edit described by the payload) so positions stay correct with a single event per intent.

## Wheel phase/cycles/totals derivation
Derive on fold from wheel-linked position + roll/assignment events:
- `totalPremiumCollected` = Σ premium received on sell-options linked to wheelId (from their open events) ... matching today's incremental updates.
- `totalRealizedPnL` = Σ realizedPnL of closed wheel-linked positions + assignment stock P&L.
- `cycles` = count of call-assignment events on the wheel.
- `phase`/`status`/`endDate`: set by WheelCampaignStarted (initial) and transitioned by
  OptionAssigned (put→'stock', call→'csp'+cycle) and WheelClosed→'completed'. Keep phase as folded
  state driven by those events (deterministic).

## Cross-slice PortfolioRenamed cascade
`PortfolioRenamed` fold updates: portfolios (name + summaries/dailyData/transactions refs), wheels
(portfolio), strategies (portfolio), journal entries (portfolio). Positions already handled by the
existing `PositionsPortfolioRenamed` — unify: the portfolio rename command emits ONE
`PortfolioRenamed` event that ALL these projections (incl. positions) fold; retire the separate
`PositionsPortfolioRenamed`/`renamePortfolioPositions` from Phase 1 (or have positions fold both).

## Daily data / summaries
- `summaries` already a selector (`selectPortfolioSummaries`) — keep derived, no events.
- `dailyData` — realized-equity time-series projection (deferred/optional; current addTransaction
  side-effect that wrote dailyData is dropped, recomputed by a projection/selector). Keep minimal:
  fold a daily snapshot from cash events + portfolio value if needed; otherwise compute on read.

## Persistence cutover
Remove `portfolios` and `wheels` from the redux-persist whitelist (rebuilt from the event log).
`positionValueMiddleware` keeps recomputing `currentValue` on `events/appendEvents`/`replayEvents`
(already wired) — verify it reads the now-projected `transactions`.

## Equivalence-test strategy (the safety net)
For representative scenarios — open stock, open sold call, close, single roll (sell & buy), spread
roll, put assignment (with & without wheel), call assignment full + partial (with wheel) — build a
store and run BOTH:
1. the OLD path (reconstruct the pre-refactor dispatch sequence), and
2. the NEW path (the command emitting the composite event),
then assert identical `positions`, `transactions` (type+amount+order), and `portfolio.currentValue`.
(Where the old path's code is being removed, snapshot its expected outputs as fixtures derived from
the formulas above.) These tests gate the phase.

## Sub-phase task order (atomic cutover — persist removal happens LAST)
The portfolios/wheels slices cannot leave redux-persist until their FULL state (incl. the
position-derived ledger) is event-sourced — otherwise rehydrate + replay double-apply. So we BUILD
everything additively (app stays green on the old paths), then flip in one atomic sweep.

1. **Event types** — add ALL cluster event types + payloads to `types.ts` (portfolio CRUD, cash,
   `OptionRolled`, `SpreadRolled`, `OptionAssigned`, wheel events). Additive, green.
2. **Pure projections + tests (not wired yet):**
   - `projectPortfolios.ts` (CRUD + `PortfolioRenamed` cascade over portfolios/summaries/dailyData/transactions refs).
   - extend `projectPositions.ts` to apply `OptionRolled`/`SpreadRolled`/`OptionAssigned` (close+open/edit from payload).
   - `projectTransactions.ts` (the ledger: cash events + PositionOpened/Closed + composite roll/assignment events → PortfolioTransaction[]).
   - `projectWheels.ts` (WheelCampaignStarted + CRUD + derived phase/cycles/totals from wheel-linked position + assignment events).
3. **Commands + tests:** `portfolioCommands` (create/edit/rename/delete/reorder), `cashCommands`
   (deposit/withdraw/fee/dividend/adjust), `wheelCommands` (start/edit/close/delete), and
   `rollOption`/`rollSpread`/`recordAssignment` (emit the composite events).
4. **Cash-bug fix + tests:** update `positionValueMiddleware.calculatePortfolioValue` to include
   `option_roll`/`dividend`/`fee` per the cash rule; unit-test it.
5. **Equivalence tests:** for open/close/roll/spread-roll/put-assign/call-assign(full+partial),
   assert the composite-event flow yields the documented positions + transactions + portfolio value.
6. **ATOMIC CUTOVER (one big step):** wire `portfoliosSlice`/`wheelsSlice` `extraReducers` to fold
   their events (transactions become a projection); remove the raw intent reducers (addWheel,
   addTransaction, addPortfolio, updatePortfolio, etc.); sweep ALL call sites (wizards, PortfolioView,
   CampaignView, NewWheelModal, PortfolioManagement, PortfolioDetail, ai/tools.ts) to commands;
   unify portfolio rename onto the single `PortfolioRenamed` event (retire `renamePortfolioPositions`);
   remove `portfolios` + `wheels` from the persist whitelist. Green.
7. **Final:** full verification (typecheck/test/lint/build), holistic review (drift focus), merge.

Each step ends green (typecheck+test+lint) and is committed.
