import type { Dispatch } from '@reduxjs/toolkit';
import type { CommunityAuthor, CommunityChannel, TradeIdea } from '../../types';
import {
  addPost,
  addReply,
  COMMUNITY_POST_CREDITS,
  COMMUNITY_REPLY_CREDITS,
} from '../slices/communitySlice';
import { addCredits } from '../slices/userProgressSlice';

// Deterministic id helper (no Date.now needed in reducers/seed for tests).
const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export const submitPost =
  (args: {
    author: CommunityAuthor;
    channel: CommunityChannel;
    text: string;
    tradeIdea?: TradeIdea;
  }) =>
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
  (args: { postId: string; author: CommunityAuthor; text: string }) => (dispatch: Dispatch) => {
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
