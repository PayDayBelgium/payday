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
  const rng = mulberry32((hashSeed(symbol.toUpperCase()) + seed) >>> 0);
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

const liquidityStatusFromScore = (score: number): CriterionStatus =>
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
    status: liquidityStatusFromScore(liquidityScore),
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
  // 'optionable' is always 100 when options exist, so an optionable ticker scores >= 20.
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
