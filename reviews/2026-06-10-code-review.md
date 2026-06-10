# Code review payday-web (main) — volledig rapport

*Datum: 2026-06-10 · Scope: volledige repository (main branch) · Methode: vijf onafhankelijke deep-dives (security, financiële logica, state/persistentie, performance, UI/i18n) + `npm audit`. Er is niets aan de code gewijzigd.*

## TL;DR

De architectuur is gezond (event-sourcing, coverage-allocator, propose-then-confirm AI, lazy pages) en de security-houding is goed voor een client-only app — geen XSS-sinks op AI-output, geen secrets in de repo, `npm audit` schoon (0 kwetsbaarheden over 467 dependencies). Maar er zitten **9 major bugs** in, waarvan de ergste **echt geld verkeerd tonen of opslaan**: de winst-opportunities voor short opties staan exact omgekeerd, spread-sluitingen negeren de ingevoerde premie, assignments tellen de premie dubbel in cash, en een duizendtal-separator in een invoerveld wordt als decimaal geparset (strike 2.500 → 2,5). Performance heeft één dominante oorzaak: de price-tick-pijplijn (geen batching, alles herberekend per tick, `Intl.NumberFormat` per cel).

---

## 1. Vulnerabilities (security)

`npm audit`: **0 kwetsbaarheden** (69 prod-dependencies). Context bepaalt de ernst: er is geen backend en geen data van andere gebruikers; het enige echte geheim is de BYO Anthropic API-key. Daardoor is niets hier Critical/High, maar de volgende punten verdienen aandacht:

| # | Ernst | Bevinding |
|---|-------|-----------|
| V1 | Low | **WebSocket-input wordt ongevalideerd in de store gedispatcht.** `priceWebSocketService.ts:278-285, 354-430` en `ibWebSocketService.ts:313-338` doen `JSON.parse` op berichten en sturen `symbol`/`price`/`premium` rechtstreeks naar Redux, zonder shape/range-validatie. De URL komt uit localStorage (`priceWebSocketConfig`) zonder scheme-check en is standaard cleartext `ws://`. Wordt dit ooit naar een remote host gewezen, dan kan een MitM/kwaadaardige server de financiële weergave corrumperen. Fix: `wss://` afdwingen voor niet-localhost + type-guards op inkomende berichten. |
| V2 | Low | **Backup-restore vertrouwt arbitraire bestandsinhoud.** `utils/backup.ts:35-58` checkt alleen `version`/`timestamp`/`Array.isArray(events)`; individuele events worden niet tegen het `DomainEvent`-schema gevalideerd vóór `appendMany`/`replayEvents`. Malafide events worden persistente state. Geen prototype-pollution-sink gevonden, maar wel de route waarlangs bv. een `javascript:`-URL in `portfolio.url` kan belanden (zie V3). |
| V3 | Low | **`portfolio.url` wordt zonder scheme-validatie als `href` gerenderd** (`PortfolioManagement.tsx:722-733`, `PortfolioDetail.tsx:1008-1016`). Het formulier checkt `https://`, maar via backup-restore is dat omzeilbaar → klikbare `javascript:`-URL (self-XSS, dus beperkt). `rel="noopener noreferrer"` staat overal correct. Fix: scheme valideren bij render. |
| V4 | Low | **AI-proposals: level-gating geldt alleen voor opties.** `tools.ts:452-458` filtert enkel `option`-proposals op ontgrendeld niveau; `propose_create_portfolio`/`propose_create_stock` passeren ongefilterd. Ook geen numerieke sanity-bounds (negatieve shares/strikes mogelijk na bevestiging). De kern is wél veilig: propose-then-confirm wordt correct afgedwongen, geen id-injectie, geen prototype pollution, AI-output wordt als platte tekst gerenderd. |
| V5 | Low | **Latente XSS-combinatie:** `interpolation.escapeValue: false` globaal (`i18n/config.ts:18-20`) + `dangerouslySetInnerHTML` op i18n-strings in `OptionCheck.tsx:97`, `CoveredCallSimulator.tsx:249`, `CapitalGainsTaxCalculator.tsx` (5×). Vandaag is die content statisch en veilig, maar zodra ooit een geïnterpoleerde variabele in zo'n key komt, is het een XSS-sink met toegang tot de API-key in localStorage. |
| V6 | Info | **Hardcoded admin-credentials** (`AdminLogin.tsx:9-10`, `LoginPage.tsx:10-11`: `admin`/`payday`) — geen echte boundary in een client-only app, maar `AddUser.tsx` vraagt een wachtwoord dat **nergens wordt opgeslagen of gecheckt** (security-theater). Documenteer of verwijder. |
| V7 | Info | **API-key in localStorage** is inherent aan BYO-key; "session-only" verplaatst hem enkel naar sessionStorage. Positief: de key lekt níét in prompts, backups of logs (geverifieerd). |

**Schoon bevonden:** geen `eval`/`new Function`/`document.write`; AI-output rendert React-escaped (`MessageBubble.tsx:33`); geen secrets/`.env` in de repo; `nodeBuiltinStubPlugin` in `vite.config.ts` is een onschadelijke bundling-shim; IndexedDB event store gebruikt structured clone, geen JSON-trucs.

---

## 2. Bugs — MAJOR

Dit zijn de bevindingen waarbij geld, posities of invoer **verkeerd getoond of opgeslagen** worden.

**B1 — Winst-opportunities voor short opties staan exact omgekeerd.**
`alertEvaluator.ts:1122-1138` flipt de tekens verkeerd om (`pnl = effectiveCurrentValue - effectiveCostBasis` op al-negatief opgeslagen waarden). Gevolg: een short put met 80% reële winst geeft *geen* opportunity, terwijl dezelfde put die naar een fors verlies is gelopen een "100% winst — overweeg te sluiten"-melding op het dashboard toont. Het dashboard adviseert dus actief het tegenovergestelde van de waarheid. Fix: het bestaande, correcte `calculateOptionUnrealizedPnL` uit `pnlCalculations.ts` gebruiken.

**B2 — Spread-winst-opportunities: dubbele tekenfout + credit/debit verkeerd geclassificeerd voor call-spreads.**
`alertEvaluator.ts:1045-1066` negeert dat legs al signed zijn opgeslagen (dubbele negatie) én bepaalt `isCredit` op strike-volgorde, wat voor call-credit-spreads precies omgekeerd is. Credit-spread-winsten vuren daardoor effectief nooit; `maxProfit` klopt niet.

**B3 — Spread sluiten: de ingevoerde close-premie valt weg uit de totale P&L, en de cash-ledger telt netto op nul.**
`PortfolioView.tsx:441-475` past één netto close-premie op *beide* legs toe, waardoor die in de som wegvalt (P&L = `shortCB − longCB`, ongeacht de close-prijs). De preview in `ClosePositionModal.tsx:120-141` is op een *andere* manier fout. En de twee `PositionClosed`-ledgerlijnen (`projectTransactions.ts:251-273`) heffen elkaar op: elke spread-close heeft cash-effect €0, wat de werkelijke cashflow nooit is.

**B4 — Assignment boekt de premie dubbel in cash → portfolio-waarde permanent overschat.**
Bij het openen van een short optie boekt `PositionOpened` al `premium_collected`. Bij assignment boekt `projectTransactions.ts:319-355` vervolgens `-(strike·shares − premie)` (put) resp. `proceeds + premie` (call) in plaats van het bruto bedrag. Netto: +1× premie te veel per assignment, voor altijd, in `portfolio.currentValue` én de equity-curve. (De roll-flow doet het wél correct — de assignment-route is de inconsistente.)

**B5 — Een CSP rollen laat de `cashReserved`-collateral vallen.**
`rollCommands.ts:132-152` zet geen `cashReserved` op de nieuwe positie (de spread-roll op regel 274 doet dat wel). Na elke roll springt de vrije cash met het volledige collateral-bedrag omhoog en zwijgen de negatieve-cash-alerts, terwijl het geld bij de broker vastzit.

**B6 — Duizendtal-separator wordt als decimaal geparset: 1000× fout.**
`parseLocalizedNumber` in `numberFormat.ts` (gebruikt door `LocalizedNumberInput`, dus alle wizards): `"2,500"` (en) → **2,5**; `"1.000"` (nl) → **1**. `validateNumberInput` (`optionWizardUtils.ts:55-75`) staat de separator expliciet toe, dus dit gebeurt geruisloos. De repo bevat al een correcte parser (`utils/inputFormat.ts:32-48`) — de twee divergeren.

**B7 — IndexedDB-schrijffouten worden stil ingeslikt → dataverlies.**
`eventPersistenceMiddleware.ts:14`: `void eventStore.appendMany(...)` zonder `.catch`. Faalt de write (quota, private browsing, seq-conflict), dan bestaat de trade alleen nog in deze sessie en is hij na reload **weg** — zonder enige melding. Voor een app waarvan de event-log de enige persistentie is, is dit de gevaarlijkste durability-bug.

**B8 — Multi-tab gebruik verliest events.**
Elke tab stempelt `seq` uit eigen geheugen (`eventsSlice.ts:61-73`); twee tabs botsen op dezelfde `seq` → `ConstraintError` → transaction abort → het event van tab B verdwijnt (en B7 verbergt het). Fix: conflict-detectie of single-writer (Web Locks/BroadcastChannel).

**B9 — `useStrategyRules` overschrijft de rules van een ander portfolio bij route-wissel.**
`useStrategyRules.ts:24-40`: state wordt alleen bij eerste mount uit localStorage gelezen, maar de `storageKey` bevat de route-param. Navigeer van portfolio A naar B binnen dezelfde strategy-pagina en het persist-effect schrijft **A's rules onder B's key** — B's opgeslagen rules zijn stil weg.

---

## 3. Bugs — MEDIUM

1. **Wizard-capaciteit wijkt af van de allocator** — `computeCoveredCallCapacity` (`coveredCallEligibility.ts:35-38`) telt álle short calls tegen de aandelen (incl. PMCC-calls die de allocator aan een LEAPS toewijst, en wheel-gelinkte calls). Resultaat: het dashboard zegt "verkoop 1 covered call" terwijl de wizard 0 vrije contracten toont — precies de divergente-heuristiek-klasse die de coverage-rules verbieden.
2. **KaChing phantom opportunity** — `alertEvaluator.ts:545-575` negeert reeds geschreven short puts; de "Verkoop X put(s)"-melding blijft eeuwig staan terwijl de campaign-view correct "volledig gedekt" toont.
3. **Gesloten short calls dubbel geteld in campagne-historiek** — `campaignDetector.ts:208-214, 281-292`: een gesloten call zonder `underlyingId` telt mee in de CC- én de PMCC-campagne (en elke PMCC bij meerdere LEAPS) → premie-inkomsten dubbel geclaimd, `adjustedCostBasis` van twee roots verlaagd.
4. **Mini-contracten: capaciteit rekent met 10 aandelen/contract, al het geld met 100** — premie, `cashReserved` en assignment-shares zijn 10× fout voor mini-tickers (`optionWizardUtils.ts:119-131`, `rollCommands.ts:105,361-362`). Opties dragen geen multiplier-veld, dus downstream kan niets dit corrigeren.
5. **Call-credit-spread-collateral nooit gereserveerd in vrije cash** — `alertEvaluator.ts:129-137` telt alleen `cashReserved` op puts; de spread-collateral staat op de short *call*-leg en het `type === 'spread'`-branch is dood (spreads worden als twee legs opgeslagen).
6. **DTE/datum-bugs** — `alertEvaluator.ts:1029-1036` en `optionWizardUtils.calculateDTE` gebruiken `new Date('YYYY-MM-DD')` (UTC) i.p.v. het timezone-veilige `getDaysToExpiration`: opties die morgen expireren worden als "verlopen" overgeslagen; `getTodayDateString` (`dateHelpers.ts:6-8`) geeft vóór ~02:00 Belgische tijd *gisteren*.
7. **FIFO vs GAK** — bij multi-lot call-assignment berekent het positiescherm de realized P&L per FIFO-lot en het trade-log via gemiddelde kostprijs (`rollCommands.ts:447-454` vs `projectPositions.ts:151`): blijvend verschil tussen beide schermen.
8. **Drie verschillende "is een LEAPS"-definities** — `campaignDetector.ts:44`, `positionHelpers.ts:26`, `CallOptionWizard.tsx:173`: randgevallen flippen tussen views (allocator suggereert schrijven tegen een LEAPS die de wizard niet aanbiedt).
9. **Wheel-statistieken driften** — `projectWheels.ts` foldt `OptionRolled` en `PositionClosed` niet: elke roll/terugkoop van een wheel-call mist in `totalPremiumCollected`/`totalRealizedPnL`.
10. **Long optie op $0 gewaardeerd als kostprijs** — `positionValueMiddleware.ts:55` gebruikt `||` waar `??` moet: een waardeloos geworden long optie blaast de portfolio-waarde op.
11. **Demo-account is dood** — `LoginPage.tsx:72-90` seedt mock-data in persist-keys die niet meer in de whitelist staan en die `replayEvents` toch wist: de demo-gebruiker krijgt een lege app.
12. **`disconnect()` van de price-feed verbindt 5 s later stilletjes opnieuw** — `priceWebSocketService.ts:287-328` mist een "intentioneel gesloten"-vlag; ook ontbreekt een connect-guard (dubbele sockets) en bij `ibWebSocketService` stapelen heartbeat-intervals.
13. **Globale localStorage-keys lekken tussen gebruikers** — `dismissed-alerts` en `strategy-rules-{type}-{portfolio}` zijn niet per gebruiker geprefixt: gebruiker B erft de dismissals/rules van A.
14. **Strike-cross-alerts spammen onbeperkt** — `tickerPriceMiddleware.ts:160-186`: unieke id per tick, geen cooldown — een prijs die rond de strike oscilleert voegt elke tick een alert toe.
15. **Call-spread P&L-curve rendert nooit** — `CallOptionWizard.tsx:1291` test op het dode `action === 'spread'`; gebruikers zien bij een call-spread een single-leg-curve op basis van de verkeerde leg (de put-wizard doet het wél goed via `isSpread`).
16. **Geen enkele error boundary** — één render-fout of een mislukte lazy-chunk-fetch (na een deploy) = wit scherm zonder herstel-UI (`App.tsx:276`).
17. **Wizards accepteren expiraties in het verleden** — `FridayDatePicker` krijgt geen `min`; `calculateDTE` clampt naar 0, dus de positie wordt al-verlopen aangemaakt.
18. **i18n-gaten**: hardcoded NL "Stap X van Y" in `WizardModal.tsx:202` en "Laden..." in `App.tsx:276` (keys bestaan al); gemengde NL/EN backup-toasts (`Header.tsx`); 33× `toLocaleDateString('nl-NL')` in 18 bestanden; `PMCCStrategy.tsx` volledig Engels + onleesbare infokaart in dark mode; `Journal.tsx` en `OnboardingWizard.tsx` grotendeels niet vertaald; 37× hardcoded `$` in de call-wizard naast een currency-bewuste grafiek op hetzelfde scherm.
19. **Stale prijs in wizard** — de `steps`-`useMemo` in beide optie-wizards mist `currentTickerPrice` (en `t`) in de deps: live prijsupdates verversen de "huidige prijs"-banner niet zolang de wizard open is.
20. **Legacy `PositionsPortfolioRenamed` events** worden door de transactions/wheels-projecties niet gefold → cash blijft na replay onder de oude portfolionaam hangen.
21. **Default trading rules onbereikbaar** — `rulesSlice` initialState wordt door `replayEvents` altijd gewist en niets seedt rule-events; latent (geen UI leest ze nog), maar het contract is kapot.

---

## 4. Bugs — MICRO

- `Date.now()`-id's voor posities in de wizards (`call-${Date.now()}`) — botsing bij twee creaties in dezelfde ms; AI-pad en rolls gebruiken wél uuid.
- `miniSupported` gelezen van ongesorteerde `stocks[0]` (`coverageAllocation.ts:120`).
- Covered call krijgt `cashReserved` alsof hij naked is (`CallOptionWizard.tsx:390`) — nu inert, maar een latente dubbele reservering zodra medium #5 gefixt wordt.
- Wheel-stock-fase negeert mini-contracten en kijkt alleen naar het eerste aandelenlot (`campaignDetector.ts:563`).
- Commissies/fees op trades altijd 0 (`projectTrades.ts:39-40`).
- `optionsSupported` alleen afgedwongen bij 0 covered contracts (`alertEvaluator.ts:409-410`).
- Alert-berichten hardcoden `$` ongeacht `portfolio.currency`; geen FX-handling (USD in EUR-portfolio 1:1 opgeteld).
- Hardcoded NL alert-teksten in `tickerPriceMiddleware.ts:141-181` (komen in de dashboard-UI).
- Dode reducers (`loadPositions` e.a.) met misleidende comments; `tickerMigration.ts` is permanent een no-op; CLAUDE.md vermeldt een niet-meer-bestaande `tradeMiddleware`; persist `version: 5` spreekt de v7-comments tegen.
- `closePrice ?? 0` bij stock-close boekt €0 cash i.p.v. terug te vallen op `currentPrice` zoals `projectTrades` doet.
- Niet-deterministische reducers (`Date.now()`/`new Date()` in `userProgressSlice`, `journalSlice`).
- Modal: geen focus-trap, één Esc sluit gestapelde modals allemaal, body-scroll komt te vroeg terug; icon-only sluitknop zonder `aria-label` (`WizardModal.tsx:127`).
- 24× rauwe `toFixed()` naast locale-bewuste formatting; `RollOptionModal` accepteert negatieve premies (`type="number"` zonder `min`); 5 onvertaalde key-wáárden (structuur en/nl/fr is verder 100% in sync — alle 2.266 keys geverifieerd).

---

## 5. Performance

**Eén dominante keten — de price-tick-pijplijn (major):**

1. **Geen batching:** `tickerPriceMiddleware.ts:90-103` dispatcht per aandelenlot een aparte `updatePositionLivePrice`; elk daarvan laat `positionValueMiddleware` de **volledige transactie-ledger** van het portfolio opnieuw scannen (die ledger groeit eeuwig) en dispatcht opnieuw. Eén WS-bericht = 1 + 2×S dispatches met O(transacties)-scans. Fix: één `updateMultiplePositionValues`-batch + incrementele delta (cash verandert niet bij een prijstick).
2. **`evaluateAllAlerts` draait integraal, 2-3× per tick:** `useAlerts.ts:98-113` memoizet op refs die elke tick wijzigen, en elke hook-instantie (2× dashboard-widget + PortfolioOverview) heeft zijn eigen memo. Binnenin: `tickers.find` in per-positie-lussen (O(P×T)) en synchrone `localStorage.getItem` + `JSON.parse` per evaluatie. Fix: één gedeelde `createSelector` + ticker-Map + config-cache.
3. **`Intl.NumberFormat` + `localStorage.getItem` per cel:** `numberFormat.ts:66-76` construeert per call een formatter; `OptionRow` heeft er 11 per rij, rijen zijn niet gememoized en de hele tabel re-rendert per tick → bij 500 posities ~5.000 Intl-constructies per render. **Dit is de goedkoopste fix met het grootste effect** (formatter-cache in één bestand).
4. **Recharts her-animeert elke tick:** Dashboard en PortfolioView subscriben op de rauwe `positions`-array; beide grafieken redrawen + animeren per tick (`isAnimationActive` staat nergens uit), en `getAlertsForPosition` doet O(P×A) regex-filters per tick.
5. **Barrel-import ondergraaft code-splitting:** `App.tsx:6` importeert `LoginPage` uit `./pages` (barrel die élke pagina statisch re-exporteert, incl. recharts en de 103KB curriculum) en `Layout` uit `./components`. In dev laadt het loginscherm daardoor gegarandeerd de hele app; in prod hangt de splitting aan tree-shaking en is hij fragiel. Fix: direct-pad-imports.

**Medium:** alle drie de taalbundels (~380KB bron) eager geladen — alleen de actieve taal eager laden; 3× `console.log` per prijsbericht in `priceWebSocketService`; `TransactionLog` rendert de hele ledger zonder memo/virtualisatie met een `Intl.DateTimeFormat` per rij; context-values (`ToastContext.tsx:111`, `PageTitleContext.tsx:56`) niet ge-`useMemo`'d → app-brede re-render per toast/titel.

**Micro:** event-replay is O(events × posities) bij boot (nog prima, groeit met de jaren — snapshotting overwegen); redundante sort in `eventStore.loadAll`; 8 losse filter-passes in Dashboard `totalStats`; latente selector-footgun `selectPortfolioValueBreakdown` (filter in input-selector, nieuwe selector per call — nu ongebruikt).

**Wat al goed zit:** alle pages lazy; `@anthropic-ai/sdk` echt lazy + manualChunks; persist-whitelist minimaal (price-ticks raken localStorage nooit); event-writes off the critical path; Header vermijdt bewust hot subscriptions; `selectEquitySeries`/`selectPortfolioSummaries` correct gememoized.

---

## 6. Wat geverifieerd correct is (selectie)

- `pnlCalculations.ts` — alle tekenconventies en formules kloppen en zijn goed getest.
- `coverageAllocation.ts` — implementeert alle vijf allocator-regels uit de spec exact, inclusief tie-breaks; `pickParentForNewShortCall` en `suggestCoveredCallStrike` conform.
- Campaign-dedup voor **open** posities (CC/PMCC via één allocator-pass) en de CC/LEAPS-opportunities zelf: geen phantom/dubbele opportunities (de problemen zitten in KaChing en profit-taking).
- Event-pipeline-atomiciteit, replay-determinisme (met testsuites), `positionValueMiddleware`-dekking van alle live acties, per-user store-lifecycle, redux-persist-whitelist.
- Wizard-hygiëne: reset bij heropenen, geen negatieve premies/0 contracten, covered-call-normalisatie naar `action:'sell'`, automatische parent-linking.
- AI-laag: propose-then-confirm waterdicht, AbortController/cleanup correct, value gememoized.

---

## 7. Aanbevolen prioriteiten

1. **B1 + B2** (`alertEvaluator` winst-opportunities) — het dashboard adviseert nu het omgekeerde van de waarheid; kleine fix via bestaande `pnlCalculations`-functies.
2. **B4 + B3 + B5** (assignment-premie dubbel, spread-close, CSP-roll-collateral) — opgeslagen cash/P&L fout; vereist aandacht voor replay-compatibiliteit (schema-upcast of nieuwe event-variant).
3. **B6** (`parseLocalizedNumber`) — één-bestand-fix: overschakelen op `inputFormat.parseNumberInput`.
4. **B7 + B8** (event-log durability + multi-tab) — minstens een foutmelding bij write-failure; daarna single-writer.
5. **B9** (`useStrategyRules`) en de wizard/allocator-divergentie (medium #1).
6. Performance-trio: formatter-cache → tick-batching → gedeelde alert-evaluatie; daarna de barrel-import fixen en met de bundle-visualizer verifiëren.
7. Security-hygiëne: WS-message-validatie + `wss://`, backup-event-validatie, href-scheme-check, level-gating voor alle AI-proposal-types.
