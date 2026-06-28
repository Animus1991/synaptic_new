import type { UserSettings } from '../types';
import { loadJson, saveJson } from './persistence';

const THEME_KEY = 'theme-preference';

export type ResolvedTheme = 'dark' | 'light' | 'spectrum';

export function resolveTheme(preference: UserSettings['theme']): ResolvedTheme {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return preference;
}

export function themeColorScheme(resolved: ResolvedTheme): 'light' | 'dark' {
  return resolved === 'light' ? 'light' : 'dark';
}

const THEME_META_COLORS: Record<ResolvedTheme, string> = {
  light: '#faf8f5',
  dark: '#0f0a1e',
  spectrum: '#131028',
};

export function themeMetaColor(resolved: ResolvedTheme): string {
  return THEME_META_COLORS[resolved];
}

export function applyTheme(preference: UserSettings['theme']): ResolvedTheme {
  const resolved = resolveTheme(preference);
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = themeColorScheme(resolved);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', themeMetaColor(resolved));
  }

  saveJson(THEME_KEY, preference);
  return resolved;
}

export function loadThemePreference(): UserSettings['theme'] {
  return loadJson<UserSettings['theme']>(THEME_KEY, 'dark');
}

export function watchSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const handler = () => onChange();
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

/** Call once before React mount to avoid flash */
export function initThemeEarly(): void {
  const pref = loadThemePreference();
  const resolved = pref === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : pref;
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = themeColorScheme(resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', themeMetaColor(resolved));
  }
}
