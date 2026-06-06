---
name: payday-domain
description: Domain context for the payday-web options-trading platform — the position data model, campaign detection (covered call / PMCC / KaChing / wheel), the per-user Redux store, and the well-known pitfalls. Use this whenever you work anywhere in this repo on positions, strategies, portfolios, alerts/opportunities, or the AI assistant, even if the task seems small — getting the model and conventions right up front prevents subtle financial bugs.
---

# PayDay domain context

`payday-web` is a fully client-side options-trading / wheel-strategy platform (React 19, TypeScript strict, Redux Toolkit + redux-persist, Vite, Tailwind, i18next nl/en/fr). There is **no backend**; all state lives in Redux, persisted to localStorage **per user**. Read `CLAUDE.md` first — it is the source of truth for commands and conventions.

## Position data model (the part that bites people)

`src/types/index.ts` is the single source of truth. There are **two overlapping models**:

- **Generic, current model** — what the wizards actually create: `CallOption` (`type: 'call'`) and `PutOption` (`type: 'put'`), each with `action: 'buy' | 'sell'`, `strike`, `expiration`, `contracts`, `premium`, optional `underlyingId` (link to parent) and `wheelId`. `StockPosition` (`type: 'stock' | 'etf'`).
- **Legacy, discriminated types** — `LEAP` (`type: 'leap'`), `CoveredCall` (`type: 'covered-call'`), `CashSecuredPut`, `KaChingStrategy`, etc. These are **mostly not produced by the wizards anymore**. Some old pages (e.g. `pages/strategies/PMCCStrategy.tsx`, `CoveredCallsStrategy.tsx`) still filter on `type: 'leap'` / `'covered-call'` and therefore show nothing for real positions — treat those pages as legacy until migrated.

A short call/put is linked to its parent through the optional `underlyingId`. A LEAPS is just a long `CallOption` with a long horizon (see `isLEAPS` in `utils/campaignDetector.ts`: ≥ 90 days between open and expiration).

## Campaigns (how strategies are presented)

`utils/campaignDetector.ts` derives `Campaign` objects from raw positions per ticker:
- **covered-call**: stock + short calls.
- **pmcc**: long LEAPS call + short calls (strike > LEAPS strike).
- **kaching**: long protective put + short puts.
- **wheel**: positions linked via `wheelId` (built from explicit `WheelCampaign` records).

`CampaignView.tsx` renders these with the parent (root) and the covered options grouped together, including a collateral label. Wheel-linked positions belong to their own wheel campaign and are excluded from the CC/PMCC allocation.

## Store (important)

`main.tsx` builds a per-user store via `createAppStore(username)` and injects it. There is **no module-level singleton store**. Read state in components via `useAppSelector`/`useStore`, in services via injection. `tickersSlice` is the only source for ticker data (incl. `currentPrice`). Derived portfolio value is maintained by `positionValueMiddleware`.

## AI assistant

`services/ai/` is a BYO-key, propose-then-confirm agent: it never mutates data directly but proposes `ProposedChange`s the user confirms (`tools.ts` `parseProposedChange`/`applyChanges`). The assistant FAB is **always available** (it is not gated behind a learning level), but `applyChanges` still enforces level-gating on what it may create — see [[payday-business-audit]].

## Conventions

- Typed hooks `useAppSelector`/`useAppDispatch`. Design tokens, no `gray-*`. Narrow on `position.type` (or `utils/holdings.ts` predicates), avoid `as any`.
- **Comments and documentation are English.** UI strings go through i18n (`t()`, nl/en/fr in sync). Learning/mission content in `config/` is intentionally NL-only data (not comments).
- Always finish with `npm run typecheck && npm test && npm run lint`. Write tests for financial/behaviour-critical logic (`utils/*.test.ts`).

## Related skills

- [[payday-coverage-rules]] — how covered calls / PMCC are linked to their parent and how coverage/opportunities are computed.
- [[payday-business-audit]] — how learning levels gate features, opportunities and creation.
