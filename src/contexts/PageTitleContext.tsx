import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface PageTitleContextType {
  pageTitle: string;
  pageDescription: string;
  setPageTitle: (title: string, description?: string) => void;
  showInfoIcon: boolean;
  isInfoActive: boolean;
  onInfoClick: (() => void) | null;
  setInfoIcon: (show: boolean, isActive: boolean, onClick: (() => void) | null) => void;
  showWarningIcon: boolean;
  isWarningActive: boolean;
  onWarningClick: (() => void) | null;
  setWarningIcon: (show: boolean, isActive: boolean, onClick: (() => void) | null) => void;
  titleIcon: string | null;
  setTitleIcon: (iconUrl: string | null) => void;
}

const PageTitleContext = createContext<PageTitleContextType | undefined>(undefined);

export const PageTitleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pageTitle, setTitle] = useState('');
  const [pageDescription, setDescription] = useState('');
  const [showInfoIcon, setShowInfoIcon] = useState(false);
  const [isInfoActive, setIsInfoActive] = useState(false);
  const [onInfoClick, setOnInfoClick] = useState<(() => void) | null>(null);
  const [showWarningIcon, setShowWarningIcon] = useState(false);
  const [isWarningActive, setIsWarningActive] = useState(false);
  const [onWarningClick, setOnWarningClick] = useState<(() => void) | null>(null);
  const [titleIcon, setIcon] = useState<string | null>(null);

  const setPageTitle = (title: string, description: string = '') => {
    setTitle(title);
    setDescription(description);
  };

  const setInfoIcon = (show: boolean, isActive: boolean, onClick: (() => void) | null) => {
    setShowInfoIcon(show);
    setIsInfoActive(isActive);
    setOnInfoClick(() => onClick);
  };

  const setWarningIcon = (show: boolean, isActive: boolean, onClick: (() => void) | null) => {
    setShowWarningIcon(show);
    setIsWarningActive(isActive);
    setOnWarningClick(() => onClick);
  };

  const setTitleIcon = (iconUrl: string | null) => {
    setIcon(iconUrl);
  };

  return (
    <PageTitleContext.Provider
      value={{
        pageTitle,
        pageDescription,
        setPageTitle,
        showInfoIcon,
        isInfoActive,
        onInfoClick,
        setInfoIcon,
        showWarningIcon,
        isWarningActive,
        onWarningClick,
        setWarningIcon,
        titleIcon,
        setTitleIcon,
      }}
    >
      {children}
    </PageTitleContext.Provider>
  );
};

export const usePageTitle = () => {
  const context = useContext(PageTitleContext);
  if (!context) {
    throw new Error('usePageTitle must be used within a PageTitleProvider');
  }
  return context;
};
