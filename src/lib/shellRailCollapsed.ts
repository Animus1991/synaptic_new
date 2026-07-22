/** OPT-R9 — persist optional icon-collapsed desktop shell rail (all themes). */

export const SHELL_RAIL_COLLAPSED_KEY = 'synapse:shell-rail-collapsed';

export function loadShellRailCollapsed(defaultCollapsed: boolean): boolean {
  if (typeof window === 'undefined') return defaultCollapsed;
  try {
    const raw = localStorage.getItem(SHELL_RAIL_COLLAPSED_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
  } catch {
    /* ignore */
  }
  return defaultCollapsed;
}

export function persistShellRailCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(SHELL_RAIL_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch {
    /* ignore */
  }
}
