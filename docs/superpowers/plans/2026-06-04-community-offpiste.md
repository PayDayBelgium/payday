# Community, Trading ideas & Off-piste (Quant) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Voeg een community-laag (après-ski bar) met trading ideas, dashboard-widgets en een nieuw Off-piste/Quant-level toe aan PayDay, en herwerk de berg-visualisatie.

**Architecture:** Frontend-only op Redux Toolkit + redux-persist. Nieuwe `community`-slice met mock seed-data; Off-piste als 5e level in de bestaande level/credits-mechaniek; nieuwe pagina's `/community` en `/quant`; dashboard-widgets; berg-SVG geëxtraheerd naar een herbruikbaar component.

**Tech Stack:** React 19, Redux Toolkit, react-router-dom v7, Tailwind, lucide-react, recharts, i18next, Vitest (node-env, alleen `*.test.ts`).

**Testing-conventie:** De codebase test enkel pure logica in `.ts` (Vitest, node-env, geen DOM/testing-library). Daarom: TDD voor slice/reducers/selectors/thunks/level-logica. UI-componenten (`.tsx`) worden geverifieerd via `npm run build` (tsc) + visuele controle (Playwright MCP), niet via unit tests.

**Referentie-spec:** `docs/superpowers/specs/2026-06-04-community-offpiste-design.md` (bevat de canonieke berg-SVG).

---

## File Structure

**Nieuw:**
- `src/store/slices/communitySlice.ts` — posts-state, reducers, selectors
- `src/store/slices/communitySlice.test.ts` — reducer/selector-tests
- `src/store/slices/userProgressSlice.test.ts` — level-logica-tests
- `src/store/actions/communityActions.ts` — thunks die post/reply + credits dispatchen
- `src/store/actions/communityActions.test.ts` — thunk-tests
- `src/data/communitySeed.ts` — mock seed-posts
- `src/components/community/LevelBadge.tsx`
- `src/components/community/TradeIdeaCard.tsx`
- `src/components/community/useTradeIdeaWizard.tsx`
- `src/components/community/ReplyThread.tsx`
- `src/components/community/Composer.tsx`
- `src/components/community/PostCard.tsx`
- `src/components/community/index.ts`
- `src/components/mission/PaydayMountain.tsx` — geëxtraheerde + herwerkte berg
- `src/components/widgets/TradingIdeasWidget.tsx`
- `src/components/widgets/CommunityWidget.tsx`
- `src/pages/community/Community.tsx`
- `src/pages/quant/QuantTrading.tsx`

**Gewijzigd:**
- `src/types/index.ts` — `UserLevel`, `FeatureId`, community-types
- `src/store/index.ts` — community-reducer registreren + persist
- `src/store/slices/userProgressSlice.ts` — Off-piste level + levelOrder-arrays
- `src/components/features/FeatureGate.tsx` — `'orange'` kleur-tak
- `src/pages/mission/MissionStatement.tsx` — `PaydayMountain` gebruiken, LevelCard-kleur, traject 5e stap
- `src/App.tsx` — routes `/community`, `/quant`
- `src/pages/index.ts` — exports
- `src/components/layout/Sidebar.tsx` — Community + Quant trading items
- `src/pages/dashboard/Dashboard.tsx` — widgets onderaan
- `src/i18n/locales/{nl,en,fr}.ts` — strings

---

## Task 1: Types uitbreiden

**Files:**
- Modify: `src/types/index.ts:503` (UserLevel) en `:519` (FeatureId); append community-types.

- [ ] **Step 1: UserLevel uitbreiden**

In `src/types/index.ts`, vervang regel 503:

```ts
export type UserLevel = 'beginner' | 'medior' | 'senior' | 'expert' | 'offpiste';
```

- [ ] **Step 2: FeatureId uitbreiden**

Voeg `'quant_trading'` toe aan de expert-sectie van de `FeatureId`-union (na `'ai_assistant'`):

```ts
  | 'ai_assistant'
  // Off-piste features
  | 'quant_trading';
```

- [ ] **Step 3: Community-types toevoegen**

Voeg onderaan `src/types/index.ts` toe:

```ts
// =====================================================
// Community / Trading ideas
// =====================================================

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
  expiry: string;
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

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: PASS (mogelijk nieuwe fouten in switch-statements over `UserLevel`/`FeatureId` — die lossen latere taken op; als tsc hier al klaagt over exhaustiveness in bestaande bestanden, noteer en ga door, ze worden in Task 5/6 geadresseerd).

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add offpiste level, quant_trading feature, community types"
```

---

## Task 2: Community seed-data

**Files:**
- Create: `src/data/communitySeed.ts`

- [ ] **Step 1: Seed-bestand schrijven**

```ts
import type { CommunityPost } from '../types';

// Mock seed-posts voor de community. Frontend-only; vervangt later een API.
export const COMMUNITY_SEED: CommunityPost[] = [
  {
    id: 'post-tsla-csp',
    author: { name: 'Sven K.', initials: 'SK', color: '#D14343', level: 'senior' },
    channel: 'ideas',
    text: 'Er zit serieus juice in Tesla deze week — IV rank staat hoog na de earnings-dip. Een cash secured put op $230 lijkt me mooi betaald. Iemand mee?',
    createdAt: '2026-06-04T08:00:00.000Z',
    likes: 12,
    likedByMe: false,
    tradeIdea: {
      ticker: 'TSLA',
      strategy: 'cash_secured_puts',
      expiry: '2026-06-21',
      strike: 230,
      premium: 4.1,
      returnPct: 1.8,
      delta: 0.28,
      ivRank: 78,
    },
    replies: [
      {
        id: 'reply-tsla-1',
        author: { name: 'Mona', initials: 'MO', color: '#86AED9', level: 'medior' },
        text: 'Mooie setup, ik wacht op $225 voor iets meer marge 👀',
        createdAt: '2026-06-04T09:00:00.000Z',
      },
    ],
  },
  {
    id: 'post-nvda-cc',
    author: { name: 'Tom V.', initials: 'TV', color: '#0F9D58', level: 'medior' },
    channel: 'ideas',
    text: 'Premie pakken op de NVDA-rally met een covered call op $135.',
    createdAt: '2026-06-03T14:00:00.000Z',
    likes: 8,
    likedByMe: false,
    tradeIdea: {
      ticker: 'NVDA',
      strategy: 'covered_calls',
      expiry: '2026-06-21',
      strike: 135,
      ivRank: 61,
    },
    replies: [],
  },
  {
    id: 'post-cc-roll',
    author: { name: 'Anke L.', initials: 'AL', color: '#2F6CAE', level: 'medior' },
    channel: 'general',
    text: 'Hoe beheren jullie covered calls als het aandeel hard stijgt? Rollen of laten callen?',
    createdAt: '2026-06-03T10:00:00.000Z',
    likes: 7,
    likedByMe: false,
    replies: [
      {
        id: 'reply-cc-1',
        author: { name: 'Tom V.', initials: 'TV', color: '#0F9D58', level: 'medior' },
        text: 'Ik rol meestal door als er nog tijdswaarde in zit, anders laten callen.',
        createdAt: '2026-06-03T11:00:00.000Z',
      },
    ],
  },
  {
    id: 'post-pmcc-asml',
    author: { name: 'Mona', initials: 'MO', color: '#86AED9', level: 'medior' },
    channel: 'general',
    text: 'Iemand ervaring met PMCC op ASML?',
    createdAt: '2026-06-02T16:00:00.000Z',
    likes: 4,
    likedByMe: false,
    replies: [],
  },
];
```

- [ ] **Step 2: Commit**

```bash
git add src/data/communitySeed.ts
git commit -m "feat(community): add mock seed posts"
```

---

## Task 3: communitySlice (TDD)

**Files:**
- Create: `src/store/slices/communitySlice.ts`
- Test: `src/store/slices/communitySlice.test.ts`

- [ ] **Step 1: Failing test schrijven**

`src/store/slices/communitySlice.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import reducer, {
  addPost,
  addReply,
  toggleLike,
  selectPostsByChannel,
  selectRecentPosts,
  selectFeaturedTradeIdeas,
} from './communitySlice';
import type { CommunityPost } from '../../types';

const basePost = (over: Partial<CommunityPost> = {}): CommunityPost => ({
  id: over.id ?? 'p1',
  author: { name: 'A', initials: 'A', color: '#000', level: 'beginner' },
  channel: over.channel ?? 'general',
  text: 'hi',
  createdAt: over.createdAt ?? '2026-01-01T00:00:00.000Z',
  likes: over.likes ?? 0,
  likedByMe: false,
  replies: [],
  ...over,
});

describe('communitySlice', () => {
  it('addPost prepends the post', () => {
    const state = reducer({ posts: [basePost({ id: 'old' })] }, addPost(basePost({ id: 'new' })));
    expect(state.posts[0].id).toBe('new');
  });

  it('toggleLike toggles like and count', () => {
    const s1 = reducer({ posts: [basePost({ id: 'p1', likes: 2 })] }, toggleLike('p1'));
    expect(s1.posts[0].likedByMe).toBe(true);
    expect(s1.posts[0].likes).toBe(3);
    const s2 = reducer(s1, toggleLike('p1'));
    expect(s2.posts[0].likedByMe).toBe(false);
    expect(s2.posts[0].likes).toBe(2);
  });

  it('addReply appends a reply to the right post', () => {
    const state = reducer(
      { posts: [basePost({ id: 'p1' })] },
      addReply({
        postId: 'p1',
        reply: {
          id: 'r1',
          author: { name: 'B', initials: 'B', color: '#111', level: 'medior' },
          text: 'reply',
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      })
    );
    expect(state.posts[0].replies).toHaveLength(1);
    expect(state.posts[0].replies[0].id).toBe('r1');
  });

  it('selectPostsByChannel filters by channel', () => {
    const root: any = { community: { posts: [basePost({ id: 'a', channel: 'ideas' }), basePost({ id: 'b', channel: 'general' })] } };
    expect(selectPostsByChannel('ideas')(root).map((p) => p.id)).toEqual(['a']);
  });

  it('selectFeaturedTradeIdeas returns only posts with a tradeIdea, sorted by ivRank desc', () => {
    const root: any = {
      community: {
        posts: [
          basePost({ id: 'low', channel: 'ideas', tradeIdea: { ticker: 'X', strategy: 'cash_secured_puts', expiry: '', ivRank: 40 } }),
          basePost({ id: 'high', channel: 'ideas', tradeIdea: { ticker: 'Y', strategy: 'cash_secured_puts', expiry: '', ivRank: 90 } }),
          basePost({ id: 'none', channel: 'general' }),
        ],
      },
    };
    expect(selectFeaturedTradeIdeas(5)(root).map((p) => p.id)).toEqual(['high', 'low']);
  });

  it('selectRecentPosts limits the count', () => {
    const root: any = { community: { posts: [basePost({ id: '1' }), basePost({ id: '2' }), basePost({ id: '3' })] } };
    expect(selectRecentPosts(2)(root)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/store/slices/communitySlice.test.ts`
Expected: FAIL ("Cannot find module './communitySlice'").

- [ ] **Step 3: Slice implementeren**

`src/store/slices/communitySlice.ts`:

```ts
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { CommunityPost, CommunityReply, CommunityChannel } from '../../types';
import { COMMUNITY_SEED } from '../../data/communitySeed';

// Credits verdiend met community-deelname (brug naar Off-piste unlock).
export const COMMUNITY_POST_CREDITS = 10;
export const COMMUNITY_REPLY_CREDITS = 3;

interface CommunityState {
  posts: CommunityPost[];
}

const initialState: CommunityState = {
  posts: COMMUNITY_SEED,
};

const communitySlice = createSlice({
  name: 'community',
  initialState,
  reducers: {
    addPost: (state, action: PayloadAction<CommunityPost>) => {
      state.posts.unshift(action.payload);
    },
    addReply: (state, action: PayloadAction<{ postId: string; reply: CommunityReply }>) => {
      const post = state.posts.find((p) => p.id === action.payload.postId);
      if (post) post.replies.push(action.payload.reply);
    },
    toggleLike: (state, action: PayloadAction<string>) => {
      const post = state.posts.find((p) => p.id === action.payload);
      if (!post) return;
      post.likedByMe = !post.likedByMe;
      post.likes += post.likedByMe ? 1 : -1;
    },
  },
});

export const { addPost, addReply, toggleLike } = communitySlice.actions;

// Selectors
export const selectAllPosts = (state: RootState) => state.community.posts;

export const selectPostsByChannel = (channel: CommunityChannel) => (state: RootState) =>
  state.community.posts.filter((p) => p.channel === channel);

export const selectRecentPosts = (limit: number) => (state: RootState) =>
  state.community.posts.slice(0, limit);

export const selectFeaturedTradeIdeas = (limit: number) => (state: RootState) =>
  state.community.posts
    .filter((p) => !!p.tradeIdea)
    .slice()
    .sort((a, b) => (b.tradeIdea!.ivRank ?? 0) - (a.tradeIdea!.ivRank ?? 0))
    .slice(0, limit);

export default communitySlice.reducer;
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/store/slices/communitySlice.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/slices/communitySlice.ts src/store/slices/communitySlice.test.ts
git commit -m "feat(community): add community slice with reducers and selectors"
```

---

## Task 4: communitySlice in store registreren

**Files:**
- Modify: `src/store/index.ts`

- [ ] **Step 1: Reducer importeren**

Voeg na regel 19 (`import userProgressReducer ...`) toe:

```ts
import communityReducer from './slices/communitySlice';
```

- [ ] **Step 2: In rootReducer opnemen**

Voeg in het `combineReducers`-object (na `userProgress: userProgressReducer,`) toe:

```ts
  community: communityReducer,
```

- [ ] **Step 3: Persisten**

Voeg `'community'` toe aan de `whitelist`-array in `persistConfig` (regel 49).

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: PASS voor `src/store/index.ts` (RootState bevat nu `community`).

- [ ] **Step 5: Commit**

```bash
git add src/store/index.ts
git commit -m "feat(community): register community reducer with persistence"
```

---

## Task 5: Off-piste level + level-logica (TDD)

**Files:**
- Modify: `src/store/slices/userProgressSlice.ts`
- Test: `src/store/slices/userProgressSlice.test.ts`

- [ ] **Step 1: Failing test schrijven**

`src/store/slices/userProgressSlice.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import reducer, {
  LEVEL_CONFIGS,
  getFeaturesForLevel,
  isFeatureAvailable,
  selectNextLevel,
  unlockLevel,
} from './userProgressSlice';

describe('userProgressSlice levels', () => {
  it('has an offpiste level config with quant_trading', () => {
    const off = LEVEL_CONFIGS.find((c) => c.level === 'offpiste');
    expect(off).toBeTruthy();
    expect(off!.features).toContain('quant_trading');
    expect(off!.slopeColor).toBe('orange');
  });

  it('getFeaturesForLevel("offpiste") includes all lower features plus quant_trading', () => {
    const feats = getFeaturesForLevel('offpiste');
    expect(feats).toContain('quant_trading');
    expect(feats).toContain('stocks');      // beginner
    expect(feats).toContain('kaching');     // expert
  });

  it('quant_trading is only available when offpiste is unlocked', () => {
    expect(isFeatureAvailable('quant_trading', ['beginner', 'expert'])).toBe(false);
    expect(isFeatureAvailable('quant_trading', ['offpiste'])).toBe(true);
  });

  it('selectNextLevel from expert returns offpiste', () => {
    const root: any = { userProgress: { progress: { currentLevel: 'expert' } } };
    expect(selectNextLevel(root)?.level).toBe('offpiste');
  });

  it('selectNextLevel from offpiste returns null (top)', () => {
    const root: any = { userProgress: { progress: { currentLevel: 'offpiste' } } };
    expect(selectNextLevel(root)).toBeNull();
  });

  it('unlockLevel("offpiste") promotes currentLevel to offpiste', () => {
    const state: any = {
      progress: { currentLevel: 'expert', unlockedLevels: ['beginner', 'medior', 'senior', 'expert'] },
      creditHistory: [],
      isLoading: false,
    };
    const next = reducer(state, unlockLevel('offpiste'));
    expect(next.progress.unlockedLevels).toContain('offpiste');
    expect(next.progress.currentLevel).toBe('offpiste');
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/store/slices/userProgressSlice.test.ts`
Expected: FAIL (geen offpiste-config; levelOrder mist 'offpiste').

- [ ] **Step 3: Off-piste config toevoegen**

In `src/store/slices/userProgressSlice.ts`, voeg na de `expert`-entry (regel 53) een 5e entry toe in `LEVEL_CONFIGS`:

```ts
  {
    level: 'offpiste',
    name: 'Off-piste',
    slopeName: 'Off-piste',
    slopeColor: 'orange',
    icon: '🟠',
    description: 'Verlaat de geprepareerde piste: kwantitatieve modellen, edge-detectie en data-gedreven trading. Ontgrendel via de community.',
    features: ['quant_trading'],
    creditsRequired: 100,
    priceEUR: 0,
  },
```

- [ ] **Step 4: levelOrder-arrays uitbreiden**

Vervang in `getFeaturesForLevel` (regel ~59) de array door:

```ts
  const levelOrder: UserLevel[] = ['beginner', 'medior', 'senior', 'expert', 'offpiste'];
```

Vervang in `unlockLevel` (regel ~162) de array door:

```ts
        const levelOrder: UserLevel[] = ['beginner', 'medior', 'senior', 'expert', 'offpiste'];
```

Vervang in `selectNextLevel` (regel ~269) de array door:

```ts
  const levelOrder: UserLevel[] = ['beginner', 'medior', 'senior', 'expert', 'offpiste'];
```

- [ ] **Step 5: Run test, verify pass**

Run: `npx vitest run src/store/slices/userProgressSlice.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/store/slices/userProgressSlice.ts src/store/slices/userProgressSlice.test.ts
git commit -m "feat(levels): add off-piste (quant) as 5th level"
```

---

## Task 6: Community credit-thunks (TDD)

**Files:**
- Create: `src/store/actions/communityActions.ts`
- Test: `src/store/actions/communityActions.test.ts`

- [ ] **Step 1: Failing test schrijven**

`src/store/actions/communityActions.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { submitPost, submitReply } from './communityActions';
import type { CommunityAuthor, TradeIdea } from '../../types';

const author: CommunityAuthor = { name: 'Me', initials: 'ME', color: '#000', level: 'beginner' };

describe('communityActions', () => {
  it('submitPost dispatches addPost and addCredits', () => {
    const dispatch = vi.fn();
    submitPost({ author, channel: 'ideas', text: 'idea' })(dispatch as any);
    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).toContain('community/addPost');
    expect(types).toContain('userProgress/addCredits');
    const creditCall = dispatch.mock.calls.find((c) => c[0].type === 'userProgress/addCredits');
    expect(creditCall![0].payload.amount).toBe(10);
  });

  it('submitPost forwards a tradeIdea onto the post', () => {
    const dispatch = vi.fn();
    const tradeIdea: TradeIdea = { ticker: 'TSLA', strategy: 'cash_secured_puts', expiry: '2026-06-21', ivRank: 70 };
    submitPost({ author, channel: 'ideas', text: 'x', tradeIdea })(dispatch as any);
    const postCall = dispatch.mock.calls.find((c) => c[0].type === 'community/addPost');
    expect(postCall![0].payload.tradeIdea).toEqual(tradeIdea);
    expect(postCall![0].payload.channel).toBe('ideas');
  });

  it('submitReply dispatches addReply and 3 credits', () => {
    const dispatch = vi.fn();
    submitReply({ postId: 'p1', author, text: 'r' })(dispatch as any);
    const types = dispatch.mock.calls.map((c) => c[0].type);
    expect(types).toContain('community/addReply');
    const creditCall = dispatch.mock.calls.find((c) => c[0].type === 'userProgress/addCredits');
    expect(creditCall![0].payload.amount).toBe(3);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npx vitest run src/store/actions/communityActions.test.ts`
Expected: FAIL ("Cannot find module './communityActions'").

- [ ] **Step 3: Thunks implementeren**

`src/store/actions/communityActions.ts`:

```ts
import type { Dispatch } from '@reduxjs/toolkit';
import type { CommunityAuthor, CommunityChannel, TradeIdea } from '../../types';
import {
  addPost,
  addReply,
  COMMUNITY_POST_CREDITS,
  COMMUNITY_REPLY_CREDITS,
} from '../slices/communitySlice';
import { addCredits } from '../slices/userProgressSlice';

// Deterministische id-helper (geen Date.now in reducers/seed nodig in tests).
const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const submitPost =
  (args: { author: CommunityAuthor; channel: CommunityChannel; text: string; tradeIdea?: TradeIdea }) =>
  (dispatch: Dispatch) => {
    dispatch(
      addPost({
        id: makeId('post'),
        author: args.author,
        channel: args.channel,
        text: args.text,
        createdAt: new Date().toISOString(),
        likes: 0,
        likedByMe: false,
        replies: [],
        tradeIdea: args.tradeIdea,
      })
    );
    dispatch(addCredits({ amount: COMMUNITY_POST_CREDITS, reason: 'Bijdrage in de community' }));
  };

export const submitReply =
  (args: { postId: string; author: CommunityAuthor; text: string }) =>
  (dispatch: Dispatch) => {
    dispatch(
      addReply({
        postId: args.postId,
        reply: {
          id: makeId('reply'),
          author: args.author,
          text: args.text,
          createdAt: new Date().toISOString(),
        },
      })
    );
    dispatch(addCredits({ amount: COMMUNITY_REPLY_CREDITS, reason: 'Reactie in de community' }));
  };
```

- [ ] **Step 4: Run test, verify pass**

Run: `npx vitest run src/store/actions/communityActions.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/actions/communityActions.ts src/store/actions/communityActions.test.ts
git commit -m "feat(community): post/reply thunks award participation credits"
```

---

## Task 7: FeatureGate + LevelCard kleur voor 'orange'

**Files:**
- Modify: `src/components/features/FeatureGate.tsx` (regels ~46-58 en ~76-79)
- Modify: `src/pages/mission/MissionStatement.tsx` (`getSlopeColorClasses`/`getHeaderColorClasses`)

- [ ] **Step 1: FeatureGate lock-icoon kleur**

In `FeatureGate.tsx`, in de twee `${levelConfig?.slopeColor === 'red' ? ... : '...'}`-ketens (icon-achtergrond regel ~50 en icon-kleur regel ~57), voeg vóór de eind-fallback een `'orange'`-tak toe. Achtergrond:

```tsx
            levelConfig?.slopeColor === 'red' ? 'bg-negative-50 dark:bg-negative-700/25' :
            levelConfig?.slopeColor === 'orange' ? 'bg-caution-50 dark:bg-caution-600/25' :
            'bg-gray-100 dark:bg-gray-700'}
```

Icon-kleur:

```tsx
              levelConfig?.slopeColor === 'red' ? 'text-negative-600 dark:text-negative-500' :
              levelConfig?.slopeColor === 'orange' ? 'text-caution-600 dark:text-caution-500' :
              'text-gray-600 dark:text-gray-400'}
```

- [ ] **Step 2: FeatureGate level-card kleur**

In de level-card-`className` (regel ~76), voeg een `'orange'`-tak toe vóór de fallback:

```tsx
              levelConfig.slopeColor === 'red' ? 'bg-negative-50 dark:bg-negative-700/15 border border-negative-500/20 dark:border-negative-700' :
              levelConfig.slopeColor === 'orange' ? 'bg-caution-50 dark:bg-caution-600/15 border border-caution-500/30 dark:border-caution-600' :
              'bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'}
```

- [ ] **Step 3: MissionStatement LevelCard kleuren**

In `src/pages/mission/MissionStatement.tsx`, in `getSlopeColorClasses` (regel ~349) voeg vóór `default` toe:

```tsx
      case 'orange': return 'border-caution-500 bg-caution-50 dark:bg-caution-600/15';
```

In `getHeaderColorClasses` (regel ~359) voeg vóór `default` toe:

```tsx
      case 'orange': return 'bg-caution-500';
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: PASS (de `caution`-kleur bestaat in `tailwind.config.js`).

- [ ] **Step 5: Commit**

```bash
git add src/components/features/FeatureGate.tsx src/pages/mission/MissionStatement.tsx
git commit -m "feat(levels): orange (caution) styling for off-piste in gate and cards"
```

---

## Task 8: LevelBadge component

**Files:**
- Create: `src/components/community/LevelBadge.tsx`

- [ ] **Step 1: Component schrijven**

```tsx
import React from 'react';
import { getLevelConfig } from '../../store/slices/userProgressSlice';
import type { UserLevel } from '../../types';

const TONE: Record<string, string> = {
  green: 'bg-positive-50 text-positive-700',
  blue: 'bg-primary-50 text-primary-700',
  red: 'bg-negative-50 text-negative-600',
  black: 'bg-ink-100 text-ink-700',
  orange: 'bg-caution-50 text-caution-600',
};

export const LevelBadge: React.FC<{ level: UserLevel; className?: string }> = ({ level, className = '' }) => {
  const config = getLevelConfig(level);
  const tone = TONE[config.slopeColor] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${tone} ${className}`}>
      <span>{config.icon}</span>
      <span>{config.slopeName}</span>
    </span>
  );
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/community/LevelBadge.tsx
git commit -m "feat(community): LevelBadge component"
```

---

## Task 9: useTradeIdeaWizard hook

**Files:**
- Create: `src/components/community/useTradeIdeaWizard.tsx`

- [ ] **Step 1: Hook schrijven**

Opent de juiste optie-wizard, voorgevuld vanuit een `TradeIdea`. Gebruikt de eerste portefeuille als doel (v1-keuze; de wizard laat verder aanpassen toe).

```tsx
import React, { useState, useCallback } from 'react';
import { PutOptionWizard } from '../modals/PutOptionWizard';
import { CallOptionWizard } from '../modals/CallOptionWizard';
import { useAppSelector } from '../../hooks/useAppSelector';
import type { TradeIdea, Ticker } from '../../types';

type Kind = 'put' | 'call' | null;

export function useTradeIdeaWizard() {
  const portfolios = useAppSelector((s) => s.portfolios.portfolios);
  const [kind, setKind] = useState<Kind>(null);
  const [ticker, setTicker] = useState<Ticker | null>(null);

  const launch = useCallback((idea: TradeIdea) => {
    setTicker({
      symbol: idea.ticker,
      name: idea.ticker,
      type: 'stock',
      optionsAvailable: true,
      miniContractsAvailable: false,
    });
    setKind(idea.strategy === 'covered_calls' ? 'call' : 'put');
  }, []);

  const close = () => {
    setKind(null);
    setTicker(null);
  };

  const portfolio = portfolios[0];
  const canLaunch = !!portfolio;

  const wizard = portfolio ? (
    <>
      <PutOptionWizard
        isOpen={kind === 'put'}
        onClose={close}
        portfolio={portfolio}
        initialAction="sell"
        initialTicker={ticker || undefined}
        initialStep={2}
      />
      <CallOptionWizard
        isOpen={kind === 'call'}
        onClose={close}
        portfolio={portfolio}
        initialAction="sell"
        initialTicker={ticker || undefined}
        initialStep={2}
      />
    </>
  ) : null;

  return { launch, wizard, canLaunch };
}
```

> **Implementatienoot:** controleer dat `PutOptionWizard`/`CallOptionWizard` een `portfolio`-prop nemen met velden `{ name, currency, logo, ... }` (zoals in `CampaignView.tsx`). Geef indien nodig de overige verplichte props mee zoals daar gebruikt.

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/community/useTradeIdeaWizard.tsx
git commit -m "feat(community): useTradeIdeaWizard hook to prefill option wizard"
```

---

## Task 10: TradeIdeaCard component

**Files:**
- Create: `src/components/community/TradeIdeaCard.tsx`

- [ ] **Step 1: Component schrijven**

```tsx
import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { TradeIdea } from '../../types';

const STRATEGY_LABEL: Partial<Record<TradeIdea['strategy'], string>> = {
  cash_secured_puts: 'Cash Secured Put',
  covered_calls: 'Covered Call',
  pmcc: 'PMCC',
  leaps: 'LEAPS',
  spreads: 'Spread',
};

const juiceLabel = (iv: number) => (iv >= 70 ? 'hoog' : iv >= 50 ? 'matig' : 'laag');

export const TradeIdeaCard: React.FC<{
  idea: TradeIdea;
  onPlaceTrade?: (idea: TradeIdea) => void;
  compact?: boolean;
}> = ({ idea, onPlaceTrade, compact = false }) => {
  return (
    <div className="border border-[var(--line)] rounded-lg p-3 bg-surface-subtle dark:bg-trading-dark-700/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tabular-nums">{idea.ticker}</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
            {STRATEGY_LABEL[idea.strategy] ?? idea.strategy.replace(/_/g, ' ')}
          </span>
        </div>
        <span className="text-[11px] text-ink-400">vervalt {idea.expiry}</span>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between text-[11px] text-ink-500">
          <span>Juice (IV rank)</span>
          <span><b className="text-ink-900 dark:text-white">{idea.ivRank}%</b> · {juiceLabel(idea.ivRank)}</span>
        </div>
        <div className="h-1.5 rounded bg-[var(--line)] overflow-hidden mt-1">
          <div
            className="h-full rounded"
            style={{ width: `${Math.min(100, Math.max(0, idea.ivRank))}%`, background: 'linear-gradient(90deg,#0F9D58,#F0B429)' }}
          />
        </div>
      </div>

      {!compact && (
        <div className="flex gap-4 mt-2 text-[11px] text-ink-500">
          {idea.strike != null && <span>Strike <b className="text-ink-900 dark:text-white">${idea.strike}</b></span>}
          {idea.premium != null && <span>Premie <b className="text-ink-900 dark:text-white">${idea.premium}</b></span>}
          {idea.returnPct != null && <span>Rend. <b className="text-ink-900 dark:text-white">{idea.returnPct}%</b></span>}
          {idea.delta != null && <span>Δ <b className="text-ink-900 dark:text-white">{idea.delta}</b></span>}
        </div>
      )}

      {onPlaceTrade && (
        <button
          onClick={() => onPlaceTrade(idea)}
          className="mt-3 inline-flex items-center gap-1.5 bg-positive-500 hover:bg-positive-600 text-white rounded-md px-3 py-1.5 text-xs font-bold transition-colors"
        >
          Leg deze trade in
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/components/community/TradeIdeaCard.tsx
git commit -m "feat(community): TradeIdeaCard with juice meter and place-trade action"
```

---

## Task 11: Composer + ReplyThread + PostCard + index

**Files:**
- Create: `src/components/community/Composer.tsx`, `ReplyThread.tsx`, `PostCard.tsx`, `index.ts`

- [ ] **Step 1: Composer**

`src/components/community/Composer.tsx`:

```tsx
import React, { useState } from 'react';

export const Composer: React.FC<{
  initials: string;
  color: string;
  placeholder?: string;
  onSubmit: (text: string) => void;
}> = ({ initials, color, placeholder = 'Deel een trading idea of stel een vraag…', onSubmit }) => {
  const [text, setText] = useState('');
  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
  };
  return (
    <div className="flex gap-2.5 bg-white dark:bg-trading-dark-800 border border-[var(--line)] rounded-lg p-2.5">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: color }}>
        {initials}
      </div>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={placeholder}
        className="flex-1 bg-transparent outline-none text-sm text-ink-700 dark:text-ink-200 placeholder:text-ink-400"
      />
      <button onClick={submit} className="btn-primary rounded-md px-3 py-1.5 text-xs font-semibold">
        Plaatsen
      </button>
    </div>
  );
};
```

- [ ] **Step 2: ReplyThread**

`src/components/community/ReplyThread.tsx`:

```tsx
import React, { useState } from 'react';
import type { CommunityReply } from '../../types';

export const ReplyThread: React.FC<{
  replies: CommunityReply[];
  onReply: (text: string) => void;
}> = ({ replies, onReply }) => {
  const [text, setText] = useState('');
  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onReply(trimmed);
    setText('');
  };
  return (
    <div className="mt-3 space-y-2">
      {replies.map((r) => (
        <div key={r.id} className="flex gap-2 pl-3 border-l-2 border-[var(--line-soft)]">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: r.author.color }}>
            {r.author.initials}
          </div>
          <div>
            <span className="font-semibold text-xs text-ink-900 dark:text-white">{r.author.name}</span>
            <p className="text-xs text-ink-600 dark:text-ink-300 leading-snug">{r.text}</p>
          </div>
        </div>
      ))}
      <div className="flex gap-2 pl-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Reageer…"
          className="flex-1 bg-surface-subtle dark:bg-trading-dark-700 rounded-md px-2.5 py-1.5 text-xs outline-none text-ink-700 dark:text-ink-200 placeholder:text-ink-400"
        />
      </div>
    </div>
  );
};
```

- [ ] **Step 3: PostCard**

`src/components/community/PostCard.tsx`:

```tsx
import React, { useState } from 'react';
import { ThumbsUp, MessageSquare } from 'lucide-react';
import type { CommunityPost, TradeIdea } from '../../types';
import { LevelBadge } from './LevelBadge';
import { TradeIdeaCard } from './TradeIdeaCard';
import { ReplyThread } from './ReplyThread';

export const PostCard: React.FC<{
  post: CommunityPost;
  onLike: () => void;
  onReply: (text: string) => void;
  onPlaceTrade?: (idea: TradeIdea) => void;
}> = ({ post, onLike, onReply, onPlaceTrade }) => {
  const [showReplies, setShowReplies] = useState(false);
  return (
    <div className="surface-card p-4">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold text-white" style={{ background: post.author.color }}>
          {post.author.initials}
        </div>
        <div>
          <div className="font-semibold text-sm text-ink-900 dark:text-white">{post.author.name}</div>
          <div className="text-[11px] text-ink-400">{new Date(post.createdAt).toLocaleDateString('nl-BE')}</div>
        </div>
        <LevelBadge level={post.author.level} className="ml-auto" />
      </div>

      <p className="text-sm text-ink-700 dark:text-ink-300 leading-relaxed my-2.5">{post.text}</p>

      {post.tradeIdea && <TradeIdeaCard idea={post.tradeIdea} onPlaceTrade={onPlaceTrade} />}

      <div className="flex items-center gap-4 mt-2.5 text-xs text-ink-500">
        <button onClick={onLike} className={`inline-flex items-center gap-1.5 ${post.likedByMe ? 'text-primary-700 font-semibold' : ''}`}>
          <ThumbsUp className="w-3.5 h-3.5" /> {post.likes}
        </button>
        <button onClick={() => setShowReplies((v) => !v)} className="inline-flex items-center gap-1.5">
          <MessageSquare className="w-3.5 h-3.5" /> {post.replies.length} reacties
        </button>
      </div>

      {showReplies && <ReplyThread replies={post.replies} onReply={onReply} />}
    </div>
  );
};
```

- [ ] **Step 4: Barrel index**

`src/components/community/index.ts`:

```ts
export { LevelBadge } from './LevelBadge';
export { TradeIdeaCard } from './TradeIdeaCard';
export { Composer } from './Composer';
export { ReplyThread } from './ReplyThread';
export { PostCard } from './PostCard';
export { useTradeIdeaWizard } from './useTradeIdeaWizard';
```

- [ ] **Step 5: Type-check**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/community/
git commit -m "feat(community): Composer, ReplyThread, PostCard components"
```

---

## Task 12: Community-pagina

**Files:**
- Create: `src/pages/community/Community.tsx`

- [ ] **Step 1: Pagina schrijven**

```tsx
import React, { useState, useEffect } from 'react';
import { Beer } from 'lucide-react';
import { useAppSelector } from '../../hooks/useAppSelector';
import { useAppDispatch } from '../../hooks/useAppDispatch';
import { usePageTitle } from '../../contexts/PageTitleContext';
import { selectPostsByChannel, toggleLike } from '../../store/slices/communitySlice';
import { submitPost, submitReply } from '../../store/actions/communityActions';
import { isFeatureAvailable, selectUnlockedLevels } from '../../store/slices/userProgressSlice';
import { PostCard, Composer, useTradeIdeaWizard } from '../../components/community';
import type { CommunityAuthor, CommunityChannel } from '../../types';

// De ingelogde gebruiker als community-auteur (mock; geen echte profielen).
const ME: CommunityAuthor = { name: 'Jij', initials: 'JIJ', color: '#2F6CAE', level: 'beginner' };

const CHANNELS: { id: CommunityChannel; label: string }[] = [
  { id: 'ideas', label: 'Trading ideas' },
  { id: 'general', label: 'Algemeen' },
  { id: 'quant', label: 'Off-piste · Quant' },
];

export const Community: React.FC = () => {
  const dispatch = useAppDispatch();
  const { setPageTitle } = usePageTitle();
  const [channel, setChannel] = useState<CommunityChannel>('ideas');
  const unlocked = useAppSelector(selectUnlockedLevels);
  const quantUnlocked = isFeatureAvailable('quant_trading', unlocked);
  const posts = useAppSelector(selectPostsByChannel(channel));
  const { launch, wizard } = useTradeIdeaWizard();

  useEffect(() => {
    setPageTitle('Community', 'Après-ski bar · trading ideas & gesprekken');
  }, [setPageTitle]);

  return (
    <div className="space-y-4 max-w-3xl">
      {/* Hero */}
      <div className="flex items-center gap-3 rounded-xl border border-caution-500/40 bg-caution-50 dark:bg-caution-600/10 px-4 py-3">
        <div className="w-9 h-9 rounded-lg bg-caution-500 text-white flex items-center justify-center">
          <Beer className="w-5 h-5" strokeWidth={1.75} />
        </div>
        <div>
          <p className="eyebrow text-caution-600">Après-ski bar</p>
          <h1 className="text-base font-semibold text-ink-900 dark:text-white tracking-tight">Community</h1>
        </div>
      </div>

      {/* Channel tabs */}
      <div className="flex gap-1.5">
        {CHANNELS.map((c) => {
          const locked = c.id === 'quant' && !quantUnlocked;
          return (
            <button
              key={c.id}
              disabled={locked}
              onClick={() => setChannel(c.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                channel === c.id
                  ? 'bg-primary-700 text-white border-primary-700 font-semibold'
                  : 'bg-white dark:bg-trading-dark-800 text-ink-500 border-[var(--line)]'
              } ${locked ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {c.label}{locked ? ' 🔒' : ''}
            </button>
          );
        })}
      </div>

      {/* Composer */}
      <Composer
        initials={ME.initials}
        color={ME.color}
        onSubmit={(text) => dispatch(submitPost({ author: ME, channel, text }))}
      />

      {/* Feed */}
      <div className="space-y-3">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={() => dispatch(toggleLike(post.id))}
            onReply={(text) => dispatch(submitReply({ postId: post.id, author: ME, text }))}
            onPlaceTrade={post.tradeIdea ? launch : undefined}
          />
        ))}
        {posts.length === 0 && (
          <p className="text-sm text-ink-400 text-center py-8">Nog geen berichten in dit kanaal.</p>
        )}
      </div>

      {wizard}
    </div>
  );
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/community/Community.tsx
git commit -m "feat(community): community page with channels, composer and feed"
```

---

## Task 13: Quant trading-pagina (teaser)

**Files:**
- Create: `src/pages/quant/QuantTrading.tsx`

- [ ] **Step 1: Pagina schrijven**

```tsx
import React, { useEffect } from 'react';
import { Sigma, Activity, Radar, TrendingUp } from 'lucide-react';
import { usePageTitle } from '../../contexts/PageTitleContext';

export const QuantTrading: React.FC = () => {
  const { setPageTitle } = usePageTitle();
  useEffect(() => {
    setPageTitle('Quant trading', 'Off-piste · data-gedreven strategieën');
  }, [setPageTitle]);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl border border-caution-500/40 bg-caution-50 dark:bg-caution-600/10 p-8">
        <p className="eyebrow text-caution-600 mb-2">Off-piste ontgrendeld</p>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 dark:text-white mb-2">Quant trading</h1>
        <p className="text-sm text-ink-600 dark:text-ink-300 max-w-xl leading-relaxed">
          Je hebt de geprepareerde pistes verlaten. Hier draait alles om data: kwantitatieve modellen,
          edge-detectie en systematische signalen. Dit is een voorproefje — de tools volgen.
        </p>
      </div>

      {/* Concept cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[var(--line)] rounded-md overflow-hidden">
        {[
          { icon: Radar, t: 'Opportunity scanner', d: 'Rangschik kansen op IV rank, edge en liquiditeit.' },
          { icon: Activity, t: 'Edge-modellen', d: 'Kwantificeer verwachte waarde per strategie.' },
          { icon: TrendingUp, t: 'Backtesting', d: 'Test systematische regels op historische data.' },
        ].map(({ icon: Icon, t, d }) => (
          <div key={t} className="bg-white dark:bg-trading-dark-800 p-5">
            <div className="w-9 h-9 rounded-md bg-caution-50 text-caution-600 flex items-center justify-center mb-3">
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
            </div>
            <h3 className="font-semibold text-sm text-ink-900 dark:text-white tracking-tight mb-1">{t}</h3>
            <p className="text-xs text-ink-500 dark:text-ink-400 leading-relaxed">{d}</p>
          </div>
        ))}
      </div>

      {/* Teaser visual */}
      <div className="surface-card p-8 text-center">
        <Sigma className="w-10 h-10 mx-auto text-caution-500 mb-3" strokeWidth={1.5} />
        <p className="eyebrow mb-2">Binnenkort</p>
        <h2 className="text-lg font-semibold text-ink-900 dark:text-white tracking-tight mb-2">De off-piste toolkit</h2>
        <p className="text-sm text-ink-500 dark:text-ink-400 max-w-md mx-auto leading-relaxed">
          We bouwen hier de kwantitatieve tools uit. Blijf actief in de community om als eerste toegang te krijgen.
        </p>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/quant/QuantTrading.tsx
git commit -m "feat(quant): off-piste quant trading teaser page"
```

---

## Task 14: PaydayMountain component (extract + redesign)

**Files:**
- Create: `src/components/mission/PaydayMountain.tsx`
- Modify: `src/pages/mission/MissionStatement.tsx` (gebruik nieuw component; verwijder oude `SkiSlope`; voeg 5e traject-stap toe)

- [ ] **Step 1: PaydayMountain schrijven**

Gebruikt exact de canonieke SVG uit de spec, met twee dynamische delen: (a) de "ONTGRENDELEN"-pill toont enkel wanneer `'offpiste'` niet ontgrendeld is; (b) après-ski-groep en off-piste-groep zijn klikbaar.

```tsx
import React from 'react';
import type { UserLevel } from '../../types';

interface PaydayMountainProps {
  activeLevel: UserLevel;
  unlockedLevels: UserLevel[];
  onOpenCommunity?: () => void;
  onOpenQuant?: () => void;
}

export const PaydayMountain: React.FC<PaydayMountainProps> = ({
  unlockedLevels,
  onOpenCommunity,
  onOpenQuant,
}) => {
  const offpisteUnlocked = unlockedLevels.includes('offpiste');

  return (
    <div className="relative w-full rounded-xl overflow-hidden border border-[var(--line)]">
      <svg viewBox="0 0 800 420" className="w-full block" style={{ aspectRatio: '800 / 420', fontFamily: "'Inter Tight', Inter, sans-serif" }}>
        <defs>
          <linearGradient id="pm-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#EAF1FB" /><stop offset="1" stopColor="#F6F9FD" /></linearGradient>
          <linearGradient id="pm-far" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#C3D5EE" /><stop offset="1" stopColor="#DDE8F6" /></linearGradient>
          <linearGradient id="pm-mid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8FB1D9" /><stop offset="1" stopColor="#B9D0EA" /></linearGradient>
          <linearGradient id="pm-near" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5A8DC4" /><stop offset="1" stopColor="#88B0DA" /></linearGradient>
          <linearGradient id="pm-valley" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ECF3FC" /><stop offset="1" stopColor="#FCFDFF" /></linearGradient>
          <linearGradient id="pm-cabin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#DCE7F4" /></linearGradient>
          <radialGradient id="pm-glow" cx="0.5" cy="0.45" r="0.55"><stop offset="0" stopColor="#FFD37A" stopOpacity="0.95" /><stop offset="1" stopColor="#FFD37A" stopOpacity="0" /></radialGradient>
          <radialGradient id="pm-mogul" cx="0.4" cy="0.3" r="0.78"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#CBDDF1" /></radialGradient>
          <filter id="pm-soft" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="1.5" stdDeviation="1.6" floodColor="#0B1E36" floodOpacity="0.18" /></filter>
        </defs>

        <rect width="800" height="420" fill="url(#pm-sky)" />
        <circle cx="735" cy="58" r="34" fill="rgba(255,231,170,0.5)" /><circle cx="735" cy="58" r="15" fill="rgba(255,231,170,0.85)" />
        <path d="M0 240 L130 175 L250 215 L380 150 L520 200 L650 150 L800 188 L800 300 L0 300Z" fill="url(#pm-far)" opacity="0.65" />
        <path d="M0 285 L110 235 L230 275 L360 205 L470 255 L600 195 L720 240 L800 215 L800 320 L0 320Z" fill="url(#pm-mid)" opacity="0.85" />
        <path d="M0 332 L120 272 L250 212 L370 152 L495 92 L585 50 L660 76 L770 128 L800 148 L800 332Z" fill="url(#pm-near)" />
        <path d="M495 92 L585 50 L660 76 L636 92 L606 68 L578 90 L530 102Z" fill="#fff" />
        <path d="M584 60 Q512 138 432 198 Q352 256 300 318" fill="none" stroke="#fff" strokeWidth="16" strokeLinecap="round" opacity="0.45" />
        <path d="M584 60 Q512 138 432 198 Q352 256 300 318" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity="0.7" />
        <path d="M0 332 L800 332 L800 420 L0 420Z" fill="url(#pm-valley)" />
        <g fill="#0E4C92"><polygon points="22,376 14,394 30,394" /><polygon points="52,384 44,402 60,402" /><polygon points="10,390 4,404 16,404" /></g>

        {/* ski-lift base station */}
        <g transform="translate(48 360)" filter="url(#pm-soft)">
          <rect x="-22" y="0" width="44" height="26" rx="3" fill="#FFFFFF" stroke="#D8E1EC" />
          <polygon points="-26,0 0,-12 26,0" fill="#2F6CAE" />
          <rect x="-15" y="7" width="11" height="12" rx="1.5" fill="#CFE0F3" /><rect x="4" y="7" width="11" height="12" rx="1.5" fill="#CFE0F3" />
        </g>
        {/* towers */}
        <g stroke="#33425C" strokeWidth="2.4" strokeLinecap="round">
          <line x1="190" y1="288" x2="190" y2="332" /><line x1="178" y1="288" x2="202" y2="288" />
          <line x1="350" y1="208" x2="350" y2="300" /><line x1="338" y1="208" x2="362" y2="208" />
          <line x1="490" y1="132" x2="490" y2="240" /><line x1="478" y1="132" x2="502" y2="132" />
        </g>
        <g transform="translate(592 60)" filter="url(#pm-soft)"><rect x="-16" y="-6" width="32" height="18" rx="3" fill="#FFFFFF" stroke="#D8E1EC" /><polygon points="-19,-6 0,-15 19,-6" fill="#2F6CAE" /></g>
        <path id="pm-cable" d="M 56 350 Q 230 268 350 208 Q 470 148 588 58" fill="none" stroke="#33425C" strokeWidth="1.4" />
        {/* gondolas */}
        <g>
          <g id="pm-gondola">
            <rect x="-3" y="-2.6" width="6" height="3.2" rx="1.2" fill="#33425C" />
            <path d="M0 0.6 q3 4.4 0 7.4" stroke="#33425C" strokeWidth="1.3" fill="none" />
            <rect x="-9" y="7.5" width="18" height="13.5" rx="4" fill="url(#pm-cabin)" stroke="#9FB6D2" strokeWidth="0.7" filter="url(#pm-soft)" />
            <rect x="-6.5" y="10" width="13" height="6" rx="2" fill="#9FC4EA" />
            <rect x="-7.5" y="17.6" width="15" height="3" rx="1.5" fill="#0B4A8F" />
          </g>
          <animateMotion dur="22s" repeatCount="indefinite"><mpath href="#pm-cable" /></animateMotion>
        </g>
        <g><use href="#pm-gondola" /><animateMotion dur="22s" begin="-7.3s" repeatCount="indefinite"><mpath href="#pm-cable" /></animateMotion></g>
        <g><use href="#pm-gondola" /><animateMotion dur="22s" begin="-14.6s" repeatCount="indefinite"><mpath href="#pm-cable" /></animateMotion></g>

        {/* off-piste mogul corridor (clickable → quant) */}
        <g onClick={onOpenQuant} style={{ cursor: onOpenQuant ? 'pointer' : 'default' }}>
          <path d="M626 78 Q672 108 650 148 Q632 178 658 206 L630 206 Q606 174 624 146 Q646 108 602 82 Z" fill="#fff" opacity="0.26" />
          <g>
            <ellipse cx="630" cy="104" rx="13" ry="6" fill="url(#pm-mogul)" /><ellipse cx="652" cy="124" rx="14" ry="6.5" fill="url(#pm-mogul)" />
            <ellipse cx="632" cy="146" rx="13" ry="6" fill="url(#pm-mogul)" /><ellipse cx="652" cy="168" rx="14" ry="6.5" fill="url(#pm-mogul)" />
            <ellipse cx="636" cy="190" rx="13" ry="6" fill="url(#pm-mogul)" />
            <g fill="#9DB6D6" opacity="0.3"><ellipse cx="643" cy="115" rx="6.5" ry="2" /><ellipse cx="643" cy="157" rx="6.5" ry="2" /><ellipse cx="645" cy="179" rx="6.5" ry="2" /></g>
          </g>
          <path d="M630 92 Q662 110 634 130 Q608 150 650 174 Q672 190 638 202" fill="none" stroke="#9DB6D6" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="2 6" />
        </g>

        {/* uniform label pills */}
        <g fontSize="9.5" fontWeight="600" fill="#0F1E36">
          <g transform="translate(150 300)" filter="url(#pm-soft)"><rect x="-32" y="-9" width="64" height="18" rx="9" fill="#fff" stroke="#E3E8EF" /><circle cx="-19" cy="0" r="4.5" fill="#0F9D58" /><text x="6" y="3" textAnchor="middle">GROEN</text></g>
          <g transform="translate(300 224)" filter="url(#pm-soft)"><rect x="-32" y="-9" width="64" height="18" rx="9" fill="#fff" stroke="#E3E8EF" /><rect x="-23.5" y="-4.5" width="9" height="9" fill="#2F6CAE" /><text x="6" y="3" textAnchor="middle">BLAUW</text></g>
          <g transform="translate(431 164)" filter="url(#pm-soft)"><rect x="-30" y="-9" width="60" height="18" rx="9" fill="#fff" stroke="#E3E8EF" /><rect x="-20" y="-4.5" width="9" height="9" fill="#D14343" transform="rotate(45 -15.5 0)" /><text x="6" y="3" textAnchor="middle">ROOD</text></g>
          <g transform="translate(560 104)" filter="url(#pm-soft)"><rect x="-32" y="-9" width="64" height="18" rx="9" fill="#fff" stroke="#E3E8EF" /><g transform="translate(-21 0)"><rect x="-5" y="-3.5" width="6.5" height="6.5" fill="#0F1E36" transform="rotate(45 -1.75 0)" /><rect x="2" y="-3.5" width="6.5" height="6.5" fill="#0F1E36" transform="rotate(45 5.25 0)" /></g><text x="7" y="3" textAnchor="middle">ZWART</text></g>
          <g transform="translate(692 171)" filter="url(#pm-soft)" onClick={onOpenQuant} style={{ cursor: onOpenQuant ? 'pointer' : 'default' }}>
            <rect x="-52" y="-9" width="104" height="18" rx="9" fill="#fff" stroke="#F3D2B0" />
            <g transform="translate(-34 0)"><rect x="-5" y="-3.5" width="6.5" height="6.5" fill="#F08C2E" transform="rotate(45 -1.75 0)" /><rect x="2" y="-3.5" width="6.5" height="6.5" fill="#F08C2E" transform="rotate(45 5.25 0)" /></g>
            <text x="6" y="3" textAnchor="middle" fill="#9A3412">OFF-PISTE</text>
          </g>
          {!offpisteUnlocked && (
            <g transform="translate(692 184)" filter="url(#pm-soft)" onClick={onOpenQuant} style={{ cursor: onOpenQuant ? 'pointer' : 'default' }}>
              <rect x="-39" y="-7.5" width="78" height="15" rx="7.5" fill="#FFF7ED" stroke="#F08C2E" strokeWidth="0.9" />
              <text x="0" y="2.6" fontSize="7.6" fontWeight="700" fill="#9A3412" textAnchor="middle" letterSpacing="0.04em">ONTGRENDELEN</text>
            </g>
          )}
        </g>

        {/* après-ski bar = community (clickable) */}
        <g transform="translate(700 300)" onClick={onOpenCommunity} style={{ cursor: onOpenCommunity ? 'pointer' : 'default' }}>
          <ellipse cx="0" cy="58" rx="86" ry="9" fill="#0B4A8F" opacity="0.12" />
          <circle cx="0" cy="30" r="64" fill="url(#pm-glow)" />
          <g filter="url(#pm-soft)">
            <rect x="-50" y="20" width="100" height="40" rx="2.5" fill="#7A4E2A" />
            <polygon points="-58,20 0,-10 58,20" fill="#4A2F18" />
            <polygon points="-58,20 0,-10 58,20" fill="#fff" opacity="0.5" />
          </g>
          <rect x="-35" y="30" width="17" height="17" rx="1.5" fill="#FFD37A" /><rect x="18" y="30" width="17" height="17" rx="1.5" fill="#FFD37A" />
          <rect x="-7.5" y="34" width="15" height="26" rx="1.5" fill="#3A2410" />
          <rect x="33" y="-2" width="9" height="15" fill="#4A2F18" />
          <path d="M37.5 -4 q-6.5 -8 0 -14 q6.5 -6.5 0 -13" fill="none" stroke="#cfd8e3" strokeWidth="2.2" opacity="0.7" />
          <path d="M-55 16 Q0 7 55 16" fill="none" stroke="#C2410C" strokeWidth="1.1" />
          <circle cx="-35" cy="12.5" r="2.1" fill="#FFB347" /><circle cx="-13" cy="10" r="2.1" fill="#7AD1FF" /><circle cx="13" cy="10" r="2.1" fill="#FF8FA3" /><circle cx="35" cy="12.5" r="2.1" fill="#9DFFB0" />
          <g transform="translate(-58 38)"><rect x="-1.8" y="-35" width="3.4" height="47" rx="1.7" fill="#D14343" transform="rotate(14)" /><rect x="-1.8" y="-35" width="3.4" height="47" rx="1.7" fill="#2F6CAE" transform="rotate(-14)" /><ellipse cx="0" cy="13" rx="10" ry="3" fill="#fff" opacity="0.8" /></g>
          <g transform="translate(58 26)"><rect x="-6" y="0" width="13" height="38" rx="6.5" fill="#0F9D58" transform="rotate(12)" /></g>
          <g fill="#5A3A1E"><rect x="-25" y="58" width="10" height="6" rx="1" /><rect x="12" y="60" width="10" height="6" rx="1" /></g>
          <g transform="translate(0 76)" filter="url(#pm-soft)"><rect x="-72" y="-9" width="144" height="18" rx="9" fill="#fff" stroke="#E3E8EF" /><text y="3" fontSize="9.5" fontWeight="700" fill="#9A3412" textAnchor="middle">APRÈS-SKI · COMMUNITY</text></g>
        </g>
      </svg>
    </div>
  );
};
```

> **Noot:** JSX gebruikt camelCase SVG-attributen (`strokeWidth`, `floodColor`, `textAnchor`, `strokeDasharray`, `stopColor`). Behoud de id's met `pm-`-prefix om botsingen te vermijden.

- [ ] **Step 2: MissionStatement aanpassen**

In `src/pages/mission/MissionStatement.tsx`:
1. Verwijder de volledige `SkiSlope`-component-definitie (regels ~41-336).
2. Voeg import toe bovenaan: `import { PaydayMountain } from '../../components/mission/PaydayMountain';`
3. Voeg `useNavigate` toe (al geïmporteerd) — vervang de `<SkiSlope .../>` aanroep (regel ~631) door:

```tsx
        <PaydayMountain
          activeLevel={progress.currentLevel}
          unlockedLevels={progress.unlockedLevels}
          onOpenCommunity={() => handleNavigate('/community', 'Community')}
          onOpenQuant={() => handleNavigate('/quant', 'Quant trading')}
        />
```

4. In de "traject"-strip (regels ~571-576), voeg een 5e item toe aan de array:

```tsx
                  { level: 'offpiste'  as UserLevel, label: 'Off-piste', sub: 'Quant trading',    color: '#F08C2E', shape: 'double-diamond' as const },
```

En wijzig de grid van `grid-cols-4` naar `grid-cols-5` (regel ~570).

- [ ] **Step 3: Type-check + build**

Run: `npx tsc -b --noEmit`
Expected: PASS (geen ongebruikte `SkiSlope`/imports meer; verwijder ongebruikte lucide-imports die enkel door `SkiSlope` werden gebruikt indien tsc daarover klaagt).

- [ ] **Step 4: Commit**

```bash
git add src/components/mission/PaydayMountain.tsx src/pages/mission/MissionStatement.tsx
git commit -m "feat(mission): extract & redesign PaydayMountain with off-piste and après-ski"
```

---

## Task 15: Routes + page-exports

**Files:**
- Modify: `src/pages/index.ts`, `src/App.tsx`

- [ ] **Step 1: Exports toevoegen**

In `src/pages/index.ts`, voeg toe:

```ts
// Community
export { Community } from './community/Community';

// Quant
export { QuantTrading } from './quant/QuantTrading';
```

- [ ] **Step 2: Imports in App.tsx**

Voeg `Community` en `QuantTrading` toe aan de bestaande import uit `'./pages'` (regels 3-28).

- [ ] **Step 3: Routes toevoegen**

In `src/App.tsx`, voeg binnen de `<Route path="/" element={<Layout />}>`-groep (na regel 91, `mission`) toe:

```tsx
        <Route path="community" element={<Community />} />
        <Route path="quant" element={<FeatureGate feature="quant_trading"><QuantTrading /></FeatureGate>} />
```

- [ ] **Step 4: Type-check + build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.ts src/App.tsx
git commit -m "feat: routes for /community and /quant"
```

---

## Task 16: Sidebar-items

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Imports**

Voeg aan de lucide-import (regels 4-15) toe: `MessageSquare, Sigma`. Voeg toe aan de bestaande import van FeatureGate-helpers:

```tsx
import { FeatureLockIndicator } from '../features/FeatureGate';
```

- [ ] **Step 2: ROUTE_FEATURE_MAP**

Voeg toe aan `ROUTE_FEATURE_MAP` (regel ~22):

```ts
  '/quant': 'quant_trading',
```

- [ ] **Step 3: Community + Quant items**

Voeg in de "Primary"-sectie, ná de `/analytics`-NavLink (regel ~118), deze twee NavLinks toe. **Quant trading blijft altijd zichtbaar** met een slot-indicator (niet via `hasAccess` verbergen):

```tsx
        <NavLink
          to="/community"
          onClick={() => handleMenuClick('/community', t('sidebar.community'))}
          className={({ isActive }) => navClass(isActive, isCollapsed)}
          title={isCollapsed ? t('sidebar.community') : ''}
        >
          {({ isActive }) => (
            <>
              <ActiveBar active={isActive} />
              <MessageSquare className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
              {!isCollapsed && <span>{t('sidebar.community')}</span>}
            </>
          )}
        </NavLink>

        <NavLink
          to="/quant"
          onClick={() => handleMenuClick('/quant', t('sidebar.quantTrading'))}
          className={({ isActive }) => navClass(isActive, isCollapsed)}
          title={isCollapsed ? t('sidebar.quantTrading') : ''}
        >
          {({ isActive }) => (
            <>
              <ActiveBar active={isActive} />
              <Sigma className="w-[18px] h-[18px] flex-shrink-0" strokeWidth={1.75} />
              {!isCollapsed && (
                <span className="flex items-center gap-1.5">
                  {t('sidebar.quantTrading')}
                  <FeatureLockIndicator feature="quant_trading" />
                </span>
              )}
            </>
          )}
        </NavLink>
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: PASS (i18n-keys worden in Task 18 toegevoegd; `t()` faalt niet bij ontbrekende key, maar voeg ze toe vóór de visuele check).

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat(sidebar): add Community and Quant trading (locked) items"
```

---

## Task 17: Dashboard-widgets

**Files:**
- Create: `src/components/widgets/TradingIdeasWidget.tsx`, `src/components/widgets/CommunityWidget.tsx`
- Modify: `src/pages/dashboard/Dashboard.tsx`

- [ ] **Step 1: TradingIdeasWidget**

`src/components/widgets/TradingIdeasWidget.tsx`:

```tsx
import React from 'react';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectFeaturedTradeIdeas } from '../../store/slices/communitySlice';
import { TradeIdeaCard, LevelBadge, useTradeIdeaWizard } from '../community';

export const TradingIdeasWidget: React.FC = () => {
  const navigate = useNavigate();
  const ideas = useAppSelector(selectFeaturedTradeIdeas(2));
  const { launch, wizard } = useTradeIdeaWizard();

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center">
          <Lightbulb className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </div>
        <div>
          <p className="eyebrow">Markt</p>
          <h2 className="text-base font-semibold text-ink-900 dark:text-white tracking-tight">Trading ideas</h2>
        </div>
        <button onClick={() => navigate('/community')} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
          Bekijk alle <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-3">
        {ideas.map((post) => (
          <div key={post.id}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs text-ink-500">{post.author.name}</span>
              <LevelBadge level={post.author.level} className="ml-auto" />
            </div>
            <TradeIdeaCard idea={post.tradeIdea!} onPlaceTrade={launch} />
          </div>
        ))}
        {ideas.length === 0 && <p className="text-sm text-ink-400">Nog geen trading ideas.</p>}
      </div>
      {wizard}
    </div>
  );
};
```

- [ ] **Step 2: CommunityWidget**

`src/components/widgets/CommunityWidget.tsx`:

```tsx
import React from 'react';
import { MessageSquare, ArrowRight, ThumbsUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectRecentPosts } from '../../store/slices/communitySlice';

export const CommunityWidget: React.FC = () => {
  const navigate = useNavigate();
  const posts = useAppSelector(selectRecentPosts(4));

  return (
    <div className="surface-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-md bg-primary-50 text-primary-700 flex items-center justify-center">
          <MessageSquare className="w-[18px] h-[18px]" strokeWidth={1.75} />
        </div>
        <div>
          <p className="eyebrow">Gesprekken</p>
          <h2 className="text-base font-semibold text-ink-900 dark:text-white tracking-tight">Community</h2>
        </div>
        <button onClick={() => navigate('/community')} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary-700">
          Naar de community <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="divide-y divide-[var(--line-soft)]">
        {posts.map((post) => (
          <div key={post.id} className="flex gap-2.5 py-2.5 first:pt-0">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0" style={{ background: post.author.color }}>
              {post.author.initials}
            </div>
            <div className="min-w-0">
              <span className="font-semibold text-xs text-ink-900 dark:text-white">{post.author.name}</span>
              <p className="text-xs text-ink-600 dark:text-ink-300 leading-snug truncate">{post.text}</p>
              <div className="text-[10px] text-ink-400 mt-0.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{post.likes}</span>
                <span className="inline-flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.replies.length}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Dashboard integreren**

In `src/pages/dashboard/Dashboard.tsx`:
1. Imports toevoegen:

```tsx
import { TradingIdeasWidget } from '../../components/widgets/TradingIdeasWidget';
import { CommunityWidget } from '../../components/widgets/CommunityWidget';
```

2. Vóór het sluiten van het `hasPortfolios &&`-fragment (na de alerts/opportunities/events-`div`, regel ~316), voeg toe:

```tsx
          {/* Community & Trading ideas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TradingIdeasWidget />
            <CommunityWidget />
          </div>
```

- [ ] **Step 4: Type-check + build**

Run: `npx tsc -b --noEmit && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/widgets/TradingIdeasWidget.tsx src/components/widgets/CommunityWidget.tsx src/pages/dashboard/Dashboard.tsx
git commit -m "feat(dashboard): add Trading ideas and Community widgets"
```

---

## Task 18: i18n-strings

**Files:**
- Modify: `src/i18n/locales/nl.ts`, `src/i18n/locales/en.ts`, `src/i18n/locales/fr.ts`

- [ ] **Step 1: NL**

In `src/i18n/locales/nl.ts`, voeg in het `sidebar`-object (na `account: 'Account',`, regel ~62) toe:

```ts
    community: 'Community',
    quantTrading: 'Quant trading',
```

- [ ] **Step 2: EN**

In `src/i18n/locales/en.ts`, in het `sidebar`-object:

```ts
    community: 'Community',
    quantTrading: 'Quant trading',
```

- [ ] **Step 3: FR**

In `src/i18n/locales/fr.ts`, in het `sidebar`-object:

```ts
    community: 'Communauté',
    quantTrading: 'Trading quant',
```

- [ ] **Step 4: Type-check**

Run: `npx tsc -b --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales/nl.ts src/i18n/locales/en.ts src/i18n/locales/fr.ts
git commit -m "feat(i18n): community and quant trading sidebar strings"
```

---

## Task 19: Volledige verificatie

**Files:** geen (verificatie).

- [ ] **Step 1: Lint + tests + build**

Run: `npm run lint && npm run test && npm run build`
Expected: alles PASS. Los eventuele lint/tsc-fouten op (let op exhaustiveness-switches over `UserLevel`/`FeatureId` die de nieuwe waarden mogelijk niet afhandelen — voeg ontbrekende takken toe).

- [ ] **Step 2: Visuele controle (Playwright MCP)**

Start de dev-server (`npm run dev`) en controleer met Playwright MCP:
- **Dashboard**: onderaan twee widgets (Trading ideas + Community), stijl consistent met andere widgets, geen après-ski-branding.
- **/community**: hero, kanaaltabs (Off-piste·Quant met slot), composer, feed met TSLA-idea (juice-meter + "Leg deze trade in"). Klik "Leg deze trade in" → PutOptionWizard opent voorgevuld op TSLA (vereist minstens 1 portefeuille).
- **/quant**: zonder unlock → FeatureGate locked-scherm; na unlock (via /mission) → teaser-pagina.
- **/mission**: herwerkte berg (gondels vanaf de voet, off-piste mogul-corridor + ONTGRENDELEN-pill, après-ski bar). Klik op de bar → /community; klik op de off-piste → /quant. Traject-strip toont 5 stappen incl. Off-piste.
- **Sidebar**: Community altijd zichtbaar; Quant trading zichtbaar met slotje zolang vergrendeld.

- [ ] **Step 3: Functionele controle**

- Een post plaatsen in /community → verschijnt bovenaan; credits stijgen (controleer op /mission het credits-aantal).
- Bij ≥100 credits is Off-piste te ontgrendelen op /mission; daarna verdwijnt de ONTGRENDELEN-pill op de berg en is /quant + het Quant-kanaal toegankelijk en het sidebar-slotje weg.

- [ ] **Step 4: Finale commit (indien fixes)**

```bash
git add -A
git commit -m "fix: address lint/build/visual issues for community & off-piste"
```

---

## Self-review (uitgevoerd)

**Spec-dekking:** §3.1 types → T1; §3.2 slice → T3; §3.3 credits → T6; §3.4 levels → T5; §4 berg → T14; §5 community-pagina/componenten → T8-T12; §5.1 wizard → T9; §6 quant → T13; §7 dashboard → T17; §8 sidebar/routes → T15/T16; §9 i18n → T18; §10 seed → T2; §12 verificatie → T19. Alle secties gedekt.

**Placeholders:** geen TBD/TODO; alle code-stappen bevatten volledige code.

**Type-consistentie:** `addPost`/`addReply`/`toggleLike`, selectors (`selectPostsByChannel`, `selectRecentPosts`, `selectFeaturedTradeIdeas`), thunks (`submitPost`/`submitReply`), `COMMUNITY_POST_CREDITS`/`COMMUNITY_REPLY_CREDITS`, `PaydayMountain`-props en `TradeIdea`-velden zijn consistent gebruikt over taken heen.
