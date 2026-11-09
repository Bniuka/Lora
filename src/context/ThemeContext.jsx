import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';

const ThemeContext = createContext({
  theme: 'light',           // resolved active theme: 'light' | 'dark'
  themeMode: 'auto',        // user choice: 'auto' | 'light' | 'dark'
  resolvedTheme: 'light',   // alias for theme
  isDark: false,
  isAuto: true,
  systemTheme: 'light',     // current OS preference: 'light' | 'dark'
  toggleTheme: () => {},
  cycleTheme: () => {},
  setTheme: () => {},
  setThemeMode: () => {},
});

const THEME_STORAGE_KEY = 'lora_theme';

const getSystemPrefersDark = () => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export function ThemeProvider({ children }) {
  // Read saved preference from localStorage ('auto' | 'light' | 'dark')
  // Default to 'auto' so it seamlessly auto-selects based on device/system preference
  const [themeMode, setThemeModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light' || saved === 'auto') {
        return saved;
      }
      return 'auto';
    } catch {
      return 'auto';
    }
  });

  // Track system preference in real time
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    // Sync initially
    setSystemPrefersDark(mediaQuery.matches);

    const handleChange = (e) => {
      setSystemPrefersDark(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
    }

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  // Compute effective theme based on choice
  const resolvedTheme = useMemo(() => {
    if (themeMode === 'auto') {
      return systemPrefersDark ? 'dark' : 'light';
    }
    return themeMode === 'dark' ? 'dark' : 'light';
  }, [themeMode, systemPrefersDark]);

  const isDark = resolvedTheme === 'dark';
  const isAuto = themeMode === 'auto';
  const systemTheme = systemPrefersDark ? 'dark' : 'light';

  // Explicitly select theme mode ('auto' | 'light' | 'dark')
  const setTheme = useCallback((newMode) => {
    const validMode = (newMode === 'auto' || newMode === 'dark' || newMode === 'light')
      ? newMode
      : 'auto';
    setThemeModeState(validMode);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, validMode);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  }, []);

  // Cycle through choices: light -> dark -> auto -> light
  const cycleTheme = useCallback(() => {
    setThemeModeState((prev) => {
      let nextMode = 'light';
      if (prev === 'light') nextMode = 'dark';
      else if (prev === 'dark') nextMode = 'auto';
      else nextMode = 'light';

      try {
        localStorage.setItem(THEME_STORAGE_KEY, nextMode);
      } catch (e) {
        console.error('Failed to save theme preference', e);
      }
      return nextMode;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    cycleTheme();
  }, [cycleTheme]);

  // Sync document root and body classes
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      body.classList.add('dark-theme');
      body.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.removeAttribute('data-theme');
      body.classList.remove('dark-theme');
      body.removeAttribute('data-theme');
    }

    root.setAttribute('data-theme-mode', themeMode);
    body.setAttribute('data-theme-mode', themeMode);
  }, [isDark, themeMode]);

  return (
    <ThemeContext.Provider
      value={{
        theme: resolvedTheme,
        themeMode,
        resolvedTheme,
        isDark,
        isAuto,
        systemTheme,
        toggleTheme,
        cycleTheme,
        setTheme,
        setThemeMode: setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

export default ThemeContext;
