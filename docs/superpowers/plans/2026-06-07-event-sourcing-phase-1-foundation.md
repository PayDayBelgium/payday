# Event Sourcing — Phase 1 (Foundation + positions/trades pilot) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the event-sourcing foundation (domain-event log in IndexedDB, command layer, replay-on-boot, projections) and convert the `positions` + `trades` + `priceAlertRules` data to it, while the rest of the app keeps working unchanged.

**Architecture:** A single append-only domain-event log is the only persisted financial state. Commands validate intent and emit immutable `DomainEvent`s via a `commit` thunk; the `eventsSlice` appends them (stamping `seq` + `actor`); projection slices fold the same events through `extraReducers`; an `eventPersistenceMiddleware` writes each event to IndexedDB; on cold boot `bootstrapFromEventStore` loads all events and replays them into the projections before the UI renders. Live prices stay runtime/non-persisted. See spec: `docs/superpowers/specs/2026-06-07-event-sourced-financial-core-design.md`.

**Tech Stack:** React 19, Redux Toolkit + redux-persist, `idb` (IndexedDB wrapper), `fake-indexeddb` (tests), Vitest + Testing Library, TypeScript strict.

---

## File Structure (Phase 1)

**Create:**
- `src/utils/uuid.ts` — `uuid()` wrapper around `crypto.randomUUID`.
- `src/store/events/types.ts` — `DomainEvent`, `DomainEventType`, Phase-1 payload types, `createEvent` helper.
- `src/store/events/eventStore.ts` — IndexedDB wrapper: `appendMany`, `loadAll`, `clear`.
- `src/store/events/eventsSlice.ts` — runtime log slice (`appendEvents`, `replayEvents`, `setActor`), `commit` thunk, selectors.
- `src/store/events/eventPersistenceMiddleware.ts` — writes appended events to IndexedDB.
- `src/store/events/bootstrap.ts` — `bootstrapFromEventStore(store)`: load + replay.
- `src/store/events/projectPositions.ts` — pure `applyPositionEvent(positions, event)` fold.
- `src/store/events/projectTrades.ts` — pure `applyTradeEvent(trades, event)` fold.
- `src/store/commands/positionCommands.ts` — `openPosition`, `closePosition`, `editPosition`, `renamePortfolioPositions`.
- `src/store/commands/priceAlertRuleCommands.ts` — `createPriceAlertRule`, `updatePriceAlertRule`, `deletePriceAlertRule`, `togglePriceAlertRule`.
- Test files alongside each (`*.test.ts`).

**Modify:**
- `src/store/slices/positionsSlice.ts` — fold events via `extraReducers`; keep runtime price reducers; remove raw intent reducers (`addPosition`/`updatePosition`/`closePosition`/`removePosition`/`addPriceAlertRule`/`updatePriceAlertRule`/`deletePriceAlertRule`/`togglePriceAlertRule`/`updatePortfolioName`).
- `src/store/slices/tradesSlice.ts` — fold `PositionClosed` via `extraReducers`; remove `addTrade` from public mutation path.
- `src/store/index.ts` — register `events` reducer + `eventPersistenceMiddleware`; remove `positions`/`trades` from persist whitelist; drop `tradeMiddleware`; bump persist version.
- `src/main.tsx` — async boot: `bootstrapFromEventStore` before render.
- `package.json` — add `idb`, `fake-indexeddb`.
- Call sites across `src/` that dispatch the removed raw intent actions (enumerated by `tsc`).

---

## Task 1: Dependencies + uuid utility

**Files:**
- Modify: `package.json`
- Create: `src/utils/uuid.ts`
- Test: `src/utils/uuid.test.ts`

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install idb && npm install -D fake-indexeddb
```
Expected: `package.json` gains `idb` (dependencies) and `fake-indexeddb` (devDependencies); `npm install` exits 0.

- [ ] **Step 2: Write the failing test**

Create `src/utils/uuid.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { uuid } from './uuid';

describe('uuid', () => {
  it('returns a v4-shaped string', () => {
    expect(uuid()).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('returns a different value each call', () => {
    expect(uuid()).not.toBe(uuid());
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/utils/uuid.test.ts`
Expected: FAIL — cannot find module `./uuid`.

- [ ] **Step 4: Write minimal implementation**

Create `src/utils/uuid.ts`:
```ts
/**
 * Stable, sync-safe identifier for domain events and entities.
 * Uses the platform crypto UUID (available in modern browsers and jsdom).
 */
export function uuid(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/utils/uuid.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/utils/uuid.ts src/utils/uuid.test.ts
git commit -m "feat(store): add idb deps and uuid utility for event sourcing"
```

---

## Task 2: Domain event types + createEvent helper

**Files:**
- Create: `src/store/events/types.ts`
- Test: `src/store/events/types.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/events/types.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createEvent } from './types';
import type { PositionOpenedPayload } from './types';

describe('createEvent', () => {
  it('builds an unsequenced event with id, type, payload, timestamp, schemaVersion', () => {
    const payload: PositionOpenedPayload = { position: { id: 'x' } as any };
    const ev = createEvent('PositionOpened', payload, '2026-06-07T10:00:00.000Z');

    expect(ev.id).toMatch(/[0-9a-f-]{36}/i);
    expect(ev.type).toBe('PositionOpened');
    expect(ev.payload).toBe(payload);
    expect(ev.timestamp).toBe('2026-06-07T10:00:00.000Z');
    expect(ev.schemaVersion).toBe(1);
    // seq and actor are stamped later by the commit thunk
    expect('seq' in ev).toBe(false);
    expect('actor' in ev).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/events/types.test.ts`
Expected: FAIL — cannot find module `./types`.

- [ ] **Step 3: Write minimal implementation**

Create `src/store/events/types.ts`:
```ts
import type { Position, PriceAlertRule, Trade, PortfolioName } from '../../types';
import { uuid } from '../../utils/uuid';

/** Current event schema version. Bump + add an upcaster when payloads change. */
export const EVENT_SCHEMA_VERSION = 1;

/** All domain-event type names handled in Phase 1. */
export type DomainEventType =
  | 'PositionOpened'
  | 'PositionClosed'
  | 'PositionEdited'
  | 'PositionsPortfolioRenamed'
  | 'PriceAlertRuleCreated'
  | 'PriceAlertRuleUpdated'
  | 'PriceAlertRuleDeleted'
  | 'PriceAlertRuleToggled';

// --- Phase 1 payloads ---
export interface PositionOpenedPayload {
  position: Position;
}
export interface PositionClosedPayload {
  id: string;
  closeDate: string;
  closePrice?: number;
  closePremium?: number;
  realizedPnL?: number;
  notes?: string;
}
export interface PositionEditedPayload {
  position: Position;
}
export interface PositionsPortfolioRenamedPayload {
  oldName: string;
  newName: string;
}
export interface PriceAlertRuleCreatedPayload {
  rule: PriceAlertRule;
}
export interface PriceAlertRuleUpdatedPayload {
  rule: PriceAlertRule;
}
export interface PriceAlertRuleDeletedPayload {
  id: string;
}
export interface PriceAlertRuleToggledPayload {
  id: string;
}

/** Maps each event type to its payload shape. */
export interface DomainEventPayloads {
  PositionOpened: PositionOpenedPayload;
  PositionClosed: PositionClosedPayload;
  PositionEdited: PositionEditedPayload;
  PositionsPortfolioRenamed: PositionsPortfolioRenamedPayload;
  PriceAlertRuleCreated: PriceAlertRuleCreatedPayload;
  PriceAlertRuleUpdated: PriceAlertRuleUpdatedPayload;
  PriceAlertRuleDeleted: PriceAlertRuleDeletedPayload;
  PriceAlertRuleToggled: PriceAlertRuleToggledPayload;
}

/** A persisted domain event (has seq + actor). */
export interface DomainEvent<T extends DomainEventType = DomainEventType> {
  id: string;
  seq: number;
  type: T;
  payload: DomainEventPayloads[T];
  timestamp: string;
  actor: string;
  schemaVersion: number;
}

/** An event before the store stamps seq + actor (output of createEvent). */
export type UnsequencedEvent<T extends DomainEventType = DomainEventType> = Omit<
  DomainEvent<T>,
  'seq' | 'actor'
>;

/**
 * Build an unsequenced event. `seq` and `actor` are stamped by the commit thunk.
 * `timestamp` is injected (not read from the clock here) so callers stay testable.
 */
export function createEvent<T extends DomainEventType>(
  type: T,
  payload: DomainEventPayloads[T],
  timestamp: string
): UnsequencedEvent<T> {
  return {
    id: uuid(),
    type,
    payload,
    timestamp,
    schemaVersion: EVENT_SCHEMA_VERSION,
  };
}

// Re-export domain aliases used by payloads for convenience.
export type { Position, PriceAlertRule, Trade, PortfolioName };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/events/types.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/store/events/types.ts src/store/events/types.test.ts
git commit -m "feat(store): domain event types and createEvent helper"
```

---

## Task 3: IndexedDB event store

**Files:**
- Create: `src/store/events/eventStore.ts`
- Test: `src/store/events/eventStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/events/eventStore.test.ts`:
```ts
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { createEventStore } from './eventStore';
import type { DomainEvent } from './types';

function ev(seq: number): DomainEvent<'PositionClosed'> {
  return {
    id: `id-${seq}`,
    seq,
    type: 'PositionClosed',
    payload: { id: `p${seq}`, closeDate: '2026-06-07' },
    timestamp: '2026-06-07T10:00:00.000Z',
    actor: 'tester',
    schemaVersion: 1,
  };
}

describe('eventStore', () => {
  beforeEach(async () => {
    const store = createEventStore('test-user');
    await store.clear();
  });

  it('appends and loads events in seq order', async () => {
    const store = createEventStore('test-user');
    await store.appendMany([ev(1), ev(2)]);
    await store.appendMany([ev(3)]);

    const all = await store.loadAll();
    expect(all.map((e) => e.seq)).toEqual([1, 2, 3]);
    // loadAll returns the un-narrowed union; cast to read the payload.
    expect((all[0] as DomainEvent<'PositionClosed'>).payload.id).toBe('p1');
  });

  it('isolates events per user (db name)', async () => {
    const a = createEventStore('user-a');
    const b = createEventStore('user-b');
    await a.clear();
    await b.clear();

    await a.appendMany([ev(1)]);
    expect((await a.loadAll()).length).toBe(1);
    expect((await b.loadAll()).length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/events/eventStore.test.ts`
Expected: FAIL — cannot find module `./eventStore`.

- [ ] **Step 3: Write minimal implementation**

Create `src/store/events/eventStore.ts`:
```ts
import { openDB, type IDBPDatabase } from 'idb';
import type { DomainEvent } from './types';

const STORE_NAME = 'events';

/**
 * Append-only IndexedDB event log, one record per event, keyed by `seq`.
 * One database per user keeps logs isolated (mirrors the per-user redux-persist key).
 */
export interface EventStore {
  appendMany(events: DomainEvent[]): Promise<void>;
  loadAll(): Promise<DomainEvent[]>;
  clear(): Promise<void>;
}

export function createEventStore(username?: string): EventStore {
  const dbName = `payday-events-${username ?? 'root'}`;

  const dbPromise = (): Promise<IDBPDatabase> =>
    openDB(dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'seq' });
        }
      },
    });

  return {
    async appendMany(events) {
      if (events.length === 0) return;
      const db = await dbPromise();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      for (const e of events) {
        await tx.store.add(e);
      }
      await tx.done;
    },
    async loadAll() {
      const db = await dbPromise();
      const all = (await db.getAll(STORE_NAME)) as DomainEvent[];
      return all.sort((a, b) => a.seq - b.seq);
    },
    async clear() {
      const db = await dbPromise();
      await db.clear(STORE_NAME);
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/events/eventStore.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/events/eventStore.ts src/store/events/eventStore.test.ts
git commit -m "feat(store): append-only IndexedDB event store"
```

---

## Task 4: events slice + commit thunk

**Files:**
- Create: `src/store/events/eventsSlice.ts`
- Test: `src/store/events/eventsSlice.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/events/eventsSlice.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import reducer, { appendEvents, replayEvents, setActor } from './eventsSlice';
import type { DomainEvent } from './types';

function ev(seq: number): DomainEvent<'PriceAlertRuleDeleted'> {
  return {
    id: `id-${seq}`,
    seq,
    type: 'PriceAlertRuleDeleted',
    payload: { id: `r${seq}` },
    timestamp: '2026-06-07T10:00:00.000Z',
    actor: 'tester',
    schemaVersion: 1,
  };
}

describe('eventsSlice', () => {
  it('appendEvents pushes events and advances nextSeq', () => {
    let s = reducer(undefined, { type: '@@init' });
    s = reducer(s, appendEvents({ events: [ev(0), ev(1)], positionsBefore: [] }));
    expect(s.log).toHaveLength(2);
    expect(s.nextSeq).toBe(2);
  });

  it('replayEvents replaces the log and sets nextSeq from the last event', () => {
    let s = reducer(undefined, { type: '@@init' });
    s = reducer(s, replayEvents([ev(0), ev(1), ev(2)]));
    expect(s.log).toHaveLength(3);
    expect(s.nextSeq).toBe(3);
  });

  it('setActor stores the actor used for stamping', () => {
    let s = reducer(undefined, { type: '@@init' });
    s = reducer(s, setActor('alice'));
    expect(s.actor).toBe('alice');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/events/eventsSlice.test.ts`
Expected: FAIL — cannot find module `./eventsSlice`.

- [ ] **Step 3: Write minimal implementation**

Create `src/store/events/eventsSlice.ts`:
```ts
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../index';
import type { DomainEvent, UnsequencedEvent } from './types';
import type { Position } from '../../types';

interface EventsState {
  log: DomainEvent[];
  nextSeq: number;
  actor: string;
}

/**
 * appendEvents carries the positions snapshot from *before* this commit so the
 * trades projection (which needs positions-before each close) can fold without
 * reading another slice. Captured by the commit thunk.
 */
export interface AppendEventsPayload {
  events: DomainEvent[];
  positionsBefore: Position[];
}

const initialState: EventsState = {
  log: [],
  nextSeq: 0,
  actor: 'local',
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    /** Runtime append of newly committed (already stamped) events. */
    appendEvents: (state, action: PayloadAction<AppendEventsPayload>) => {
      for (const e of action.payload.events) {
        state.log.push(e);
      }
      state.nextSeq = state.log.length ? state.log[state.log.length - 1].seq + 1 : state.nextSeq;
    },
    /** Cold-boot replace of the whole log (projections fold the same action). */
    replayEvents: (state, action: PayloadAction<DomainEvent[]>) => {
      state.log = action.payload;
      state.nextSeq = action.payload.length
        ? action.payload[action.payload.length - 1].seq + 1
        : 0;
    },
    setActor: (state, action: PayloadAction<string>) => {
      state.actor = action.payload;
    },
  },
});

export const { appendEvents, replayEvents, setActor } = eventsSlice.actions;

/**
 * Stamp `seq` + `actor` onto unsequenced events and dispatch them as one
 * atomic append. Projections (extraReducers) and the persistence middleware
 * both observe the resulting `appendEvents` action. The positions-before
 * snapshot is captured here so the trades projection stays slice-independent.
 */
export const commit =
  (events: UnsequencedEvent[]) =>
  (dispatch: AppDispatch, getState: () => RootState): DomainEvent[] => {
    const { nextSeq, actor } = getState().events;
    const positionsBefore = getState().positions.positions;
    const stamped: DomainEvent[] = events.map((e, i) => ({
      ...e,
      seq: nextSeq + i,
      actor,
    })) as DomainEvent[];
    dispatch(appendEvents({ events: stamped, positionsBefore }));
    return stamped;
  };

// Selectors
export const selectEventLog = (state: RootState) => state.events.log;

export default eventsSlice.reducer;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/events/eventsSlice.test.ts`
Expected: PASS (3 tests).

> Note: `commit`'s `getState` reads `getState().events` and `getState().positions.positions`. `RootState` only includes `events` once the reducer is registered, so register it now (Step 5) — otherwise `tsc -b` fails on `.events` for every task until Task 12.

- [ ] **Step 5: Register the events reducer (minimal — rest of store wiring is Task 12)**

In `src/store/index.ts`, add the import and the one reducer line so `RootState` includes `events`:
```ts
import eventsReducer from './events/eventsSlice';
```
and inside `combineReducers({ ... })` add:
```ts
  events: eventsReducer,
```
Do NOT touch the persist whitelist, middleware, or version here — that is Task 12. (`events` is intentionally NOT persisted via redux-persist; it lives in IndexedDB.)

- [ ] **Step 6: Verify typecheck + test**

Run: `npm run typecheck` (expect 0 errors) and `npx vitest run src/store/events/eventsSlice.test.ts` (expect 3 pass).

- [ ] **Step 7: Commit**

```bash
git add src/store/events/eventsSlice.ts src/store/events/eventsSlice.test.ts src/store/index.ts
git commit -m "feat(store): events slice with commit thunk"
```

---

## Task 5: positions projection (pure fold)

**Files:**
- Create: `src/store/events/projectPositions.ts`
- Test: `src/store/events/projectPositions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/events/projectPositions.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { applyPositionEvent } from './projectPositions';
import type { Position } from '../../types';
import type { DomainEvent } from './types';

const stock = (id: string, portfolio = 'Main'): Position =>
  ({
    id,
    type: 'stock',
    ticker: 'AAPL',
    portfolio,
    status: 'open',
    openDate: '2026-01-01',
    shares: 10,
    purchasePrice: 100,
  }) as unknown as Position;

function event<T extends DomainEvent['type']>(type: T, payload: any): DomainEvent {
  return { id: 'e', seq: 0, type, payload, timestamp: 't', actor: 'a', schemaVersion: 1 } as DomainEvent;
}

describe('applyPositionEvent', () => {
  it('PositionOpened appends the position', () => {
    const next = applyPositionEvent([], event('PositionOpened', { position: stock('p1') }));
    expect(next.map((p) => p.id)).toEqual(['p1']);
  });

  it('PositionClosed marks the position closed and records close fields', () => {
    const opened = applyPositionEvent([], event('PositionOpened', { position: stock('p1') }));
    const next = applyPositionEvent(
      opened,
      event('PositionClosed', { id: 'p1', closeDate: '2026-02-01', realizedPnL: 50 })
    );
    expect(next[0].status).toBe('closed');
    expect(next[0].closeDate).toBe('2026-02-01');
    expect(next[0].realizedPnL).toBe(50);
  });

  it('PositionEdited replaces the position', () => {
    const opened = applyPositionEvent([], event('PositionOpened', { position: stock('p1') }));
    const edited = { ...(opened[0] as any), shares: 99 };
    const next = applyPositionEvent(opened, event('PositionEdited', { position: edited }));
    expect((next[0] as any).shares).toBe(99);
  });

  it('PositionsPortfolioRenamed rewrites the portfolio key', () => {
    const opened = applyPositionEvent([], event('PositionOpened', { position: stock('p1', 'Old') }));
    const next = applyPositionEvent(
      opened,
      event('PositionsPortfolioRenamed', { oldName: 'Old', newName: 'New' })
    );
    expect(next[0].portfolio).toBe('New');
  });

  it('ignores unrelated event types', () => {
    const opened = applyPositionEvent([], event('PositionOpened', { position: stock('p1') }));
    const next = applyPositionEvent(opened, event('PriceAlertRuleDeleted', { id: 'x' }));
    expect(next).toBe(opened);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/events/projectPositions.test.ts`
Expected: FAIL — cannot find module `./projectPositions`.

- [ ] **Step 3: Write minimal implementation**

Create `src/store/events/projectPositions.ts`:
```ts
import type { Position, PortfolioName } from '../../types';
import type { DomainEvent } from './types';

/**
 * Pure fold of a single domain event into the positions array.
 * Returns the same reference for events this projection does not own,
 * so callers can cheaply detect no-ops.
 */
export function applyPositionEvent(positions: Position[], event: DomainEvent): Position[] {
  switch (event.type) {
    case 'PositionOpened':
      return [...positions, event.payload.position];

    case 'PositionEdited':
      return positions.map((p) => (p.id === event.payload.position.id ? event.payload.position : p));

    case 'PositionClosed': {
      const { id, closeDate, closePrice, closePremium, realizedPnL, notes } = event.payload;
      return positions.map((p) => {
        if (p.id !== id) return p;
        const next: Position = { ...p, status: 'closed', closeDate };
        if (closePrice !== undefined) next.closePrice = closePrice;
        if (closePremium !== undefined) next.closePremium = closePremium;
        if (realizedPnL !== undefined) next.realizedPnL = realizedPnL;
        if (notes) {
          next.notes = p.notes ? `${p.notes}\n\nClose notes: ${notes}` : `Close notes: ${notes}`;
        }
        return next;
      });
    }

    case 'PositionsPortfolioRenamed': {
      const { oldName, newName } = event.payload;
      return positions.map((p) =>
        p.portfolio === oldName ? { ...p, portfolio: newName as PortfolioName } : p
      );
    }

    default:
      return positions;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/events/projectPositions.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/events/projectPositions.ts src/store/events/projectPositions.test.ts
git commit -m "feat(store): positions projection fold"
```

---

## Task 6: trades projection (pure fold from PositionClosed)

This replaces `tradeMiddleware`. The pure trade-building logic is lifted verbatim from `src/store/middleware/tradeMiddleware.ts:48-107`, but keyed off the closed position + close payload.

**Files:**
- Create: `src/store/events/projectTrades.ts`
- Test: `src/store/events/projectTrades.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/events/projectTrades.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { applyTradeEvent } from './projectTrades';
import type { Position } from '../../types';
import type { DomainEvent } from './types';

const sellCall = (id: string): Position =>
  ({
    id,
    type: 'call',
    action: 'sell',
    ticker: 'AAPL',
    portfolio: 'Main',
    status: 'open',
    openDate: '2026-01-01',
    strike: 200,
    expiration: '2026-03-20',
    contracts: 1,
    premium: 3,
  }) as unknown as Position;

function closed(id: string, payload: any): DomainEvent {
  return {
    id: 'e',
    seq: 0,
    type: 'PositionClosed',
    payload: { id, ...payload },
    timestamp: 't',
    actor: 'a',
    schemaVersion: 1,
  } as DomainEvent;
}

describe('applyTradeEvent', () => {
  it('creates a trade from a closed sold call with computed realizedPnL', () => {
    const next = applyTradeEvent([], closed('p1', { closeDate: '2026-02-01', closePremium: 1 }), [
      sellCall('p1'),
    ]);
    expect(next).toHaveLength(1);
    expect(next[0].ticker).toBe('AAPL');
    expect(next[0].strategy).toBe('Covered Calls');
    // (3 - 1) * 1 * 100 = 200
    expect(next[0].realizedPnL).toBe(200);
  });

  it('prefers an explicit realizedPnL from the payload', () => {
    const next = applyTradeEvent([], closed('p1', { closeDate: '2026-02-01', realizedPnL: 42 }), [
      sellCall('p1'),
    ]);
    expect(next[0].realizedPnL).toBe(42);
  });

  it('ignores non-close events and unknown positions', () => {
    expect(applyTradeEvent([], closed('missing', { closeDate: 'x' }), [])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/events/projectTrades.test.ts`
Expected: FAIL — cannot find module `./projectTrades`.

- [ ] **Step 3: Write minimal implementation**

Create `src/store/events/projectTrades.ts`:
```ts
import type {
  Trade,
  Position,
  StockPosition,
  CallOption,
  PutOption,
} from '../../types';
import type { DomainEvent, PositionClosedPayload } from './types';

/**
 * Build a Trade from a closed position (lifted from the former tradeMiddleware).
 * The trade id is derived from the close event so replays are deterministic.
 */
function buildTrade(
  position: Position,
  close: PositionClosedPayload,
  eventId: string
): Trade | null {
  if (position.type === 'stock' || position.type === 'etf') {
    const stockPos = position as StockPosition;
    const exitPrice = close.closePrice ?? stockPos.currentPrice ?? stockPos.purchasePrice;
    const realizedPnL = (exitPrice - stockPos.purchasePrice) * stockPos.shares;
    return {
      id: `trade-${eventId}`,
      ticker: position.ticker,
      portfolio: position.portfolio,
      strategy: position.type === 'etf' ? 'ETF' : 'Aandelen',
      openDate: position.openDate,
      closeDate: close.closeDate,
      entryPrice: stockPos.purchasePrice,
      exitPrice,
      quantity: stockPos.shares,
      commission: 0,
      fees: 0,
      realizedPnL: close.realizedPnL ?? realizedPnL,
      notes: close.notes ?? position.notes,
    };
  }

  if (position.type === 'call' || position.type === 'put') {
    const option = position as CallOption | PutOption;
    const isSell = option.action === 'sell';
    const exitPremium = close.closePremium ?? 0;
    const realizedPnL = isSell
      ? (option.premium - exitPremium) * option.contracts * 100
      : (exitPremium - option.premium) * option.contracts * 100;
    return {
      id: `trade-${eventId}`,
      ticker: position.ticker,
      portfolio: position.portfolio,
      strategy: isSell
        ? option.type === 'call'
          ? 'Covered Calls'
          : 'Cash Secured Puts'
        : option.type === 'call'
          ? 'Long Calls'
          : 'Long Puts',
      openDate: position.openDate,
      closeDate: close.closeDate,
      entryPrice: option.premium,
      exitPrice: exitPremium,
      quantity: option.contracts,
      commission: 0,
      fees: 0,
      realizedPnL: close.realizedPnL ?? realizedPnL,
      notes: close.notes ?? position.notes,
      tags: [`${option.type}`, `$${option.strike}`, option.expiration],
    };
  }

  return null;
}

/**
 * Trades are a projection of PositionClosed events. `positionsBefore` is the
 * positions projection state *before* this event is folded (the open position).
 */
export function applyTradeEvent(
  trades: Trade[],
  event: DomainEvent,
  positionsBefore: Position[]
): Trade[] {
  if (event.type !== 'PositionClosed') return trades;
  const position = positionsBefore.find((p) => p.id === event.payload.id);
  if (!position) return trades;
  const trade = buildTrade(position, event.payload, event.id);
  return trade ? [...trades, trade] : trades;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/events/projectTrades.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/events/projectTrades.ts src/store/events/projectTrades.test.ts
git commit -m "feat(store): trades projection from PositionClosed"
```

---

## Task 8: Wire projections into positionsSlice and tradesSlice

> **Execution order:** do Task 7 (price-alert-rule projection) *before* this task — the slice
> edit below imports `applyPriceAlertRuleEvent` from the file Task 7 creates. (Task 7's block
> appears immediately after this one in the document.)

Both projections fold inside their own slices via `extraReducers` on `appendEvents` and
`replayEvents`. The trades projection needs the positions list *before* each close is applied;
RTK reducers cannot read another slice, so the `commit` thunk (Task 4) already attaches that
snapshot as `action.payload.positionsBefore` on `appendEvents`. For `replayEvents` the trades
fold rebuilds its own positions seed inline from the same event stream (deterministic).

**Files:**
- Modify: `src/store/slices/positionsSlice.ts`
- Modify: `src/store/slices/tradesSlice.ts`
- Test: `src/store/slices/positionsSlice.test.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/store/slices/positionsSlice.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import reducer from './positionsSlice';
import { appendEvents } from '../events/eventsSlice';
import type { DomainEvent } from '../events/types';
import type { Position } from '../../types';

const stock = (id: string): Position =>
  ({ id, type: 'stock', ticker: 'AAPL', portfolio: 'Main', status: 'open', openDate: '2026-01-01', shares: 10, purchasePrice: 100 }) as unknown as Position;

const ev = (seq: number, type: DomainEvent['type'], payload: any): DomainEvent =>
  ({ id: `e${seq}`, seq, type, payload, timestamp: 't', actor: 'a', schemaVersion: 1 }) as DomainEvent;

describe('positionsSlice projection', () => {
  it('folds PositionOpened from appendEvents', () => {
    let s = reducer(undefined, { type: '@@init' });
    s = reducer(
      s,
      appendEvents({ events: [ev(0, 'PositionOpened', { position: stock('p1') })], positionsBefore: [] })
    );
    expect(s.positions.map((p) => p.id)).toEqual(['p1']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/slices/positionsSlice.test.ts`
Expected: FAIL — projection not wired (positions stays empty).

- [ ] **Step 3: Edit `positionsSlice.ts`**

3a. Remove these raw intent reducers from the `reducers: { ... }` block (they are replaced by event folds): `addPosition`, `updatePosition`, `removePosition`, `closePosition`, `addPriceAlertRule`, `updatePriceAlertRule`, `deletePriceAlertRule`, `togglePriceAlertRule`, `updatePortfolioName`. **Keep** the runtime/derived reducers: `updatePositionValue`, `updateMultiplePositionValues`, `updateOptionPremium`, `setSelectedPortfolio`, `setSelectedStrategy`, `loadPositions`, `addPriceAlert`, `markPriceAlertAsRead`, `deletePriceAlert`, `clearReadAlerts`.

3b. Remove the deleted names from the `export const { ... } = positionsSlice.actions;` block.

3c. Add the imports at the top:
```ts
import { applyPositionEvent } from '../events/projectPositions';
import { appendEvents, replayEvents } from '../events/eventsSlice';
import { applyPriceAlertRuleEvent } from '../events/projectPriceAlertRules';
```

3d. Add an `extraReducers` builder to the slice config (sibling of `reducers`):
```ts
  extraReducers: (builder) => {
    const fold = (state: PositionsState, events: DomainEvent[]) => {
      for (const event of events) {
        state.positions = applyPositionEvent(state.positions, event);
        state.priceAlertRules = applyPriceAlertRuleEvent(state.priceAlertRules, event);
      }
    };
    builder.addCase(appendEvents, (state, action) => fold(state, action.payload.events));
    builder.addCase(replayEvents, (state, action) => {
      state.positions = [];
      state.priceAlertRules = [];
      fold(state, action.payload);
    });
  },
```
Add `import type { DomainEvent } from '../events/types';` to the imports.

> Note: `applyPositionEvent` returns new arrays; assigning them inside Immer's draft is fine (Immer accepts replacement of draft properties).

- [ ] **Step 4: Edit `tradesSlice.ts`**

4a. Add imports:
```ts
import { appendEvents, replayEvents } from '../events/eventsSlice';
import { applyTradeEvent } from '../events/projectTrades';
import { applyPositionEvent } from '../events/projectPositions';
import type { DomainEvent } from '../events/types';
import type { Position } from '../../types';
```

4b. **Keep `addTrade` for now** (do NOT remove it in this task). `tradeMiddleware` still imports `addTrade` and stays wired until Task 12; removing it here would break that import. After Task 8 the trades projection is the only path that adds trades (`positions/closePosition` is no longer dispatched, so `tradeMiddleware` never fires — no double trades). `addTrade` and `tradeMiddleware` are removed together in Task 12. Keep all existing trades reducers (`addTrade`, `updateTrade`, `removeTrade`, `setFilter`, `clearFilter`, `loadTrades`).

4c. Add `extraReducers`. The trade fold needs positions-*before* each close. On `appendEvents`
that seed comes from `action.payload.positionsBefore` (attached by `commit`); on `replayEvents`
it starts empty and is rebuilt inline from the same stream:
```ts
  extraReducers: (builder) => {
    const fold = (state: TradesState, events: DomainEvent[], positionsSeed: Position[]) => {
      let positions = positionsSeed;
      for (const event of events) {
        // trades use positions as they were BEFORE this event is applied
        state.trades = applyTradeEvent(state.trades, event, positions);
        positions = applyPositionEvent(positions, event);
      }
    };
    builder.addCase(appendEvents, (state, action) => {
      fold(state, action.payload.events, action.payload.positionsBefore);
    });
    builder.addCase(replayEvents, (state, action) => {
      state.trades = [];
      fold(state, action.payload, []);
    });
  },
```

- [ ] **Step 5: Run targeted tests to verify they pass**

Run: `npx vitest run src/store/slices/positionsSlice.test.ts src/store/events/eventsSlice.test.ts`
Expected: PASS.

> **IMPORTANT — expected red state from here until Task 13:** removing the raw intent action
> creators from `positionsSlice` breaks every UI call site that imported them, so `npm run
> typecheck` and the FULL `npm test` suite are expected to FAIL until the Task 13 sweep fixes
> the call sites. That is by design. In Tasks 8–12 only run the *targeted* test files named in
> each step; do NOT run full `npm test`/`npm run typecheck` as a gate, and do NOT fix call sites
> outside the files this task names (that is Task 13's job).

- [ ] **Step 6: Commit**

```bash
git add src/store/slices/positionsSlice.ts src/store/slices/tradesSlice.ts src/store/slices/positionsSlice.test.ts
git commit -m "feat(store): fold position/trade projections from event log"
```

---

## Task 7: price-alert-rule projection

> Execute this before Task 8 (it consumes `applyPriceAlertRuleEvent`).

**Files:**
- Create: `src/store/events/projectPriceAlertRules.ts`
- Test: `src/store/events/projectPriceAlertRules.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/events/projectPriceAlertRules.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { applyPriceAlertRuleEvent } from './projectPriceAlertRules';
import type { PriceAlertRule } from '../../types';
import type { DomainEvent } from './types';

const rule = (id: string): PriceAlertRule => ({ id, isActive: true } as unknown as PriceAlertRule);
const ev = (type: DomainEvent['type'], payload: any): DomainEvent =>
  ({ id: 'e', seq: 0, type, payload, timestamp: 't', actor: 'a', schemaVersion: 1 }) as DomainEvent;

describe('applyPriceAlertRuleEvent', () => {
  it('Created appends', () => {
    expect(applyPriceAlertRuleEvent([], ev('PriceAlertRuleCreated', { rule: rule('r1') })).map((r) => r.id)).toEqual(['r1']);
  });
  it('Updated replaces', () => {
    const s = applyPriceAlertRuleEvent([], ev('PriceAlertRuleCreated', { rule: rule('r1') }));
    const next = applyPriceAlertRuleEvent(s, ev('PriceAlertRuleUpdated', { rule: { ...s[0], isActive: false } }));
    expect(next[0].isActive).toBe(false);
  });
  it('Deleted removes', () => {
    const s = applyPriceAlertRuleEvent([], ev('PriceAlertRuleCreated', { rule: rule('r1') }));
    expect(applyPriceAlertRuleEvent(s, ev('PriceAlertRuleDeleted', { id: 'r1' }))).toEqual([]);
  });
  it('Toggled flips isActive', () => {
    const s = applyPriceAlertRuleEvent([], ev('PriceAlertRuleCreated', { rule: rule('r1') }));
    expect(applyPriceAlertRuleEvent(s, ev('PriceAlertRuleToggled', { id: 'r1' }))[0].isActive).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/events/projectPriceAlertRules.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/store/events/projectPriceAlertRules.ts`:
```ts
import type { PriceAlertRule } from '../../types';
import type { DomainEvent } from './types';

export function applyPriceAlertRuleEvent(
  rules: PriceAlertRule[],
  event: DomainEvent
): PriceAlertRule[] {
  switch (event.type) {
    case 'PriceAlertRuleCreated':
      return [...rules, event.payload.rule];
    case 'PriceAlertRuleUpdated':
      return rules.map((r) => (r.id === event.payload.rule.id ? event.payload.rule : r));
    case 'PriceAlertRuleDeleted':
      return rules.filter((r) => r.id !== event.payload.id);
    case 'PriceAlertRuleToggled':
      return rules.map((r) =>
        r.id === event.payload.id ? { ...r, isActive: !r.isActive } : r
      );
    default:
      return rules;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/events/projectPriceAlertRules.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/events/projectPriceAlertRules.ts src/store/events/projectPriceAlertRules.test.ts
git commit -m "feat(store): price alert rule projection"
```

---

## Task 9: Position + price-alert-rule commands

**Files:**
- Create: `src/store/commands/positionCommands.ts`
- Create: `src/store/commands/priceAlertRuleCommands.ts`
- Test: `src/store/commands/positionCommands.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/commands/positionCommands.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor } from '../events/eventsSlice';
import positionsReducer, { selectPositions } from '../slices/positionsSlice';
import tradesReducer from '../slices/tradesSlice';
import { openPosition, closePosition } from './positionCommands';
import type { Position } from '../../types';
import type { AppDispatch } from '../index';

function makeStore() {
  return configureStore({
    reducer: { events: eventsReducer, positions: positionsReducer, trades: tradesReducer },
  });
}

const stock = (id: string): Position =>
  ({ id, type: 'stock', ticker: 'AAPL', portfolio: 'Main', status: 'open', openDate: '2026-01-01', shares: 10, purchasePrice: 100 }) as unknown as Position;

describe('position commands', () => {
  it('openPosition emits PositionOpened and updates the projection', () => {
    const store = makeStore();
    // The mini test store's inferred dispatch lacks the global thunk overload;
    // commands are typed against the app's AppDispatch (real call sites use that).
    const dispatch = store.dispatch as AppDispatch;
    dispatch(setActor('alice'));
    dispatch(openPosition(stock('p1'), '2026-06-07T10:00:00.000Z'));

    expect(selectPositions(store.getState() as any).map((p) => p.id)).toEqual(['p1']);
    const log = (store.getState() as any).events.log;
    expect(log[0].type).toBe('PositionOpened');
    expect(log[0].actor).toBe('alice');
    expect(log[0].seq).toBe(0);
  });

  it('closePosition emits PositionClosed and projects a trade', () => {
    const store = makeStore();
    const dispatch = store.dispatch as AppDispatch;
    dispatch(openPosition(stock('p1'), '2026-06-07T10:00:00.000Z'));
    dispatch(closePosition({ id: 'p1', closeDate: '2026-06-08', realizedPnL: 50 }, '2026-06-08T10:00:00.000Z'));

    const state = store.getState() as any;
    expect(selectPositions(state)[0].status).toBe('closed');
    expect(state.trades.trades).toHaveLength(1);
    expect(state.trades.trades[0].realizedPnL).toBe(50);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/commands/positionCommands.test.ts`
Expected: FAIL — cannot find module `./positionCommands`.

- [ ] **Step 3: Write minimal implementation**

Create `src/store/commands/positionCommands.ts`:
```ts
import type { AppDispatch, RootState } from '../index';
import { commit } from '../events/eventsSlice';
import { createEvent } from '../events/types';
import type { PositionClosedPayload } from '../events/types';
import type { Position } from '../../types';

/** Open a new position. Emits PositionOpened. */
export const openPosition =
  (position: Position, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('PositionOpened', { position }, timestamp)]));

/** Close an existing position. Emits PositionClosed (trades project from it). */
export const closePosition =
  (payload: PositionClosedPayload, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('PositionClosed', payload, timestamp)]));

/** Edit an existing position (full replacement). Emits PositionEdited. */
export const editPosition =
  (position: Position, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('PositionEdited', { position }, timestamp)]));

/** Rename a portfolio key across all positions. Emits PositionsPortfolioRenamed. */
export const renamePortfolioPositions =
  (oldName: string, newName: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('PositionsPortfolioRenamed', { oldName, newName }, timestamp)]));

// Re-export RootState so callers importing from commands get the type.
export type { RootState };
```

Create `src/store/commands/priceAlertRuleCommands.ts`:
```ts
import type { AppDispatch } from '../index';
import { commit } from '../events/eventsSlice';
import { createEvent } from '../events/types';
import type { PriceAlertRule } from '../../types';

export const createPriceAlertRule =
  (rule: PriceAlertRule, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('PriceAlertRuleCreated', { rule }, timestamp)]));

export const updatePriceAlertRule =
  (rule: PriceAlertRule, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('PriceAlertRuleUpdated', { rule }, timestamp)]));

export const deletePriceAlertRule =
  (id: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('PriceAlertRuleDeleted', { id }, timestamp)]));

export const togglePriceAlertRule =
  (id: string, timestamp: string) => (dispatch: AppDispatch) =>
    dispatch(commit([createEvent('PriceAlertRuleToggled', { id }, timestamp)]));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/commands/positionCommands.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/commands/positionCommands.ts src/store/commands/priceAlertRuleCommands.ts src/store/commands/positionCommands.test.ts
git commit -m "feat(store): position and price-alert-rule commands"
```

---

## Task 10: Event persistence middleware

**Files:**
- Create: `src/store/events/eventPersistenceMiddleware.ts`
- Test: `src/store/events/eventPersistenceMiddleware.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/events/eventPersistenceMiddleware.test.ts`:
```ts
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor } from './eventsSlice';
import positionsReducer from '../slices/positionsSlice';
import tradesReducer from '../slices/tradesSlice';
import { createEventPersistenceMiddleware } from './eventPersistenceMiddleware';
import { createEventStore } from './eventStore';
import { openPosition } from '../commands/positionCommands';
import type { Position } from '../../types';

const stock = (id: string): Position =>
  ({ id, type: 'stock', ticker: 'AAPL', portfolio: 'Main', status: 'open', openDate: '2026-01-01', shares: 10, purchasePrice: 100 }) as unknown as Position;

describe('eventPersistenceMiddleware', () => {
  beforeEach(async () => {
    await createEventStore('mw-test').clear();
  });

  it('writes committed events to the IndexedDB store', async () => {
    const eventStore = createEventStore('mw-test');
    const store = configureStore({
      reducer: { events: eventsReducer, positions: positionsReducer, trades: tradesReducer },
      middleware: (gdm) => gdm().concat(createEventPersistenceMiddleware(eventStore)),
    });
    store.dispatch(setActor('alice'));
    store.dispatch(openPosition(stock('p1'), '2026-06-07T10:00:00.000Z'));

    // allow the async write to settle
    await new Promise((r) => setTimeout(r, 0));

    const persisted = await eventStore.loadAll();
    expect(persisted.map((e) => e.type)).toEqual(['PositionOpened']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/events/eventPersistenceMiddleware.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/store/events/eventPersistenceMiddleware.ts`:
```ts
import type { Middleware } from '@reduxjs/toolkit';
import { appendEvents } from './eventsSlice';
import type { EventStore } from './eventStore';

/**
 * Persists every committed event to the IndexedDB event store.
 * Listens to the `appendEvents` action (runtime commits only — `replayEvents`
 * comes FROM storage, so it is intentionally not re-persisted).
 */
export const createEventPersistenceMiddleware = (eventStore: EventStore): Middleware => {
  return () => (next) => (action) => {
    const result = next(action);
    if (appendEvents.match(action)) {
      void eventStore.appendMany(action.payload.events);
    }
    return result;
  };
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/events/eventPersistenceMiddleware.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/store/events/eventPersistenceMiddleware.ts src/store/events/eventPersistenceMiddleware.test.ts
git commit -m "feat(store): persist committed events to IndexedDB"
```

---

## Task 11: Bootstrap (load + replay)

**Files:**
- Create: `src/store/events/bootstrap.ts`
- Test: `src/store/events/bootstrap.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/store/events/bootstrap.test.ts`:
```ts
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer from './eventsSlice';
import positionsReducer, { selectPositions } from '../slices/positionsSlice';
import tradesReducer from '../slices/tradesSlice';
import { bootstrapFromEventStore } from './bootstrap';
import { createEventStore } from './eventStore';
import type { DomainEvent } from './types';

const opened = (seq: number, id: string): DomainEvent =>
  ({
    id: `e${seq}`, seq, type: 'PositionOpened',
    payload: { position: { id, type: 'stock', ticker: 'AAPL', portfolio: 'Main', status: 'open', openDate: '2026-01-01', shares: 1, purchasePrice: 1 } },
    timestamp: 't', actor: 'a', schemaVersion: 1,
  }) as DomainEvent;

describe('bootstrapFromEventStore', () => {
  beforeEach(async () => {
    await createEventStore('boot-test').clear();
  });

  it('loads persisted events and rebuilds the projections', async () => {
    const eventStore = createEventStore('boot-test');
    await eventStore.appendMany([opened(0, 'p1'), opened(1, 'p2')]);

    const store = configureStore({
      reducer: { events: eventsReducer, positions: positionsReducer, trades: tradesReducer },
    });
    await bootstrapFromEventStore(store, eventStore);

    expect(selectPositions(store.getState() as any).map((p) => p.id)).toEqual(['p1', 'p2']);
    expect((store.getState() as any).events.nextSeq).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/events/bootstrap.test.ts`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write minimal implementation**

Create `src/store/events/bootstrap.ts`:
```ts
import type { Store } from '@reduxjs/toolkit';
import { replayEvents } from './eventsSlice';
import type { EventStore } from './eventStore';

/**
 * Load the full persisted event log and replay it into the projections.
 * Call once at startup, before rendering the app.
 */
export async function bootstrapFromEventStore(
  store: Pick<Store, 'dispatch'>,
  eventStore: EventStore
): Promise<void> {
  const events = await eventStore.loadAll();
  store.dispatch(replayEvents(events));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/events/bootstrap.test.ts`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/store/events/bootstrap.ts src/store/events/bootstrap.test.ts
git commit -m "feat(store): bootstrap projections by replaying the event log"
```

---

## Task 12: Store wiring

**Files:**
- Modify: `src/store/index.ts`

- [ ] **Step 1: Edit `src/store/index.ts`**

1a. Add imports (note: `eventsReducer` and its `events:` line in `combineReducers` were already added in Task 4 — do not duplicate):
```ts
import { createEventStore } from './events/eventStore';
import { createEventPersistenceMiddleware } from './events/eventPersistenceMiddleware';
import { setActor } from './events/eventsSlice';
```

1b. (Already done in Task 4: `events: eventsReducer` is in `combineReducers`.)

1c. Remove `'positions'` and `'trades'` from the persist `whitelist` array (they are now rebuilt from the event log; the event log lives in IndexedDB, not redux-persist).

1d. Bump `version: 1` → `version: 2` in `persistConfig` (clean start: drops the old persisted positions/trades blob). Leave the `migrate` body as-is.

1e. In `createAppStore`, build the event store and middleware, drop `tradeMiddleware`, and stamp the actor:
```ts
  const eventStore = createEventStore(username);
```
Change the middleware chain from:
```ts
      }).concat(tickerPriceMiddleware, tradeMiddleware, positionValueMiddleware),
```
to:
```ts
      }).concat(
        tickerPriceMiddleware,
        positionValueMiddleware,
        createEventPersistenceMiddleware(eventStore)
      ),
```
Remove the now-unused `import { tradeMiddleware } from './middleware/tradeMiddleware';`.

1e-bis. Now that `tradeMiddleware` is unwired, remove the dead trade-creation path (deferred from Task 8):
- In `src/store/slices/tradesSlice.ts`: remove the `addTrade` reducer from the `reducers` block and from the exported `tradesSlice.actions` destructuring. Keep `updateTrade`, `removeTrade`, `setFilter`, `clearFilter`, `loadTrades`.
- Delete the file `src/store/middleware/tradeMiddleware.ts` (it imported `addTrade` and is fully replaced by the trades projection). There is no `tradeMiddleware.test.ts` to remove.
- `git rm src/store/middleware/tradeMiddleware.ts`.

1f. Add `'positions/addPosition'` / `'trades/addTrade'` are gone; update the `ignoredActions` list to drop those two entries and add `'events/appendEvents'`, `'events/replayEvents'` (event payloads contain Position objects, which are serializable, but this silences any date/string-key checks):
```ts
          ignoredActions: [
            'persist/PERSIST',
            'persist/REHYDRATE',
            'events/appendEvents',
            'events/replayEvents',
          ],
```

1g. After `persistStore`, set the actor and expose the event store on the returned object:
```ts
  store.dispatch(setActor(username ?? 'local'));

  return { store, persistor, eventStore };
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: errors ONLY at the call sites of the removed raw actions (`addPosition`, `closePosition`, `updatePosition`, `removePosition`, `addPriceAlertRule`, `updatePriceAlertRule`, `deletePriceAlertRule`, `togglePriceAlertRule`, `updatePortfolioName`, `addTrade`). These are fixed in Task 13. No errors inside `src/store/events/` or `src/store/commands/`.

- [ ] **Step 3: Commit**

```bash
git add src/store/index.ts src/store/slices/tradesSlice.ts
git rm src/store/middleware/tradeMiddleware.ts
git commit -m "feat(store): wire event log into the store, drop tradeMiddleware"
```

---

## Task 13: Migrate call sites to commands (compiler-driven sweep)

The removed raw intent actions now cause `tsc` errors at every call site. Fix each by dispatching the equivalent command. **The compiler is the checklist** — Task 12 Step 2 produced the exact list.

**Transformation rules:**

| Old dispatch | New dispatch (import from `@/store/commands/positionCommands` or `.../priceAlertRuleCommands`) |
|---|---|
| `dispatch(addPosition(pos))` | `dispatch(openPosition(pos, new Date().toISOString()))` |
| `dispatch(closePosition(payload))` | `dispatch(closePosition(payload, new Date().toISOString()))` |
| `dispatch(updatePosition(pos))` | `dispatch(editPosition(pos, new Date().toISOString()))` |
| `dispatch(removePosition(id))` | Replace with a close (`closePosition`) if it represents closing, else `editPosition`. There is no hard delete in the event model — see note below. |
| `dispatch(updatePortfolioName({oldName,newName}))` | `dispatch(renamePortfolioPositions(oldName, newName, new Date().toISOString()))` |
| `dispatch(addPriceAlertRule(rule))` | `dispatch(createPriceAlertRule(rule, new Date().toISOString()))` |
| `dispatch(updatePriceAlertRule(rule))` | `dispatch(updatePriceAlertRule(rule, new Date().toISOString()))` |
| `dispatch(deletePriceAlertRule(id))` | `dispatch(deletePriceAlertRule(id, new Date().toISOString()))` |
| `dispatch(togglePriceAlertRule(id))` | `dispatch(togglePriceAlertRule(id, new Date().toISOString()))` |
| `dispatch(addTrade(trade))` | **Remove** — trades now project from `PositionClosed`. If a call site builds a trade manually, delete that code. |

> `removePosition` note: the only legitimate Phase-1 callers are hard deletes of mistakenly-created positions. Keep a thin `removePosition` *runtime* reducer in `positionsSlice` (non-persisted, not event-sourced) ONLY if a call site needs it for non-persisted scratch data; otherwise model the removal as a close. Decide per call site; default to close. Document the choice in the commit message.

- [ ] **Step 1: Enumerate call sites**

Run: `npm run typecheck` and collect every error location. Cross-check with:
```bash
git grep -nE "addPosition|closePosition\(|updatePosition\(|removePosition|updatePortfolioName|addPriceAlertRule|updatePriceAlertRule|deletePriceAlertRule|togglePriceAlertRule|addTrade" -- src ':!src/store'
```
Also audit the *kept* runtime reducers `loadPositions` / `loadTrades` (the compiler will NOT
flag these — they still exist). Any caller that seeds positions/trades through them bypasses the
event log and the data is lost on reload. Re-route such seeding through `openPosition` commands,
or confirm the caller is dead code and remove it.
Known hotspots from prior analysis: `src/components/widgets/PortfolioView.tsx` (open/close/roll/assignment handlers), `src/components/modals/NewTickerForm.tsx`, `src/components/modals/NewWheelModal.tsx`, `src/components/modals/RollOptionModal.tsx` callers, `src/components/modals/AssignmentModal.tsx` callers, price-alert UI under `src/components/`.

- [ ] **Step 2: Apply the transformation at each site**

For each error, replace the import (`from '@/store/slices/positionsSlice'` → the matching command module for the moved actions; leave imports of kept actions/selectors untouched) and update the dispatch per the table. Roll/assignment handlers in `PortfolioView` keep their multi-step structure for now (collapsing to a single `OptionRolled`/`OptionAssigned` event is Phase 4) — just swap each `addPosition`/`closePosition` for `openPosition`/`closePosition` commands so every position lands in the log.

- [ ] **Step 3: Typecheck until clean**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: PASS. If `positionValueMiddleware.test.ts` or other slice tests referenced removed actions, update them to drive state via commands or `replayEvents` (the projection entry points). Keep their assertions identical.

- [ ] **Step 5: Lint**

Run: `npm run lint`
Expected: 0 errors. Remove now-unused imports the sweep left behind.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(store): route position/trade/alert mutations through commands"
```

---

## Task 14: Async boot in main.tsx

**Files:**
- Modify: `src/main.tsx`

- [ ] **Step 1: Edit `src/main.tsx`**

Replace the synchronous bottom half with an async bootstrap that replays the event log before rendering. The returned `eventStore` (Task 12) is passed to `bootstrapFromEventStore`.

```tsx
import { bootstrapFromEventStore } from './store/events/bootstrap';

const username = getCurrentUsername();
const { store, persistor, eventStore } = createAppStore(username);

initializeWebSocketService(store);
initializeIBWebSocketService(store);

async function bootstrap() {
  // Rebuild financial projections from the persisted event log before render.
  await bootstrapFromEventStore(store, eventStore);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </PersistGate>
      </Provider>
    </StrictMode>
  );
}

void bootstrap();
```

- [ ] **Step 2: Typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: both succeed. `eventStore` is correctly typed on the `createAppStore` return.

- [ ] **Step 3: Manual smoke test**

Run: `npm run dev`, open the app, then:
1. Create a position → it appears in the portfolio view.
2. Open DevTools → Application → IndexedDB → `payday-events-<user>` → `events`: confirm a `PositionOpened` record exists.
3. Reload the page → the position is still there (rebuilt from the log, not redux-persist).
4. Close the position → a trade appears in the trades view AND a `PositionClosed` record is in IndexedDB.
5. Reload → closed position + trade both survive.

Expected: all five behave as described. (See `skills/visual-verification` — screenshot the portfolio + trades views before/after reload.)

- [ ] **Step 4: Commit**

```bash
git add src/main.tsx
git commit -m "feat(store): replay event log on boot before render"
```

---

## Task 15: Replay-determinism test (the core ES invariant)

**Files:**
- Create: `src/store/events/replayDeterminism.test.ts`

- [ ] **Step 1: Write the test**

Create `src/store/events/replayDeterminism.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import eventsReducer, { setActor, replayEvents } from './eventsSlice';
import positionsReducer from '../slices/positionsSlice';
import tradesReducer from '../slices/tradesSlice';
import { openPosition, closePosition, editPosition } from '../commands/positionCommands';
import type { Position } from '../../types';

const stock = (id: string): Position =>
  ({ id, type: 'stock', ticker: 'AAPL', portfolio: 'Main', status: 'open', openDate: '2026-01-01', shares: 10, purchasePrice: 100 }) as unknown as Position;

function makeStore() {
  return configureStore({
    reducer: { events: eventsReducer, positions: positionsReducer, trades: tradesReducer },
  });
}

describe('replay determinism', () => {
  it('replay(log) equals incrementally-folded state', () => {
    // Build state incrementally via commands.
    const live = makeStore();
    live.dispatch(setActor('alice'));
    live.dispatch(openPosition(stock('p1'), '2026-06-07T10:00:00.000Z'));
    live.dispatch(editPosition({ ...stock('p1'), shares: 20 } as Position, '2026-06-07T11:00:00.000Z'));
    live.dispatch(openPosition(stock('p2'), '2026-06-07T12:00:00.000Z'));
    live.dispatch(closePosition({ id: 'p1', closeDate: '2026-06-08', realizedPnL: 50 }, '2026-06-08T10:00:00.000Z'));

    const liveState = live.getState();

    // Rebuild a fresh store purely by replaying the captured log.
    const rebuilt = makeStore();
    rebuilt.dispatch(replayEvents(liveState.events.log));
    const rebuiltState = rebuilt.getState();

    expect(rebuiltState.positions.positions).toEqual(liveState.positions.positions);
    expect(rebuiltState.trades.trades).toEqual(liveState.trades.trades);
  });
});
```

- [ ] **Step 2: Run the test**

Run: `npx vitest run src/store/events/replayDeterminism.test.ts`
Expected: PASS. If positions or trades differ, the incremental fold and the replay fold diverge — fix the projection (likely the trades positions-before seed) before proceeding.

- [ ] **Step 3: Full verification**

Run: `npm run typecheck && npm test && npm run lint`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add src/store/events/replayDeterminism.test.ts
git commit -m "test(store): replay determinism invariant for positions/trades"
```

---

## Done criteria (Phase 1)

- [ ] Domain-event log persists to IndexedDB, one record per event, per user.
- [ ] `positions`, `trades`, `priceAlertRules` removed from redux-persist and rebuilt by replay on boot.
- [ ] All position/trade/alert-rule *intents* go through commands that emit domain events; no raw intent dispatches remain (`tsc` enforces this).
- [ ] Trades and the positions `currentValue` are derived (trades projected from `PositionClosed`; `currentValue` updated by the runtime price reducers, not persisted).
- [ ] `tradeMiddleware` removed.
- [ ] Replay-determinism test green; `npm run typecheck && npm test && npm run lint` all green.
- [ ] Manual smoke test (create → reload → close → reload) passes.

## Notes for later phases (not in scope here)

- Phase 2: portfolios + cash/transaction-ledger projection (`PortfolioRenamed` will supersede the Phase-1 `PositionsPortfolioRenamed` shim).
- Phase 4: collapse roll/assignment multi-command handlers in `PortfolioView` into single `OptionRolled`/`OptionAssigned` events.
- Snapshotting for replay performance remains deferred (YAGNI).
