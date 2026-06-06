---
name: payday-business-audit
description: How learning-level gating works in payday-web and how to audit it — features unlock per ski-slope level, and opportunities/strategy creation must respect the user's unlocked level while alerts always show. Use this whenever you review or change what the app shows or lets the user do based on their level (gating, "should this be visible at beginner level?", opportunities on the dashboard, the option wizards, AI proposals), or when doing a functional/business audit of the app.
---

# Business audit: learning-level gating

PayDay is didactic: a user should only see and create a strategy once the matching knowledge level is unlocked. Getting this consistent is the point — the app exists to help users spot opportunities in their own portfolio **and** make sure they understand them, so showing advice or actions beyond their level is a real defect.

## The level model

`src/store/slices/userProgressSlice.ts` defines `LEVEL_CONFIGS` (ski-slope analogy): beginner → medior → senior → expert → offpiste, each owning a set of `FeatureId`s. A user has `unlockedLevels`; `isFeatureAvailable(feature, unlockedLevels)` is the gate. Key mappings: covered_calls/cash_secured_puts/options_basics/wheel_strategy = medior; leaps/pmcc = senior; spreads/iron_condors/kaching = expert. The AI assistant is **not** a gated level feature — keep the FAB always available.

## The core rule: alert vs opportunity

- **Opportunity** ("you could write extra income here") → **level-gated**. Only show / allow creation once the matching feature is unlocked.
- **Alert** (risk on an existing position — ITM short put, negative cash, expiring option) → **always shown**, regardless of level. Hiding a risk warning would be dangerous.

## Where gating is enforced (check all layers)

1. **Routes / sidebar** — `App.tsx` wraps strategy routes in `FeatureGate`; `Sidebar.tsx` hides links via `ROUTE_FEATURE_MAP`.
2. **Opportunity display** — `useAlerts` filters opportunities through `utils/opportunityGating.ts` (`filterOpportunitiesByAccess`, maps opportunity-id prefix → feature) before they reach the dashboard, portfolio overview and detail. Alerts pass through unfiltered.
3. **Creation (wizards)** — `Call/PutOptionWizard` hide action buttons and guard `handleComplete` via `utils/optionFeatureAccess.ts` (`getOptionActionFeature(optionType, action)`): buy→options_basics, sell call→covered_calls, sell put→cash_secured_puts, spreads→spreads.
4. **AI agent** — `services/ai/tools.ts` `applyChanges` skips option proposals above the user's level (`isOptionChangeAllowed`) and reports them as `skipped`; the assistant itself stays available.

## Auditing checklist

When asked to audit gating, walk every surface where a strategy/opportunity/action can appear and confirm it consults `isFeatureAvailable` (directly or via the helpers above). The classic failure mode is a **new surface that re-derives visibility itself** and forgets the gate (e.g. an opportunity engine that never receives the level). For each finding, state: the surface, the feature it should require, and whether it's gated. Distinguish "display" leaks from "creation" leaks. Keep the alert-vs-opportunity rule in mind so you don't over-gate risk warnings.

When adding a new opportunity type or option action, add its feature mapping in `opportunityGating.ts` / `optionFeatureAccess.ts`, or it will leak to too low a level.

## Verify

Gating logic is unit-tested: `opportunityGating.test.ts`, `optionFeatureAccess.test.ts`, `tools.gating.test.ts`. Run `npm run typecheck && npm test && npm run lint`. For UI changes, also verify visually in the dev server. See [[payday-domain]] for the data model and [[payday-coverage-rules]] for coverage/linking.
