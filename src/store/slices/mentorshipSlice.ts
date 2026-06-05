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
