import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cycleDashboardLayoutMode,
  dashboardColumnCount,
  loadDashboardLayoutMode,
  saveDashboardLayoutMode,
  toggleDashboardLayoutMode,
} from './dashboardLayoutPrefs';
import { loadJson, saveJson } from './persistence';

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
    expect(loadDashboardLayoutMode('dual')).toBe('dual');
    expect(loadDashboardLayoutMode('stacked')).toBe('stacked');
    expect(loadDashboardLayoutMode('triple')).toBe('triple');
  });

  it('persists stacked / dual / triple', () => {
    saveDashboardLayoutMode('dual');
    expect(loadDashboardLayoutMode('stacked')).toBe('dual');
    saveDashboardLayoutMode('triple');
    expect(loadDashboardLayoutMode('stacked')).toBe('triple');
    saveDashboardLayoutMode('stacked');
    expect(loadDashboardLayoutMode('dual')).toBe('stacked');
  });

  it('cycles 1 → 2 → 3 → 1', () => {
    expect(cycleDashboardLayoutMode('stacked')).toBe('dual');
    expect(cycleDashboardLayoutMode('dual')).toBe('triple');
    expect(cycleDashboardLayoutMode('triple')).toBe('stacked');
    expect(toggleDashboardLayoutMode('dual')).toBe('triple');
  });

  it('maps column counts', () => {
    expect(dashboardColumnCount('stacked')).toBe(1);
    expect(dashboardColumnCount('dual')).toBe(2);
    expect(dashboardColumnCount('triple')).toBe(3);
  });

  it('migrates legacy canvas → dual', () => {
    saveJson('dashboard-layout-mode-v2', 'canvas');
    expect(loadDashboardLayoutMode('stacked')).toBe('dual');
    expect(loadJson('dashboard-layout-mode-v3', null)).toBe('dual');
  });
});
