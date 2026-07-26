/**
 * Dashboard layout preference — column density (all themes).
 * - stacked: single column
 * - dual: two columns (xl+)
 * - triple: three columns (xl+)
 * Optional only; never removes sections or tool wiring.
 */

import { loadJson, saveJson } from './persistence';

export type DashboardLayoutMode = 'stacked' | 'dual' | 'triple';

/** v3 — explicit 1/2/3 columns for Minimal and non-Minimal. */
const KEY = 'dashboard-layout-mode-v3';
/** v2 — canvas | stacked (pre-K92). */
const LEGACY_KEY = 'dashboard-layout-mode-v2';

const MODES: DashboardLayoutMode[] = ['stacked', 'dual', 'triple'];

function normalizeMode(raw: string | null | undefined): DashboardLayoutMode | null {
  if (raw === 'stacked' || raw === 'dual' || raw === 'triple') return raw;
  /* Legacy: canvas meant “more columns” (Minimal pairs / non-Minimal 3-col). */
  if (raw === 'canvas') return 'dual';
  return null;
}

export function loadDashboardLayoutMode(
  fallback: DashboardLayoutMode = 'stacked',
): DashboardLayoutMode {
  const current = normalizeMode(loadJson<string | null>(KEY, null));
  if (current) return current;

  const legacy = normalizeMode(loadJson<string | null>(LEGACY_KEY, null));
  if (legacy) {
    saveJson(KEY, legacy);
    return legacy;
  }
  return fallback;
}

export function saveDashboardLayoutMode(mode: DashboardLayoutMode): void {
  saveJson(KEY, mode);
}

/** Cycle 1 → 2 → 3 → 1. */
export function cycleDashboardLayoutMode(current: DashboardLayoutMode): DashboardLayoutMode {
  const i = MODES.indexOf(current);
  return MODES[(i < 0 ? 0 : i + 1) % MODES.length];
}

/** @deprecated Use cycleDashboardLayoutMode — kept for older imports/tests. */
export function toggleDashboardLayoutMode(current: DashboardLayoutMode): DashboardLayoutMode {
  return cycleDashboardLayoutMode(current);
}

export function dashboardColumnCount(mode: DashboardLayoutMode): 1 | 2 | 3 {
  if (mode === 'triple') return 3;
  if (mode === 'dual') return 2;
  return 1;
}
