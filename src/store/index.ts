import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // localStorage
import { combineReducers } from '@reduxjs/toolkit';
import positionsReducer from './slices/positionsSlice';
import tradesReducer from './slices/tradesSlice';
import portfoliosReducer from './slices/portfoliosSlice';
import alertsReducer from './slices/alertsSlice';
import rulesReducer from './slices/rulesSlice';
import ibConnectionReducer from './slices/ibConnectionSlice';
import authReducer from './slices/authSlice';
import journalReducer from './slices/journalSlice';
import todosReducer from './slices/todosSlice';
import adminAuthReducer from './slices/adminAuthSlice';
import tickersReducer from './slices/tickersSlice';
import strategiesReducer from './slices/strategiesSlice';
import wheelsReducer from './slices/wheelsSlice';
import connectivityReducer from './slices/connectivitySlice';
import userProgressReducer from './slices/userProgressSlice';
import communityReducer from './slices/communitySlice';
import mentorshipReducer from './slices/mentorshipSlice';
import { tickerPriceMiddleware } from './middleware/tickerPriceMiddleware';
import { tradeMiddleware } from './middleware/tradeMiddleware';
import { positionValueMiddleware } from './middleware/positionValueMiddleware';

// Combine all reducers
const rootReducer = combineReducers({
  auth: authReducer,
  adminAuth: adminAuthReducer,
  positions: positionsReducer,
  trades: tradesReducer,
  portfolios: portfoliosReducer,
  alerts: alertsReducer,
  rules: rulesReducer,
  ibConnection: ibConnectionReducer,
  journal: journalReducer,
  todos: todosReducer,
  tickers: tickersReducer,
  strategies: strategiesReducer,
  wheels: wheelsReducer,
  connectivity: connectivityReducer,
  userProgress: userProgressReducer,
  community: communityReducer,
  mentorship: mentorshipReducer,
});

// Create store factory to support per-user persistence
export const createAppStore = (username?: string) => {
  // Persist config with user-specific key
  const persistConfig = {
    key: username ? `payday-${username}` : 'payday-root',
    storage,
    whitelist: ['auth', 'adminAuth', 'portfolios', 'positions', 'trades', 'rules', 'journal', 'todos', 'tickers', 'strategies', 'wheels', 'userProgress', 'community', 'mentorship'], // Persist auth and adminAuth to remember sessions
    // blacklist: ['alerts', 'ibConnection'], // Don't persist these
    version: 1,
    migrate: (state: any) => {
      // Migration: ensure positions slice has priceAlertRules and priceAlerts arrays
      if (state && state.positions) {
        if (!state.positions.priceAlertRules) {
          state.positions.priceAlertRules = [];
        }
        if (!state.positions.priceAlerts) {
          state.positions.priceAlerts = [];
        }
      }
      return Promise.resolve(state);
    },
  };

  const persistedReducer = persistReducer(persistConfig, rootReducer);

  const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these action types and paths for redux-persist
          ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'positions/addPosition', 'trades/addTrade'],
          ignoredPaths: ['register', 'rehydrate'],
        },
      }).concat(tickerPriceMiddleware, tradeMiddleware, positionValueMiddleware),
  });

  const persistor = persistStore(store);

  return { store, persistor };
};

// Create default store instance
const { store, persistor } = createAppStore();

export { store, persistor };
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
