import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './theme-switcher.css';

/**
 * ThemeSwitcher Component
 *
 * Supported variants:
 * - "button" (default): Compact circular icon button for topbars/headers
 * - "pill": Rounded pill button with icon and text for hero/action rows
 * - "menu-item": Structured menu item for user dropdowns
 * - "switch": Animated toggle switch with sliding thumb
 */
export default function ThemeSwitcher({
  variant = 'button',
  className = '',
  showTooltip = true,
  size = 'md',
}) {
  const { isDark, toggleTheme } = useTheme();

  if (variant === 'menu-item') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`lora-theme-menu-item ${className}`}
        role="switch"
        aria-checked={isDark}
        aria-label={`Toggle dark mode (currently ${isDark ? 'on' : 'off'})`}
      >
        <span className="lora-theme-menu-left">
          {isDark ? (
            <Sun size={16} className="text-amber-400" />
          ) : (
            <Moon size={16} className="text-blue-500" />
          )}
          <span>Dark Mode</span>
        </span>
        <span className={`lora-theme-badge ${isDark ? 'active' : ''}`}>
          {isDark ? 'ON' : 'OFF'}
        </span>
      </button>
    );
  }

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        className={`lora-theme-pill ${isDark ? 'dark-active' : ''} ${className}`}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <Motion.span
          key={isDark ? 'sun' : 'moon'}
          initial={{ rotate: -45, scale: 0.8, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 45, scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="lora-theme-icon-wrap"
        >
          {isDark ? (
            <Sun size={16} className="theme-sun-icon" />
          ) : (
            <Moon size={16} className="theme-moon-icon" />
          )}
        </Motion.span>
        <span className="lora-theme-pill-label">
          {isDark ? 'Dark Mode' : 'Light Mode'}
        </span>
      </button>
    );
  }

  if (variant === 'switch') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={toggleTheme}
        className={`lora-theme-switch-track ${isDark ? 'checked' : ''} ${className}`}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <Motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="lora-theme-switch-thumb"
        >
          {isDark ? (
            <Sun size={12} className="text-amber-400" />
          ) : (
            <Moon size={12} className="text-blue-600" />
          )}
        </Motion.div>
      </button>
    );
  }

  // Default: "button"
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`lora-theme-btn ${isDark ? 'dark-active' : ''} size-${size} ${className}`}
      title={showTooltip ? (isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode') : undefined}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        <Motion.span
          key={isDark ? 'sun' : 'moon'}
          initial={{ rotate: -60, scale: 0.6, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 60, scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
          className="lora-theme-icon-wrap"
        >
          {isDark ? (
            <Sun size={18} className="theme-sun-icon" />
          ) : (
            <Moon size={18} className="theme-moon-icon" />
          )}
        </Motion.span>
      </AnimatePresence>
    </button>
  );
}
