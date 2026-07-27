import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  LIBRARY_PREFS_KEY,
  defaultLibraryViewMode,
  loadLibraryViewPrefs,
  saveLibraryViewPrefs,
} from './libraryViewPrefs';

describe('libraryViewPrefs (OPT-L5)', () => {
  const store = new Map<string, string>();

  afterEach(() => {
    store.clear();
    vi.unstubAllGlobals();
  });

  function stubStorage() {
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
    });
  }

  it('defaults list under Minimal and grid otherwise', () => {
    expect(defaultLibraryViewMode('minimal')).toBe('list');
    expect(defaultLibraryViewMode('minimal-dark')).toBe('list');
    expect(defaultLibraryViewMode('blueprint')).toBe('grid');
  });

  it('persists filter/view/sort across theme defaults without clobber', () => {
    stubStorage();
    saveLibraryViewPrefs({ filter: 'attention', viewMode: 'grid', sortBy: 'title' });
    // Theme default would be list under minimal — saved prefs must win.
    const loaded = loadLibraryViewPrefs('minimal');
    expect(loaded).toEqual({ filter: 'attention', viewMode: 'grid', sortBy: 'title' });
    expect(store.get(LIBRARY_PREFS_KEY)).toContain('attention');
  });

  it('falls back to theme default when prefs missing', () => {
    stubStorage();
    expect(loadLibraryViewPrefs('minimal').viewMode).toBe('list');
    expect(loadLibraryViewPrefs('blueprint').viewMode).toBe('grid');
  });
});
