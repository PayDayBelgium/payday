import type { Dispatch } from '@reduxjs/toolkit';
import type { MentorshipFocus, MentorStyle, UserLevel } from '../../types';
import { submitRequest } from '../slices/mentorshipSlice';

// Deterministic id helper (consistent with communityActions).
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
