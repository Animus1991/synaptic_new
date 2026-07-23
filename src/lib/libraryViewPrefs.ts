/** OPT-L5 — Library filter/view/sort prefs (theme-independent; no clobber on theme switch). */

export const LIBRARY_PREFS_KEY = 'synapse:library-view-prefs';

export type LibraryFilter = 'all' | 'in-progress' | 'generating' | 'completed' | 'attention';
export type LibraryViewMode = 'grid' | 'list';
export type LibrarySortBy = 'recent' | 'progress' | 'quality' | 'title';

export type LibraryViewPrefs = {
  filter: LibraryFilter;
  viewMode: LibraryViewMode;
  sortBy: LibrarySortBy;
};

export function defaultLibraryViewMode(themeAttr?: string | null): LibraryViewMode {
  const theme =
    themeAttr
    ?? (typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null);
  return theme === 'minimal' || theme === 'minimal-dark' ? 'list' : 'grid';
}

export function loadLibraryViewPrefs(
  themeAttr?: string | null,
): LibraryViewPrefs {
  const fallbackView = defaultLibraryViewMode(themeAttr);
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(LIBRARY_PREFS_KEY) : null;
    if (!raw) return { filter: 'all', viewMode: fallbackView, sortBy: 'recent' };
    const parsed = JSON.parse(raw) as Partial<LibraryViewPrefs>;
    return {
      filter: parsed.filter ?? 'all',
      viewMode: parsed.viewMode ?? fallbackView,
      sortBy: parsed.sortBy ?? 'recent',
    };
  } catch {
    return { filter: 'all', viewMode: fallbackView, sortBy: 'recent' };
  }
}

export function saveLibraryViewPrefs(prefs: LibraryViewPrefs): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(LIBRARY_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore quota / private mode */
  }
}
