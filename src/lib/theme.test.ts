/** @vitest-environment jsdom */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  cycleTheme,
  themeToggleTarget,
  resolveInitialThemePreference,
  resolveTheme,
  DEFAULT_THEME_PREFERENCE,
  hasStoredThemePreference,
} from './theme';

function installLocalStorageMock(): void {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
    get length() {
      return store.size;
    },
    key: (index: number) => [...store.keys()][index] ?? null,
  });
}

describe('cycleTheme', () => {
  it('cycles dark → light → spectrum → blueprint → minimal → minimal-dark → dark', () => {
    expect(cycleTheme('dark')).toBe('light');
    expect(cycleTheme('light')).toBe('spectrum');
    expect(cycleTheme('spectrum')).toBe('blueprint');
    expect(cycleTheme('blueprint')).toBe('minimal');
    expect(cycleTheme('minimal')).toBe('minimal-dark');
    expect(cycleTheme('minimal-dark')).toBe('dark');
  });
});

describe('themeToggleTarget', () => {
  it('returns the next theme in the cycle', () => {
    expect(themeToggleTarget('dark')).toBe('light');
    expect(themeToggleTarget('light')).toBe('spectrum');
    expect(themeToggleTarget('spectrum')).toBe('blueprint');
    expect(themeToggleTarget('blueprint')).toBe('minimal');
    expect(themeToggleTarget('minimal')).toBe('minimal-dark');
    expect(themeToggleTarget('minimal-dark')).toBe('dark');
  });
});

describe('resolveInitialThemePreference', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it('defaults to minimal when no session or theme key exists', () => {
    expect(hasStoredThemePreference()).toBe(false);
    expect(DEFAULT_THEME_PREFERENCE).toBe('minimal');
    expect(resolveInitialThemePreference()).toBe(DEFAULT_THEME_PREFERENCE);
  });

  it('uses dark for demo session without explicit theme', () => {
    localStorage.setItem(
      'synapse:session-v2',
      JSON.stringify({ userSettings: { showDemoContent: true } }),
    );
    expect(resolveInitialThemePreference()).toBe('dark');
  });
});

describe('resolveTheme (OPT-M19)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('prefers-color-scheme: light') ? true : false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    );
  });

  it('maps system + light OS to minimal', () => {
    expect(resolveTheme('system')).toBe('minimal');
  });

  it('maps system + dark OS to minimal-dark', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn((query: string) => ({
        matches: query.includes('prefers-color-scheme: light') ? false : true,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    );
    expect(resolveTheme('system')).toBe('minimal-dark');
  });

  it('passes through explicit preferences', () => {
    expect(resolveTheme('blueprint')).toBe('blueprint');
    expect(resolveTheme('minimal')).toBe('minimal');
  });
});
