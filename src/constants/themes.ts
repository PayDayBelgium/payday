export type ThemeColor = 'blue' | 'green' | 'purple' | 'red' | 'orange';

export interface ThemeConfig {
  id: ThemeColor;
  name: string;
  primary: string;
  primaryHover: string;
  primaryLight: string;
  primaryDark: string;
}

export const THEMES: Record<ThemeColor, ThemeConfig> = {
  blue: {
    id: 'blue',
    name: 'Institutional Blue',
    primary: '#0B4A8F',       // institutional anchor
    primaryHover: '#082C56',  // deeper on hover
    primaryLight: '#2F6CAE',  // sky accent
    primaryDark: '#051A33',   // very dark
  },
  green: {
    id: 'green',
    name: 'Forest Green',
    primary: 'rgb(20, 83, 45)', // green-900
    primaryHover: 'rgb(5, 46, 22)', // green-950
    primaryLight: 'rgb(34, 197, 94)', // green-500
    primaryDark: 'rgb(21, 128, 61)', // green-700
  },
  purple: {
    id: 'purple',
    name: 'Royal Purple',
    primary: 'rgb(88, 28, 135)', // purple-900
    primaryHover: 'rgb(59, 7, 100)', // purple-950
    primaryLight: 'rgb(168, 85, 247)', // purple-500
    primaryDark: 'rgb(126, 34, 206)', // purple-700
  },
  red: {
    id: 'red',
    name: 'Crimson Red',
    primary: 'rgb(127, 29, 29)', // red-900
    primaryHover: 'rgb(69, 10, 10)', // red-950
    primaryLight: 'rgb(239, 68, 68)', // red-500
    primaryDark: 'rgb(185, 28, 28)', // red-700
  },
  orange: {
    id: 'orange',
    name: 'Sunset Orange',
    primary: 'rgb(154, 52, 18)', // orange-900
    primaryHover: 'rgb(67, 20, 7)', // orange-950
    primaryLight: 'rgb(249, 115, 22)', // orange-500
    primaryDark: 'rgb(194, 65, 12)', // orange-700
  },
};

/**
 * Apply theme colors to the document
 */
export const applyTheme = (theme: ThemeColor) => {
  const themeConfig = THEMES[theme];
  document.documentElement.style.setProperty('--color-primary', themeConfig.primary);
  document.documentElement.style.setProperty('--color-primary-hover', themeConfig.primaryHover);
  document.documentElement.style.setProperty('--color-primary-light', themeConfig.primaryLight);
  document.documentElement.style.setProperty('--color-primary-dark', themeConfig.primaryDark);

  // Save to localStorage
  localStorage.setItem('payday-theme', theme);
};

/**
 * Get saved theme or default to blue
 */
export const getSavedTheme = (): ThemeColor => {
  const saved = localStorage.getItem('payday-theme') as ThemeColor;
  return saved && THEMES[saved] ? saved : 'blue';
};
