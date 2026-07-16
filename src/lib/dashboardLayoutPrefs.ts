/**
 * Dashboard layout preference — stacked (default production) vs canvas 3-column preview.
 * Optional only; never removes sections or tool wiring.
 */

import { loadJson, saveJson } from './persistence';

export type DashboardLayoutMode = 'stacked' | 'canvas';

const KEY = 'dashboard-layout-mode';

export function loadDashboardLayoutMode(): DashboardLayoutMode {
  const v = loadJson<string>(KEY, 'stacked');
  return v === 'canvas' ? 'canvas' : 'stacked';
}

export function saveDashboardLayoutMode(mode: DashboardLayoutMode): void {
  saveJson(KEY, mode);
}

export function toggleDashboardLayoutMode(current: DashboardLayoutMode): DashboardLayoutMode {
  return current === 'stacked' ? 'canvas' : 'stacked';
}
