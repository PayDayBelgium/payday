# Business-analyse payday-web — strategieën, didactiek & roadmap

*Datum: 2026-06-10 · Scope: inhoudelijke/business-audit van alle ondersteunde strategieën (covered calls, cash-secured puts, wheel, LEAPS, PMCC, KaChing, spreads, …), de didactische laag (level-gating), de productmaturiteit en roadmap-opties. Drie onafhankelijke deep-dives: strategie-lifecycle, didactiek/gating, product/markt-gaps. Aanvullend op het code-reviewrapport van dezelfde datum (`2026-06-10-code-review.md`). Er is niets aan de code gewijzigd.*

## TL;DR

De kern van het product is écht goed: het event-sourced grootboek, de deterministische coverage-allocator (CC/PMCC/wheel-koppeling is rigoureuzer dan bij commerciële concurrenten), de didactische level-gating (uniek in deze niche) en de propose-then-confirm AI-assistent. Maar drie dingen ondermijnen de businesswaarde vandaag:

1. **De assignment-boekhouding telt de premie dubbel** — en assignment is het hart van de wheel. Cumulatieve P&L, cash, portfolio-waarde én de "adjusted cost basis" van de wheel zijn na elke assignment fout.
2. **De veiligheidsrails van een didactisch platform ontbreken net waar het gevaarlijk wordt**: naked calls worden zwijgend aangemaakt zonder waarschuwing, er is geen ITM-alert op short calls, geen cash-toereikendheidscheck bij CSP's, en de CampaignView lekt expert-advies (KaChing) naar medior-gebruikers — uitvoerbaar, niet alleen zichtbaar.
3. **De marktdata-laag is theater**: alle prijzen zijn handmatig of komen van een localhost-feed die alleen voor de ontwikkelaar zelf werkt. De dagelijkse vraag van een wheel-trader ("wat verkoop ik vandaag, wat is mijn positie waard?") kan de app niet beantwoorden zonder handmatige invoer.

Strategische volgorde voor de roadmap: **broker-import (CSV) → BYO-key marktdata → cloud-sync van het event-log.** Elke stap versterkt de vorige; pas de derde verlaat de no-backend-architectuur.

---

## Deel 1 — Per strategie: zit het inhoudelijk goed ineen?

Verdicten: **volledig** / **bruikbaar met gaten** / **half af** / **conceptueel fout**.

### 1.0 De bevinding die alles raakt: assignment-premie dubbel geteld

De normale optie-cyclus (open → terugkoop / waardeloos expireren) is correct geboekt. **De assignment-paden niet:**

- **Put-assignment** (`rollCommands.ts:364-406`): boekt de volledige premie als realized P&L op de optie **én** verlaagt de kostbasis van de nieuwe aandelen met diezelfde premie (`effectiveCost = strike×shares − premie`). Bij latere verkoop van de aandelen wordt de premie dus twee keer als winst geteld. Voorbeeld: put @100 verkocht voor $200 premie, assigned, aandelen verkocht op $99 → de app boekt +$300 realized; economisch correct is +$100.
- **Cash-ledger** (`projectTransactions.ts:319-355`): bij open is de premie al als `premium_collected` geboekt; de assignment-lijn telt ze nogmaals mee. Elke assignment blaast portfolio-waarde en vrije cash blijvend op met één premie.
- **Wheel-kostbasis** (`campaignDetector.ts:571`): `adjustedCostBasis = stock.costBasis − totalRealizedPnL` — maar de stockbasis is al premie-verlaagd én `totalRealizedPnL` bevat de premie ook: dubbele aftrek.

**Fix-richting:** kies één conventie — premie als optie-inkomen boeken en de aandelen tegen volle `strike×shares` inboeken — en maak de assignment-cashlijnen `±strike×shares`. Dit is de belangrijkste businesscorrectie van het hele platform.

### 1.1 Aandelen/ETF's — bruikbaar met gaten

Multi-lot, mini-contract/dividend-vlaggen, live prijzen, CC-suggestiebadge: goed. Gaten: geen cash-toereikendheidscheck bij aankoop (je kunt meer "kopen" dan de vrije cash); **partiële verkoop is inhoudelijk kapot** — `PortfolioView.handleClosePosition` (`PortfolioView.tsx:411-424`) verkleint alleen het lot via `editPosition`: geen `PositionClosed`-event, geen trade, geen cashlijn, de berekende realized P&L wordt weggegooid. Vanuit `CampaignView` wordt de gekozen quantity zelfs genegeerd en het hele lot gesloten (`CampaignView.tsx:219-241`).

### 1.2 Covered calls — bruikbaar met gaten (best ondersteunde strategie)

- **Open:** wizard normaliseert correct naar short call, koppelt automatisch de parent via `pickParentForNewShortCall`; de allocator (`coverageAllocation.ts`) is conceptueel sterk en goed getest. Maar: vindt de wizard geen parent, dan ontstaat **zwijgend een naked call** — geen waarschuwing, geen bevestigingsstap. En de covered call krijgt `cashReserved = strike×100` alsof hij naked is (de aandelen zíjn het onderpand); `CashOnderpandAnalysis` rapporteert covered calls daardoor als cash-verbruikers.
- **Monitor:** campaign-view met coverage x/y, premietotalen, adjusted cost basis. **Mist de stuurmetrics van een CC-schrijver**: geen ITM-alert op short calls (short puts hebben die wél), geen % OTM, geen geannualiseerd rendement op onderpand bij live posities (bestaat alleen in de calculators), geen ex-dividend/early-assignment-waarschuwing ondanks dat `ticker.hasDividend` bestaat.
- **Adjust/close/assign:** roll-flow solide (composite `OptionRolled`-event, correcte credit/debit-math, links blijven behouden); call-assignment met multi-lot FIFO is het sterkste stuk — maar de cashboeking telt de premie dubbel (§1.0).

### 1.3 Cash-secured puts — bruikbaar met gaten

Collateral-reservering en vrije-cash-aftrek kloppen; ITM-alert, expiring-OTM-opportunity en negatieve-cash-alert dekken de monitoring goed. **Maar de wizard checkt nooit of de cash er daadwerkelijk is** — je kunt een CSP verkopen met nul vrije cash en ontdekt het pas achteraf via een alert. Voor een didactisch product is een "onvoldoende onderpand"-waarschuwing bij open de evidente misser. (Plus: een CSP rollen laat de `cashReserved` vallen — zie code-review B5.)

### 1.4 De wheel — bruikbaar met gaten

Aanmaak en koppeling zijn doordacht (NewWheelModal, wheel-selectie in wizards, rolls behouden `wheelId`, fase-overgangen event-gedreven). **Lifecycle-gat: een wheel kan nooit afgerond worden.** `closeWheel` bestaat (`wheelCommands.ts:17-19`) maar wordt nergens gedispatcht; de enige UI-actie is `deleteWheel`, dat de historiek vernietigt. `status: 'completed'` en `endDate` zijn onbereikbaar. De kernvraag van elke wheel-trader — "wat heeft deze hele campagne opgebracht, geannualiseerd?" — is onbeantwoordbaar. Geen per-cyclus-overzicht; de stock-fase kijkt maar naar één aandelenlot; adjusted cost basis dubbel geteld (§1.0). (Bekend uit de event-sourcing-refactor: wheel-statistieken missen ook rolls/terugkopen — code-review medium #9.)

### 1.5 LEAPS — bruikbaar met gaten

Model (long call ≥ 90 dagen) en PMCC-detectie kloppen. **Geen exercise-flow** — `AssignmentModal` weigert long opties (`AssignmentModal.tsx:103`), dus een LEAPS omzetten naar aandelen kan alleen via handmatig knutselen. Geen theta/extrinsieke-waarde-bewaking ("rol je LEAPS voor de extrinsiek sterft"). De `LEAPSStrategy.tsx`-pagina toont hardcoded nullen (§2).

### 1.6 PMCC — bruikbaar met gaten

Detectie- en coverage-regels conceptueel juist (short strike > LEAPS-strike, stock-vóór-LEAPS, break-even-bewuste strike-suggestie); de PMCC-calculator waarschuwt terecht als de short strike onder de LEAPS-break-even ligt. **Maar het definiërende staartrisico van de PMCC is onrepresenteerbaar**: een assignment op de short call zoekt alleen aandelenlots en gooit anders een fout (`rollCommands.ts:420-426`) — "LEAPS verkopen/exercisen om de assignment te dekken" bestaat niet. Geen ex-dividend/early-assignment-waarschuwing in de live flow.

### 1.7 KaChing — half af

Detectie en koppeling werken; campagne-math (premie vs. beschermingskost) is in orde. De **calculator is conceptueel te dun** (`KaChingCalculator.tsx:90-180`): netto P&L = wekelijkse premie × weken − putkost, met elke week dezelfde premie en **zonder verliesrisico op de short puts** — terwijl (short strike − protective strike) per week hét definiërende getal van de strategie is. De waarschuwing "weekly strike boven protective strike verhoogt assignment-risico" vuurt bovendien op de *canonieke* KaChing-opstelling en zal lerende gebruikers verwarren. Strategiepagina is een mock-up (§2); geen exercise-flow voor de protective put.

### 1.8 Spreads (call/put, credit/debit) — half af, deels conceptueel fout

- Wizard-validatie en samenvattingsmath zijn **correct** (max winst/verlies, break-evens, collateral = breedte × 100; put-credit-collateral wordt gereserveerd).
- **Modellering is fragiel**: `SpreadPosition` bestaat als type maar wordt nooit aangemaakt; spreads zijn twee losse legs die via een regex over het vrije-tekst-notitieveld gepaard worden (`spreadHelpers.ts:12-16`). Eén bewerking van de notities en de spread valt uiteen. De wizards dragen nog het commentaar "to be implemented with SpreadPosition type".
- **Conceptuele fouten**: spread sluiten boekt per leg verkeerd (teken-inversie; de preview gaat ervan uit dat de spread op nul sluit) — zie ook code-review B3; credit/debit-classificatie op strike-volgorde is fout voor call-credit-spreads (B2); call-credit-spread-collateral verlaagt de vrije cash nooit (medium #5). Spread-leg-assignment (hét realistische risico op een doorbroken credit spread) heeft geen begeleide flow.

### 1.9 Iron condors — half af (beloofd, niet gebouwd)

Feature-id op expert-niveau, de Spreads-pagina belooft "twee spreads combineren automatisch tot een Iron Condor" (`stratPages.ts:247`), een `IronCondor`-type bestaat — maar er is **nul detectie- of constructiecode**. Belofte verwijderen of bouwen.

### 1.10 Naked opties — conceptueel onaf (grootste veiligheidsgat)

Naked short calls kunnen zwijgend ontstaan (allocator geeft `null` parent en berekent zelfs de `uncovered`-set) — maar **er wordt nooit een waarschuwing of alert voor een naked short call geëmit**: de gevaarlijkste positie die een lerende gebruiker kan aanhouden, op een platform dat bestaat om dat te voorkomen.

### 1.11 Half-afgewerkte schermen (dead/mock-UI)

| Oppervlak | Toestand |
|---|---|
| `SpreadsStrategy.tsx`, `CSPStrategy.tsx`, `LEAPSStrategy.tsx`, `KaChingStrategy.tsx` | Hardcoded nul-statistieken ("$0.00", "Win Rate -%"); "Add first spread"-knop is een no-op. (CoveredCalls/PMCC/StocksETFs zíjn echt via `CampaignView`/`GroupedStockList`.) |
| `UpcomingEvents.tsx:14-47` | Hardcoded mock-earnings/Fed-events uit januari 2025, zonder "demo"-disclaimer — ondermijnt vertrouwen in de rest van het dashboard |
| Legacy positietypes (`LEAP`, `CoveredCall`, `CashSecuredPut`, `CreditSpread`, `IronCondor`, …) | Worden nergens meer geproduceerd; dood modelgewicht |
| AI-assistent tools | Alleen portfolio/stock/single-option-proposals; geen spreads, rolls, closes of assignments; aangemaakte opties krijgen geen `underlyingId`/`wheelId` |
| Wheel-afronding | `closeWheel`/`editWheel` bestaan, geen UI dispatcht ze |

---

## Deel 2 — Tools (calculators)

| Tool | Verdict |
|---|---|
| CoveredCallSimulator | Inhoudelijk correct (if-called/if-not-called, annualisatie, kostbasisverlaging). Detail: downside-break-even gebruikt de huidige prijs i.p.v. kostbasis. |
| PMCCCalculator | Correct maar optimistisch: zelfde premie elke periode tot LEAPS-expiratie, modelleert nooit een doorbroken short call; geen early-assignment/dividend-noot. |
| KaChingCalculator | Conceptueel onvolledig — negeert verliesrisico op short puts volledig; tegenstrijdige waarschuwing op de canonieke opstelling. |
| PnLSimulator | Correct (multi-leg expiratie-payoff, geïnterpoleerde break-evens). Beperking: geen aandelen-leg (covered call/wheel niet simuleerbaar), alleen op expiratie. |
| CapitalGainsTaxCalculator | Correct voor het 2026-regime (10% boven €10k vrijstelling, nationaliteitsbewust) — maar puur handmatige invoer, niet gekoppeld aan de eigen realized gains; geen TOB, geen 30% RV op dividenden, hoewel het curriculum die wél onderwijst. |
| OptionCheck | Eerlijke mock: deterministisch gesimuleerde IV-rank/OI/earnings mét duidelijke disclaimer. Dat disclaimer-patroon verdient navolging overal waar mock-data staat. |
| MonthlyIncomeCalculator | Losstaande schets; enige plek waar broker-commissies bestaan; niet gekoppeld aan echte posities. |

---

## Deel 3 — Didactische laag (level-gating)

De kernpijplijn is goed ontworpen en getest (19/19 gating-tests slagen): één evaluator → één filter (`useAlerts`/`filterOpportunitiesByAccess`) → alle dashboards; tweelaagse wizard-gate; AI-gate met hetzelfde `getOptionActionFeature`. Risico-alerts worden correct nooit gefilterd (geen over-gating gevonden). De opportunity-id→feature-mapping is volledig.

**Lekken (precies de voorspelde faalwijze: schermen die zichtbaarheid zelf her-afleiden buiten de pijplijn):**

1. **HOOG — CampaignView lekt senior/expert-advies naar medior, uitvoerbaar.** De Campaigns-tab is bereikbaar op medior; `CampaignFilterTabs` toont PMCC- (senior) en KaChing-tabs (expert) ongegate; de empty-states coachen actief ("Koop LEAPS", "Koop protective put") met werkende wizard-knoppen; `CampaignCard.tsx:677-698` toont `opportunityMessage` + quick-create-knop zonder `getOpportunityRequiredFeature`. Concreet: een medior-gebruiker koopt een long put (toegestaan) → er verschijnt een KaChing-campagne met "verkoop puts"-advies en een knop die *werkt* — exact het advies dat de dashboard-gating verbergt.
2. **MIDDEL — TradingIdeasWidget/Community toont optie-advies aan beginners** (strategie, strike, premie, delta) zonder level-check; de "Place trade"-knop loopt pas stuk op het stille wizard-vangnet — de beginner vult alles in en Complete doet niets, zonder uitleg.
3. **LAAG (latent) — NewWheelModal heeft geen eigen gating** en kan rechtstreeks een CSP aanmaken buiten `optionFeatureAccess` om; vandaag toevallig afgeschermd doordat hij alleen via medior-schermen bereikbaar is.

**Het level-model zelf is op papier coherent maar momenteel tandeloos:**
- Alle levels kosten 0 credits ("set low for easy testing") en zijn met één klik te ontgrendelen; lessen zijn geen voorwaarde.
- Niet-sequentiële unlocks toegestaan: een beginner kan expert ontgrendelen zonder medior — incoherente toestand (spreads ontgrendeld, covered calls niet) en breekt de `isTop`-aanname in de AI-systemprompt.
- ~12 spook-features gedefinieerd maar nergens gecheckt (o.a. `roll_management`, `iron_condors`, `paper_trading` — dat laatste staat als expert-feature terwijl `paperTradingEnabled` standaard aan staat voor beginners).
- Dode crediteconomie: achievements/streaks/aankoop bestaan in de UI-teksten maar worden nooit gedispatcht.
- **Het curriculum onderwijst niet wat de levels ontgrendelen**: medior ontgrendelt CC/CSP/wheel maar heeft daar geen hoofdstuk over; expert ontgrendelt spreads/iron condors/KaChing en **nergens in het curriculum bestaat een spreads-, iron-condor- of KaChing-les**. De school geeft creatierechten voor strategieën die ze zelf nooit doceert.
- Off-piste-lessen zijn onbereikbaar: beide leerpagina's hardcoden `levelOrder` zonder `offpiste`.

---

## Deel 4 — Productmaturiteit & de marktdata-vraag

| Feature | Maturiteit |
|---|---|
| Positie-lifecycle, event-log, backup/restore, journal/todos/goals, leeromgeving (als content), AI-assistent (smal) | **Production-ready** |
| Dashboard, strategiepagina's, alerts/opportunities, analytics (2 van 4 tabs), price-websocket | **Werkt met gaten** |
| Community (4 geseede NL-posts, gebruiker hardcoded "Jij"), mentorship (formulier dat nergens heen gaat), quant (teaser), admin (localStorage-registry, creds in bundle), auth (elk wachtwoord werkt) | **Stub** |
| Demo-account (schrijft naar dode persist-keys → lege app), IB-directe-WebSocket (`ibWebSocketService` verbindt met de native TWS-socketpoort die geen WebSocket-API heeft — kan per definitie nooit werken; `requestMarketData`/`requestOptionChain` worden nergens aangeroepen) | **Dood** |

**De marktdata-realiteit:** prijzen komen (1) handmatig per ticker, of (2) van een lokale .NET-companion-service (`ws://localhost:5000`) die ofwel een random-walk-generator is (demo-feed), ofwel live quotes via TWS/Lynx vereist — beide draaiend op de machine van de gebruiker. De feed levert alleen prijs + delta; **geen option chains, geen IV, geen volledige greeks bereiken de app**. Alles wat analytisch van marktdata afhangt (OptionCheck, IV-rank, opportunity-kwaliteit) is gesimuleerd of verouderd. Dit is het plafond op de productwaarde: zonder data-acquisitie eerst op te lossen is elke andere investering "de hut decoreren terwijl de lift kapot is".

**Vergelijking met de concurrentie** (Wingman Tracker, wheel-spreadsheets, OptionStrat, broker-tools): kritieke gaten zijn option-chain-browsing, live quotes, IV/greeks, **broker-import (CSV/IBKR Flex — nergens een parser in de repo; manuele her-invoer van elke fill is dé churn-driver bij trackers)**, earnings-kalender, PWA/notificaties, en **cross-device-sync (alles staat in één browserprofiel: een cache-clear of herinstallatie = totaal dataverlies tenzij handmatig JSON geëxporteerd — existentieel risico voor een echt-geld-tracker)**. Waar PayDay vóór ligt: de didactische gating (uniek), het campagne/coverage-model, het event-sourced audit-trail, de propose-then-confirm-AI en de Belgische framing (EUR, Lynx, TOB-educatie, nieuwe meerwaardetaks).

---

## Deel 5 — Ontbrekende standaardconcepten (belang voor dít product)

| Concept | Status | Belang |
|---|---|---|
| Ex-dividend-bewustzijn voor CC/PMCC-schrijvers | Afwezig | **Hoog** — dé early-assignment-trigger; de doelgroep schrijft calls op dividendaandelen |
| Geannualiseerd rendement op onderpand / % OTM op live posities | Alleen in calculators | **Hoog, lage moeite** — alle inputs zitten in het grootboek |
| Fees/commissies/TOB | Trades altijd 0; `Portfolio.pricePerContract` bestaat maar wordt nooit toegepast | **Hoog** voor Belgisch P&L-realisme; bijna gratis te bouwen |
| Delta | Veld bestaat (IB-feed schrijft het), wordt nergens getoond | Hoog — curriculum onderwijst delta-gebaseerde strike-keuze; tonen is goedkoop |
| Earnings-datums | Alleen mock | Middel-hoog — "niet door earnings schrijven" is wheel-basishygiëne; zelfs een handmatig veld per ticker maakt een echte alert mogelijk |
| FX (EUR-portfolio, USD-opties) | Geen — impliciet 1:1 | Middel-hoog — elke Belg die US-opties handelt heeft dit; minimaal positie-valuta + handmatige EURUSD-koers |
| Dividenden op aandelen | Handmatige cashlijn + vlag; geen schema/yield/attributie | Middel |
| IV / IV-rank | Alleen mock (eerlijk gelabeld) | Middel — vereist databron |
| Overige greeks (theta/gamma) | Afwezig | Laag-middel — theta-verhaal telt voor LEAPS/PMCC |
| Margin vs. cash-account | Geen margin-concept | Laag — cash-model past bij de doelgroep; benoem het expliciet en stop `cashReserved` op covered calls |

---

## Deel 6 — Roadmap-voorstel

### Quick wins (< 1 week, geen backend nodig)

1. **CSV-broker-import (IBKR/Lynx-activity-statement → events).** Hoogste waarde-per-moeite van de hele audit; event sourcing maakt dit natuurlijk. Doodt de handmatige her-invoer.
2. **Veiligheidsrails**: naked-call-waarschuwing bij aanmaak + naked-call-alert; ITM-alert op short calls; cash-toereikendheidscheck (zacht) bij CSP/aandelenaankoop.
3. **Wheel afronden**: `closeWheel` aan de UI hangen + campagne-samenvatting (totaal, geannualiseerd, per cyclus) bij afronding.
4. **Gating-lekken dichten**: CampaignFilterTabs/empty-states/CampaignCard-opportunityblok gaten op het campagne-feature; TradeIdeaCard "Place trade" gaten + expliciete "ontgrendel op piste X"-feedback i.p.v. stille no-op; `isFeatureAvailable` in NewWheelModal.
5. **Demo-account fixen via event-seeding** (een realistische wheel-campagne is ook lesmateriaal) — of het pad verwijderen; nu is het een stille blamage bij eerste contact.
6. **Dode IB-integratie verwijderen** (`ibWebSocketService`, IBSettings, IBConnectionStatus) — kan per ontwerp nooit werken en misleidt gebruikers.
7. **UpcomingEvents de-mocken** (minimaal: afleiden uit eigen posities — expiraties; eventueel handmatige earnings-datum per ticker) en de iron-condor-belofte uit de Spreads-copy halen.
8. **Geannualiseerd rendement op onderpand + % OTM** op CampaignCard en de Performance-tab; **per-contract-fee** toepassen op optie-opens/closes (veld bestaat al).

### Medium bets (1–4 weken)

9. **BYO-key marktdata in de browser** — dezelfde filosofie als de BYO Anthropic-key: gebruiker plakt een API-key van een quotes/chains-provider; client-side fetchen. Maakt OptionCheck/IV-rank echt, ontgrendelt een echte CSP/CC-screener en option-chain-picker, en **vereist géén backend**. De belangrijkste productinvestering.
10. **Option-chain-picker in de wizards** (afhankelijk van #9): strike/expiratie kiezen i.p.v. premies typen — transformeert de dagelijkse UX.
11. **PWA + lokale notificaties**: manifest, service worker, `Notification` bij alert-hits in een achtergrondtab. (Echte push-bij-gesloten-app vergt een backend — uitstellen.)
12. **AI-assistent fase B**: lees-tools over posities/campagnes/alerts; close/roll/assignment-proposals (de propose-then-confirm + gating-scaffolding ondersteunt het al); aangemaakte opties laten linken (`underlyingId`/`wheelId`).
13. **Belgisch fiscaal pakket**: TOB-berekening per transactietype + jaaroverzicht realized P&L/TOB/meerwaardetaks als export, gekoppeld aan de eigen ledger (i.p.v. handmatige invoer). Unieke marktpositie; het curriculum bereidt gebruikers er al op voor.
14. **Didactiek sluitend maken**: sequentiële unlocks afdwingen, 0-credit-"testing"-prijzen vervangen door les-voorwaarden, de ontbrekende medior/senior/expert-hoofdstukken schrijven (CC, CSP, wheel, LEAPS/PMCC, rollen, spreads, KaChing) of unlock blokkeren tot het bijhorende hoofdstuk af is; `offpiste` aan beide `levelOrder`-arrays toevoegen; spook-features opruimen.
15. **Spreads volwaardig maken**: `SpreadPosition` (of een expliciete spread-groepering) i.p.v. de notes-regex; correcte close-flow; call-credit-collateral in vrije cash; spread-leg-assignment-flow. Plus de wizard-merge/legacy-pagina-migratie uit CLAUDE.md (tech-debt die elke feature hierboven belast).
16. **Exercise-flow voor long opties** (LEAPS → aandelen, protective put, PMCC-ITM-resolutie via LEAPS).

### Strategic bets (> 1 maand)

17. **Cloud-sync van het event-log (accepteer de backend).** Eén browserprofiel als enige opslag is een existentieel risico voor een echt-geld-tracker, en echte auth, cross-device en echte push staan er allemaal achter in de rij. De event-sourcing-refactor was er de perfecte voorbereiding op: een append-only log syncen is drastisch eenvoudiger dan mutable state. Doe dit vóór enige betaalde tier — je kunt niet aanrekenen voor data die een cache-clear kan wissen.
18. **Hosted marktdata + screener** (uitbreiding van #9 zodra er een backend is): gedeelde quote-cache, CSP/CC-screener met echte IV-rank, earnings/dividend-kalenders.
19. **Community: echt maken of expliciet "preview" houden** tot na cloud-sync; **mentorship nu killen of vervangen door een contactlink** — een formulier dat nergens heen gaat is erger dan geen formulier.

### Finish/kill-verdicten voor halve features

| Halve feature | Verdict |
|---|---|
| Demo-account | **Fixen via event-seeding** (sales- én lesmateriaal) |
| IB-directe WebSocket + IBSettings | **Nu killen** — per ontwerp onmogelijk |
| .NET PriceService demo-feed | Dev-only houden; niet in investeren — vervangen door #9 |
| Mentorship | **Killen/vervangen door contactlink** |
| Community | Houden als gelabelde preview; beslissen na cloud-sync |
| Quant-teaser | Houden — eerlijk als teaser, verankert off-piste |
| Iron condors | **Niet bouwen** — wheel-gebruikers hebben het niet nodig; belofte uit de UI halen of als "theorie" markeren |
| Analytics Risk-tab | Verbergen tot ontworpen |
| Credits/betalingen (`purchaseCredits`) | Uitstellen tot cloud-accounts bestaan |

### Strategische samenvatting in één zin

Het grootboek, de didactiek en de AI-laag zijn echt en goed; de marktdata-laag en alles sociaals is theater — prioriteer **import (weg met handmatige invoer) → BYO-marktdata (weg met handmatige prijzen) → cloud-gesynchroniseerd event-log (weg met het dataverlies-risico)**, in die volgorde, want elke stap versterkt de vorige en pas de derde verlaat de no-backend-architectuur.
