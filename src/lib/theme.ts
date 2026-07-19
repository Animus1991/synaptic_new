import type { UserSettings } from '../types';
import { loadJson, saveJson } from './persistence';
import {
  applyChromeDensity,
  loadChromeDensity,
  resolveChromeDensity,
  type ChromeDensity,
} from './chromeDensity';

const THEME_KEY = 'theme-preference';
const SESSION_KEY = 'session-v2';
const LEGACY_SESSION_KEY = 'session-v1';

/** Default for first-time production users (no saved preference). */
export const DEFAULT_THEME_PREFERENCE: UserSettings['theme'] = 'blueprint';

export type { ChromeDensity };

export function hasStoredThemePreference(): boolean {
  try {
    return localStorage.getItem(`synapse:${THEME_KEY}`) !== null;
  } catch {
    return false;
  }
}

/** Theme on cold start before React — respects saved pref, demo dark, else blueprint. */
export function resolveInitialThemePreference(): UserSettings['theme'] {
  if (hasStoredThemePreference()) return loadThemePreference();
  try {
    const legacy = loadJson<{ userSettings?: Partial<UserSettings> }>(LEGACY_SESSION_KEY, {});
    const current = loadJson<{ userSettings?: Partial<UserSettings> }>(SESSION_KEY, {});
    const merged = { ...legacy.userSettings, ...current.userSettings };
    if (merged.theme) return merged.theme;
    return merged.showDemoContent === true ? 'dark' : DEFAULT_THEME_PREFERENCE;
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

export type ResolvedTheme =
  | 'dark'
  | 'light'
  | 'spectrum'
  | 'blueprint'
  | 'minimal'
  | 'minimal-dark';

export function resolveTheme(preference: UserSettings['theme']): ResolvedTheme {
  if (preference === 'system') {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return preference;
}

export function themeColorScheme(resolved: ResolvedTheme): 'light' | 'dark' {
  return resolved === 'light'
    || resolved === 'spectrum'
    || resolved === 'minimal'
    ? 'light'
    : 'dark';
}

const THEME_META_COLORS: Record<ResolvedTheme, string> = {
  light: '#faf8f5',
  dark: '#0f0a1e',
  spectrum: '#f7f5ff',
  blueprint: '#020617',
  minimal: '#ffffff',
  'minimal-dark': '#0d1117',
};

export function themeMetaColor(resolved: ResolvedTheme): string {
  return THEME_META_COLORS[resolved];
}

export function applyTheme(
  preference: UserSettings['theme'],
  density?: ChromeDensity,
): ResolvedTheme {
  const resolved = resolveTheme(preference);
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = themeColorScheme(resolved);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', themeMetaColor(resolved));
  }

  applyChromeDensity(density ?? loadChromeDensity());

  saveJson(THEME_KEY, preference);
  return resolved;
}

export function loadThemePreference(): UserSettings['theme'] {
  return loadJson<UserSettings['theme']>(THEME_KEY, DEFAULT_THEME_PREFERENCE);
}

const THEME_CYCLE: ResolvedTheme[] = [
  'dark',
  'light',
  'spectrum',
  'blueprint',
  'minimal',
  'minimal-dark',
];

/** Header toggle: cycles explicit themes (system not in cycle). */
export function cycleTheme(preference: UserSettings['theme']): ThemeToggleTarget {
  const current = resolveTheme(preference);
  const idx = THEME_CYCLE.indexOf(current);
  return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]!;
}

export type ThemeToggleTarget =
  | 'dark'
  | 'light'
  | 'spectrum'
  | 'blueprint'
  | 'minimal'
  | 'minimal-dark';

export function themeToggleTarget(resolved: ResolvedTheme): ThemeToggleTarget {
  const idx = THEME_CYCLE.indexOf(resolved);
  return THEME_CYCLE[(idx + 1) % THEME_CYCLE.length]!;
}

export function watchSystemTheme(onChange: () => void): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: light)');
  const handler = () => onChange();
  mq.addEventListener('change', handler);
  return () => mq.removeEventListener('change', handler);
}

/** Call once before React mount to avoid flash */
export function initThemeEarly(): void {
  const pref = resolveInitialThemePreference();
  const resolved = pref === 'system'
    ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
    : pref;
  document.documentElement.setAttribute('data-theme', resolved);
  document.documentElement.style.colorScheme = themeColorScheme(resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', themeMetaColor(resolved));
  }
  // Density from dedicated key; session language may refine later via React.
  applyChromeDensity(loadChromeDensity());
}

export { applyChromeDensity, resolveChromeDensity, loadChromeDensity };
