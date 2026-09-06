// theme/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { themes, THEME_ORDER, type ThemeName, type ThemeColors } from './colors';

const STORAGE_KEY = 'app-theme';

interface ThemeContextValue {
  themeName: ThemeName;
  colors: ThemeColors;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeName] = useState<ThemeName>('light');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'light' || saved === 'dark' || saved === 'pink') {
          setThemeName(saved);
        }
      })
      .catch(() => {});
  }, []);

  function cycleTheme() {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(themeName) + 1) % THEME_ORDER.length];
    setThemeName(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }

  return (
    <ThemeContext.Provider value={{ themeName, colors: themes[themeName], cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
