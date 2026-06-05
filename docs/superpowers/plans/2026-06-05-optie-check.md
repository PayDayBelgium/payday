# Optie-Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Een "Optie-Check" tool in de Tools-sectie (vanaf medior) die per gekozen ticker gesimuleerde optie-kerncijfers toont en op 5 criteria scoort tot een totaalverdict.

**Architecture:** Pure, geteste util (`optionCandidate.ts`) met een deterministische mock-datagenerator (hash → mulberry32, géén `Math.random`) en een scoringsfunctie. Een tool-pagina (`OptionCheck.tsx`) rendert het resultaat in de stijl van de bestaande tools. Gegate via `options_basics` (medior) op de route + sidebar.

**Tech Stack:** React 19, TypeScript, Redux Toolkit (read-only `selectAllTickers`), react-router-dom v7, react-i18next, lucide-react, Vitest.

---

## File Structure

**Create:**
- `src/utils/optionCandidate.ts` — types + `generateMockOptionData` + `scoreOptionCandidate`.
- `src/utils/optionCandidate.test.ts` — unit-tests (determinisme, ranges, scoring/verdicts).
- `src/pages/tools/OptionCheck.tsx` — de tool-pagina.

**Modify:**
- `src/pages/index.ts` — export `OptionCheck`.
- `src/App.tsx` — route `/tools/option-check` met `FeatureGate feature="options_basics"`.
- `src/components/layout/Sidebar.tsx` — `ROUTE_FEATURE_MAP` + NavLink in de Tools-groep.
- `src/i18n/locales/{nl,en,fr}.ts` — `sidebar.optionCheck`.

---

## Task 1: Util — types + deterministische mock-generator (TDD)

**Files:**
- Create: `src/utils/optionCandidate.ts`
- Test: `src/utils/optionCandidate.test.ts`

- [ ] **Step 1: Schrijf de falende test**

Maak `src/utils/optionCandidate.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateMockOptionData } from './optionCandidate';

describe('generateMockOptionData', () => {
  it('is deterministic for the same symbol + seed', () => {
    expect(generateMockOptionData('AAPL')).toEqual(generateMockOptionData('AAPL'));
    expect(generateMockOptionData('AAPL', 3)).toEqual(generateMockOptionData('AAPL', 3));
  });

  it('is case-insensitive on the symbol', () => {
    expect(generateMockOptionData('aapl')).toEqual(generateMockOptionData('AAPL'));
  });

  it('varies with a different seed', () => {
    expect(generateMockOptionData('AAPL', 0)).not.toEqual(generateMockOptionData('AAPL', 1));
  });

  it('produces values within the expected ranges', () => {
    for (const sym of ['AAPL', 'TSLA', 'SPY', 'KO', 'XYZ']) {
      const d = generateMockOptionData(sym);
      expect(d.ivRank).toBeGreaterThanOrEqual(0);
      expect(d.ivRank).toBeLessThanOrEqual(100);
      expect(d.openInterest).toBeGreaterThanOrEqual(20);
      expect(d.openInterest).toBeLessThanOrEqual(5000);
      expect(d.optionVolume).toBeGreaterThanOrEqual(5);
      expect(d.optionVolume).toBeLessThanOrEqual(2000);
      expect(d.bidAskSpreadPct).toBeGreaterThanOrEqual(1);
      expect(d.bidAskSpreadPct).toBeLessThanOrEqual(25);
      expect(d.annualizedPremiumPct).toBeGreaterThanOrEqual(2);
      expect(d.annualizedPremiumPct).toBeLessThanOrEqual(40);
      expect(d.daysToEarnings).toBeGreaterThanOrEqual(1);
      expect(d.daysToEarnings).toBeLessThanOrEqual(60);
    }
  });
});
```

- [ ] **Step 2: Run de test — verifieer dat hij faalt**

Run: `npx vitest run src/utils/optionCandidate.test.ts`
Expected: FAIL met "Failed to resolve import './optionCandidate'".

- [ ] **Step 3: Schrijf de generator + types**

Maak `src/utils/optionCandidate.ts`:

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

// FNV-1a string hash → 32-bit seed (deterministisch, geen Math.random).
function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 PRNG — deterministisch op basis van de seed.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateMockOptionData(symbol: string, seed = 0): MockOptionData {
  const rng = mulberry32(hashSeed(symbol.toUpperCase()) + seed);
  const between = (min: number, max: number) => min + rng() * (max - min);
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    ivRank: Math.round(between(0, 100)),
    openInterest: Math.round(between(20, 5000)),
    optionVolume: Math.round(between(5, 2000)),
    bidAskSpreadPct: round1(between(1, 25)),
    annualizedPremiumPct: round1(between(2, 40)),
    daysToEarnings: Math.round(between(1, 60)),
  };
}
```

- [ ] **Step 4: Run de test — verifieer dat hij slaagt**

Run: `npx vitest run src/utils/optionCandidate.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/utils/optionCandidate.ts src/utils/optionCandidate.test.ts
git commit -m "feat(optie-check): deterministic mock option-data generator with tests"
```

(PowerShell: voer `git add` en `git commit` als aparte statements uit. Voeg aan elke commit-body de trailer toe: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.)

---

## Task 2: Util — scoreOptionCandidate (TDD)

**Files:**
- Modify: `src/utils/optionCandidate.ts`
- Modify: `src/utils/optionCandidate.test.ts`

- [ ] **Step 1: Schrijf de falende test (voeg toe onderaan het testbestand)**

Voeg toe aan `src/utils/optionCandidate.test.ts`:

```ts
import { scoreOptionCandidate } from './optionCandidate';
import type { MockOptionData } from './optionCandidate';
import type { Ticker } from '../types';

const ticker = (over: Partial<Ticker> = {}): Ticker => ({
  symbol: 'AAPL',
  name: 'Apple',
  type: 'stock',
  optionsAvailable: true,
  miniContractsAvailable: false,
  ...over,
});

const data = (over: Partial<MockOptionData> = {}): MockOptionData => ({
  ivRank: 70,
  openInterest: 2000,
  optionVolume: 1000,
  bidAskSpreadPct: 3,
  annualizedPremiumPct: 25,
  daysToEarnings: 30,
  ...over,
});

describe('scoreOptionCandidate', () => {
  it('a strong candidate scores excellent', () => {
    const r = scoreOptionCandidate(ticker(), data());
    expect(r.verdict).toBe('excellent');
    expect(r.totalScore).toBeGreaterThanOrEqual(80);
    expect(r.criteria).toHaveLength(5);
  });

  it('no options available forces unsuitable and score 0', () => {
    const r = scoreOptionCandidate(ticker({ optionsAvailable: false }), data());
    expect(r.verdict).toBe('unsuitable');
    expect(r.totalScore).toBe(0);
    const optionable = r.criteria.find((c) => c.key === 'optionable');
    expect(optionable!.status).toBe('bad');
  });

  it('a weak candidate scores unsuitable', () => {
    const r = scoreOptionCandidate(
      ticker(),
      data({ ivRank: 10, openInterest: 50, optionVolume: 10, bidAskSpreadPct: 20, annualizedPremiumPct: 2, daysToEarnings: 3 })
    );
    expect(r.verdict).toBe('unsuitable');
    expect(r.totalScore).toBeLessThan(40);
  });

  it('flags imminent earnings as bad', () => {
    const r = scoreOptionCandidate(ticker(), data({ daysToEarnings: 3 }));
    const earnings = r.criteria.find((c) => c.key === 'earnings');
    expect(earnings!.status).toBe('bad');
  });

  it('low IV-rank is bad, mid is ok, high is good', () => {
    const lo = scoreOptionCandidate(ticker(), data({ ivRank: 10 })).criteria.find((c) => c.key === 'ivRank')!;
    const mid = scoreOptionCandidate(ticker(), data({ ivRank: 40 })).criteria.find((c) => c.key === 'ivRank')!;
    const hi = scoreOptionCandidate(ticker(), data({ ivRank: 70 })).criteria.find((c) => c.key === 'ivRank')!;
    expect(lo.status).toBe('bad');
    expect(mid.status).toBe('ok');
    expect(hi.status).toBe('good');
  });
});
```

- [ ] **Step 2: Run de test — verifieer dat hij faalt**

Run: `npx vitest run src/utils/optionCandidate.test.ts`
Expected: FAIL met "scoreOptionCandidate is not a function" / export ontbreekt.

- [ ] **Step 3: Implementeer de scoring (voeg toe aan `src/utils/optionCandidate.ts`)**

Voeg toe onder de generator in `src/utils/optionCandidate.ts`:

```ts
export type CriterionStatus = 'good' | 'ok' | 'bad';

export interface CriterionResult {
  key: 'optionable' | 'liquidity' | 'ivRank' | 'premium' | 'earnings';
  label: string;
  status: CriterionStatus;
  score: number;   // 0–100
  detail: string;
}

export type Verdict = 'excellent' | 'suitable' | 'mediocre' | 'unsuitable';

export interface CandidateAssessment {
  totalScore: number; // 0–100
  verdict: Verdict;
  criteria: CriterionResult[];
}

const statusFromScore = (score: number): CriterionStatus =>
  score >= 75 ? 'good' : score >= 45 ? 'ok' : 'bad';

export function scoreOptionCandidate(ticker: Ticker, data: MockOptionData): CandidateAssessment {
  // 1. Optionable (echte ticker-vlag).
  const optionableScore = ticker.optionsAvailable ? 100 : 0;
  const optionable: CriterionResult = {
    key: 'optionable',
    label: 'Opties beschikbaar',
    status: ticker.optionsAvailable ? 'good' : 'bad',
    score: optionableScore,
    detail: ticker.optionsAvailable
      ? 'Er zijn genoteerde opties op deze ticker.'
      : 'Geen genoteerde opties — niet bruikbaar voor optiestrategieën.',
  };

  // 2. Optie-liquiditeit (OI + volume + spread).
  const oiPts = data.openInterest >= 1000 ? 100 : data.openInterest >= 250 ? 50 : 0;
  const volPts = data.optionVolume >= 500 ? 100 : data.optionVolume >= 100 ? 50 : 0;
  const spreadPts = data.bidAskSpreadPct <= 5 ? 100 : data.bidAskSpreadPct <= 10 ? 50 : 0;
  const liquidityScore = Math.round((oiPts + volPts + spreadPts) / 3);
  const liquidity: CriterionResult = {
    key: 'liquidity',
    label: 'Optie-liquiditeit',
    status: statusFromScore(liquidityScore),
    score: liquidityScore,
    detail: `OI ${data.openInterest}, volume ${data.optionVolume}/dag, spread ${data.bidAskSpreadPct}%.`,
  };

  // 3. IV-rank (hoog = rijke premie voor verkopers).
  const ivScore = Math.max(0, Math.min(100, data.ivRank));
  const ivStatus: CriterionStatus = data.ivRank > 50 ? 'good' : data.ivRank >= 25 ? 'ok' : 'bad';
  const ivRank: CriterionResult = {
    key: 'ivRank',
    label: 'IV-rank',
    status: ivStatus,
    score: ivScore,
    detail: `IV-rank ${data.ivRank}/100 — ${data.ivRank > 50 ? 'rijke' : data.ivRank >= 25 ? 'redelijke' : 'magere'} premie.`,
  };

  // 4. Premie-rendement (geannualiseerd %).
  const p = data.annualizedPremiumPct;
  const premiumScore = p >= 20 ? 100 : p >= 10 ? 60 : p >= 5 ? 30 : 10;
  const premiumStatus: CriterionStatus = p >= 20 ? 'good' : p >= 10 ? 'ok' : 'bad';
  const premium: CriterionResult = {
    key: 'premium',
    label: 'Premie-rendement',
    status: premiumStatus,
    score: premiumScore,
    detail: `~${data.annualizedPremiumPct}% geannualiseerd.`,
  };

  // 5. Earnings-nabijheid (<7 dagen = risico op IV-crush/gap).
  const d = data.daysToEarnings;
  const earningsScore = d >= 21 ? 100 : d >= 7 ? 60 : 20;
  const earningsStatus: CriterionStatus = d >= 21 ? 'good' : d >= 7 ? 'ok' : 'bad';
  const earnings: CriterionResult = {
    key: 'earnings',
    label: 'Earnings-nabijheid',
    status: earningsStatus,
    score: earningsScore,
    detail: `Earnings over ${data.daysToEarnings} dagen${d < 7 ? ' — let op IV-crush/gap-risico.' : '.'}`,
  };

  const criteria = [optionable, liquidity, ivRank, premium, earnings];
  const totalScore = ticker.optionsAvailable
    ? Math.round(criteria.reduce((sum, c) => sum + c.score, 0) / criteria.length)
    : 0;

  const verdict: Verdict = !ticker.optionsAvailable
    ? 'unsuitable'
    : totalScore >= 80
    ? 'excellent'
    : totalScore >= 60
    ? 'suitable'
    : totalScore >= 40
    ? 'mediocre'
    : 'unsuitable';

  return { totalScore, verdict, criteria };
}
```

- [ ] **Step 4: Run de test — verifieer dat hij slaagt**

Run: `npx vitest run src/utils/optionCandidate.test.ts`
Expected: PASS (9 tests in totaal in dit bestand).

- [ ] **Step 5: Commit**

```bash
git add src/utils/optionCandidate.ts src/utils/optionCandidate.test.ts
git commit -m "feat(optie-check): scoring of option-candidate criteria with tests"
```

---

## Task 3: De Optie-Check pagina

**Files:**
- Create: `src/pages/tools/OptionCheck.tsx`
- Modify: `src/pages/index.ts`

- [ ] **Step 1: Maak de pagina**

Maak `src/pages/tools/OptionCheck.tsx`:

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { ScanSearch, Info } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { selectAllTickers } from '../../store/slices/tickersSlice';
import { generateMockOptionData, scoreOptionCandidate } from '../../utils/optionCandidate';
import type { CriterionStatus, Verdict } from '../../utils/optionCandidate';

const STATUS_BADGE: Record<CriterionStatus, string> = {
  good: 'bg-positive-50 text-positive-600 dark:bg-positive-700/15',
  ok: 'bg-caution-50 text-caution-600 dark:bg-caution-600/15',
  bad: 'bg-negative-50 text-negative-600 dark:bg-negative-700/15',
};

const STATUS_LABEL: Record<CriterionStatus, string> = {
  good: 'Goed',
  ok: 'Matig',
  bad: 'Zwak',
};

const VERDICT_META: Record<Verdict, { label: string; cls: string }> = {
  excellent: { label: 'Uitstekende kandidaat', cls: 'text-positive-600' },
  suitable: { label: 'Geschikte kandidaat', cls: 'text-positive-600' },
  mediocre: { label: 'Matige kandidaat', cls: 'text-caution-600' },
  unsuitable: { label: 'Ongeschikt', cls: 'text-negative-600' },
};

export const OptionCheck: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  const tickers = useAppSelector(selectAllTickers);
  const [symbol, setSymbol] = useState('');

  useEffect(() => {
    setPageTitle('Optie-Check', 'Is deze ticker geschikt voor opties?');
  }, [setPageTitle]);

  const selected = useMemo(
    () => tickers.find((t) => t.symbol.toUpperCase() === symbol.toUpperCase()),
    [tickers, symbol]
  );

  const assessment = useMemo(() => {
    if (!selected) return null;
    const data = generateMockOptionData(selected.symbol);
    return { data, result: scoreOptionCandidate(selected, data) };
  }, [selected]);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="border-b border-[var(--line)] pb-4">
        <p className="eyebrow mb-1">Tools</p>
        <h1 className="text-xl font-semibold text-ink-900 dark:text-white tracking-tight">Optie-Check</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400 mt-1">
          Beoordeel of een ticker een goede kandidaat is voor optiestrategieën.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-md border border-caution-500/40 bg-caution-50 dark:bg-caution-600/10 px-3 py-2 text-xs text-caution-700 dark:text-caution-300">
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={1.75} />
        <span>De optie-cijfers hieronder zijn <strong>gesimuleerd</strong> (de app heeft geen live optie-feed) en dienen enkel ter illustratie.</span>
      </div>

      {/* Ticker select */}
      <div>
        <label htmlFor="oc-ticker" className="block text-xs font-semibold text-ink-500 mb-1.5">Ticker</label>
        {tickers.length === 0 ? (
          <p className="text-sm text-ink-400">Nog geen tickers. Voeg er eerst een toe via Tickers.</p>
        ) : (
          <select
            id="oc-ticker"
            className="w-full rounded-md border border-[var(--line)] bg-white dark:bg-trading-dark-800 px-3 py-2 text-sm text-ink-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
          >
            <option value="">Kies een ticker…</option>
            {tickers.map((t) => (
              <option key={t.symbol} value={t.symbol}>{t.symbol} — {t.name}</option>
            ))}
          </select>
        )}
      </div>

      {assessment && (
        <>
          {/* Verdict */}
          <div className="surface-card p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="eyebrow">Verdict</p>
              <span className="text-2xl font-bold tabular-nums text-ink-900 dark:text-white">{assessment.result.totalScore}<span className="text-sm text-ink-400">/100</span></span>
            </div>
            <p className={`text-lg font-semibold tracking-tight ${VERDICT_META[assessment.result.verdict].cls}`}>
              {VERDICT_META[assessment.result.verdict].label}
            </p>
            <div className="mt-3 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-primary-600 transition-all"
                style={{ width: `${assessment.result.totalScore}%` }}
              />
            </div>
          </div>

          {/* Criteria */}
          <div className="surface-card divide-y divide-[var(--line)]">
            {assessment.result.criteria.map((c) => (
              <div key={c.key} className="flex items-start justify-between gap-3 p-4">
                <div>
                  <p className="text-sm font-semibold text-ink-900 dark:text-white">{c.label}</p>
                  <p className="text-xs text-ink-500 dark:text-ink-400 mt-0.5">{c.detail}</p>
                </div>
                <span className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${STATUS_BADGE[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Exporteer de pagina**

In `src/pages/index.ts`, voeg in het Tools-exportblok (bij de andere `./tools/...` exports) toe:

```ts
export { OptionCheck } from './tools/OptionCheck';
```

- [ ] **Step 3: Verifieer typecheck + tests blijven groen**

Run: `npx vitest run` (alle bestaande tests + util-tests groen; imports moeten resolven).
Expected: PASS. Volledige typecheck volgt in Task 5.

- [ ] **Step 4: Commit**

```bash
git add src/pages/tools/OptionCheck.tsx src/pages/index.ts
git commit -m "feat(optie-check): add Optie-Check tool page"
```

---

## Task 4: Route, sidebar & i18n

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/layout/Sidebar.tsx`
- Modify: `src/i18n/locales/nl.ts`, `src/i18n/locales/en.ts`, `src/i18n/locales/fr.ts`

- [ ] **Step 1: Voeg de route toe (App.tsx)**

In `src/App.tsx`: voeg `OptionCheck` toe aan het pages-import-blok (bij de andere tool-imports). Voeg dan na de bestaande `tools/...`-routes (bv. na de `tools/covered-call-simulator`-route) toe:

```tsx
        <Route path="tools/option-check" element={<FeatureGate feature="options_basics"><OptionCheck /></FeatureGate>} />
```

- [ ] **Step 2: i18n-sleutel toevoegen (3 locales)**

In `src/i18n/locales/nl.ts`, in het `sidebar`-object (bv. na `mentorship`):

```ts
    optionCheck: 'Optie-Check',
```

In `src/i18n/locales/en.ts`, in het `sidebar`-object:

```ts
    optionCheck: 'Option check',
```

In `src/i18n/locales/fr.ts`, in het `sidebar`-object:

```ts
    optionCheck: "Vérification d'options",
```

- [ ] **Step 3: Sidebar — ROUTE_FEATURE_MAP + NavLink**

In `src/components/layout/Sidebar.tsx`:

(a) Voeg `ScanSearch` toe aan de lucide-react import.

(b) Voeg een entry toe aan `ROUTE_FEATURE_MAP`:

```ts
  '/tools/option-check': 'options_basics',
```

(c) Voeg in de **Tools**-groep (na de bestaande tool-NavLinks, bv. na de `tools/pnl-simulator`-NavLink en vóór het sluiten van de Tools-`div`) deze NavLink toe, gegate met `hasAccess`:

```tsx
          {hasAccess('/tools/option-check') && (
            <NavLink
              to="/tools/option-check"
              onClick={() => handleMenuClick('/tools/option-check', t('sidebar.optionCheck'))}
              className={({ isActive }) => navClass(isActive, isCollapsed)}
              title={isCollapsed ? t('sidebar.optionCheck') : ''}
            >
              {({ isActive }) => (
                <>
                  <ActiveBar active={isActive} />
                  <ScanSearch className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
                  {!isCollapsed && <span>{t('sidebar.optionCheck')}</span>}
                </>
              )}
            </NavLink>
          )}
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/layout/Sidebar.tsx src/i18n/locales/nl.ts src/i18n/locales/en.ts src/i18n/locales/fr.ts
git commit -m "feat(optie-check): route, sidebar item (medior-gated) and i18n"
```

---

## Task 5: Volledige verificatie

**Files:** geen — alleen verificatie.

- [ ] **Step 1: Volledige testsuite**

Run: `npm run test`
Expected: PASS — inclusief de nieuwe `optionCandidate`-tests (9) en alle bestaande tests.

- [ ] **Step 2: Lint**

Run: `npx eslint src/utils/optionCandidate.ts src/utils/optionCandidate.test.ts src/pages/tools/OptionCheck.tsx src/pages/index.ts src/App.tsx src/components/layout/Sidebar.tsx`
Expected: geen errors in deze bestanden.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS (tsc -b + vite build).

- [ ] **Step 4: Commit eventuele fixes**

```bash
git add -A
git commit -m "fix(optie-check): resolve lint/type issues"
```

---

## Task 6: Visuele verificatie (Playwright MCP indien beschikbaar)

**Files:** geen — visuele check (zie geheugen: visuele verificatie na UI-wijzigingen).

- [ ] **Step 1:** Start `npm run dev` (achtergrond), open de app.
- [ ] **Step 2:** Met een **medior** (of hoger) account: zie je "Optie-Check" in de Tools-groep van de sidebar? Met een beginner-account: is het item verborgen?
- [ ] **Step 3:** Open `/tools/option-check`, kies een ticker → verschijnen de gesimuleerde cijfers, de 5 criteria met badges en het verdict + score-meter? Is de "gesimuleerd"-disclaimer zichtbaar?
- [ ] **Step 4:** Kies een ticker met `optionsAvailable=false` (indien aanwezig) → verdict "Ongeschikt", score 0.
- [ ] **Step 5:** Commit eventuele visuele bijsturing.

```bash
git add -A
git commit -m "style(optie-check): visual fine-tuning"
```

---

## Self-Review notities

- **Spec-dekking:** mock-databron + determinisme (T1), kernset van 5 criteria + scoring + verdict-drempels (T2), pagina met ticker-select/cijfers/scorecard/verdict + disclaimer (T3), route+sidebar+ i18n gegate via `options_basics` vanaf medior (T4), verificatie incl. determinisme/ranges/verdicts (T1/T2/T5), naam "Optie-Check" overal. Alle spec-secties gedekt. Buiten scope (echte feed, batch-scan, strategie-weging, persistentie) blijft buiten scope.
- **Type-consistentie:** `MockOptionData`, `CriterionResult` (keys: optionable/liquidity/ivRank/premium/earnings), `CriterionStatus` (good/ok/bad), `Verdict` (excellent/suitable/mediocre/unsuitable), `CandidateAssessment` — identiek gebruikt in util, tests en pagina. Functies `generateMockOptionData(symbol, seed?)` en `scoreOptionCandidate(ticker, data)` consistent.
- **Geen placeholders:** elke stap bevat volledige code/commando's.
- **Aanname (geverifieerd tijdens implementatie):** het lucide-icoon `ScanSearch` bestaat; zo niet, gebruik `Gauge` of `SearchCheck`. De Tools-groep en `ActiveBar`/`navClass`-helpers in de sidebar bestaan al (gebruikt door de andere tool-NavLinks).
