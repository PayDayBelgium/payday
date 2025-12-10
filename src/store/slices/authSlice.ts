import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

export type NationalityType = 'BE' | 'NL' | 'FR' | 'DE' | 'US' | 'UK' | 'OTHER';

interface AuthState {
  isAuthenticated: boolean;
  user: string | null;
  nationality: NationalityType | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  nationality: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = true;
      state.user = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.nationality = null;
    },
    setNationality: (state, action: PayloadAction<NationalityType>) => {
      state.nationality = action.payload;
    },
  },
});

export const { login, logout, setNationality } = authSlice.actions;

export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectUser = (state: RootState) => state.auth.user;
export const selectNationality = (state: RootState) => state.auth.nationality;

export default authSlice.reducer;
