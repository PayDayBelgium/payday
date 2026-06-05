# Ski-school · Mentorship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg een ski-school (metafoor voor opleiding/mentorship) toe aan de PayDay-berg, met een eigen aanvraagpagina `/mentorship` waar je mentorship aanvraagt via een formulier — losgekoppeld van credits/levels.

**Architecture:** Frontend-only. Een lichte Redux-slice (`mentorshipSlice`) + redux-persist bewaart de ingediende aanvragen (consistent met `communitySlice`). Een thunk (`mentorshipActions`) bouwt het request-object (id/createdAt/status) net als `communityActions`, maar dispatcht géén credits. De berg (`PaydayMountain`) krijgt een klikbare ski-leraar+leerling-groep die naar `/mentorship` navigeert; de sidebar krijgt een "Mentorship"-item.

**Tech Stack:** React 19, TypeScript, Redux Toolkit, redux-persist, react-router-dom v7, react-i18next, lucide-react, Vitest. SVG voor de berg-illustratie.

---

## File Structure

**Create:**
- `src/store/slices/mentorshipSlice.ts` — slice (state, `submitRequest` reducer, selectors).
- `src/store/slices/mentorshipSlice.test.ts` — unit tests voor reducer + selectors.
- `src/store/actions/mentorshipActions.ts` — thunk `submitMentorshipRequest` (id/createdAt/status).
- `src/store/actions/mentorshipActions.test.ts` — unit tests voor de thunk.
- `src/pages/mentorship/Mentorship.tsx` — pagina met hero + aanvraagformulier + bevestiging.

**Modify:**
- `src/types/index.ts` — nieuwe mentorship-types.
- `src/store/index.ts` — `mentorship`-reducer registreren + in persist-whitelist.
- `src/components/mission/PaydayMountain.tsx` — ski-leraar+leerling-groep + `onOpenMentorship` prop + status-pill.
- `src/pages/mission/MissionStatement.tsx` — `onOpenMentorship` doorgeven + `mentorshipRequested`.
- `src/pages/index.ts` — `Mentorship` exporteren.
- `src/App.tsx` — route `/mentorship` (geen FeatureGate).
- `src/components/layout/Sidebar.tsx` — "Mentorship"-item in groep Overzicht.
- `src/i18n/locales/nl.ts`, `src/i18n/locales/en.ts`, `src/i18n/locales/fr.ts` — `sidebar.mentorship`.

---

## Task 1: Mentorship-types

**Files:**
- Modify: `src/types/index.ts` (achter de `UserLevel`/community-types, bv. na regel 756)

- [ ] **Step 1: Voeg de types toe**

Voeg onderaan `src/types/index.ts` toe (na de bestaande community-types):

```ts
// Mentorship (ski-school) — losgekoppeld van credits/levels.
export type MentorshipFocus =
  | 'options'      // optiestrategieën
  | 'risk'         // risicobeheer
  | 'psychology'   // trading-psychologie
  | 'portfolio'    // portefeuille-opbouw
  | 'quant';       // kwantitatief / off-piste

export type MentorStyle =
  | 'hands_on'     // intensief, samen traden
  | 'coaching'     // periodieke coaching/reviews
  | 'async';       // asynchroon (berichten/feedback)

export type MentorshipStatus = 'pending';

export interface MentorshipRequest {
  id: string;
  focus: MentorshipFocus;
  level: UserLevel;        // huidig niveau van de aanvrager
  style: MentorStyle;
  availability: string;    // vrije tekst, bv. "weekends, 2u/week"
  message: string;         // motivatie / context
  createdAt: string;       // ISO
  status: MentorshipStatus;
}
```

- [ ] **Step 2: Verifieer dat het typecheckt**

Run: `npx tsc -b --noEmit`
Expected: PASS (geen nieuwe fouten). Als `tsc -b` klaagt over project-refs, gebruik `npm run build` later in Task 9.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(mentorship): add mentorship request types"
```

---

## Task 2: mentorshipSlice (TDD)

**Files:**
- Create: `src/store/slices/mentorshipSlice.ts`
- Test: `src/store/slices/mentorshipSlice.test.ts`

- [ ] **Step 1: Schrijf de falende test**

Maak `src/store/slices/mentorshipSlice.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import reducer, {
  submitRequest,
  selectLatestRequest,
  selectHasPendingRequest,
} from './mentorshipSlice';
import type { MentorshipRequest } from '../../types';

const baseReq = (over: Partial<MentorshipRequest> = {}): MentorshipRequest => ({
  id: over.id ?? 'm1',
  focus: over.focus ?? 'options',
  level: over.level ?? 'beginner',
  style: over.style ?? 'coaching',
  availability: over.availability ?? 'weekends',
  message: over.message ?? 'graag begeleiding',
  createdAt: over.createdAt ?? '2026-01-01T00:00:00.000Z',
  status: 'pending',
  ...over,
});

describe('mentorshipSlice', () => {
  it('submitRequest prepends the request', () => {
    const state = reducer({ requests: [baseReq({ id: 'old' })] }, submitRequest(baseReq({ id: 'new' })));
    expect(state.requests[0].id).toBe('new');
    expect(state.requests).toHaveLength(2);
  });

  it('selectLatestRequest returns the first request or undefined', () => {
    const empty: any = { mentorship: { requests: [] } };
    expect(selectLatestRequest(empty)).toBeUndefined();
    const root: any = { mentorship: { requests: [baseReq({ id: 'a' }), baseReq({ id: 'b' })] } };
    expect(selectLatestRequest(root)!.id).toBe('a');
  });

  it('selectHasPendingRequest reflects whether a pending request exists', () => {
    const empty: any = { mentorship: { requests: [] } };
    expect(selectHasPendingRequest(empty)).toBe(false);
    const root: any = { mentorship: { requests: [baseReq()] } };
    expect(selectHasPendingRequest(root)).toBe(true);
  });
});
```

- [ ] **Step 2: Run de test — verifieer dat hij faalt**

Run: `npx vitest run src/store/slices/mentorshipSlice.test.ts`
Expected: FAIL met "Failed to resolve import './mentorshipSlice'".

- [ ] **Step 3: Schrijf de slice**

Maak `src/store/slices/mentorshipSlice.ts`:

```ts
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { MentorshipRequest } from '../../types';

interface MentorshipState {
  requests: MentorshipRequest[];
}

const initialState: MentorshipState = {
  requests: [],
};

const mentorshipSlice = createSlice({
  name: 'mentorship',
  initialState,
  reducers: {
    submitRequest: (state, action: PayloadAction<MentorshipRequest>) => {
      state.requests.unshift(action.payload);
    },
  },
});

export const { submitRequest } = mentorshipSlice.actions;

// Selectors
export const selectLatestRequest = (state: RootState): MentorshipRequest | undefined =>
  state.mentorship.requests[0];

export const selectHasPendingRequest = (state: RootState): boolean =>
  state.mentorship.requests.some((r) => r.status === 'pending');

export default mentorshipSlice.reducer;
```

- [ ] **Step 4: Run de test — verifieer dat hij slaagt**

Run: `npx vitest run src/store/slices/mentorshipSlice.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/mentorshipSlice.ts src/store/slices/mentorshipSlice.test.ts
git commit -m "feat(mentorship): add mentorship slice with tests"
```

---

## Task 3: mentorshipActions thunk (TDD)

**Files:**
- Create: `src/store/actions/mentorshipActions.ts`
- Test: `src/store/actions/mentorshipActions.test.ts`

- [ ] **Step 1: Schrijf de falende test**

Maak `src/store/actions/mentorshipActions.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { submitMentorshipRequest } from './mentorshipActions';

describe('mentorshipActions', () => {
  it('submitMentorshipRequest dispatches submitRequest with status pending and generated id/createdAt', () => {
    const dispatch = vi.fn();
    submitMentorshipRequest({
      focus: 'options',
      level: 'beginner',
      style: 'coaching',
      availability: 'weekends',
      message: 'graag begeleiding',
    })(dispatch as any);

    expect(dispatch).toHaveBeenCalledTimes(1);
    const action = dispatch.mock.calls[0][0];
    expect(action.type).toBe('mentorship/submitRequest');
    expect(action.payload.status).toBe('pending');
    expect(action.payload.focus).toBe('options');
    expect(action.payload.id).toBeTruthy();
    expect(action.payload.createdAt).toBeTruthy();
  });

  it('submitMentorshipRequest does NOT dispatch credits', () => {
    const dispatch = vi.fn();
    submitMentorshipRequest({
      focus: 'risk',
      level: 'medior',
      style: 'async',
      availability: 'avonds',
      message: 'x',
    })(dispatch as any);
    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).not.toContain('userProgress/addCredits');
  });
});
```

- [ ] **Step 2: Run de test — verifieer dat hij faalt**

Run: `npx vitest run src/store/actions/mentorshipActions.test.ts`
Expected: FAIL met "Failed to resolve import './mentorshipActions'".

- [ ] **Step 3: Schrijf de thunk**

Maak `src/store/actions/mentorshipActions.ts` (zelfde `makeId`-patroon als `communityActions.ts`, géén credits):

```ts
import type { Dispatch } from '@reduxjs/toolkit';
import type { MentorshipFocus, MentorStyle, UserLevel } from '../../types';
import { submitRequest } from '../slices/mentorshipSlice';

// Deterministische id-helper (consistent met communityActions).
const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const submitMentorshipRequest =
  (args: {
    focus: MentorshipFocus;
    level: UserLevel;
    style: MentorStyle;
    availability: string;
    message: string;
  }) =>
  (dispatch: Dispatch) => {
    dispatch(
      submitRequest({
        id: makeId('mentor'),
        focus: args.focus,
        level: args.level,
        style: args.style,
        availability: args.availability,
        message: args.message,
        createdAt: new Date().toISOString(),
        status: 'pending',
      })
    );
  };
```

- [ ] **Step 4: Run de test — verifieer dat hij slaagt**

Run: `npx vitest run src/store/actions/mentorshipActions.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/actions/mentorshipActions.ts src/store/actions/mentorshipActions.test.ts
git commit -m "feat(mentorship): add submit thunk (no credits) with tests"
```

---

## Task 4: Registreer de slice in de store

**Files:**
- Modify: `src/store/index.ts`

- [ ] **Step 1: Importeer de reducer**

In `src/store/index.ts`, na regel 20 (`import communityReducer ...`):

```ts
import mentorshipReducer from './slices/mentorshipSlice';
```

- [ ] **Step 2: Voeg toe aan `combineReducers`**

In het `rootReducer`-object (na `community: communityReducer,`):

```ts
  community: communityReducer,
  mentorship: mentorshipReducer,
```

- [ ] **Step 3: Voeg toe aan de persist-whitelist**

Wijzig de `whitelist`-array zodat `'mentorship'` erbij staat:

```ts
    whitelist: ['auth', 'adminAuth', 'portfolios', 'positions', 'trades', 'rules', 'journal', 'todos', 'tickers', 'strategies', 'wheels', 'userProgress', 'community', 'mentorship'],
```

- [ ] **Step 4: Verifieer dat de slice-tests nog groen zijn (RootState compileert)**

Run: `npx vitest run src/store/slices/mentorshipSlice.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/index.ts
git commit -m "feat(mentorship): register reducer and persist mentorship state"
```

---

## Task 5: i18n — sidebar.mentorship

**Files:**
- Modify: `src/i18n/locales/nl.ts:63`, `src/i18n/locales/en.ts:63`, `src/i18n/locales/fr.ts:63`

- [ ] **Step 1: Voeg de sleutel toe (NL)**

In `src/i18n/locales/nl.ts`, direct na de `quantTrading`-regel (regel 64):

```ts
    quantTrading: 'Quant trading',
    mentorship: 'Mentorship',
```

- [ ] **Step 2: Voeg de sleutel toe (EN)**

In `src/i18n/locales/en.ts`, direct na de `quantTrading`-regel:

```ts
    quantTrading: 'Quant trading',
    mentorship: 'Mentorship',
```

- [ ] **Step 3: Voeg de sleutel toe (FR)**

In `src/i18n/locales/fr.ts`, direct na de `quantTrading`-regel:

```ts
    quantTrading: 'Trading quant',
    mentorship: 'Mentorat',
```

- [ ] **Step 4: Commit**

```bash
git add src/i18n/locales/nl.ts src/i18n/locales/en.ts src/i18n/locales/fr.ts
git commit -m "feat(i18n): add sidebar.mentorship label"
```

---

## Task 6: Mentorship-pagina

**Files:**
- Create: `src/pages/mentorship/Mentorship.tsx`
- Modify: `src/pages/index.ts`

- [ ] **Step 1: Maak de pagina**

Maak `src/pages/mentorship/Mentorship.tsx`. Het formulier gebruikt lokale state; bij verzenden dispatcht het de thunk en toont het een bevestiging. Bij een reeds openstaande aanvraag toont het meteen de bevestigingsstaat.

```tsx
import React, { useEffect, useState } from 'react';
import { GraduationCap, Check } from 'lucide-react';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { useAppSelector } from '../../hooks/useAppSelector';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { submitMentorshipRequest } from '../../store/actions/mentorshipActions';
import { selectLatestRequest, selectHasPendingRequest } from '../../store/slices/mentorshipSlice';
import type { MentorshipFocus, MentorStyle, UserLevel } from '../../types';

const FOCUS_OPTIONS: { value: MentorshipFocus; label: string }[] = [
  { value: 'options', label: 'Optiestrategieën' },
  { value: 'risk', label: 'Risicobeheer' },
  { value: 'psychology', label: 'Trading-psychologie' },
  { value: 'portfolio', label: 'Portefeuille-opbouw' },
  { value: 'quant', label: 'Kwantitatief (off-piste)' },
];

const LEVEL_OPTIONS: { value: UserLevel; label: string }[] = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'medior', label: 'Medior' },
  { value: 'senior', label: 'Senior' },
  { value: 'expert', label: 'Expert' },
  { value: 'offpiste', label: 'Off-piste' },
];

const STYLE_OPTIONS: { value: MentorStyle; label: string }[] = [
  { value: 'hands_on', label: 'Hands-on (samen traden)' },
  { value: 'coaching', label: 'Coaching (periodieke reviews)' },
  { value: 'async', label: 'Asynchroon (berichten/feedback)' },
];

const FOCUS_LABEL = (v: MentorshipFocus) => FOCUS_OPTIONS.find((o) => o.value === v)?.label ?? v;
const STYLE_LABEL = (v: MentorStyle) => STYLE_OPTIONS.find((o) => o.value === v)?.label ?? v;
const LEVEL_LABEL = (v: UserLevel) => LEVEL_OPTIONS.find((o) => o.value === v)?.label ?? v;

const fieldClass =
  'w-full rounded-md border border-[var(--line)] bg-white dark:bg-trading-dark-800 px-3 py-2 text-sm text-ink-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';

export const Mentorship: React.FC = () => {
  const dispatch = useAppDispatch();
  const { setPageTitle } = usePageTitle();
  const hasPending = useAppSelector(selectHasPendingRequest);
  const latest = useAppSelector(selectLatestRequest);

  const [focus, setFocus] = useState<MentorshipFocus>('options');
  const [level, setLevel] = useState<UserLevel>('beginner');
  const [style, setStyle] = useState<MentorStyle>('coaching');
  const [availability, setAvailability] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setPageTitle('Mentorship', 'Ski-school · opleiding & begeleiding');
  }, [setPageTitle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(submitMentorshipRequest({ focus, level, style, availability, message }));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Hero */}
      <div className="flex items-center gap-3 rounded-xl border border-caution-500/40 bg-caution-50 dark:bg-caution-600/10 px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-caution-500 text-white flex items-center justify-center">
          <GraduationCap className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div>
          <p className="eyebrow text-caution-600">Ski-school</p>
          <h1 className="text-base font-semibold text-ink-900 dark:text-white tracking-tight">Mentorship</h1>
        </div>
      </div>

      <p className="text-sm text-ink-600 dark:text-ink-300 leading-relaxed">
        Een ski-leraar leert je de berg lezen. Onze ski-school koppelt je aan een mentor voor
        opleiding en begeleiding. Dit staat los van credits en pistes — je vraagt het gewoon aan.
      </p>

      {hasPending && latest ? (
        <div className="surface-card p-6">
          <div className="flex items-center gap-2 text-success-600 mb-3">
            <Check className="w-5 h-5" strokeWidth={2} />
            <p className="font-semibold text-sm">Je aanvraag is verstuurd</p>
          </div>
          <p className="text-sm text-ink-500 dark:text-ink-400 mb-4 leading-relaxed">
            We hebben je mentorship-aanvraag ontvangen. Een mentor neemt contact met je op.
          </p>
          <dl className="text-sm divide-y divide-[var(--line)]">
            <div className="flex justify-between py-2"><dt className="text-ink-400">Focus</dt><dd className="text-ink-900 dark:text-white">{FOCUS_LABEL(latest.focus)}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-ink-400">Niveau</dt><dd className="text-ink-900 dark:text-white">{LEVEL_LABEL(latest.level)}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-ink-400">Stijl</dt><dd className="text-ink-900 dark:text-white">{STYLE_LABEL(latest.style)}</dd></div>
            <div className="flex justify-between py-2"><dt className="text-ink-400">Beschikbaarheid</dt><dd className="text-ink-900 dark:text-white">{latest.availability || '—'}</dd></div>
          </dl>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="surface-card p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Focusgebied</label>
            <select className={fieldClass} value={focus} onChange={(e) => setFocus(e.target.value as MentorshipFocus)}>
              {FOCUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Huidig niveau</label>
            <select className={fieldClass} value={level} onChange={(e) => setLevel(e.target.value as UserLevel)}>
              {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Voorkeur mentor-stijl</label>
            <select className={fieldClass} value={style} onChange={(e) => setStyle(e.target.value as MentorStyle)}>
              {STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Beschikbaarheid</label>
            <input className={fieldClass} type="text" placeholder="bv. weekends, 2u per week" value={availability} onChange={(e) => setAvailability(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-500 mb-1.5">Bericht / motivatie</label>
            <textarea className={`${fieldClass} min-h-[96px] resize-y`} placeholder="Waar wil je in groeien?" value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary-700 text-white text-sm font-semibold py-2.5 hover:bg-primary-800 transition-colors"
          >
            Aanvraag versturen
          </button>
        </form>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Exporteer de pagina**

In `src/pages/index.ts`, na het Quant-blok (regel 53):

```ts
// Quant
export { QuantTrading } from './quant/QuantTrading';

// Mentorship
export { Mentorship } from './mentorship/Mentorship';
```

- [ ] **Step 3: Verifieer typecheck van de nieuwe pagina**

Run: `npx vitest run` (alle tests blijven groen — pagina heeft geen test, maar imports moeten resolven).
Expected: PASS (geen nieuwe failures). Volledige typecheck volgt in Task 9.

- [ ] **Step 4: Commit**

```bash
git add src/pages/mentorship/Mentorship.tsx src/pages/index.ts
git commit -m "feat(mentorship): add mentorship request page"
```

---

## Task 7: Route + sidebar-item

**Files:**
- Modify: `src/App.tsx` (import rond regel 29, route rond regel 95)
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Importeer de pagina in App.tsx**

In `src/App.tsx`, in het pages-import-blok (na `QuantTrading,` op regel 29):

```tsx
  MissionStatement,
  Community,
  QuantTrading,
  Mentorship,
```

- [ ] **Step 2: Voeg de route toe (geen FeatureGate)**

In `src/App.tsx`, na de quant-route (regel 95):

```tsx
        <Route path="quant" element={<FeatureGate feature="quant_trading"><QuantTrading /></FeatureGate>} />
        <Route path="mentorship" element={<Mentorship />} />
```

- [ ] **Step 3: Importeer het icoon in de Sidebar**

In `src/components/layout/Sidebar.tsx`, voeg `GraduationCap` toe aan de lucide-import (na `Sigma,` op regel 16):

```tsx
  MessageSquare,
  Sigma,
  GraduationCap,
```

- [ ] **Step 4: Voeg het sidebar-item toe (na het Quant-item)**

In `src/components/layout/Sidebar.tsx`, direct na de afsluitende `</NavLink>` van het `/quant`-item (regel 157), vóór `{/* Portfolios */}`:

```tsx
        <NavLink
          to="/mentorship"
          onClick={() => handleMenuClick('/mentorship', t('sidebar.mentorship'))}
          className={({ isActive }) => navClass(isActive, isCollapsed)}
          title={isCollapsed ? t('sidebar.mentorship') : ''}
        >
          {({ isActive }) => (
            <>
              <ActiveBar active={isActive} />
              <GraduationCap className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
              {!isCollapsed && <span>{t('sidebar.mentorship')}</span>}
            </>
          )}
        </NavLink>
```

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/components/layout/Sidebar.tsx
git commit -m "feat(mentorship): add /mentorship route and sidebar item"
```

---

## Task 8: Ski-school op de berg (PaydayMountain + MissionStatement)

**Files:**
- Modify: `src/components/mission/PaydayMountain.tsx`
- Modify: `src/pages/mission/MissionStatement.tsx`

- [ ] **Step 1: Breid de props uit**

In `src/components/mission/PaydayMountain.tsx`, wijzig de interface (regel 4-9) naar:

```tsx
interface PaydayMountainProps {
  activeLevel: UserLevel;
  unlockedLevels: UserLevel[];
  onOpenCommunity?: () => void;
  onOpenQuant?: () => void;
  onOpenMentorship?: () => void;
  mentorshipRequested?: boolean;
}
```

En de destructuring (regel 11-15):

```tsx
export const PaydayMountain: React.FC<PaydayMountainProps> = ({
  unlockedLevels,
  onOpenCommunity,
  onOpenQuant,
  onOpenMentorship,
  mentorshipRequested,
}) => {
```

- [ ] **Step 2: Voeg de ski-school-groep toe**

In `src/components/mission/PaydayMountain.tsx`, vóór de après-ski-groep (vóór de comment `{/* après-ski bar = community (clickable) */}` op regel 103), voeg deze klikbare groep toe. Plaatsing midden in de vlakte (`translate(390 352)`), klein gehouden, met leraar (rood, rechtop, met stok) + leerling (blauw, kleiner):

```tsx
        {/* ski-school = mentorship (clickable) */}
        <g transform="translate(390 352)" onClick={onOpenMentorship} style={{ cursor: onOpenMentorship ? 'pointer' : 'default' }}>
          {/* schaduw */}
          <ellipse cx="0" cy="20" rx="34" ry="5" fill="#0B4A8F" opacity="0.10" />
          {/* leraar (instructeur, rood) */}
          <g filter="url(#pm-soft)">
            <circle cx="-9" cy="-14" r="4" fill="#F4C9A0" />
            <rect x="-12.5" y="-10" width="7" height="15" rx="3" fill="#D14343" />
            {/* arm met stok, wijzend */}
            <line x1="-6" y1="-6" x2="4" y2="-12" stroke="#D14343" strokeWidth="2" strokeLinecap="round" />
            <line x1="4" y1="-12" x2="6" y2="2" stroke="#7A4E2A" strokeWidth="1.2" strokeLinecap="round" />
            {/* benen + ski */}
            <line x1="-10.5" y1="5" x2="-12" y2="13" stroke="#33425C" strokeWidth="2" strokeLinecap="round" />
            <line x1="-7.5" y1="5" x2="-6" y2="13" stroke="#33425C" strokeWidth="2" strokeLinecap="round" />
            <rect x="-18" y="13" width="18" height="2.4" rx="1.2" fill="#2F6CAE" />
          </g>
          {/* leerling (kleiner, blauw) */}
          <g filter="url(#pm-soft)">
            <circle cx="11" cy="-7" r="3.3" fill="#F4C9A0" />
            <rect x="8" y="-3.5" width="6" height="12" rx="2.6" fill="#2F6CAE" />
            <line x1="9.5" y1="8" x2="8.5" y2="14" stroke="#33425C" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="12.5" y1="8" x2="13.5" y2="14" stroke="#33425C" strokeWidth="1.8" strokeLinecap="round" />
            <rect x="4" y="14" width="15" height="2.2" rx="1.1" fill="#0F9D58" />
          </g>
          {/* label-pill */}
          <g transform="translate(0 30)" filter="url(#pm-soft)">
            <rect x="-66" y="-9" width="132" height="18" rx="9" fill="#fff" stroke="#E3E8EF" />
            <text y="3" fontSize="9.5" fontWeight="700" fill="#9A3412" textAnchor="middle">SKI-SCHOOL · MENTORSHIP</text>
          </g>
          {/* status: aangevraagd */}
          {mentorshipRequested && (
            <g transform="translate(0 45)" filter="url(#pm-soft)">
              <rect x="-34" y="-7.5" width="68" height="15" rx="7.5" fill="#ECFDF3" stroke="#0F9D58" strokeWidth="0.9" />
              <text y="2.6" fontSize="7.6" fontWeight="700" fill="#0A6B3B" textAnchor="middle" letterSpacing="0.04em">AANGEVRAAGD</text>
            </g>
          )}
        </g>
```

- [ ] **Step 3: Geef de props door vanuit MissionStatement**

In `src/pages/mission/MissionStatement.tsx`: voeg bovenaan (bij de andere imports rond regel 33) toe:

```tsx
import { selectHasPendingRequest } from '../../store/slices/mentorshipSlice';
```

Voeg in de component (bij de andere `useAppSelector`-hooks, in de buurt van waar `progress` wordt gelezen) toe:

```tsx
  const mentorshipRequested = useAppSelector(selectHasPendingRequest);
```

> Let op: gebruik de bestaande `useAppSelector`-hook die al in dit bestand wordt gebruikt. Als die nog niet geïmporteerd is, voeg `import { useAppSelector } from '../../hooks/useAppSelector';` toe (controleer eerst — `useAppDispatch` wordt al gebruikt, dus de hooks-map is bekend).

Wijzig de `<PaydayMountain ... />` (regel 332-337) naar:

```tsx
        <PaydayMountain
          activeLevel={progress.currentLevel}
          unlockedLevels={progress.unlockedLevels}
          onOpenCommunity={() => handleNavigate('/community', 'Community')}
          onOpenQuant={() => handleNavigate('/quant', 'Quant trading')}
          onOpenMentorship={() => handleNavigate('/mentorship', 'Mentorship')}
          mentorshipRequested={mentorshipRequested}
        />
```

- [ ] **Step 4: Commit**

```bash
git add src/components/mission/PaydayMountain.tsx src/pages/mission/MissionStatement.tsx
git commit -m "feat(mission): add clickable ski-school (mentorship) to the mountain"
```

---

## Task 9: Volledige verificatie (lint, build, tests)

**Files:** geen — alleen verificatie.

- [ ] **Step 1: Run de volledige testsuite**

Run: `npm run test`
Expected: PASS — inclusief de nieuwe `mentorshipSlice` (3) en `mentorshipActions` (2) tests, en alle bestaande tests blijven groen.

- [ ] **Step 2: Run de linter**

Run: `npm run lint`
Expected: geen nieuwe errors in de gewijzigde/nieuwe bestanden.

- [ ] **Step 3: Run de build (typecheck)**

Run: `npm run build`
Expected: PASS — `tsc -b` slaagt (let op exhaustiveness: de nieuwe `MentorshipFocus`/`MentorStyle`/`UserLevel`-mappings zijn volledig afgedekt in de pagina).

- [ ] **Step 4: Commit eventuele fixes**

Als lint/build aanpassingen vereisten:

```bash
git add -A
git commit -m "fix(mentorship): resolve lint/type issues"
```

---

## Task 10: Visuele verificatie (Playwright MCP)

**Files:** geen — handmatige/visuele check (zie geheugen: visuele verificatie na UI-wijzigingen).

- [ ] **Step 1: Start de dev-server**

Run: `npm run dev` (achtergrond) en open de app.

- [ ] **Step 2: Controleer de berg op `/mission`**

Via Playwright MCP: screenshot `/mission`. Verifieer:
- Ski-leraar + leerling staan zichtbaar in het midden van de berg, tussen het basisstation (linksonder) en de après-ski bar (rechtsonder).
- De pill `SKI-SCHOOL · MENTORSHIP` staat eronder en overlapt geen andere pills/pistes.
- Klikken op de groep navigeert naar `/mentorship`.

Stel de coördinaten (`translate(390 352)`) visueel bij indien de groep een piste/label overlapt; commit de aanpassing.

- [ ] **Step 3: Controleer `/mentorship`**

Screenshot `/mentorship`. Verifieer dat hero + formulier (focus, niveau, stijl, beschikbaarheid, bericht) correct renderen. Vul in en klik "Aanvraag versturen" → bevestigingsstaat met samenvatting verschijnt.

- [ ] **Step 4: Controleer de persistente status**

Herlaad `/mentorship` → de "aanvraag verstuurd"-staat blijft. Ga naar `/mission` → de berg toont nu de groene "AANGEVRAAGD"-indicatie. Controleer dat de sidebar "Mentorship" toont en navigeert.

- [ ] **Step 5: Commit eventuele visuele bijsturing**

```bash
git add -A
git commit -m "style(mission): fine-tune ski-school placement on the mountain"
```

---

## Self-Review notities

- **Spec-dekking:** types (T1), slice+persist aanpak A (T2/T4), thunk zonder credits (T3), berg-visualisatie met leraar+leerling+pill+status (T8), pagina met uitgebreid formulier + bevestiging (T6), route zonder FeatureGate (T7), sidebar "Mentorship" (T7), i18n (T5), geen dashboard-widget (bewust weggelaten), verificatie lint/build/tests + visueel (T9/T10). Alle spec-secties gedekt.
- **Type-consistentie:** `submitRequest` (reducer, payload = volledige `MentorshipRequest`), `submitMentorshipRequest` (thunk, bouwt het object), `selectLatestRequest`/`selectHasPendingRequest` — identieke namen gebruikt in slice, thunk, pagina en MissionStatement.
- **Geen placeholders:** alle stappen bevatten volledige code/commando's.
