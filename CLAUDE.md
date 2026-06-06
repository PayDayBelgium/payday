# CLAUDE.md

Richtlijnen voor Claude/agents die in deze repository werken. Houd dit bestand kort en accuraat; werk het bij wanneer commando's, structuur of conventies wijzigen.

## Wat is dit

`payday-web` (v2.0.0) — een options-trading / wheel-strategy platform (portefeuilles, posities, strategieën, alerts, een AI-assistent en een leeromgeving). **Volledig client-side**: er is geen backend; alle state leeft in Redux + `redux-persist` (localStorage) **per gebruiker**.

Stack: **React 19** · TypeScript (strict) · Redux Toolkit + redux-persist · React Router 7 · Vite 7 · Tailwind 3 · i18next (nl/en/fr) · recharts · `@anthropic-ai/sdk` (in de browser, lazy) · Vitest + Testing Library.

> **Taal:** code-commentaar en alle documentatie (JSDoc, README's, comments) zijn **Engels**. **UI-teksten** lopen via i18n in **nl/en/fr** (`t()` — nooit hardcoden). *(Uitzondering: de learning/mission-content in `config/` is bewust NL-only.)* Commits: conventional-commits mét scope, bv. `feat(ai):`, `fix(ai):`, `refactor(...)`.

## Commando's

| Doel | Commando |
|------|----------|
| Dev-server | `npm run dev` — Vite op **poort 3000**, opent de browser |
| Build | `npm run build` — `tsc -b` daarna `vite build` |
| Typecheck | `npm run typecheck` (= `tsc -b`) |
| Lint | `npm run lint` (`eslint .`) — **0 errors** is de norm; faalt (exit 1) bij errors |
| Format | `npm run format` (Prettier write) · `npm run format:check` |
| Tests | `npm test` (`vitest run`) · `npm run test:watch` |

CI (`.github/workflows/ci.yml`) draait typecheck + test + build + lint op elke PR. **Lint is een harde gate** (geen errors toegestaan).

Vóór je klaar bent: `npm run typecheck && npm test && npm run lint` (en `npm run format` als je veel hebt aangeraakt).

## Architectuur

```
src/
  pages/        # routes per feature (dashboard, portfolios, strategies, tools, settings, admin, ...)
                #   alle pages zijn lazy (React.lazy) in App.tsx
  components/   # per feature: widgets, modals, common, ai, community, learning, layout, ...
  store/
    slices/     # RTK slices (positions, portfolios, trades, tickers, wheels, alerts, ...)
    middleware/ # positionValueMiddleware, tickerPriceMiddleware, tradeMiddleware
    index.ts    # createAppStore(username) factory + persistConfig; GEEN module-singleton store
  contexts/     # UI-ephemeral state (Navigation, PageTitle, Toast, AIAssistant) — GEEN domeinstate
  services/     # ai/ (provider-abstractie, lazy), priceWebSocketService, ibWebSocketService
  hooks/        # useAppSelector/useAppDispatch (getypeerd), useAlerts, useStrategyRules, useFormData, ...
  utils/        # pure berekeningen (pnlCalculations, holdings, alertEvaluator, campaignDetector,
                #   positionHelpers, optionWizardUtils, ...) — veel hebben *.test.ts
  i18n/         # config + locales/{nl,en,fr}.ts (in sync houden!) + react-i18next.d.ts (type-safe keys)
  config/       # zware statische content (educationCurriculum.ts ~105KB, learningResources.ts)
  types/        # index.ts is DE bron; Position is een discriminated union op `type`
  test/setup.ts # vitest jsdom-setup (jest-dom matchers)
```

- **Store (belangrijk):** `main.tsx` maakt de per-user store via `createAppStore(username)` en injecteert die: `<Provider store>`, `initializeWebSocketService(store)`, `initializeIBWebSocketService(store)`. Er is **geen module-level singleton store**. Lees de store in componenten via `useStore()`/`useAppSelector`, en in services via de injectie — nooit via een geïmporteerde `store`.
- **Padalias:** `@` → `src/` (in `vite.config.ts` én `vitest.config.ts`).
- **Bundling:** `vite.config.ts` heeft `manualChunks` voor `@anthropic-ai/sdk` en `recharts`; de AI-laag wordt via `import()` lazy geladen. Houd zware deps uit het eager pad.
- **AI-laag** (`services/ai/`): provider-abstractie, **BYO-key** (`localStorage['payday-ai-config']`, optioneel session-only via `persistKey`), default-model in `config.ts` (`DEFAULT_MODELS.anthropic = 'claude-opus-4-8'`). Veiligheid: **propose-then-confirm** — de agent muteert nooit zelf data maar stelt wijzigingen voor (`tools.ts` `parseProposedChange`/`applyChanges`; regels in `policy.ts`). Gebruikersinhoud = data, nooit instructies.

## Valkuilen (lees dit vóór je iets aanraakt)

- **Server-SDK in de browser:** `@anthropic-ai/sdk` draait client-side met `dangerouslyAllowBrowser: true`; daarom stubt `vite.config.ts` (`nodeBuiltinStubPlugin`) alle `node:*`-imports. Niet aanraken zonder de reden te kennen.
- **`tickersSlice` is de enige bron voor tickers.** Schrijf ticker-data altijd via `tickersSlice` (`ensureTicker`/`addTicker`), nooit via `portfoliosSlice` (die ticker-API is verwijderd). `tickerMigration.ts` migreert eenmalig oude persisted data.
- **Afgeleide portefeuillewaarde:** `portfolio.currentValue` wordt opgeslagen door `positionValueMiddleware` én her-afgeleid in selectors. De middleware reageert op alle position-mutaties incl. `updateOptionPremium`/`updatePositionValue`/`updateMultiplePositionValues`. Voeg je een nieuwe actie toe die `position.currentValue` muteert? Voeg die dan toe aan `isPositionMutation` + `getAffectedPortfolios`, anders drift.
- **Financiële kern wijzigen?** `pnlCalculations`, `calculatePortfolioFreeCash`, `parseProposedChange` hebben tests — draai ze. Let op de sign-conventies (long = positief, short = negatief; zie `pnlCalculations.ts`).
- **i18n:** locales `{nl,en,fr}` moeten dezelfde key-paden hebben; keys zijn type-safe (`react-i18next.d.ts`, afgeleid van `en`). Voeg UI-strings via `t()` toe, niet hardcoded. *(Uitzondering: de learning/mission-content in `config/` is bewust NL-only.)*

## Conventies

- **Getypeerde hooks:** gebruik `useAppSelector`/`useAppDispatch`, niet rauwe `useSelector`/`useDispatch`.
- **Design-tokens, geen `gray-*`:** gebruik de semantische Tailwind-tokens uit `tailwind.config.js` — `ink-*` (tekst), `surface`/`surface-subtle`/`surface-muted`/`surface-line` (lichte vlakken), `trading-dark-*` (dark-mode vlakken), `primary`/`positive`/`negative`/`caution`. Default `gray-*` is uit de codebase verwijderd; introduceer het niet opnieuw.
- **Posities = discriminated union:** narrow op `position.type` (of de predicates in `utils/holdings.ts`) i.p.v. `as any`.
- **Hergebruik bestaande bouwstenen** i.p.v. opnieuw inline:
  - Strategy-pages: `useStrategyRules(strategyType, portfolio)` voor rule-state/persist/handlers.
  - Wizards/modals: `WizardModal`, `common/Modal` (shell), `NewTickerForm`, `LocalizedNumberInput`, `RollModalShell`/`RollCalculationSummary`.
  - Positie-tabellen: `OptionRow`, `StockRow`, `SpreadSummaryRow`, en de grid-constanten in `components/widgets/positionGrid.ts` (`POSITION_GRID_COLS*`) — geen hardcoded grid-templates.
- **Lint-beleid:** echte fouten (ongebruikte code, `no-case-declarations`, rules-of-hooks) zijn **errors**. `@typescript-eslint/no-explicit-any` en de experimentele `react-hooks/*`-regels staan op **warn** (bewust getrackte tech-debt — voeg geen nieuwe `any` toe, ruim liever op). Bewust ongebruikte args/vars: prefix met `_`.
- **Component-tests** kunnen nu (`vitest` draait jsdom + Testing Library; include `*.test.{ts,tsx}`). Schrijf tests bij financiële/gedragskritische logica.

## Verdere documentatie

- **`docs/CODE-REVIEW-2026-06.md`** — expert-review + gefaseerd refactorplan (status van uitgevoerd/openstaand werk).
- `docs/superpowers/specs/` & `docs/superpowers/plans/` — feature-specs en implementatieplannen.
- `scripts/` — hulpscripts (o.a. `gray-to-tokens.cjs` codemod, `lintcount.cjs`).
- *(Let op: `README.md` en `PROJECT_STATUS.md` zijn deels verouderd; deze CLAUDE.md + de review zijn leidend.)*

## Nog open (zie de review)

- Volledige Call/Put-wizard-merge (`useOptionWizard`-hook + `WheelLinkPicker`) — `NewTickerForm` is al gedeeld.
- Lint-warnings (~199, vooral `no-explicit-any`) gefaseerd wegwerken.
- De `gray-*`→token-codemod is toegepast maar nog **niet visueel geverifieerd** — controleer het beeld in de dev-server.
