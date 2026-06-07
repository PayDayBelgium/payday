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
import eventsReducer from './events/eventsSlice';
import { tickerPriceMiddleware } from './middleware/tickerPriceMiddleware';
import { positionValueMiddleware } from './middleware/positionValueMiddleware';
import { createEventStore } from './events/eventStore';
import { createEventPersistenceMiddleware } from './events/eventPersistenceMiddleware';
import { setActor } from './events/eventsSlice';

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
  events: eventsReducer,
});

// Create store factory to support per-user persistence
export const createAppStore = (username?: string) => {
  const eventStore = createEventStore(username);
  // Persist config with user-specific key
  const persistConfig = {
    key: username ? `payday-${username}` : 'payday-root',
    storage,
    whitelist: [
      'auth',
      'adminAuth',
      'portfolios',
      'rules',
      'journal',
      'todos',
      'tickers',
      'strategies',
      'wheels',
      'userProgress',
      'community',
      'mentorship',
    ], // Persist auth and adminAuth to remember sessions
    // blacklist: ['alerts', 'ibConnection'], // Don't persist these
    version: 2,
    // v2 (event-sourcing): `positions` and `trades` were removed from the whitelist —
    // they are rebuilt from the IndexedDB event log on boot, not from redux-persist.
    // The legacy v1 positions blob is therefore ignored (clean start). The guard below
    // is now effectively dead (state.positions is never rehydrated) but kept harmless.
    migrate: (state: any) => {
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
          ignoredActions: [
            'persist/PERSIST',
            'persist/REHYDRATE',
            'events/appendEvents',
            'events/replayEvents',
          ],
          ignoredPaths: ['register', 'rehydrate'],
        },
      }).concat(
        tickerPriceMiddleware,
        positionValueMiddleware,
        createEventPersistenceMiddleware(eventStore)
      ),
  });

  const persistor = persistStore(store);
  store.dispatch(setActor(username ?? 'local'));

  return { store, persistor, eventStore };
};

// The runtime store is created per user in main.tsx and injected where needed
// (see initializeWebSocketService / initializeIBWebSocketService). There is no
// module-level singleton: that previously caused reads/dispatches against an empty
// default store. Types are derived from the factory's return type instead.
export type AppStore = ReturnType<typeof createAppStore>['store'];
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
