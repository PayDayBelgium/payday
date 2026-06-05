# Optie-Check — Design

**Datum:** 2026-06-05
**Branch:** feature/community-offpiste
**Status:** Goedgekeurd ontwerp, klaar voor implementatieplan

## 1. Doel

Een tool die controleert of een ticker een goede kandidaat is voor optiestrategieën.
De gebruiker kiest een ticker; de tool toont (gesimuleerde) optie-kerncijfers en geeft per
criterium een oordeel plus een totale geschiktheidsscore met go/no-go-verdict.

Beschikbaar **vanaf medior** (gegate via `options_basics`), in de **Tools**-sectie.

## 2. Scope-beslissingen (uit brainstorm)

| Onderwerp | Beslissing |
|-----------|-----------|
| Databron | **Mock-data per ticker**. De app heeft geen optie-feed; de tool genereert gesimuleerde cijfers. |
| Determinisme | Mock-data is **deterministisch op het ticker-symbool** (hash → seed), zodat dezelfde ticker stabiel dezelfde score geeft (geen flikkerende waarden per render). |
| Diepgang | **Kernset van 5 criteria** (zie §4). |
| Naam | **Optie-Check** (sidebar + paginatitel). |
| Gating | `options_basics` (medior-feature). |
| Eerlijkheid | Duidelijke **"gesimuleerde data"-disclaimer** op de pagina; niet als echt advies presenteren. |
| Ticker-keuze | Uit de bestaande tickerlijst (`selectAllTickers`). Lege staat als er nog geen tickers zijn. |

## 3. Architectuur

### 3.1 Util (`src/utils/optionCandidate.ts`) + test

Pure, framework-vrije logica zodat ze los testbaar is.

```ts
import type { Ticker } from '../types';

export interface MockOptionData {
  ivRank: number;            // 0–100
  openInterest: number;      // contracten
  optionVolume: number;      // contracten/dag
  bidAskSpreadPct: number;   // spread als % van de premie (lager = beter)
  annualizedPremiumPct: number; // geannualiseerd premie-rendement %
  daysToEarnings: number;    // dagen tot volgende earnings
}

export type CriterionStatus = 'good' | 'ok' | 'bad';

export interface CriterionResult {
  key: 'optionable' | 'liquidity' | 'ivRank' | 'premium' | 'earnings';
  label: string;
  status: CriterionStatus;
  score: number;       // 0–100 (bijdrage van dit criterium)
  detail: string;      // korte uitleg met de relevante waarde(n)
}

export type Verdict = 'excellent' | 'suitable' | 'mediocre' | 'unsuitable';

export interface CandidateAssessment {
  totalScore: number;          // 0–100, gewogen
  verdict: Verdict;
  criteria: CriterionResult[];
}

// Deterministische pseudo-random op basis van het symbool (+ optionele seed).
export function generateMockOptionData(symbol: string, seed?: number): MockOptionData;

// Scoort de ticker op de 5 kerncriteria. Gebruikt de echte ticker.optionsAvailable.
export function scoreOptionCandidate(ticker: Ticker, data: MockOptionData): CandidateAssessment;
```

**Determinisme:** een kleine string-hash (bv. een djb2/xfnv-achtige hash van `symbol`,
eventueel gecombineerd met `seed`) voedt een simpele LCG/mulberry32-generator. Géén
`Math.random()` (zou per render veranderen en is in deze codebase ook in tests verboden).

### 3.2 Pagina (`src/pages/tools/OptionCheck.tsx`)

- **Ticker-select** uit `selectAllTickers` (dropdown of zoekveld). Toon een lege staat met
  hint naar de tickerlijst als er nog geen tickers zijn.
- **Cijferkaart**: de gegenereerde `MockOptionData` overzichtelijk (IV-rank, OI, volume,
  spread, premie-rendement, dagen tot earnings) — met een subtiele "gesimuleerd"-badge.
- **Scorecard**: de 5 `CriterionResult`s als rijen met een status-badge (groen/amber/rood)
  + de `detail`-tekst.
- **Verdict**: een duidelijke samenvatting (kleur + label + totaalscore), bv. een score-meter.
- Stijl conform bestaande tools (`surface-card`, `eyebrow`, kleuren `positive`/`caution`/
  `negative`, dezelfde header-opbouw als andere `pages/tools/*`).

### 3.3 Criteria-scoring (§4) zit volledig in de util; de pagina rendert enkel het resultaat.

## 4. De 5 kerncriteria

| # | Criterium | Bron | Logica (richtwaarden) |
|---|-----------|------|-----------------------|
| 1 | **Opties beschikbaar** | `ticker.optionsAvailable` (echt) | `false` → status bad, en het **totale verdict wordt `unsuitable`** ongeacht de rest. |
| 2 | **Optie-liquiditeit** | mock: OI, volume, bidAskSpreadPct | goed: hoge OI/volume **en** smalle spread; matig: gemengd; slecht: lage OI/volume of brede spread. |
| 3 | **IV-rank** | mock: ivRank 0–100 | >50 goed (rijke premie), 25–50 matig, <25 mager. |
| 4 | **Premie-rendement** | mock: annualizedPremiumPct | hoog (bv. ≥20%/jr) goed, midden matig, laag slecht. |
| 5 | **Earnings-nabijheid** | mock: daysToEarnings | <7 dagen waarschuwing (bad/ok afhankelijk), ruim weg = goed. |

**Totaalscore:** gewogen gemiddelde van de criterium-scores (gelijk gewogen tenzij anders;
weging is een implementatiedetail in de util). **Verdict-drempels:** `excellent` ≥80,
`suitable` ≥60, `mediocre` ≥40, anders `unsuitable`. Criterium 1 (geen opties) forceert
`unsuitable`.

## 5. Integratie

- **Route** in `src/App.tsx`:
  `<Route path="tools/option-check" element={<FeatureGate feature="options_basics"><OptionCheck /></FeatureGate>} />`
- **Export** in `src/pages/index.ts`.
- **Sidebar** (`src/components/layout/Sidebar.tsx`), groep **Tools**:
  - `ROUTE_FEATURE_MAP['/tools/option-check'] = 'options_basics'`.
  - Een `hasAccess('/tools/option-check') && <NavLink to="/tools/option-check">` met een
    passend lucide-icoon (bv. `ScanSearch`, `SearchCheck` of `Gauge`; controleer
    beschikbaarheid) en `t('sidebar.optionCheck')`.
- **i18n** (`nl`/`en`/`fr`): `sidebar.optionCheck` ("Optie-Check" / "Option check" /
  "Option check" — NL leidend; FR passend vertaald).

## 6. Verificatie

- Unit-tests voor `optionCandidate.ts`:
  - `generateMockOptionData` is **deterministisch** (zelfde symbool → zelfde data; andere
    seed → andere data) en levert waarden binnen de verwachte ranges.
  - `scoreOptionCandidate`: `optionsAvailable=false` → verdict `unsuitable`; een
    hoge-IV/liquide/ver-van-earnings case → hoge score/`excellent`; een slechte case → laag.
  - Verdict-drempels (80/60/40) kloppen.
- `npm run test`, `npm run lint`, `npm run build` groen.
- Visuele check via Playwright MCP (indien beschikbaar): tool zichtbaar in Tools vanaf
  medior, ticker kiezen toont cijfers + scorecard + verdict; disclaimer aanwezig.

## 7. Buiten scope / later

- Echte optie-data/marktfeed (nu gesimuleerd).
- Batch-scan over de hele watchlist / ranking (nu één ticker per keer).
- Strategie-specifieke weging (CSP vs. covered call vs. wheel) — nu één algemene score.
- Persistente opslag van checks (nu enkel live berekend).
