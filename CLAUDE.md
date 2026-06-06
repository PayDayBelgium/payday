# CLAUDE.md

Richtlijnen voor Claude/agents die in deze repository werken. Houd dit bestand kort en accuraat; werk het bij wanneer commando's, structuur of valkuilen wijzigen.

## Wat is dit

`payday-web` (v2.0.0) — een options-trading / wheel-strategy platform (portefeuilles, posities, strategieën, alerts, een AI-assistent en een leeromgeving). **Volledig client-side**: er is geen backend; alle state leeft in Redux + `redux-persist` (localStorage) per gebruiker.

Stack: **React 19** · TypeScript (strict) · Redux Toolkit + redux-persist · React Router 7 · Vite 7 · Tailwind 3 · i18next (nl/en/fr) · recharts · `@anthropic-ai/sdk` (in de browser) · Vitest.

> Taal: code-commentaar en UI-teksten zijn **Nederlands**. Commits volgen conventional-commits mét scope, bv. `feat(ai):`, `fix(ai):`, `feat(onboarding):`.

## Commando's

| Doel | Commando |
|------|----------|
| Dev-server | `npm run dev` — Vite op **poort 3000**, opent de browser automatisch |
| Build | `npm run build` — `tsc -b` **daarna** `vite build` (lint draait hier **niet**) |
| Lint | `npm run lint` — `eslint .` (geeft exit 1 bij errors; er staan momenteel ~359 bestaande errors als tech debt) |
| Tests | `npm test` (= `vitest run`) · `npm run test:watch` |

## Architectuur

```
src/
  pages/        # routes, per feature (dashboard, portfolios, strategies, tools, settings, admin, ...)
  components/   # per feature: widgets, modals, common, ai, community, learning, layout, ...
  store/
    slices/     # Redux Toolkit slices (positions, portfolios, trades, tickers, wheels, alerts, ...)
    middleware/ # positionValueMiddleware, tickerPriceMiddleware, tradeMiddleware
    index.ts    # createAppStore(username) factory + persistConfig (whitelist, migrate)
  contexts/     # UI-ephemeral state (Navigation, PageTitle, Toast, AIAssistant) — GEEN domeinstate
  services/     # ai/ (provider-abstractie), priceWebSocketService, ibWebSocketService
  hooks/        # useAppSelector/useAppDispatch (getypeerd), useAlerts, useFeatureAccess, ...
  utils/        # pure berekeningen (pnlCalculations, holdings, alertEvaluator, campaignDetector, ...)
  i18n/         # config + locales/{nl,en,fr}.ts (in sync houden!)
  config/       # zware statische content (educationCurriculum.ts ~105KB, learningResources.ts)
  types/        # index.ts is de bron; Position is een discriminated union op `type`
```

- **Store**: `main.tsx` maakt de echte store via `createAppStore(username)` en geeft die aan `<Provider>` + `initializeWebSocketService(store)`. Lees de store in services via **injectie**, niet via een module-import.
- **Padalias**: `@` → `src/` (geconfigureerd in zowel `vite.config.ts` als `vitest.config.ts`).
- **AI-laag** (`services/ai/`): provider-abstractie (`providers/`), **BYO-key** opgeslagen in `localStorage['payday-ai-config']`, default-model in `config.ts` (`DEFAULT_MODELS.anthropic = 'claude-opus-4-8'`). Veiligheid: **propose-then-confirm** — de agent voert nooit zelf datawijzigingen uit maar stelt ze voor (`tools.ts` `parseProposedChange`/`applyChanges`, regels in `policy.ts`). Gebruikersinhoud wordt als data behandeld, nooit als instructies.

## Valkuilen (lees dit vóór je iets aanraakt)

- **Server-SDK in de browser**: `@anthropic-ai/sdk` wordt in de client gebundeld met `dangerouslyAllowBrowser: true`. Daarvoor stubt `vite.config.ts` (`nodeBuiltinStubPlugin`) alle `node:*`-imports. Raak die plugin niet aan zonder te begrijpen waarom hij bestaat.
- **Geen code-splitting**: er is (nog) geen `React.lazy`/`Suspense`/`manualChunks`. Alles zit in één bundel — wees bewust van wat je eager importeert.
- **Vitest pakt alleen `src/**/*.test.ts`** en draait in `environment: 'node'` (geen DOM). `.test.tsx`/component-tests worden **niet** opgepikt. Houd tests op pure logica tot dit is uitgebreid.
- **Twee bronnen voor tickers** (legacy): `portfolios.tickers` én de `tickers`-slice bestaan naast elkaar. Schrijf nieuwe ticker-logica naar de `tickers`-slice (`ensureTicker`). Zie het review-rapport.
- **Afgeleide portefeuillewaarde**: `portfolio.currentValue` wordt zowel opgeslagen (middleware) als afgeleid (selectors). Wees voorzichtig met nieuwe acties die `position.currentValue` muteren zonder `positionValueMiddleware` te triggeren.
- **Geen CI / geen Prettier**: kwaliteit hangt op lokale discipline. Draai `npm run lint` en `npm test` zelf voor je klaar bent.
- **Niet committen in de root**: screenshots, het lokale `nul`-bestand e.d. horen niet in de tree.

## Conventies

- Gebruik de getypeerde hooks `useAppSelector`/`useAppDispatch`, niet rauwe `useSelector`/`useDispatch`.
- Nieuwe gedeelde UI hoort in `components/common`; vermijd nieuwe ad-hoc `<button>`/`<input>` waar een primitief bestaat.
- Houd `i18n/locales/{nl,en,fr}.ts` in sync (zelfde key-paden); voeg nieuwe UI-strings via `t()` toe, niet hardcoded.
- Posities zijn een discriminated union — narrow op `position.type` (of gebruik de predicates in `utils/holdings.ts`) i.p.v. `as any`.

## Verdere documentatie

- **`docs/CODE-REVIEW-2026-06.md`** — volledige expert-review met bevindingen en een gefaseerd refactorplan.
- `docs/superpowers/specs/` & `docs/superpowers/plans/` — feature-specs en implementatieplannen.
- `PROJECT_STRUCTURE.md` — mapoverzicht. *(Let op: `README.md` en `PROJECT_STATUS.md` zijn deels verouderd.)*
