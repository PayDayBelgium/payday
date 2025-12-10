import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { PageTitleProvider, usePageTitle } from '../../contexts/PageTitleContext';
import { NavigationProvider } from '../../contexts/NavigationContext';

const LayoutContent: React.FC = () => {
  const { pageTitle, pageDescription, showInfoIcon, isInfoActive, onInfoClick, showWarningIcon, isWarningActive, onWarningClick, titleIcon } = usePageTitle();
  const [isDarkMode, setIsDarkMode] = useState(() => {
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
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-900">
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
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebar}
      />
      <main className={`flex-1 ${isSidebarCollapsed ? 'ml-16' : 'ml-64'} mt-16 p-6 bg-gray-50 dark:bg-slate-900 transition-all duration-300`}>
        <Outlet />
      </main>
    </div>
  );
};

export const Layout: React.FC = () => {
  return (
    <PageTitleProvider>
      <NavigationProvider>
        <LayoutContent />
      </NavigationProvider>
    </PageTitleProvider>
  );
};
