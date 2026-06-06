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
    const tradeIdea: TradeIdea = {
      ticker: 'TSLA',
      strategy: 'cash_secured_puts',
      expiry: '2026-06-21',
      ivRank: 70,
    };
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
