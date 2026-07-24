import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  loadDashboardLayoutMode,
  saveDashboardLayoutMode,
  toggleDashboardLayoutMode,
} from './dashboardLayoutPrefs';

describe('dashboardLayoutPrefs', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  it('uses theme-aware fallback when unset', () => {
    expect(loadDashboardLayoutMode('canvas')).toBe('canvas');
    expect(loadDashboardLayoutMode('stacked')).toBe('stacked');
  });

  it('persists canvas vs stacked', () => {
    saveDashboardLayoutMode('canvas');
    expect(loadDashboardLayoutMode('stacked')).toBe('canvas');
    saveDashboardLayoutMode('stacked');
    expect(loadDashboardLayoutMode('canvas')).toBe('stacked');
  });

  it('toggles between modes', () => {
    expect(toggleDashboardLayoutMode('stacked')).toBe('canvas');
    expect(toggleDashboardLayoutMode('canvas')).toBe('stacked');
  });
});
