import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import type { CommunityPost, CommunityReply, CommunityChannel } from '../../types';
import { COMMUNITY_SEED } from '../../data/communitySeed';

// Credits earned through community participation (bridge to the Off-piste unlock).
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
