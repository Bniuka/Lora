import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Sun, Moon, Laptop } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import './theme-switcher.css';

/**
 * ThemeSwitcher Component
 *
 * Supported variants:
 * - "button" (default): Circular icon button for topbars/headers (cycles Light -> Dark -> Auto)
 * - "pill": Rounded pill button with icon and text for hero/action rows (cycles Light -> Dark -> Auto)
 * - "menu-item": Interactive 3-way segmented control (Light / Dark / Auto) for user dropdowns
 * - "segmented": Standalone 3-pill segmented selector bar
 * - "switch": Animated toggle switch with sliding thumb
 */
export default function ThemeSwitcher({
  variant = 'button',
  className = '',
  showTooltip = true,
  size = 'md',
}) {
  const { themeMode, isDark, isAuto, cycleTheme, setTheme } = useTheme();

  // 1. Menu Item Variant (Structured 3-Option Segmented Selector for Dropdowns)
  if (variant === 'menu-item') {
    return (
      <div
        className={`lora-theme-menu-group ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="region"
        aria-label="Theme selector"
      >
        <div className="lora-theme-menu-title">
          <span>Theme</span>
          <span className="lora-theme-menu-current">
            {themeMode === 'auto' ? `Auto (${isDark ? 'Dark' : 'Light'})` : isDark ? 'Dark' : 'Light'}
          </span>
        </div>
        <div className="lora-theme-menu-segments" role="radiogroup" aria-label="Theme choice">
          <button
            type="button"
            className={`lora-theme-seg-btn ${themeMode === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
            role="radio"
            aria-checked={themeMode === 'light'}
            title="Light Theme"
            aria-label="Light Theme"
          >
            <Sun size={13} className="theme-sun-icon" />
            <span>Light</span>
          </button>
          <button
            type="button"
            className={`lora-theme-seg-btn ${themeMode === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
            role="radio"
            aria-checked={themeMode === 'dark'}
            title="Dark Theme"
            aria-label="Dark Theme"
          >
            <Moon size={13} className="theme-moon-icon" />
            <span>Dark</span>
          </button>
          <button
            type="button"
            className={`lora-theme-seg-btn ${themeMode === 'auto' ? 'active' : ''}`}
            onClick={() => setTheme('auto')}
            role="radio"
            aria-checked={themeMode === 'auto'}
            title="Auto (matches system preference)"
            aria-label="Auto System Theme"
          >
            <Laptop size={13} className="theme-auto-icon" />
            <span>Auto</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Segmented Variant (Standalone 3-Option Bar)
  if (variant === 'segmented') {
    return (
      <div
        className={`lora-theme-segmented-bar size-${size} ${className}`}
        role="radiogroup"
        aria-label="Theme choice"
      >
        <button
          type="button"
          className={`lora-theme-seg-btn ${themeMode === 'light' ? 'active' : ''}`}
          onClick={() => setTheme('light')}
          role="radio"
          aria-checked={themeMode === 'light'}
          title="Light Mode"
        >
          <Sun size={14} className="theme-sun-icon" />
          <span>Light</span>
        </button>
        <button
          type="button"
          className={`lora-theme-seg-btn ${themeMode === 'dark' ? 'active' : ''}`}
          onClick={() => setTheme('dark')}
          role="radio"
          aria-checked={themeMode === 'dark'}
          title="Dark Mode"
        >
          <Moon size={14} className="theme-moon-icon" />
          <span>Dark</span>
        </button>
        <button
          type="button"
          className={`lora-theme-seg-btn ${themeMode === 'auto' ? 'active' : ''}`}
          onClick={() => setTheme('auto')}
          role="radio"
          aria-checked={themeMode === 'auto'}
          title="Auto (matches system preference)"
        >
          <Laptop size={14} className="theme-auto-icon" />
          <span>Auto</span>
        </button>
      </div>
    );
  }

  // 3. Pill Variant (Dashboard Action Rows)
  if (variant === 'pill') {
    const pillLabel =
      themeMode === 'auto'
        ? `Auto (${isDark ? 'Dark' : 'Light'})`
        : isDark
        ? 'Dark Mode'
        : 'Light Mode';

    const pillTooltip =
      themeMode === 'auto'
        ? `Theme: Auto (System: ${isDark ? 'Dark' : 'Light'}) · Click to switch to Light`
        : themeMode === 'light'
        ? 'Theme: Light Mode · Click to switch to Dark'
        : 'Theme: Dark Mode · Click to switch to Auto';

    return (
      <button
        type="button"
        onClick={cycleTheme}
        className={`lora-theme-pill ${
          themeMode === 'auto' ? 'auto-active' : isDark ? 'dark-active' : 'light-active'
        } ${className}`}
        title={pillTooltip}
        aria-label={pillTooltip}
      >
        <Motion.span
          key={themeMode}
          initial={{ rotate: -45, scale: 0.8, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 45, scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="lora-theme-icon-wrap"
        >
          {themeMode === 'auto' ? (
            <Laptop size={16} className="theme-auto-icon" />
          ) : isDark ? (
            <Moon size={16} className="theme-moon-icon" />
          ) : (
            <Sun size={16} className="theme-sun-icon" />
          )}
        </Motion.span>
        <span className="lora-theme-pill-label">{pillLabel}</span>
        {themeMode === 'auto' && (
          <span className="lora-theme-pill-subtag">SYSTEM</span>
        )}
      </button>
    );
  }

  // 4. Switch Variant
  if (variant === 'switch') {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        onClick={cycleTheme}
        className={`lora-theme-switch-track ${isDark ? 'checked' : ''} ${className}`}
        title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        <Motion.div
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="lora-theme-switch-thumb"
        >
          {themeMode === 'auto' ? (
            <Laptop size={12} className="theme-auto-icon" />
          ) : isDark ? (
            <Moon size={12} className="text-blue-600" />
          ) : (
            <Sun size={12} className="text-amber-500" />
          )}
        </Motion.div>
      </button>
    );
  }

  // 5. Default Variant: "button" (Top Bar Header)
  const btnTooltip =
    themeMode === 'auto'
      ? `Theme: Auto (System: ${isDark ? 'Dark' : 'Light'}) · Click to switch to Light`
      : themeMode === 'light'
      ? 'Theme: Light Mode · Click to switch to Dark'
      : 'Theme: Dark Mode · Click to switch to Auto (System)';

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className={`lora-theme-btn ${
        themeMode === 'auto' ? 'auto-active' : isDark ? 'dark-active' : 'light-active'
      } size-${size} ${className}`}
      title={showTooltip ? btnTooltip : undefined}
      aria-label={btnTooltip}
    >
      <AnimatePresence mode="wait" initial={false}>
        <Motion.span
          key={themeMode}
          initial={{ rotate: -60, scale: 0.6, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          exit={{ rotate: 60, scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
          className="lora-theme-icon-wrap"
        >
          {themeMode === 'auto' ? (
            <Laptop size={size === 'sm' ? 15 : 17} className="theme-auto-icon" />
          ) : isDark ? (
            <Moon size={size === 'sm' ? 15 : 18} className="theme-moon-icon" />
          ) : (
            <Sun size={size === 'sm' ? 15 : 18} className="theme-sun-icon" />
          )}
        </Motion.span>
      </AnimatePresence>

      {/* Tiny badge indicating Auto mode is active */}
      {themeMode === 'auto' && (
        <span className="lora-theme-auto-dot" title="Auto Mode Active (System)">
          A
        </span>
      )}
    </button>
  );
}
