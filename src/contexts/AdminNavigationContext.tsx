import React, { createContext, useContext, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavigationEntry {
  path: string;
  title?: string;
}

interface AdminNavigationContextType {
  navigationStack: NavigationEntry[];
  canGoBack: boolean;
  goBack: () => void;
  pushNavigation: (path: string, title?: string) => void;
  clearNavigation: () => void;
  pageTitle?: string;
  pageDescription?: string;
  setPageTitle: (title: string, description?: string) => void;
}

const AdminNavigationContext = createContext<AdminNavigationContextType | undefined>(undefined);

export const useAdminNavigation = () => {
  const context = useContext(AdminNavigationContext);
  if (!context) {
    throw new Error('useAdminNavigation must be used within AdminNavigationProvider');
  }
  return context;
};

interface AdminNavigationProviderProps {
  children: React.ReactNode;
}

export const AdminNavigationProvider: React.FC<AdminNavigationProviderProps> = ({ children }) => {
  const navigate = useNavigate();
  const [navigationStack, setNavigationStack] = useState<NavigationEntry[]>([]);
  const [pageTitle, setPageTitleState] = useState<string | undefined>();
  const [pageDescription, setPageDescriptionState] = useState<string | undefined>();

  // Push new navigation entry
  const pushNavigation = useCallback((path: string, title?: string) => {
    setNavigationStack((prev) => {
      // Don't add duplicate of current path
      if (prev.length > 0 && prev[prev.length - 1].path === path) {
        return prev;
      }
      return [...prev, { path, title }];
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
    }
  }, [navigationStack, navigate]);

  // Clear navigation stack
  const clearNavigation = useCallback(() => {
    setNavigationStack([]);
  }, []);

  // Set page title and description
  const setPageTitle = useCallback((title: string, description?: string) => {
    setPageTitleState(title);
    setPageDescriptionState(description);
  }, []);

  const canGoBack = navigationStack.length > 1;

  const value: AdminNavigationContextType = {
    navigationStack,
    canGoBack,
    goBack,
    pushNavigation,
    clearNavigation,
    pageTitle,
    pageDescription,
    setPageTitle,
  };

  return (
    <AdminNavigationContext.Provider value={value}>{children}</AdminNavigationContext.Provider>
  );
};
