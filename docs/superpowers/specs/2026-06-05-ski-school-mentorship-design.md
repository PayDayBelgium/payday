# Ski-school · Mentorship — Design

**Datum:** 2026-06-05
**Branch:** feature/community-offpiste (voortbouwend op de bestaande berg-feature)
**Status:** Goedgekeurd ontwerp, klaar voor implementatieplan

## 1. Doel

De PayDay-berg (ski-metafoor) uitbreiden met een **ski-school** als metafoor voor
**opleiding/mentorship**. Een ski-leraar met een leerling staat zichtbaar op de berg.
Anders dan de pistes/levels werkt dit **niet via credits**: je kunt mentorship
**aanvragen** via een apart aanvraagformulier op een eigen pagina.

## 2. Scope-beslissingen (uit brainstorm)

| Onderwerp | Beslissing |
|-----------|-----------|
| Plaatsing op de berg | In het midden, in de vlakte tussen het gondel-basisstation (linksonder) en de après-ski bar (rechtsonder). Klein stukje op de berg. |
| Visueel | Ski-leraar (iets groter, wijzend/met stok) + leerling (kleiner) op ski's, in de bestaande SVG-stijl. Uniforme label-pill `SKI-SCHOOL · MENTORSHIP`. |
| Klik-actie | Navigeert naar een aparte pagina `/mentorship` met een aanvraagformulier. |
| Mechanisme | **Geen credits, geen level/unlock.** Losgekoppeld van het piste-/credit-traject; puur een aanvraag. |
| Naamgeving | Berg-label "SKI-SCHOOL · MENTORSHIP"; paginatitel "Mentorship"; sidebar-item "Mentorship". |
| Formulier | Uitgebreider: focusgebied, huidig niveau, voorkeur mentor-stijl, beschikbaarheid, bericht. |
| Opslag | Aanpak A: lichte Redux-slice + redux-persist (consistent met `communitySlice`). |
| Reikwijdte | Berg-visualisatie + sidebar-item. **Geen** dashboard-widget. |
| Backend | Geen. Frontend-only mock; na verzenden een bevestiging. |

## 3. Architectuur

### 3.1 Types (`src/types/index.ts`)

```ts
export type MentorshipFocus =
  | 'options'        // optiestrategieën
  | 'risk'           // risicobeheer
  | 'psychology'     // trading-psychologie
  | 'portfolio'      // portefeuille-opbouw
  | 'quant';         // kwantitatief / off-piste

export type MentorStyle =
  | 'hands_on'       // intensief, samen traden
  | 'coaching'       // periodieke coaching/reviews
  | 'async';         // asynchroon (berichten/feedback)

export type MentorshipStatus = 'pending';   // frontend-only; later evt. 'matched' | 'closed'

export interface MentorshipRequest {
  id: string;
  focus: MentorshipFocus;
  level: UserLevel;            // huidig niveau van de aanvrager
  style: MentorStyle;
  availability: string;        // vrije tekst, bv. "weekends, 2u/week"
  message: string;             // motivatie / context
  createdAt: string;           // ISO
  status: MentorshipStatus;
}
```

### 3.2 Nieuwe slice (`src/store/slices/mentorshipSlice.ts`)

- State: `{ requests: MentorshipRequest[] }` (initieel leeg).
- Reducer: `submitRequest(payload: Omit<MentorshipRequest,'id'|'createdAt'|'status'>)`
  — voegt een request toe met gegenereerd `id`, `createdAt`, `status: 'pending'`.
  - **Let op:** geen `Date.now()`/`crypto.randomUUID()`-aannames; volg het bestaande
    id/timestamp-patroon van `communitySlice` (controleer hoe daar id's/`createdAt`
    worden gezet en hergebruik dat).
- Selectors:
  - `selectLatestRequest(state)` — meest recente aanvraag of `undefined`.
  - `selectHasPendingRequest(state)` — `boolean` (is er een openstaande aanvraag?).
- Registreren in `src/store/index.ts` met persist (zelfde whitelist/persist-opzet als
  de andere slices; controleer hoe `communitySlice` daar is toegevoegd).
- **Geen** koppeling met credits/`userProgressSlice` — bewust.

## 4. Berg-visualisatie (`src/components/mission/PaydayMountain.tsx`)

- Nieuwe prop: `onOpenMentorship?: () => void` (analoog aan `onOpenCommunity`/`onOpenQuant`).
- Nieuwe prop voor status: `mentorshipRequested?: boolean` (om de pill-staat te tonen).
  - Alternatief: de component leest zelf via `useAppSelector(selectHasPendingRequest)`.
    Voorkeur: **prop doorgeven** vanuit `MissionStatement` om de component presentatie-puur
    te houden (consistent met de bestaande props-aanpak).
- **Plaatsing:** een nieuwe `<g>`-groep rond `translate(390 355)` (midden, in de vlakte
  tussen basisstation `translate(48 360)` en après-ski bar `translate(700 300)`).
  Exacte coördinaten visueel fijnstellen; klein houden zodat het de pistes niet overlapt.
- **Compositie:**
  - Leraar: iets grotere figuur op ski's, met een lichte "wijs-/stok"-pose (rechtopstaand,
    armpje/stok schuin), in een herkenbare instructeurskleur (bv. rood, zoals een ski-leraar).
  - Leerling: kleinere figuur ernaast (lichtere/andere kleur), iets lager/voorovergebogen.
  - Beiden met korte ski-streepjes onder de voeten, in de lijn-/fill-stijl van de bestaande
    figuren (pines/markers).
  - Uniforme label-pill eronder (zelfde stijl als de après-ski-pill):
    `SKI-SCHOOL · MENTORSHIP`.
- **Klikbaar:** de groep krijgt `onClick={onOpenMentorship}` + `cursor: pointer` (zelfde
  guard-patroon als de andere klikbare groepen).
- **Statusreflectie:** wanneer `mentorshipRequested` waar is, toon onder of in de pill een
  kleine groene **"AANGEVRAAGD"**-indicatie (analoog aan hoe off-piste tussen
  "ONTGRENDELEN"/actief wisselt). Anders de neutrale pill.

### 4.1 Inbedding (`src/pages/mission/MissionStatement.tsx`)

```tsx
<PaydayMountain
  activeLevel={progress.currentLevel}
  unlockedLevels={progress.unlockedLevels}
  onOpenCommunity={() => handleNavigate('/community', 'Community')}
  onOpenQuant={() => handleNavigate('/quant', 'Quant trading')}
  onOpenMentorship={() => handleNavigate('/mentorship', 'Mentorship')}
  mentorshipRequested={useAppSelector(selectHasPendingRequest)}
/>
```

(De exacte manier van selector-gebruik volgt de bestaande hooks in `MissionStatement`.)

## 5. Mentorship-pagina (`src/pages/mentorship/Mentorship.tsx`, route `/mentorship`)

- **Hero** in ski-school-sfeer (warm accent, consistent met de bestaande pagina-hero's):
  eyebrow "Ski-school", titel "Mentorship", korte uitleg dat dit **losstaat van credits en
  pistes** — je vraagt het aan.
- **Aanvraagformulier (uitgebreider):**
  - Focusgebied — dropdown (`MentorshipFocus`).
  - Huidig niveau — dropdown (`UserLevel`; hergebruik bestaande level-labels/`LEVEL_CONFIGS`).
  - Voorkeur mentor-stijl — dropdown/radiogroep (`MentorStyle`).
  - Beschikbaarheid — tekstveld (vrije tekst).
  - Bericht/motivatie — textarea.
  - Knop **"Aanvraag versturen"** → `submitRequest` (geen credits).
- **Na verzenden:** een nette bevestigingsstaat met een samenvatting van de aanvraag.
- **Reeds aangevraagd:** als `selectHasPendingRequest` waar is bij openen, toon meteen de
  "aanvraag loopt"-staat met de samenvatting i.p.v. een leeg formulier (met evt. de optie
  een nieuwe/aangepaste aanvraag te doen — eenvoudig houden).
- Geen `FeatureGate`: de pagina is altijd toegankelijk.
- Componenten: pagina mag het formulier inline bevatten; splits naar
  `src/components/mentorship/` enkel als het bestand te groot wordt (volg het patroon van
  community-componenten).

## 6. Sidebar & routes

- `src/components/layout/Sidebar.tsx`, groep **Overzicht**:
  - **Mentorship** — icoon `GraduationCap` (lucide; controleer beschikbaarheid, anders
    `Users`/`UserCheck`), `to="/mentorship"`, **altijd zichtbaar**, geen lock-indicator.
- `src/App.tsx`: route `/mentorship` → `<Mentorship />` (geen `FeatureGate`).
- Export toevoegen in `src/pages/index.ts`.
- **Geen** `ROUTE_FEATURE_MAP`-entry nodig (niet gated).

## 7. i18n (`src/i18n/locales/{nl,fr,en}.ts`)

- `sidebar.mentorship` ("Mentorship").
- Pagina-/formulierlabels: hero-eyebrow/titel/uitleg, veldlabels (focus, niveau, stijl,
  beschikbaarheid, bericht), opties van de dropdowns, knoptekst, bevestigingstekst en
  "aanvraag loopt"-tekst. NL leidend, EN/FR vertaald in bestaande stijl.
- Berg-label `SKI-SCHOOL · MENTORSHIP`: volg hoe `APRÈS-SKI · COMMUNITY` nu in de berg staat
  (hardgecodeerd in de SVG of via i18n) en wees daarmee consistent.

## 8. Buiten scope / later

- Echte backend, matching met een mentor, e-mail/notificaties.
- Koppeling met credits of het level-/unlock-mechanisme (bewust losgekoppeld).
- Dashboard-widget (bewust niet gekozen).
- Meerdere statussen dan `pending` (later evt. `matched`/`closed`).

## 9. Verificatie

- `npm run lint` en `npm run build` (tsc) groen — let op nieuwe exhaustiveness-checks door
  `MentorshipFocus`/`MentorStyle` in eventuele switch-statements.
- Visuele check via Playwright MCP:
  - De berg op `/mission`: ski-leraar + leerling zichtbaar in het midden, label-pill correct,
    klikbaar, en de "AANGEVRAAGD"-staat na indienen.
  - `/mentorship`: formulier rendert, verzenden toont bevestiging, heropenen toont
    "aanvraag loopt".
  - Sidebar toont "Mentorship" en navigeert correct.
- Functioneel: berg-klik op de ski-school → `/mentorship`; formulier indienen → bevestiging
  + persistente status; geen credit-mutatie.
