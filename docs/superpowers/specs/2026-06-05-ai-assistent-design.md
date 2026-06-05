# PayDay AI-assistent — Design

**Datum:** 2026-06-05
**Branch:** main
**Status:** Goedgekeurd ontwerp, klaar voor implementatieplan

## 1. Doel

Een floating action button (FAB) rechtsonder opent een **rechter zijpaneel** met een AI-agent
die de gebruiker helpt in PayDay. De agent kan chatten, app-acties **voorstellen** (de gebruiker
bevestigt, de app voert uit) en — als vlaggenschip-use-case — een **broker-screenshot** inlezen
om de portefeuille te **reconciliëren**: bestaande (geregistreerde) state vergelijken met wat de
screenshot toont, en alleen de verschillen doorvoeren.

Kernprincipe: **de LLM beslist *wat*, de gebruiker keurt goed, de app *doet*.** De agent dispatcht
nooit zelf een wijziging.

## 2. Scope-beslissingen (uit brainstorm)

| Onderwerp | Beslissing |
|-----------|-----------|
| AI-aanroep | **BYOK in de browser** (geen backend). Key(s) in localStorage, **éénmalig** instellen in Settings; daarna nooit meer. Settings toont "✓ ingesteld". |
| Provider | **Instelbaar**: Anthropic, OpenAI én Gemini via één provider-abstractie. Eerste te bouwen provider: **Anthropic** (fase F voegt OpenAI + Gemini toe). |
| Agent-breedte | **Volledige agent** als raamwerk, met een beheersbare v1-toolset. |
| v1-tools | Portfolio's + posities (aanmaken/wijzigen), navigeren, uitleg/lesgeven. *(Journal/todo's/doelen: later.)* |
| Schrijf-acties | **Preview + bevestigen** voor álles wat data wijzigt. Lees-acties (state opvragen, navigeren) mogen direct. |
| Broker-flow | **Reconciliatie/sync**, geen eenmalige import (zie §5). |
| Anti-hallucinatie | Architectonisch afgedwongen, niet als belofte (zie §6). |
| State opvragen | **On-demand via read-tools** — alleen wat nodig is gaat naar de LLM, niet de hele lokale database. |
| Gesprek | **Fris per sessie** (efemeer, niet gepersisteerd). |
| Taal | De agent **spiegelt de taal van de gebruiker** (los van de app-taal). |
| UI | **Rechter zijpaneel (drawer)**, geopend via FAB rechtsonder. |
| Veiligheid key | Duidelijke waarschuwing dat de key in de browser leeft (prima voor persoonlijk gebruik, niet voor publieke productie). |

## 3. Architectuur — vier lagen

Omdat alle data van PayDay in Redux zit, worden agent-"tools" simpelweg wrappers rond bestaande
Redux-acties. Geen MCP, geen netwerk-tussenlaag voor de tools zelf.

### 3.1 Provider-laag (`src/services/ai/providers/`)

Eén interface, drie adapters. Elke adapter vertaalt tussen het **genormaliseerde berichtmodel**
(§3.2) en het provider-specifieke formaat (vision-input en function-calling verschillen per provider).

```ts
export interface AIProvider {
  readonly id: 'anthropic' | 'openai' | 'gemini';
  // Stuurt het gesprek + tooldefinities; geeft een stream van genormaliseerde events terug.
  streamChat(input: {
    system: string;
    messages: AIMessage[];
    tools: ToolSchema[];
    signal: AbortSignal;
  }): AsyncIterable<AIStreamEvent>;
}
```

- `providers/anthropicProvider.ts` (fase A–D)
- `providers/openaiProvider.ts`, `providers/geminiProvider.ts` (fase F)
- `providers/index.ts` — factory die op basis van Settings de juiste adapter kiest.

### 3.2 Genormaliseerd berichtmodel (`src/services/ai/types.ts`)

```ts
export type ContentBlock =
  | { kind: 'text'; text: string }
  | { kind: 'image'; mediaType: string; dataBase64: string }   // screenshot-upload
  | { kind: 'tool_use'; id: string; name: string; args: unknown }
  | { kind: 'tool_result'; toolUseId: string; result: unknown; isError?: boolean };

export interface AIMessage {
  role: 'user' | 'assistant';
  content: ContentBlock[];
}

export type AIStreamEvent =
  | { type: 'text_delta'; text: string }
  | { type: 'tool_use'; id: string; name: string; args: unknown }
  | { type: 'done'; stopReason: 'end' | 'tool_use' | 'max_tokens' | 'aborted' }
  | { type: 'error'; message: string };
```

### 3.3 Tool-registry (`src/services/ai/tools/`)

Elke tool heeft naam, beschrijving, JSON-schema en een **soort**:

```ts
export interface ToolDef {
  name: string;
  description: string;
  parameters: JSONSchema;       // strikt: verplichte velden afgedwongen
  kind: 'read' | 'propose';
  // read: voert direct uit en geeft data terug.
  // propose: voert NIETS uit; valideert input en geeft een ProposedChange terug.
  run(args: unknown, ctx: ToolContext): Promise<ToolResult>;
}

export interface ToolContext {
  getState: () => RootState;        // lezen uit Redux
  dispatch: AppDispatch;            // alleen read-tools gebruiken dit indirect; writes lopen via bevestiging
  navigate: (path: string) => void; // react-router
}
```

Toolbestanden in v1:

| Bestand | Tools | Soort |
|---------|-------|-------|
| `readTools.ts` | `get_portfolios`, `get_positions`, `get_tickers` | read |
| `navigationTools.ts` | `navigate_to`, `open_wizard` | read |
| `portfolioTools.ts` | `propose_create_portfolio`, `propose_update_portfolio` | propose |
| `positionTools.ts` | `propose_create_position`, `propose_update_position`, `propose_close_position` | propose |
| `knowledgeTools.ts` | `explain_strategy`, `get_education_content` | read |
| `index.ts` | registry: naam → ToolDef | — |

**Propose-tools voeren niets uit.** Ze valideren tegen het schema (alle verplichte velden aanwezig
+ van bron voorzien, §6) en geven een `ProposedChange` terug die als preview-kaart verschijnt.
Pas na bevestiging dispatcht de app de échte bestaande Redux-acties.

### 3.4 Agent-loop (`src/services/ai/agentLoop.ts`)

Provider-agnostisch. Per beurt:

1. Stuur `system + messages + tools` naar de gekozen provider, stream de tekst naar de UI.
2. Bij `tool_use`:
   - **read-tool** → direct uitvoeren, resultaat terug als `tool_result`, loop gaat door.
   - **propose-tool** → valideren; geldig voorstel wordt verzameld als **openstaande change**.
3. Zijn er openstaande changes? → **pauzeer** en toon de preview-kaart(en). Wacht op bevestiging.
   - Bevestigd → app dispatcht de echte actie(s); de agent krijgt `tool_result` "doorgevoerd: …".
   - Geannuleerd → de agent krijgt `tool_result` "geannuleerd door gebruiker".
4. Geen openstaande changes en `stopReason: 'end'` → beurt klaar.
5. **Max tool-rondes per beurt** (bv. 8) beschermt tegen runaway-kosten/loops.
6. `AbortController` laat de gebruiker een lopende beurt afbreken.

### 3.5 UI-laag (`src/components/ai/`)

| Component | Verantwoordelijkheid |
|-----------|----------------------|
| `AIAssistantFab.tsx` | FAB rechtsonder (`fixed bottom-6 right-6 z-40`), opent/sluit de drawer. |
| `AIAssistantDrawer.tsx` | Rechter zijpaneel; bevat berichtenlijst + composer. |
| `MessageList.tsx` / `MessageBubble.tsx` | Rendert de chat (tekst, afbeeldingen, statusregels). |
| `ProposedChangesCard.tsx` | Toont changes gegroepeerd (`+ toevoegen`, `~ wijzigen`, `– sluiten`) met bron per veld; knoppen **✓ Doorvoeren / ✕ Annuleren** (per groep of per regel). |
| `ScreenshotDropzone.tsx` | Sleep/upload van een screenshot → image-block. |
| `AIComposer.tsx` | Tekstinvoer + verzenden + afbreken. |

### 3.6 State & opslag

- **Chat-state**: efemeer in `src/contexts/AIAssistantContext.tsx` (React context + reducer).
  Bewust **niet** in redux-persist (fris per sessie). Orchestreert de agent-loop en heeft toegang
  tot `dispatch`, `getState` en `navigate`.
- **Settings**: nieuwe AI-sectie in de Settings-pagina. Per provider één key + provider/model-keuze,
  opgeslagen los in localStorage (sleutel bv. `payday-ai-config`). Niet in de redux-persist-whitelist.

## 4. Systeemprompt (`src/services/ai/systemPrompt.ts`)

Bevat:
- De **PayDay-datamodellen** met verplichte velden per entiteit (§7) — zodat de agent weet wat hij
  moet verzamelen vóór een voorstel.
- **Taalregel**: spiegel de taal van het laatste gebruikersbericht.
- **Anti-hallucinatieregels** (§6): nooit waarden invullen die niet expliciet uit de screenshot of
  het gesprek komen; bij twijfel een vraag stellen i.p.v. aannemen; elk veld een bron meegeven.
- **Werkwijze**: stel changes voor via propose-tools, voer nooit zelf uit; vraag ontbrekende info
  eerst op.

## 5. Broker-reconciliatie (vlaggenschip-flow)

Geen eenmalige import maar een **sync** tussen geregistreerde state en de screenshot.

### 5.1 Stappen

1. **Intake.** Bij de start vraagt de agent expliciet:
   - welk **portfolio** dit betreft (bestaand kiezen of nieuw aanmaken),
   - de **valuta** (USD/EUR),
   - de **beschikbare cash bij de broker**.
2. **Geregistreerde state ophalen.** Via `get_portfolios` + `get_positions` haalt de agent de
   huidige posities van dat portfolio op.
3. **Screenshot lezen.** De gebruiker uploadt de screenshot; de agent leest de regels uit en mapt
   ze op PayDay-positietypes.
4. **Diff bepalen.** Per regel classificeren:

   | Klasse | Betekenis | Voorgestelde actie |
   |--------|-----------|--------------------|
   | **nieuw** | staat op screenshot, niet in PayDay | `propose_create_position` |
   | **gewijzigd** | match gevonden, maar veld(en) verschillen | `propose_update_position` (toont oud → nieuw) |
   | **ongewijzigd** | identiek | geen actie |
   | **mogelijk gesloten** | staat in PayDay, niet op screenshot | **vraag** — niet automatisch sluiten |

5. **Cash verwerken.** De opgegeven cash wordt mee voorgesteld zodat `currentValue =
   som(posities) + cash` klopt. Mapping: cash wordt vastgelegd via een **portfolio-transactie**
   (`deposit`/`adjustment`) en/of bijwerking van `currentValue`. *(Exacte mapping = implementatiedetail;
   zie §9 open punt 1.)*
6. **Bevestigen.** `ProposedChangesCard` toont de changes gegroepeerd; de gebruiker keurt goed.
7. **Doorvoeren.** De app dispatcht de echte acties (`addPortfolio`, `addTicker`, `addPosition`,
   `updatePosition`, `addTransaction`, …).

### 5.2 Matching-regel

Posities matchen op een **stabiele sleutel**: `ticker + type + strike + expiration + action`
(velden die niet van toepassing zijn worden weggelaten). Geen match → kandidaat "nieuw".
Match met afwijkende waarden → "gewijzigd".

### 5.3 Kritisch veiligheidsprincipe

Een positie die **wel** in PayDay staat maar **niet** op de screenshot, wordt **nooit automatisch
als gesloten** beschouwd — een screenshot kan onvolledig zijn. De agent markeert dit als
"mogelijk gesloten" en **vraagt** of het gesloten/verkocht is. Dit volgt direct uit §6.

## 6. Anti-hallucinatie — architectonisch afgedwongen

Een LLM kan zijn eigen zekerheid niet betrouwbaar kalibreren, dus we steunen niet op een
"99%"-belofte maar op een ontwerp waarin verzonnen/onzekere data **niet ongemerkt kan doorglippen**:

1. **Code-validatie (deterministisch).** Elke propose-tool heeft een strikt JSON-schema. Ontbreekt
   een verplicht veld, dan **weigert** de tool en moet de agent doorvragen. Verzinnen helpt niet,
   want:
2. **Bron per veld.** Elk veld draagt een herkomst: `from_screenshot` of `from_user`. Een veld
   zonder geldige bron is ongeldig; de status "aangenomen/verzonnen" bestaat niet.
3. **Bron zichtbaar op de preview-kaart.** De gebruiker ziet vóór bevestiging bij elk veld waar het
   vandaan komt; twijfelachtige velden worden gemarkeerd.
4. **Systeemprompt-discipline.** Harde regel: nooit waarden invullen die niet expliciet in de
   screenshot of het gesprek staan; bij de minste twijfel een vraag stellen.
5. **Menselijke bevestiging.** Niets belandt in de data zonder expliciete goedkeuring.

De combinatie *code-gate + bron-tracking + menselijke bevestiging* is de garantie — sterker dan een
zelfgerapporteerde zekerheid.

## 7. Verplichte velden per entiteit (bron van waarheid voor "alle info opvragen")

Afgeleid uit `src/types/index.ts`. De agent moet deze velden compleet hebben (met bron) vóór een
voorstel. Berekende velden (bv. `costBasis`, `currentValue`, `dte`, `breakEven`) leidt de app af en
worden **niet** door de agent verzonnen.

**Portfolio** (`addPortfolio`): `name`, `currency`, `initialCapital`, `pricePerContract`,
`hasOptions`, `strategies[]`. Afgeleid/standaard: `currentValue`, `logo`, `strategy`.

**Stock/ETF** (`type: 'stock' | 'etf'`): `ticker`, `portfolio`, `openDate`, `shares`,
`purchasePrice`. Afgeleid: `costBasis`, `currentValue`, `currentPrice` (via prijs-service).

**Call/Put** (`type: 'call' | 'put'`): `ticker`, `portfolio`, `openDate`, `action` (buy/sell),
`strike`, `expiration`, `contracts`, `premium`. Afgeleid: `costBasis`, `currentValue`.

**Covered Call**: `ticker`, `portfolio`, `openDate`, `underlyingType`, `underlyingId`, `strike`,
`expiration`, `contracts`, `premiumCollected`.

**Cash Secured Put**: `ticker`, `portfolio`, `openDate`, `strike`, `expiration`, `contracts`,
`premiumCollected`, `cashReserved`.

**Spread** (`type: 'spread'`): `ticker`, `portfolio`, `openDate`, `spreadType`, `spreadStyle`,
`longLeg`, `shortLeg` (elk: `action`, `optionType`, `strike`, `expiration`, `contracts`, `premium`).

**Ticker** (`addTicker`, indien onbekend): `symbol`, `name`, `type` (stock/etf),
`optionsAvailable`, `miniContractsAvailable`.

> De v1-toolset dekt minimaal Stock/ETF, Call, Put en Covered Call (de meest voorkomende
> broker-regels). LEAP, KaChing, Iron Condor enz. komen later; tot dan markeert de agent ze als
> "nog niet ondersteund — handmatig aanmaken" i.p.v. te gokken.

## 8. Foutafhandeling & randgevallen

| Geval | Gedrag |
|-------|--------|
| Geen/ongeldige key | Vriendelijke melding in de chat + knop naar Settings. |
| API-/rate-limit-fout | Tonen in de chat met een **retry**-knop. |
| Onzekere vision-extractie | De agent **vraagt na** i.p.v. te gokken (§6). |
| Tool-validatie faalt | `tool_result` met de fout; de agent corrigeert of vraagt na. |
| Beurt afbreken | `AbortController` stopt de stream; status "afgebroken". |
| Runaway-loop | Max tool-rondes per beurt (bv. 8). |
| Niet-ondersteund positietype | Markeren als "handmatig aanmaken", niet gokken. |
| Onvolledige screenshot | Ontbrekende bekende posities → "mogelijk gesloten", vraag (§5.3). |

## 9. Open punten (voor implementatieplan)

1. **Cash-mapping.** Exacte manier om "beschikbare cash" vast te leggen: portfolio-transactie
   (`deposit`/`adjustment`) versus rechtstreeks `currentValue`. Te beslissen bij het plan.
2. **Default model per provider.** Concrete model-ID's (Anthropic eerst) vastleggen in config.
3. **Prijs-service bij import.** Of/hoe `currentPrice` direct opgehaald wordt via de bestaande
   price-service, of voorlopig leeg blijft.
4. **Feature-gating.** *Beslist:* de FAB is **altijd zichtbaar**, ongeacht niveau — de bestaande
   `ai_assistant` expert-feature-flag wordt hiervoor niet gebruikt.

## 10. Testing (Vitest)

- **Tool-registry**: validatie (ontbrekend verplicht veld → weigeren) + `ProposedChange`-output met
  een mock-store.
- **Diff/reconciliatie**: pure functie `reconcile(geregistreerd, screenshotRegels)` → changes;
  unit-tests voor nieuw/gewijzigd/ongewijzigd/mogelijk-gesloten incl. het veiligheidsprincipe.
- **Provider-adapters**: gemockt API-antwoord → genormaliseerde `AIStreamEvent`s.
- **Agent-loop**: **scripted mock-provider** die tool_uses teruggeeft → verifieer dat read-tools
  draaien en propose-tools als bevestiging verschijnen, en dat de max-rondes-grens werkt.
- Echte netwerk-calls vallen buiten de unit-tests dankzij de provider-abstractie.

## 11. Bouwfasering (binnen v1)

| Fase | Inhoud |
|------|--------|
| **A** | Skelet: FAB + drawer + tekstchat met Anthropic-provider + Settings-key (éénmalig). |
| **B** | Tool-framework + read-tools (`get_portfolios/positions/tickers`) + navigatie. |
| **C** | Propose/confirm-tools voor portfolio's + posities + `ProposedChangesCard`. |
| **D** | Vision + broker-reconciliatie (intake, diff, cash, bevestigen, doorvoeren). |
| **E** | Uitleg/lesgeven-tools (`explain_strategy`, `get_education_content`). |
| **F** | OpenAI- + Gemini-adapter + provider-keuze in Settings. |

## 12. Nieuwe bestanden (overzicht)

```
src/services/ai/
  types.ts
  config.ts                 // provider/model + API-key opslag (localStorage)
  systemPrompt.ts
  agentLoop.ts
  reconcile.ts              // pure diff geregistreerd ↔ screenshot
  providers/
    index.ts
    anthropicProvider.ts
    openaiProvider.ts        // fase F
    geminiProvider.ts        // fase F
  tools/
    index.ts
    readTools.ts
    navigationTools.ts
    portfolioTools.ts
    positionTools.ts
    knowledgeTools.ts
src/components/ai/
  AIAssistantFab.tsx
  AIAssistantDrawer.tsx
  MessageList.tsx
  MessageBubble.tsx
  ProposedChangesCard.tsx
  ScreenshotDropzone.tsx
  AIComposer.tsx
src/contexts/AIAssistantContext.tsx
```

Integratie: `AIAssistantFab` + `AIAssistantDrawer` (binnen `AIAssistantContext`-provider) in
`src/components/layout/Layout.tsx`. AI-sectie toegevoegd aan de Settings-pagina. i18n-sleutels
(`ai.*`) in `en.ts`, `nl.ts`, `fr.ts`.
