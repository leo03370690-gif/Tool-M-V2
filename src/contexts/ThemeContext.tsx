import React, { createContext, useContext, useEffect } from 'react';
import { usePersistentState } from '../lib/usePersistentState';

export type Theme = 'default' | 'ocean' | 'forest' | 'sunset' | 'royal' | 'rose' | 'amber' | 'cyan' | 'slate';
export type SidebarStyle = 'light' | 'dark' | 'colored';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  sidebarStyle: SidebarStyle;
  setSidebarStyle: (style: SidebarStyle) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const ALL_THEMES: Theme[] = ['default', 'ocean', 'forest', 'sunset', 'royal', 'rose', 'amber', 'cyan', 'slate'];
const ALL_SIDEBAR: SidebarStyle[] = ['light', 'dark', 'colored'];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = usePersistentState<Theme>('app_theme', 'default');
  const [sidebarStyle, setSidebarStyle] = usePersistentState<SidebarStyle>('app_sidebar_style', 'light');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...ALL_THEMES.filter(t => t !== 'default').map(t => `theme-${t}`));
    if (theme !== 'default') root.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove(...ALL_SIDEBAR.filter(s => s !== 'light').map(s => `sidebar-${s}`));
    if (sidebarStyle !== 'light') root.classList.add(`sidebar-${sidebarStyle}`);
  }, [sidebarStyle]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, sidebarStyle, setSidebarStyle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}
