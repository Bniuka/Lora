import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }) {
  const location = useLocation();

  // Always default to 'light' for everyone
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem('lora_theme');
      return saved === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const setTheme = (newTheme) => {
    const value = newTheme === 'dark' ? 'dark' : 'light';
    setThemeState(value);
    try {
      localStorage.setItem('lora_theme', value);
    } catch (e) {
      console.error('Failed to save theme preference', e);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // The homepage must always show in the current light theme as requested:
  // "the homepage shows in light theme that we have right now and when we go to the leaner or creator dashboard there is a mode switcher"
  const isHomepage = location.pathname === '/';

  // Public non-dashboard routes (e.g. landing page) stay in light theme by default.
  // When inside creator or learner areas, the user's chosen theme is active.
  const isDark = useMemo(() => {
    if (isHomepage) return false;
    return theme === 'dark';
  }, [isHomepage, theme]);

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
  }, [isDark]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme, isHomepage }}>
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
