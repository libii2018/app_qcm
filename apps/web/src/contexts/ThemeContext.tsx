import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem('theme');
  return stored as Theme | null;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');

  // Charger le thème au montage
  useEffect(() => {
    const storedTheme = getStoredTheme();
    const actualTheme = storedTheme || 'system';
    setTheme(actualTheme);
  }, []);

  // Appliquer le thème
  useEffect(() => {
    const actualTheme = theme === 'system' ? getSystemTheme() : theme;
    
    // Stocker dans localStorage
    if (theme !== 'system') {
      localStorage.setItem('theme', theme);
    } else {
      localStorage.removeItem('theme');
    }

    // Appliquer la classe au body
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(actualTheme);
  }, [theme]);

  // Écouter les changements de thème système
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      function handleChange(e: MediaQueryListEvent) {
        document.body.classList.remove('light', 'dark');
        document.body.classList.add(e.matches ? 'dark' : 'light');
      }

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const isDark = theme === 'dark' || (theme === 'system' && getSystemTheme() === 'dark');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme doit être utilisé dans un ThemeProvider');
  }
  return context;
}
