import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavigationEntry {
  path: string;
  title?: string;
  fromMenu?: boolean; // True if navigation came from sidebar menu
}

interface NavigationContextType {
  navigationStack: NavigationEntry[];
  canGoBack: boolean;
  goBack: () => void;
  pushNavigation: (path: string, title?: string, fromMenu?: boolean) => void;
  clearNavigation: () => void;
  setMenuNavigation: (path: string, title?: string) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }
  return context;
};

interface NavigationProviderProps {
  children: React.ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [navigationStack, setNavigationStack] = useState<NavigationEntry[]>([]);
  const [lastMenuPath, setLastMenuPath] = useState<string>('/');

  // Set menu navigation (from sidebar clicks)
  const setMenuNavigation = useCallback((path: string, title?: string) => {
    setLastMenuPath(path);
    setNavigationStack([{ path, title, fromMenu: true }]);
  }, []);

  // Push new navigation entry
  const pushNavigation = useCallback((path: string, title?: string, fromMenu: boolean = false) => {
    setNavigationStack((prev) => {
      // Don't add duplicate of current path
      if (prev.length > 0 && prev[prev.length - 1].path === path) {
        return prev;
      }

      // If this is a menu navigation, clear stack and start fresh
      if (fromMenu) {
        setLastMenuPath(path);
        return [{ path, title, fromMenu: true }];
      }

      // Otherwise add to stack
      return [...prev, { path, title, fromMenu: false }];
    });
  }, []);

  // Go back in navigation
  const goBack = useCallback(() => {
    if (navigationStack.length > 1) {
      // Remove current page
      const newStack = navigationStack.slice(0, -1);
      const previousPage = newStack[newStack.length - 1];

      setNavigationStack(newStack);
      navigate(previousPage.path);
    } else if (navigationStack.length === 1) {
      // If we're at the last page in stack, go to last menu item
      navigate(lastMenuPath);
    }
  }, [navigationStack, navigate, lastMenuPath]);

  // Clear navigation stack
  const clearNavigation = useCallback(() => {
    setNavigationStack([]);
  }, []);

  const canGoBack =
    navigationStack.length > 1 || (navigationStack.length === 1 && !navigationStack[0].fromMenu);

  const value: NavigationContextType = {
    navigationStack,
    canGoBack,
    goBack,
    pushNavigation,
    clearNavigation,
    setMenuNavigation,
  };

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
};
