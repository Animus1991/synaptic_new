/**
 * Dashboard layout preference.
 * - canvas: multi-column (Minimal: paired 2-col sections; Blueprint: 3-col masonry)
 * - stacked: single-column vertical stack
 * Optional only; never removes sections or tool wiring.
 */

import { loadJson, saveJson } from './persistence';

export type DashboardLayoutMode = 'stacked' | 'canvas';

/** v2 — Minimal 2-col↔1-col; ignore pre-K29 values that never affected Minimal UI. */
const KEY = 'dashboard-layout-mode-v2';

export function loadDashboardLayoutMode(
  fallback: DashboardLayoutMode = 'stacked',
): DashboardLayoutMode {
  const v = loadJson<string | null>(KEY, null);
  if (v === 'canvas' || v === 'stacked') return v;
  return fallback;
}

export function saveDashboardLayoutMode(mode: DashboardLayoutMode): void {
  saveJson(KEY, mode);
}

export function toggleDashboardLayoutMode(current: DashboardLayoutMode): DashboardLayoutMode {
  return current === 'stacked' ? 'canvas' : 'stacked';
}
