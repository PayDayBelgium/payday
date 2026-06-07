import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { createAppStore } from './store';
import { ToastProvider } from './contexts/ToastContext';
import { initializeWebSocketService } from './services/priceWebSocketService';
import { initializeIBWebSocketService } from './services/ibWebSocketService';
import { bootstrapFromEventStore } from './store/events/bootstrap';
import './i18n/config'; // Initialize i18n
import { getSavedTheme, applyTheme } from './constants/themes';
import './index.css';
import App from './App.tsx';

// Apply saved theme on startup
const savedTheme = getSavedTheme();
applyTheme(savedTheme);

// Get current username from localStorage to load user-specific store
const getCurrentUsername = (): string | undefined => {
  // Check the dedicated current-user key
  const currentUser = localStorage.getItem('payday-current-user');

  // If no current user, we're logged out - return undefined
  // This will load the default store with no user data
  return currentUser || undefined;
};

const username = getCurrentUsername();
const { store, persistor, eventStore } = createAppStore(username);

// Initialize WebSocket services with store reference
initializeWebSocketService(store);
initializeIBWebSocketService(store);

async function bootstrap() {
  // Rebuild financial projections from the persisted event log before render.
  await bootstrapFromEventStore(store, eventStore);

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ToastProvider>
            <App />
          </ToastProvider>
        </PersistGate>
      </Provider>
    </StrictMode>
  );
}

void bootstrap();
