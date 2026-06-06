# Code-review payday-web — expert-revisie

> Datum: 2026-06-06 · Branch: `feature/ai-assistent` · Omvang: ~57k regels, 213 TS/TSX-bestanden
> Methode: 11 parallelle expert-reviews per zone + adversariële verificatie van elke bevinding tegen de echte code (65 bevindingen, 0 weerlegd, severities bijgesteld na verificatie).

## Samenvatting

De codebase heeft een **gezonde fundering**: een domeingedreven mapindeling, een per-user Redux-store-factory met `redux-persist`, een rijk getypeerd domeinmodel (discriminated union `Position`), een nette en geteste AI-laag (`services/ai/`), en locale-bestanden die exact in sync zijn. `tsc` komt schoon door en alle 62 unit-tests slagen.

De schuld zit op vier assen:

1. **Correctheid (een handvol latente bugs)** — een dubbele Redux-store-instantie, een drift tussen opgeslagen en berekende portefeuillewaarde op het live koers-pad, een dubbele bron van waarheid voor tickers, en een rules-of-hooks-schending.
2. **Duplicatie & god-components** — `PortfolioView` (2532 r.), `CampaignView` (1466 r.), de near-identieke `CallOptionWizard`/`PutOptionWizard` (samen 2655 r.), en zes bijna identieke strategy-pages. Dit is de grootste structurele schuld.
3. **Performance** — geen code-splitting (de volledige `@anthropic-ai/sdk` + 105 KB curriculum in de hoofdbundle), enkele O(n·m)-berekeningen op het render-/koers-pad, en ontbrekende memoization.
4. **Proces/DX** — geen `CLAUDE.md`, geen CI, geen Prettier, lint niet in de build (359 bestaande errors als tech debt), en een vrijwel ongebruikt design-system (`Button`/`Input`/`Modal`).

Na verificatie is **geen enkele bevinding `critical`**: de oorspronkelijk als kritiek gemarkeerde store-bug is in de praktijk grotendeels latent. Wel zijn er ~8 `high`-bevindingen die prioriteit verdienen.

### Telling na verificatie

| Severity | Aantal | Aard |
|----------|--------|------|
| High | ~8 | correctheid (latent) + structurele duplicatie + bundle |
| Medium | ~25 | onderhouds-/perf-/type-/DX-schuld |
| Low | ~17 | opruiming, micro-optimalisatie, cosmetisch |

> **Belangrijke nuance uit de verificatie:** sommige eerste-ronde-claims waren overdreven. `as any`-casts zijn er ~82 (niet 143); `gray-*`-tokens ~5500 (niet 2555); `npm run lint` geeft **wel** exit 1 (niet "stille exit 0"). Die correcties zijn hieronder verwerkt.

---

## Bevindingen per zone

Legenda severity = **na** adversariële verificatie.

### 1. Architectuur & state-management

| # | Bevinding | Sev | Effort | Kern |
|---|-----------|-----|--------|------|
| A1 | Dubbele Redux-store-instantie | **High** | M | `store/index.ts:90` exporteert een statische default-store náást de echte per-user store uit `main.tsx`. `App.tsx:67` (`migrateTickersToStore`) en heel `ibWebSocketService.ts` lezen/dispatchen op de verkeerde, lege store. `priceWebSocketService` doet het wél goed (injectie). Vandaag grotendeels latent (IB-service is dormant, migratie is stille no-op), maar een echte correctheids-valkuil. → DI/één bron. |
| A2 | Dubbele bron van waarheid voor tickers | **High** | M | `portfolios.tickers` (oude slice) **én** `tickers`-slice bestaan met dubbele reducers/selectors. 3 wizards schrijven naar de **oude** slice (`addTicker` uit `portfoliosSlice`), terwijl `TickerSelector` uit de **nieuwe** leest → een via wizard toegevoegde ticker verschijnt pas na reload, en updates migreren nooit. `migrateTickersToStore` draait bij elke start als permanente sync-laag. |
| A3 | Afgeleide portfoliowaarde dubbel + sync-gap | **High** | L | `portfolio.currentValue` wordt in state opgeslagen (middleware) én opnieuw afgeleid in 2 selectors. `positionValueMiddleware` luistert niet naar `updateOptionPremium` (wél op elke optie-koers-tick gedispatcht) → `currentValue` veroudert terwijl selectors de verse `position.currentValue` combineren met de stale portefeuillewaarde = **reproduceerbare drift in cash/breakdown op het live datapad**. Formule staat op 3 plekken. |
| A4 | God-components | **High** | L | `PortfolioView` 2532 r. (return ~1314 r.), `CampaignView` 1466 r., `PortfolioDetail` 1091 r. mengen data-aggregatie, filter-state, business-handlers en rendering. Geen ervan heeft tests. `calculateDTE`/`isLEAPS` worden hier lokaal her-geïmplementeerd terwijl ze al als util bestaan. |
| A5 | Factory-selectors in render | Medium | M | `selectPositionsByPortfolio(...)` e.d. maken per aanroep een nieuwe `createSelector` (size-1 cache) en worden direct in render aangeroepen (`PMCCStrategy:20`, `StocksETFsStrategy:87`) → memoization waardeloos. Het juiste patroon (`makeSelect…` + `useMemo`) bestaat al (`StocksETFsStrategy:97`). 2 van de 5 genoemde selectors zijn dode code. |
| A6 | `tickerPriceMiddleware` cascade | Medium | M | Per koers-tick: N `updatePosition`-dispatches → elk triggert een volledige `calculatePortfolioValue` (over álle posities + transacties) + `updatePortfolioValue`. O(posities·transacties) per tick op realtime-frequentie. `updateMultiplePositionValues` bestaat al maar wordt nergens gebruikt/afgevangen. |
| A7 | `Header` abonneert op 9 volledige slices | Medium | S | `Header.tsx:58-66` selecteert 9 hele slice-objecten, enkel voor `getBackupState()` (alleen bij backup-klik). Elke mutatie (incl. koers-ticks) re-rendert de always-mounted Header. → lazy via `store.getState()`. |
| A8 | `services/ai/tools.ts` mengt store-mutaties met provider-logica | Low | M | Functioneel netjes (DI via params, dus testbaar), maar schema/parse en Redux-mutaties zitten in één bestand. Nice-to-have opschoning. |
| A9 | Halfgevulde barrel-exports | Low | M | `components/index.ts` dekt 16/77 componenten; sommige submappen hebben `index.ts`, andere niet; nauwelijks gebruikt. Kies één conventie of laat de top-level barrel vallen. |
| A10 | `selectPortfolioSummaryByName` niet-gememoiseerde wrapper | Low | S | `.find()`/`.filter()` zonder stabiele referentie → omzetten naar `createSelector` met argument-selector. |

### 2. Duplicatie — modals & wizards

| # | Bevinding | Sev | Effort | Kern |
|---|-----------|-----|--------|------|
| W1 | `CallOptionWizard` ≈ `PutOptionWizard` (twins) | **High** | L | ~90% identieke state, effects, steps en JSX (spread-legs, summary, wheel-linking). Verschil = kleuren, i18n vs hardcoded NL, strike-richting `<`/`>`. Put is grotendeels een subset (mist covered-call-logica). Reeds gedivergeerd (Put heeft hardcoded NL incl. typfout "Premuim"). → `useOptionWizard(type)`-hook + presentational componenten. |
| W2 | Inline spread-math + dode imports | Medium | M | Beide wizards importeren `validate*Spread`/`calculate*SpreadSummary`/`generate*Id`/`calculateSpreadCollateral` maar roepen ze **nooit** aan; de wiskunde en id's (`spread-${Date.now()}`) staan inline gedupliceerd. Momenteel algebraïsch gelijk (geen databug), wel onderhoudsrisico. |
| W3 | Locale-getallen-input 10×/wizard gedupliceerd | Medium | M | `value={xText}` + `onChange{ validateNumberInput → setXText + parseLocalizedNumber }` herhaalt zich 10× per wizard, met 4 parallelle `*Text`-states. → gedeelde `<LocalizedNumberInput>`. |
| W4 | `RollOptionModal` ≈ `SpreadRollModal` | Medium | M | Volledig gekopieerde modal-shell, help-sectie en credit/debit-`Berekening`-summary (byte-identiek). Per-leg blokken in Spread onderling gekopieerd (kleurwissel). → `RollModalShell` + `RollCalculationSummary` + `RollLegFields`. |
| W5 | Ticker-aanmaak-subform 3× gedupliceerd | Medium | M | `createTickerFromFormData`/`DEFAULT_NEW_TICKER_DATA` bestaan maar worden niet gebruikt; inline creatie + reset-object + JSX staan dubbel/driedubbel. → `<NewTickerForm>`. |
| W6 | `useAppSelector` vs rauwe `useSelector` | Low | S | Inconsistent tussen de twee wizards. Standaardiseer op `useAppSelector`. |

### 3. Duplicatie — widgets & pages

| # | Bevinding | Sev | Effort | Kern |
|---|-----------|-----|--------|------|
| P1 | Near-identieke strategy-pages | **High** | M | 6 pages (CSP, CoveredCalls, LEAPS, Spreads, KaChing, StocksETFs) dupliceren rule-state, `localStorage`-persist en 5 handlers + de 3-tab-balk. **Copy-paste-bug:** `CoveredCallsStrategy:124` en `LEAPSStrategy:117` hebben `activeTab === 'positions' ? {} : handleAddRule()` — de positions-tak doet niets (in CSP wél zinvol). → `useStrategyRules()` + `<StrategyPageShell>`. *(PMCC heeft dit patroon niet.)* |
| P2 | `PortfolioView` god-component | **High** | L | Zie A4. Return van ~1314 r. met inline spread-summary-rij (1847-2131, ~285 r.). → hooks + `<PositionControlsBar>`/`<SpreadSummaryRow>`/`<PositionGroup>`. |
| P3 | Grid-template gekopieerd | Medium | M | `grid-cols-[32px_minmax(140px,1fr)_…]` staat ~7× hardcoded (PortfolioView, CampaignView, OptionRow, StockRow); 10- vs 12-koloms varianten lopen uit sync. Comment: "Same grid structure as PortfolioView". → `POSITION_GRID_COLS` constant + `<PositionRowGrid>`. |
| P4 | Filter-popup 2× binnen `PortfolioView` | Medium | S | Globale (1294-1350) en per-groep (1686-1751) filter identiek op tekstgrootte/`stopPropagation` na. → `<PositionFilterControls size>`. |
| P5 | 3× `formatCurrency` met verschillende signatures | Medium | M | `currency.ts` (dood), `numberFormat.ts` (20 consumers), `currencyHelpers.ts` (4 consumers). Naamcollisie = footgun. Getalformattering is identiek; verschil zit in symboollogica. → consolideren of hernoemen. |
| P6 | Inline spread-summary-rij niet geëxtraheerd | Medium | M | Terwijl `OptionRow`/`StockRow` dat wél zijn. → `<SpreadSummaryRow>`. |
| P7 | `CampaignView` mengt tabs/empty-states/rendering/modals | Medium | L | 16 `useState` over verschillende concerns. → `<CampaignCard>` + `<CampaignFilterTabs>`. |

### 4. Design-system & toegankelijkheid

| # | Bevinding | Sev | Effort | Kern |
|---|-----------|-----|--------|------|
| D1 | `Button`/`Input`/`Modal` vrijwel ongebruikt | Medium | L | `Button` 1 import, `Input`/`Modal` 0; tegenover 408 rauwe `<button>` (91 bestanden) en 203 rauwe `<input>` (50 bestanden). *(Andere common-componenten — `NumberInput`, `TickerAutocomplete`, `FridayDatePicker`, `PortalTooltip` — worden wél breed gebruikt.)* → migreren of de trio verwijderen. |
| D2 | ~5500 `gray-*`-tokens buiten het palet | Medium | L | `tailwind.config.js` definieert `ink/surface/trading-dark` maar geen `gray`; `gray-*` valt terug op default-neutraalgrijs (geen blauwzweem) over 86 bestanden. Zelfs `Input`/`Modal` gebruiken rauwe grays terwijl `Button` tokens gebruikt. Cosmetisch. → codemod naar semantische tokens, begin bij `Input`/`Modal`. |
| D3 | Modals dupliceren shell i.p.v. `common/Modal` | Medium | M | 14 modal-bestanden rollen een eigen backdrop; `common/Modal` (met Escape, scroll-lock, `role=dialog`) wordt 0× gebruikt. Gevolg: ook **inconsistente a11y** (`WizardModal`/`ConfirmDialog` missen Escape + dialog-rol). |
| D4 | Zwakke a11y op icon-only/autocomplete | Medium | M | 14 `aria-label` vs 408 `<button>`. `FridayDatePicker` enkel `title=`; `TickerAutocomplete` mist combobox-rolstructuur (terwijl keyboardnav wél bestaat); `ConfirmDialog`-backdrop is klikbare `<div>` zonder toetsenbord-equivalent. |
| D5 | `Input` genereert id met `Math.random()` per render | Low | S | → React 19 `useId()`. (`useId` wordt nu 0× gebruikt.) Ook `substr` → `slice`. |

### 5. Performance — renders & berekeningen

| # | Bevinding | Sev | Effort | Kern |
|---|-----------|-----|--------|------|
| R1 | `@anthropic-ai/sdk` eager in hoofdbundle + draait in browser | **High** | L | Statische keten `Layout → AIAssistantProvider → AIAssistantContext → anthropicProvider` (`import Anthropic`). Geen `React.lazy`/`Suspense` (0 hits). De ~90-regelige `nodeBuiltinStubPlugin` in `vite.config.ts` is het bewijs dat een server-SDK de browser in wordt geforceerd. `dangerouslyAllowBrowser: true`, key uit plaintext `localStorage`. → dynamic `import()` + `manualChunks`; structureel: serverless proxy. |
| R2 | Geen route-based code-splitting (105 KB curriculum + ~30 pages eager) | **High** | M | Alle pages statisch in `App.tsx`; `MissionStatement` trekt `educationCurriculum.ts` (105 KB) + `learningResources.ts` (26 KB) in de hoofdbundle; `recharts` (4 bestanden) ongesplitst. → `lazy()` + `<Suspense>` + `manualChunks`. |
| R3 | `useAlerts` O(posities·alerts) op koers-pad | Medium | M | `PortfolioView` bouwt 2 Maps door per positie `getOpportunities/AlertsForPosition()` te roepen → elk een `.filter()` over alle alerts; `getOpportunitiesForPosition` doet ook `positions.find` per positie. Een koers-tick invalideert de hele keten. → bouw één keer `Map<positionId, items[]>` in `useAlerts`. |
| R4 | `MultiPortfolioChart` O(dates·portfolios·data) + mount-bug | Medium | S | `Dashboard:306` geeft een verse `portfolios.map(...)`-array door (breekt memo); `data.find(...)` in dubbele loop. Daarnaast leest `useState(new Set(...))` portfolios alleen bij mount → nieuwe portfolio's zijn standaard onzichtbaar tot legenda-toggle. → memo-prop + `Map`-lookup + effect-sync. |
| R5 | `GroupedStockList` rekent volledig in render-body | Medium | M | Grouping/GAK/PnL/sort/filter zonder `useMemo` → herberekent bij elke toetsaanslag in het zoekveld; per groep `allStorePositions.filter` + `computeCoveredCallCapacity`. → `useMemo`-pijplijn + precompute sold-calls in `Map` + `EMPTY_MAP`-constante. |
| R6 | `getSpreadId` regex per positie, ~14 call-sites | Medium | M | `notes.match(/Spread ID: …/)` herhaald in alle alert-evaluators per `evaluateAllAlerts` (re-runt op elke koers-tick). → `Map<positionId, spreadId>` of expliciet `Position.spreadId`-veld. |
| R7 | `OptionRow`/`StockRow` niet `React.memo` | Low | S | Maar call-sites geven inline arrows/objecten door → memo helpt pas ná het stabiliseren van callbacks. Lijsten zijn klein (tientallen rijen). Micro-optimalisatie. |
| R8 | `tickers.find()` lineair in lussen | Low | S | O(N·M) in 6 evaluators; realistisch klein, microseconden. → `Map<symbol, Ticker>`. |
| R9 | `evaluateAllAlerts` filtert positions ~15× | Low | M | Partitioneer posities één keer bovenin. |
| R10 | Geen lijst-virtualisatie | Low | L | Pas nuttig bij honderden posities; doe ná de memo-fixes. |

### 6. Types & kwaliteit

| # | Bevinding | Sev | Effort | Kern |
|---|-----------|-----|--------|------|
| T1 | Runtime schrijft velden die niet in de types staan | Medium | M | `closePosition` schrijft `(pos as any).closePrice/.closePremium/.realizedPnL`; `updateOptionPremium` schrijft `.delta`. Deze staan niet op de positie-interfaces; `campaignDetector` leest ze terug via `(c as any).…|| 0`. Werkt runtime, maar compiler kan typo's niet vangen. → velden toevoegen (of `ClosablePosition`-mixin), `as any` weg. |
| T2 | `as any` omzeilt de discriminated union (~82 casts, 22 bestanden) | Medium | L | Waar narrowing op `type` of een predicate volstaat. Predicates bestaan al (`holdings.ts`). → narrowing + `no-explicit-any`-regel. *(Eerste claim "143 casts/PortfolioView koploper 37" was overdreven — werkelijk ~82, PortfolioView 9.)* |
| T3 | Middleware typeert actions als `any` | Medium | M | `positionValueMiddleware`/`tickerPriceMiddleware` nemen `action: any` → ongetypeerde payloads. → RTK `isAnyOf(...)`/`.match()`. *(`tradeMiddleware` doet het al beter via `UnknownAction`.)* |
| T4 | Dood, conflicterend `Position`-type in `types/position.ts` | Low | S | Tweede `interface Position` met andere shape, 0 importers. → verwijderen. |
| T5 | Zwakke generics in `useFormData` + `Record<string,any>` parameter-bags | Low | M | `updateField(field, value: any)`. → `<K extends keyof T>(field: K, value: T[K])`. |

### 7. Tests, build & dode code

| # | Bevinding | Sev | Effort | Kern |
|---|-----------|-----|--------|------|
| Q1 | Lint niet in build/CI; 359 errors als tech debt | Medium | M | *(Correctie: `npm run lint` geeft **exit 1**, geen stille faal.)* `build` = `tsc -b && vite build` draait lint niet, en er is geen CI. Errors: `no-unused-vars` 150, `no-explicit-any` 125, `react-hooks/*` ~71. → lint als falende CI-stap, errors gefaseerd. |
| Q2 | Rules-of-Hooks-schending in `AssignmentModal` | Medium | S | `if (!isShort) return null` op r.39 **vóór** `useMemo` op r.44. Latent (modal wordt conditioneel gemount, `action` is stabiel per mount), maar echte lint-error. → early-return ná alle hooks. |
| Q3 | Financiële kern ongetest | Medium | L | `alertEvaluator` (1169 r.), `campaignDetector` (670 r.), `pnlCalculations`, `tools.ts` (apply-pad dat geld-mutaties dispatcht) hebben geen tests. → pure-functie tests voor `calculatePortfolioFreeCash`, `pnlCalculations`, `parseProposedChange`/`applyChanges`. |
| Q4 | Mock-data + hardcoded admin-credentials in `LoginPage` | Medium | M | `mockData` in het productie-bundlepad (alleen door `LoginPage` geïmporteerd); `ADMIN_USERNAME='admin'`/`ADMIN_PASSWORD='payday'` hardcoded met `window.location.reload()` als auth. *(Auth is volledig client-side, dus geen server-privilege — wel uit de bron halen.)* → seed achter env/feature-flag. |
| Q5 | Functionele TODO's met foute UI-cijfers | Low→**fix** | S | `CashOnderpandAnalysis.tsx:69` `totalCash: 10000 // TODO` (hardcoded) en `PMCCStrategy.tsx:272` `isITM = false // TODO`. Deze tonen **verkeerde getallen** — los op of markeer zichtbaar. |
| Q6 | Dode code | Low | S | `generateMockAlerts.ts` (0 importers), `types/position.ts`, `data/strategyEducation.ts` (11.8 KB, 0 importers), dode functieparameters in `getPortfolioStrategyRules`/`getAllStrategyRules`. |
| Q7 | `console.*` (39× / 16 bestanden), geen `no-console` | Low | S | Vooral in de WebSocket-services. → `no-console` (allow warn/error). |

### 8. i18n & config-data

| # | Bevinding | Sev | Effort | Kern |
|---|-----------|-----|--------|------|
| I1 | Educatie-content hardcoded NL, omzeilt i18n | **High** | L | `educationCurriculum.ts` (105 KB) + `learningResources.ts` (809 r.) + de learning/mission-componenten gebruiken **geen** `useTranslation` → EN/FR-gebruikers krijgen 100% Nederlandse content terwijl de rest van de app vertaald is. → beslis expliciet (NL-only documenteren óf per-taal content); minimaal de quiz-chrome via `t()`. |
| I2 | Geen code-splitting van content/SDK | **High** | M | Zie R1/R2 (overlapt). |
| I3 | `callWizard`/`putWizard` locale-subtrees gedupliceerd (×3 talen) | Medium | M | `tickerStep` byte-identiek tussen call/put in alle 3 locales (~63 redundante strings); detailsStep deels. → gedeelde `optionWizard.*`-namespace. |
| I4 | Translation-keys niet type-veilig | Low | S | Geen `react-i18next` `CustomTypeOptions`-augmentatie → `t()` accepteert elke string; `MessageList:17` `as unknown as string[]`. → module-augmentatie. |
| I5 | `getLessonById` geeft `lesson: any` terug | Low | S | → concreet lesson-type. |

### 9. Claude/DX & projecthygiëne

| # | Bevinding | Sev | Effort | Kern |
|---|-----------|-----|--------|------|
| C1 | Geen `CLAUDE.md` | Medium | S | Build/test/valkuilen verspreid over `package.json`, `PROJECT_STRUCTURE.md` en een verouderde `PROJECT_STATUS.md`. **Opgelost door deze review** (zie `CLAUDE.md` in de root). |
| C2 | Verouderde/tegenstrijdige docs | Medium | S | `README.md:35` zegt "React 18" (is 19); "Coming Soon" lijst features die al bestaan (CSP/KaChing/Tickers/import); dode link naar niet-bestaande `REQUIREMENTS.md`; 3 concurrerende `.md`-bronnen. |
| C3 | Vitest sluit `.tsx`-tests + DOM uit | Medium | M | `environment: 'node'`, `include: ['src/**/*.test.ts']` → component/hook-tests onmogelijk. → `{ts,tsx}` + jsdom/happy-dom + `@testing-library/react`. |
| C4 | Geen CI, geen Prettier | Medium | M | Alleen `netlify.toml` (deploy). Geen GitHub Actions, geen formatter, geen pre-commit. → CI-workflow (`npm ci`/`lint`/`test`/`build`) + Prettier. |
| C5 | Repo-root vervuild | Low | S | Lokaal 186 MB `nul`-bestand (Windows-redirect-artefact, wél gitignored) + 40 getrackte root-screenshots. → `nul` lokaal verwijderen, screenshots `git rm --cached` naar `docs/`. |
| C6 | Anthropic-key in browser, plaintext `localStorage` | Medium | M | Bewust BYO-key personal-use-model (UI erkent dit), maar key staat onversleuteld en elke XSS leest hem. → in-memory/session-only optie, optioneel `VITE_`-proxy-pad, grens documenteren. |

---

## Gefaseerd refactorplan

De fasen zijn geordend op **risico-verlaging vóór investering**: eerst correctheid en een vangnet, dan performance, dan de grote structurele refactors. Elke fase is zelfstandig mergebaar.

### Fase 0 — Correctheid & opruiming (1–2 dagen, laag risico)
> Echte (latente) bugs en risicoloze schoonmaak. Levert direct waarde, raakt weinig.

1. **Store-DI** (A1): verwijder de statische default-store; geef de runtime-store door aan `migrateTickersToStore` (via `useStore()`) en aan `ibWebSocketService` (zoals `priceWebSocketService` al doet).
2. **Ticker single source of truth** (A2): laat de 3 wizards `tickersSlice.ensureTicker`/`addTicker` dispatchen; verwijder de ticker-reducers/selectors uit `portfoliosSlice`; maak van `migrateTickersToStore` een eenmalige `persistConfig.migrate`-stap.
3. **Portefeuillewaarde-drift** (A3): laat `positionValueMiddleware` ook reageren op `updateOptionPremium`/`updateMultiplePositionValues`, óf maak `currentValue` puur afgeleid. Centraliseer de formule op één plek.
4. **Rules-of-Hooks** (Q2): verplaats de early-return in `AssignmentModal` ná de hooks.
5. **Copy-paste-bugs** (P1): fix `activeTab === 'positions' ? {} : …` in `CoveredCallsStrategy`/`LEAPSStrategy`.
6. **Foute UI-cijfers** (Q5): werk `CashOnderpandAnalysis` `totalCash` en `PMCCStrategy` `isITM` af.
7. **Dode code** (Q6, T4, I5): verwijder `generateMockAlerts.ts`, `types/position.ts`, `data/strategyEducation.ts`, dode wizard-imports en dode functieparameters.
8. **Repo-hygiëne** (C5) + **README** (C2): verwijder lokaal `nul`, de-track root-screenshots, werk `README.md` bij (React 19, dode link weg).

### Fase 1 — Vangnet & tooling (2–3 dagen)
> Maak het veilig om daarna grote refactors te doen.

1. **`CLAUDE.md`** (C1) — geleverd door deze review.
2. **CI-workflow** (C4): GitHub Actions met `npm ci` → `lint` → `test` → `build`, falend op PR's.
3. **Lint als gate** (Q1): `eslint . --max-warnings 0` in CI; ruim eerst de `react-hooks`-errors op (echte bugs), daarna `no-unused-vars`.
4. **Prettier** (C4) + `format`-script.
5. **Vitest uitbreiden** (C3): `include: '{ts,tsx}'`, jsdom/happy-dom, `@testing-library/react`.
6. **Tests voor de financiële kern** (Q3): `calculatePortfolioFreeCash`, `pnlCalculations`, `parseProposedChange`/`applyChanges`, kern van `alertEvaluator`.

### Fase 2 — Performance (2–4 dagen, meetbaar)
> Begrensde, hoog-impact ingrepen. Doe code-splitting eerst (grootste winst op initial load).

1. **Code-splitting** (R1, R2, I2): `lazy()` + `<Suspense>` voor routes; dynamic `import()` voor de AI-laag; `build.rollupOptions.output.manualChunks` voor `@anthropic-ai/sdk`, `recharts` en de education-data.
2. **`useAlerts` Maps** (R3): één `Map<positionId, AlertItem[]>`/`opportunities[]` → O(posities).
3. **Header lazy backup** (A7): `store.getState()` in de click-handler.
4. **Selectors standaardiseren** (A5): `makeSelect…` + `useMemo`; deprecate de factory-varianten.
5. **Middleware-batch** (A6): `updateMultiplePositionValues` + één portefeuille-herberekening per tick.
6. **`MultiPortfolioChart`** (R4), **`GroupedStockList`** (R5): memo-props + `Map`-lookups + `useMemo`-pijplijn; fix de visiblePortfolios-mount-bug.
7. **Alert-evaluator Maps** (R6, R8): `Map<positionId, spreadId>` en `Map<symbol, Ticker>` één keer in `evaluateAllAlerts`.
8. **`React.memo` + stabiele callbacks** (R7, daarna eventueel virtualisatie R10).

### Fase 3 — Duplicatie & god-components (1–2 weken, hoogste effort)
> De grootste structurele schuld. Per item zelfstandig mergebaar; tests uit Fase 1 dekken het netwerk af.

1. **Strategy-pages** (P1): `useStrategyRules(strategyType, portfolio)` + `<StrategyPageShell>`; per-page reduceert tot config + info-tab.
2. **Optie-wizards** (W1–W3, W5, W6): `useOptionWizard(type)`-hook + `<OptionLegInputs>`/`<SpreadSummary>`/`<WheelLinkPicker>`/`<NewTickerForm>`/`<LocalizedNumberInput>`; gebruik de bestaande helpers i.p.v. inline math.
3. **Roll-modals** (W4): `<RollModalShell>` + `<RollCalculationSummary>` + `<RollLegFields>`.
4. **`PortfolioView`** (P2, P4, P6): `usePortfolioPositions`/`usePositionFilters` + `<PositionControlsBar>`/`<SpreadSummaryRow>`/`<PositionGroup>`/`<PositionFilterControls>`.
5. **`CampaignView`** (P7): `<CampaignCard>` + `<CampaignFilterTabs>`.
6. **Gedeelde grid** (P3): `POSITION_GRID_COLS` + `<PositionRowGrid>`/`<PositionColumnHeader>`.
7. **`formatCurrency` consolideren** (P5).

### Fase 4 — Types, design-system & i18n (1–2 weken, consistentie)
> Handhaving en consistentie; minder urgent maar voorkomt regressie.

1. **Positie-types** (T1, T2, T3, T5): velden toevoegen + `as any` weg via narrowing; middleware via `isAnyOf`/`.match()`; `useFormData`-generics; `no-explicit-any`-regel aan.
2. **Design-system** (D1–D5): besluit over `Button`/`Input`/`Modal` (migreren of schrappen); `gray-*`-codemod naar tokens; `common/Modal` als shell voor alle modals; a11y (aria-labels, combobox-rol); `useId`.
3. **i18n** (I1, I3, I4): beslissing over education-content; gedeelde `optionWizard.*`-namespace; `CustomTypeOptions`-augmentatie.
4. **AI-key-omkadering** (C6): in-memory/session-only optie + grens documenteren.

---

## Sterke punten (behouden)

- Domeingedreven mapstructuur; contexts bevatten alleen UI-ephemeral state (geen dubbele Redux-state).
- Per-user store-factory met `redux-persist`-whitelist en `migrate`-hook.
- `services/ai/`: pure geteste config-helpers, nette provider-abstractie met retry/backoff, propose-then-confirm tool-flow met prompt-injectie-bescherming (`policy.ts`).
- Discriminated-union domeinmodel; type-predicates op de juiste plekken (`holdings.ts`).
- Locales exact in sync (644 leaf-keys, nul drift), correcte interpolatie/pluralisatie per taal.
- `OptionRow`/`StockRow`/`StatCard`/`StrategyRules` als gedeelde bouwstenen; `numberFormat`-utils breed gebruikt.
- `tsc` schoon, 62 tests slagen (~1.3 s), deterministische PRNG in mock-data.

---

*Dit rapport is gegenereerd uit een multi-agent review met per-bevinding adversariële verificatie tegen de broncode. Regelnummers verwijzen naar de staat van `feature/ai-assistent` op 2026-06-06.*
