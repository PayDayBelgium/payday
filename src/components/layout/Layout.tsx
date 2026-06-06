import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageTitleProvider, usePageTitle } from '../../contexts/PageTitleContext';
import { NavigationProvider } from '../../contexts/NavigationContext';
import { OnboardingWizard, shouldShowWizard } from '../onboarding/OnboardingWizard';
import { useAppSelector } from '../../hooks/useAppSelector';
import { selectCurrentLevel } from '../../store/slices/userProgressSlice';
import type { UserLevel } from '../../types';
import { AIAssistantProvider } from '../../contexts/AIAssistantContext';
import { AIAssistantFab } from '../ai/AIAssistantFab';

const LayoutContent: React.FC = () => {
  const {
    pageTitle,
    pageDescription,
    showInfoIcon,
    isInfoActive,
    onInfoClick,
    showWarningIcon,
    isWarningActive,
    onWarningClick,
    titleIcon,
  } = usePageTitle();
  const currentLevel = useAppSelector(selectCurrentLevel);

  const [isDarkMode] = useState(() => {
    // Check localStorage or system preference
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return saved === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    // Check localStorage for sidebar state
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  // Onboarding wizard state
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardLevel, setWizardLevel] = useState<UserLevel>(currentLevel);
  const [lastShownLevel, setLastShownLevel] = useState<UserLevel | null>(() => {
    const saved = localStorage.getItem('wizard-last-shown-level');
    return saved as UserLevel | null;
  });

  // Show wizard on first visit or when level changes
  useEffect(() => {
    // Check if we should show the wizard for the current level
    if (shouldShowWizard(currentLevel) && currentLevel !== lastShownLevel) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        setWizardLevel(currentLevel);
        setWizardOpen(true);
        setLastShownLevel(currentLevel);
        localStorage.setItem('wizard-last-shown-level', currentLevel);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentLevel, lastShownLevel]);

  const handleWizardClose = () => {
    setWizardOpen(false);
  };

  const handleWizardComplete = () => {
    setWizardOpen(false);
  };

  useEffect(() => {
    // Update document class and save preference
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', String(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    // Save sidebar state
    localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="flex min-h-screen bg-surface dark:bg-trading-dark-900">
      <Header
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
        showInfoIcon={showInfoIcon}
        isInfoActive={isInfoActive}
        onInfoClick={onInfoClick || undefined}
        showWarningIcon={showWarningIcon}
        isWarningActive={isWarningActive}
        onWarningClick={onWarningClick || undefined}
        titleIcon={titleIcon || undefined}
      />
      <Sidebar isCollapsed={isSidebarCollapsed} onToggleCollapse={toggleSidebar} />
      <main
        className={`flex-1 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'} mt-16 p-6 bg-surface dark:bg-trading-dark-900 transition-all duration-300`}
      >
        <Outlet />
      </main>

      {/* Onboarding Wizard - shows on first visit and level unlock */}
      <OnboardingWizard
        level={wizardLevel}
        isOpen={wizardOpen}
        onClose={handleWizardClose}
        onComplete={handleWizardComplete}
      />
      <AIAssistantFab />
    </div>
  );
};

export const Layout: React.FC = () => {
  return (
    <PageTitleProvider>
      <NavigationProvider>
        <AIAssistantProvider>
          <LayoutContent />
        </AIAssistantProvider>
      </NavigationProvider>
    </PageTitleProvider>
  );
};
