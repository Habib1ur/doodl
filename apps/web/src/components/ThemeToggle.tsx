'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

const THEME_EVENT = 'doodlio-theme-change';

function subscribeTheme(callback: () => void) {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getThemeSnapshot(): boolean {
  const saved = localStorage.getItem('doodlio_theme');
  return (
    saved === 'dark' ||
    (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
}

export function ThemeToggle() {
  const dark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const toggle = () => {
    const next = !dark;
    localStorage.setItem('doodlio_theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-control border border-surface-border bg-surface-card text-ink-secondary hover:text-ink-main hover:bg-surface-elevated active:scale-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
    >
      {dark ? <Sun className="w-5 h-5 text-semantic-warning" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
