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
