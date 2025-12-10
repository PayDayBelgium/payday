import { createSlice } from '@reduxjs/toolkit';

interface AdminAuthState {
  isAuthenticated: boolean;
  username: string | null;
}

const initialState: AdminAuthState = {
  isAuthenticated: false,
  username: null,
};

const adminAuthSlice = createSlice({
  name: 'adminAuth',
  initialState,
  reducers: {
    loginAdmin: (state, action) => {
      state.isAuthenticated = true;
      state.username = action.payload;
    },
    logoutAdmin: (state) => {
      state.isAuthenticated = false;
      state.username = null;
    },
  },
});

export const { loginAdmin, logoutAdmin } = adminAuthSlice.actions;
export default adminAuthSlice.reducer;
