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
