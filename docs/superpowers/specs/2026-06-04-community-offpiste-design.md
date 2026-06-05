# Community, Trading ideas & Off-piste (Quant trading) — Design

**Datum:** 2026-06-04
**Branch:** feature/portfolio-grouped-stock-tree (nieuwe feature-branch aanbevolen)
**Status:** Goedgekeurd ontwerp, klaar voor implementatieplan

## 1. Doel

PayDay uitbreiden met een sociale laag die naadloos op de bestaande ski-piste-metafoor
voortbouwt:

1. **Community-pagina** ("après-ski bar") waar gebruikers met elkaar in dialoog gaan.
2. **Trading ideas** — posts met een gekoppeld trade-idee (incl. "juice"/IV-rank) die
   met één klik de bestaande optie-wizard voorvullen.
3. **Dashboard-sectie** onderaan met twee aparte widgets: *Trading ideas* en *Community*.
4. **Off-piste** als nieuw 5e level (*Quant trading*), ontgrendeld via credits die je
   verdient door deel te nemen aan de community (de "après-ski bar").
5. **Verfijnde berg-visualisatie** met de bestaande skilift + gondels, een off-piste
   mogul-route naast de zwarte top, en de après-ski bar als community-anker.

## 2. Scope-beslissingen (uit brainstorm)

| Onderwerp | Beslissing |
|-----------|-----------|
| Backend | Geen. Alles frontend-only via Redux Toolkit + redux-persist met mock/seed-data. |
| Quant trading-pagina | Sfeervolle **teaser/playground** (uitleg + voorbeeldvisualisaties), géén volwaardige tools. |
| Off-piste unlock | **Credit-mechaniek** zoals de andere levels, maar credits worden (mede) **verdiend door community-deelname**. |
| Trading idea → trade | Knop opent de **bestaande optie-wizard, voorgevuld** (ticker + actie). |
| Dashboard | **Twee aparte widgets** in de stijl van de bestaande widgets; **geen** après-ski-branding op het dashboard. |
| Berg te groot? | Canvas behouden (800×420) — "mooier" = compositie verfijnen en de ruimte zinvol vullen met off-piste + après-ski. |

## 3. Architectuur

### 3.1 Types (`src/types/index.ts`)

- `UserLevel` uitbreiden: `'beginner' | 'medior' | 'senior' | 'expert' | 'offpiste'`.
- `FeatureId` uitbreiden met `'quant_trading'`.
- Nieuwe types:
  ```ts
  export type CommunityChannel = 'ideas' | 'general' | 'quant';

  export interface CommunityAuthor {
    name: string;
    initials: string;
    color: string;        // avatar-achtergrondkleur (hex)
    level: UserLevel;     // bepaalt de piste-badge
  }

  export interface TradeIdea {
    ticker: string;
    strategy: FeatureId;  // bv. 'cash_secured_puts' | 'covered_calls'
    expiry: string;       // ISO of "21 jun"
    strike?: number;
    premium?: number;
    returnPct?: number;
    delta?: number;
    ivRank: number;       // 0–100, de "juice"
  }

  export interface CommunityReply {
    id: string;
    author: CommunityAuthor;
    text: string;
    createdAt: string;
  }

  export interface CommunityPost {
    id: string;
    author: CommunityAuthor;
    channel: CommunityChannel;
    text: string;
    createdAt: string;
    likes: number;
    likedByMe: boolean;
    replies: CommunityReply[];
    tradeIdea?: TradeIdea;
  }
  ```

### 3.2 Nieuwe slice (`src/store/slices/communitySlice.ts`)

- State: `{ posts: CommunityPost[] }`, geseed met mock-posts (zie §4.2).
- Reducers: `addPost`, `addReply`, `toggleLike`.
- Selectors: `selectPostsByChannel(channel)`, `selectRecentPosts(limit)`,
  `selectFeaturedTradeIdeas(limit)` (posts met `tradeIdea`, gesorteerd op ivRank/likes).
- Registreren in `src/store/index.ts` met persist.

### 3.3 Credits via community → off-piste

- Bij `addPost` en `addReply` ook `addCredits` dispatchen (bv. +10 voor een post, +3 voor
  een reply, met reden "Bijdrage in de community"). Dit is de brug: in de après-ski bar
  verdien je de credits die **Off-piste** ontgrendelen. Bestaande `spendCredits`/`unlockLevel`
  blijven het ontgrendelmechanisme.
- Implementatiekeuze: dispatch vanuit de UI-handler (composer) of via een thunk; niet in de
  community-reducer zelf (cross-slice).

### 3.4 Levels (`src/store/slices/userProgressSlice.ts`)

- `LEVEL_CONFIGS` krijgt een 5e entry:
  ```ts
  {
    level: 'offpiste',
    name: 'Off-piste',
    slopeName: 'Off-piste',
    slopeColor: 'orange',
    icon: '🟠',
    description: 'Verlaat de geprepareerde piste: kwantitatieve modellen, edge-detectie en
                  data-gedreven trading. Ontgrendel via de community.',
    features: ['quant_trading'],
    creditsRequired: 100,
    priceEUR: 0,
  }
  ```
- **Alle `levelOrder`-arrays** uitbreiden met `'offpiste'` (in `getFeaturesForLevel`,
  `unlockLevel`, `selectNextLevel`).
- `FeatureGate` (`src/components/features/FeatureGate.tsx`) en de mission `LevelCard`
  kleur-switches uitbreiden met een `'orange'`-tak (gebruik bv. amber/oranje Tailwind-tinten;
  controleer beschikbare kleuren in `tailwind.config.js`).

## 4. Berg-visualisatie

### 4.1 Component

- `SkiSlope` uit `src/pages/mission/MissionStatement.tsx` **extraheren** naar
  `src/components/mission/PaydayMountain.tsx` (het bestand groeit anders te groot).
- Props: `{ activeLevel: UserLevel; unlockedLevels: UserLevel[]; onNavigate?: (path)=>void }`.
- Canvas `viewBox="0 0 800 420"` behouden.
- **Klikbaar**: de après-ski bar-groep → navigeer naar `/community`; de off-piste-groep
  (corridor + labels) → navigeer naar `/quant` (of `/mission` bij locked, zoals FeatureGate).
- Off-piste-labelstaat: toon de "ONTGRENDELEN"-pill enkel wanneer `'offpiste'` **niet** in
  `unlockedLevels`; vervang die door bv. een groene "ACTIEF"-pill (of laat weg) wanneer
  ontgrendeld.
- Snow-fall overlay uit het origineel mag behouden blijven.
- De "traject"-strip (4 stappen) in de hero van `MissionStatement.tsx` krijgt de **5e
  off-piste-stap** (oranje dubbel-diamant glyph) voor consistentie.
- `LEVEL_CONFIGS.map(...)` voor de LevelCards toont automatisch de 5e kaart.

### 4.2 Canonieke scène (gevalideerd)

De volgende SVG is de gevalideerde doel-compositie (uit de visuele brainstorm). De React-
versie gebruikt dezelfde coördinaten/paden; markers/labels worden datagedreven uit de
stations-array gerenderd i.p.v. hardgecodeerd, met behoud van exact deze look.

```svg
<svg viewBox="0 0 800 420" style="width:100%;display:block;aspect-ratio:800/420;font-family:'Inter Tight',Inter,sans-serif;">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAF1FB"/><stop offset="1" stop-color="#F6F9FD"/></linearGradient>
    <linearGradient id="far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C3D5EE"/><stop offset="1" stop-color="#DDE8F6"/></linearGradient>
    <linearGradient id="mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8FB1D9"/><stop offset="1" stop-color="#B9D0EA"/></linearGradient>
    <linearGradient id="near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5A8DC4"/><stop offset="1" stop-color="#88B0DA"/></linearGradient>
    <linearGradient id="valley" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ECF3FC"/><stop offset="1" stop-color="#FCFDFF"/></linearGradient>
    <linearGradient id="cabin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#DCE7F4"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stop-color="#FFD37A" stop-opacity="0.95"/><stop offset="1" stop-color="#FFD37A" stop-opacity="0"/></radialGradient>
    <radialGradient id="mogul" cx="0.4" cy="0.3" r="0.78"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#CBDDF1"/></radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.6" flood-color="#0B1E36" flood-opacity="0.18"/></filter>
  </defs>
  <rect width="800" height="420" fill="url(#sky)"/>
  <circle cx="735" cy="58" r="34" fill="rgba(255,231,170,0.5)"/><circle cx="735" cy="58" r="15" fill="rgba(255,231,170,0.85)"/>
  <path d="M0 240 L130 175 L250 215 L380 150 L520 200 L650 150 L800 188 L800 300 L0 300Z" fill="url(#far)" opacity="0.65"/>
  <path d="M0 285 L110 235 L230 275 L360 205 L470 255 L600 195 L720 240 L800 215 L800 320 L0 320Z" fill="url(#mid)" opacity="0.85"/>
  <path d="M0 332 L120 272 L250 212 L370 152 L495 92 L585 50 L660 76 L770 128 L800 148 L800 332Z" fill="url(#near)"/>
  <path d="M495 92 L585 50 L660 76 L636 92 L606 68 L578 90 L530 102Z" fill="#fff"/>
  <path d="M584 60 Q512 138 432 198 Q352 256 300 318" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" opacity="0.45"/>
  <path d="M584 60 Q512 138 432 198 Q352 256 300 318" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity="0.7"/>
  <path d="M0 332 L800 332 L800 420 L0 420Z" fill="url(#valley)"/>
  <!-- pines bottom-left -->
  <g fill="#0E4C92"><polygon points="22,376 14,394 30,394"/><polygon points="52,384 44,402 60,402"/><polygon points="10,390 4,404 16,404"/></g>
  <!-- ski-lift: base station -->
  <g transform="translate(48 360)" filter="url(#soft)">
    <rect x="-22" y="0" width="44" height="26" rx="3" fill="#FFFFFF" stroke="#D8E1EC"/>
    <polygon points="-26,0 0,-12 26,0" fill="#2F6CAE"/>
    <rect x="-15" y="7" width="11" height="12" rx="1.5" fill="#CFE0F3"/><rect x="4" y="7" width="11" height="12" rx="1.5" fill="#CFE0F3"/>
  </g>
  <!-- towers -->
  <g stroke="#33425C" stroke-width="2.4" stroke-linecap="round">
    <line x1="190" y1="288" x2="190" y2="332"/><line x1="178" y1="288" x2="202" y2="288"/>
    <line x1="350" y1="208" x2="350" y2="300"/><line x1="338" y1="208" x2="362" y2="208"/>
    <line x1="490" y1="132" x2="490" y2="240"/><line x1="478" y1="132" x2="502" y2="132"/>
  </g>
  <!-- top station -->
  <g transform="translate(592 60)" filter="url(#soft)"><rect x="-16" y="-6" width="32" height="18" rx="3" fill="#FFFFFF" stroke="#D8E1EC"/><polygon points="-19,-6 0,-15 19,-6" fill="#2F6CAE"/></g>
  <!-- cable from foot to top -->
  <path id="cable" d="M 56 350 Q 230 268 350 208 Q 470 148 588 58" fill="none" stroke="#33425C" stroke-width="1.4"/>
  <!-- gondolas (3, looped) -->
  <g>
    <g id="gondola">
      <rect x="-3" y="-2.6" width="6" height="3.2" rx="1.2" fill="#33425C"/>
      <path d="M0 0.6 q3 4.4 0 7.4" stroke="#33425C" stroke-width="1.3" fill="none"/>
      <rect x="-9" y="7.5" width="18" height="13.5" rx="4" fill="url(#cabin)" stroke="#9FB6D2" stroke-width="0.7" filter="url(#soft)"/>
      <rect x="-6.5" y="10" width="13" height="6" rx="2" fill="#9FC4EA"/>
      <rect x="-7.5" y="17.6" width="15" height="3" rx="1.5" fill="#0B4A8F"/>
    </g>
    <animateMotion dur="22s" repeatCount="indefinite"><mpath href="#cable"/></animateMotion>
  </g>
  <g><use href="#gondola"/><animateMotion dur="22s" begin="-7.3s" repeatCount="indefinite"><mpath href="#cable"/></animateMotion></g>
  <g><use href="#gondola"/><animateMotion dur="22s" begin="-14.6s" repeatCount="indefinite"><mpath href="#cable"/></animateMotion></g>
  <!-- off-piste mogul corridor next to the black summit -->
  <path d="M626 78 Q672 108 650 148 Q632 178 658 206 L630 206 Q606 174 624 146 Q646 108 602 82 Z" fill="#fff" opacity="0.26"/>
  <g>
    <ellipse cx="630" cy="104" rx="13" ry="6" fill="url(#mogul)"/><ellipse cx="652" cy="124" rx="14" ry="6.5" fill="url(#mogul)"/>
    <ellipse cx="632" cy="146" rx="13" ry="6" fill="url(#mogul)"/><ellipse cx="652" cy="168" rx="14" ry="6.5" fill="url(#mogul)"/>
    <ellipse cx="636" cy="190" rx="13" ry="6" fill="url(#mogul)"/>
    <g fill="#9DB6D6" opacity="0.3"><ellipse cx="643" cy="115" rx="6.5" ry="2"/><ellipse cx="643" cy="157" rx="6.5" ry="2"/><ellipse cx="645" cy="179" rx="6.5" ry="2"/></g>
  </g>
  <path d="M630 92 Q662 110 634 130 Q608 150 650 174 Q672 190 638 202" fill="none" stroke="#9DB6D6" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="2 6"/>
  <!-- uniform label pills (no route glyphs) -->
  <g font-size="9.5" font-weight="600" fill="#0F1E36">
    <g transform="translate(150 300)" filter="url(#soft)"><rect x="-32" y="-9" width="64" height="18" rx="9" fill="#fff" stroke="#E3E8EF"/><circle cx="-19" cy="0" r="4.5" fill="#0F9D58"/><text x="6" y="3" text-anchor="middle">GROEN</text></g>
    <g transform="translate(300 224)" filter="url(#soft)"><rect x="-32" y="-9" width="64" height="18" rx="9" fill="#fff" stroke="#E3E8EF"/><rect x="-23.5" y="-4.5" width="9" height="9" fill="#2F6CAE"/><text x="6" y="3" text-anchor="middle">BLAUW</text></g>
    <g transform="translate(431 164)" filter="url(#soft)"><rect x="-30" y="-9" width="60" height="18" rx="9" fill="#fff" stroke="#E3E8EF"/><rect x="-20" y="-4.5" width="9" height="9" fill="#D14343" transform="rotate(45 -15.5 0)"/><text x="6" y="3" text-anchor="middle">ROOD</text></g>
    <g transform="translate(560 104)" filter="url(#soft)"><rect x="-32" y="-9" width="64" height="18" rx="9" fill="#fff" stroke="#E3E8EF"/><g transform="translate(-21 0)"><rect x="-5" y="-3.5" width="6.5" height="6.5" fill="#0F1E36" transform="rotate(45 -1.75 0)"/><rect x="2" y="-3.5" width="6.5" height="6.5" fill="#0F1E36" transform="rotate(45 5.25 0)"/></g><text x="7" y="3" text-anchor="middle">ZWART</text></g>
    <!-- OFF-PISTE pill + ONTGRENDELEN pill (alleen bij locked) -->
    <g transform="translate(692 171)" filter="url(#soft)"><rect x="-52" y="-9" width="104" height="18" rx="9" fill="#fff" stroke="#F3D2B0"/><g transform="translate(-34 0)"><rect x="-5" y="-3.5" width="6.5" height="6.5" fill="#F08C2E" transform="rotate(45 -1.75 0)"/><rect x="2" y="-3.5" width="6.5" height="6.5" fill="#F08C2E" transform="rotate(45 5.25 0)"/></g><text x="6" y="3" text-anchor="middle" fill="#9A3412">OFF-PISTE</text></g>
    <g transform="translate(692 184)" filter="url(#soft)">
      <rect x="-39" y="-7.5" width="78" height="15" rx="7.5" fill="#FFF7ED" stroke="#F08C2E" stroke-width="0.9"/>
      <text x="0" y="2.6" font-size="7.6" font-weight="700" fill="#9A3412" text-anchor="middle" letter-spacing="0.04em">ONTGRENDELEN</text>
    </g>
  </g>
  <!-- après-ski bar = community -->
  <g transform="translate(700 300)">
    <ellipse cx="0" cy="58" rx="86" ry="9" fill="#0B4A8F" opacity="0.12"/>
    <circle cx="0" cy="30" r="64" fill="url(#glow)"/>
    <g filter="url(#soft)">
      <rect x="-50" y="20" width="100" height="40" rx="2.5" fill="#7A4E2A"/>
      <polygon points="-58,20 0,-10 58,20" fill="#4A2F18"/>
      <polygon points="-58,20 0,-10 58,20" fill="#fff" opacity="0.5"/>
    </g>
    <rect x="-35" y="30" width="17" height="17" rx="1.5" fill="#FFD37A"/><rect x="18" y="30" width="17" height="17" rx="1.5" fill="#FFD37A"/>
    <rect x="-7.5" y="34" width="15" height="26" rx="1.5" fill="#3A2410"/>
    <rect x="33" y="-2" width="9" height="15" fill="#4A2F18"/>
    <path d="M37.5 -4 q-6.5 -8 0 -14 q6.5 -6.5 0 -13" fill="none" stroke="#cfd8e3" stroke-width="2.2" opacity="0.7"/>
    <path d="M-55 16 Q0 7 55 16" fill="none" stroke="#C2410C" stroke-width="1.1"/>
    <circle cx="-35" cy="12.5" r="2.1" fill="#FFB347"/><circle cx="-13" cy="10" r="2.1" fill="#7AD1FF"/><circle cx="13" cy="10" r="2.1" fill="#FF8FA3"/><circle cx="35" cy="12.5" r="2.1" fill="#9DFFB0"/>
    <g transform="translate(-58 38)"><rect x="-1.8" y="-35" width="3.4" height="47" rx="1.7" fill="#D14343" transform="rotate(14)"/><rect x="-1.8" y="-35" width="3.4" height="47" rx="1.7" fill="#2F6CAE" transform="rotate(-14)"/><ellipse cx="0" cy="13" rx="10" ry="3" fill="#fff" opacity="0.8"/></g>
    <g transform="translate(58 26)"><rect x="-6" y="0" width="13" height="38" rx="6.5" fill="#0F9D58" transform="rotate(12)"/></g>
    <g fill="#5A3A1E"><rect x="-25" y="58" width="10" height="6" rx="1"/><rect x="12" y="60" width="10" height="6" rx="1"/></g>
    <g transform="translate(0 76)" filter="url(#soft)"><rect x="-72" y="-9" width="144" height="18" rx="9" fill="#fff" stroke="#E3E8EF"/><text y="3" font-size="9.5" font-weight="700" fill="#9A3412" text-anchor="middle">APRÈS-SKI · COMMUNITY</text></g>
  </g>
</svg>
```

**Designnoten:** geen losse marker-glyphs op de route (enkel uniforme label-pills met
glyph+naam); gondels vertrekken vanaf het basisstation; après-ski staat verhoogd rechts
tegen de bergvoet; boompjes in de hoek linksonder; off-piste is ongemarkeerd (geen poort/
vlag) maar herkenbaar aan de mogul-corridor + oranje label.

## 5. Community-pagina (`src/pages/community/Community.tsx`, route `/community`)

- **Hero** met après-ski-accent (warm/oranje): eyebrow "Après-ski bar", titel "Community".
- **Kanaaltabs**: `Trading ideas` · `Algemeen` · `Off-piste · Quant` (laatste met slot-indicator
  zolang `quant_trading` niet toegankelijk; klikken → FeatureGate-gedrag of disabled).
- **Composer**: avatar + tekstveld + "Plaatsen". Plaatsen → `addPost` (+ credits, §3.3).
- **Feed**: lijst `PostCard`'s gefilterd op actief kanaal.
- Herbruikbare componenten in `src/components/community/`:
  - `LevelBadge` — piste-badge op basis van `author.level` (kleur uit level-config).
  - `TradeIdeaCard` — ticker + strategie-pill + juice-meter (gradient-balk op `ivRank`) +
    kerncijfers (strike/premie/rendement/Δ) + **"Leg deze trade in →"**.
  - `PostCard` — auteur-rij + badge + body + optioneel `TradeIdeaCard` + acties (like, reacties)
    + `ReplyThread`.
  - `ReplyThread` — bestaande replies + inline reply-veld (`addReply`).
  - `Composer`.

### 5.1 Trade idea → wizard

- `TradeIdeaCard` heeft een `onPlaceTrade(idea)` handler die de juiste wizard opent:
  - `cash_secured_puts` → `PutOptionWizard` met `initialAction='sell'`,
    `initialTicker` (via `ensureTicker`/`selectAllTickers`).
  - `covered_calls` → `CallOptionWizard` analoog.
- De pagina beheert wizard-open-state. Verifieer tijdens implementatie de exacte props van
  `CallOptionWizard` (PutOptionWizard ondersteunt `initialAction`, `initialTicker`,
  `initialStep`).

## 6. Quant trading-pagina (`src/pages/quant/QuantTrading.tsx`, route `/quant`)

- Gated met `<FeatureGate feature="quant_trading">`.
- Teaser/playground: sfeervolle "off-piste unlocked"-hero, uitleg van quant-concepten en
  een paar voorbeeldvisualisaties (bv. een edge/juice-grafiek met recharts, een mock
  "opportunity scanner"-tabel). **Geen** volwaardige live tools.

## 7. Dashboard (`src/pages/dashboard/Dashboard.tsx`)

- Onderaan (na de alerts/opportunities/events-rij) een grid met **twee aparte widgets**,
  stijl van bestaande widgets (icoon in afgeronde box, eyebrow, titel, divide-y rijen,
  géén après-ski-branding):
  - `src/components/widgets/TradingIdeasWidget.tsx` — uitgelichte trade ideas
    (`selectFeaturedTradeIdeas`), elk met juice-meter + kerncijfers + "Leg trade in →"
    (zelfde wizard-koppeling als §5.1). Link "Bekijk alle →" naar `/community?channel=ideas`.
  - `src/components/widgets/CommunityWidget.tsx` — recente gesprekken
    (`selectRecentPosts`) met reactietellers. Link "Naar de community →".
- Tonen onder dezelfde voorwaarde als de overige dashboard-content (`hasPortfolios`).

## 8. Sidebar & routes

- `src/components/layout/Sidebar.tsx`, groep **Overzicht**:
  - **Community** — icoon `MessageSquare` (of `Users`), `to="/community"`, altijd zichtbaar.
  - **Quant trading** — icoon `Sigma` (of `Activity`), `to="/quant"`, **altijd zichtbaar**
    met `FeatureLockIndicator feature="quant_trading"` (slotje) zolang vergrendeld. Bewuste
    afwijking van het verbergen van andere gated items, om het off-piste-traject te tonen.
- `ROUTE_FEATURE_MAP['/quant'] = 'quant_trading'` (zodat `hasAccess` klopt; het item blijft
  echter zichtbaar — toon enkel het slotje i.p.v. te verbergen).
- `src/App.tsx`: routes `/community` → `Community`, `/quant` →
  `<FeatureGate feature="quant_trading"><QuantTrading/></FeatureGate>`.
- Exports toevoegen in `src/pages/index.ts`.

## 9. i18n (`src/i18n/locales/{nl,fr,en}.ts`)

- Sidebar: `sidebar.community`, `sidebar.quantTrading`.
- Pagina-titels/labels voor Community en Quant trading (NL leidend, EN/FR vertaald in
  bestaande stijl).

## 10. Mock seed-data (§3.2)

Minimaal:
- TSLA · Cash Secured Put · ivRank 78 · strike 230 · premie 4.10 · rend. 1.8% · Δ 0.28 —
  auteur "Sven K." (senior/rood), met 1 reply ("Mona").
- NVDA · Covered Call · ivRank 61 · strike 135 — auteur "Tom V." (medior/blauw).
- Dialoog-posts (general): "Anke L." (covered calls rollen?), "Mona" (PMCC op ASML?).

## 11. Buiten scope / later

- Echte backend/persistentie tussen gebruikers (nu lokaal/mock).
- Volwaardige quant-tools (nu teaser).
- Notificaties, moderatie, profielen.

## 12. Verificatie

- `npm run lint` en `npm run build` (tsc) groen — let op exhaustiveness-checks die door de
  uitgebreide `UserLevel`/`FeatureId` kunnen breken (switch-statements, `levelOrder`-arrays).
- Visuele check via Playwright MCP (zie geheugen): dashboard-widgets, /community, /quant
  (locked + unlocked), en de herwerkte berg op /mission.
- Functioneel: post plaatsen geeft credits; bij genoeg credits is Off-piste te ontgrendelen;
  "Leg trade in" opent de voorgevulde wizard; off-piste/bar-klik in de berg navigeert correct.
```
