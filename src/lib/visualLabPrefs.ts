/**
 * Analytics Visual Lab expand preference (H-03).
 * Disclosure stays available; user can pin open/closed across visits.
 */

import { loadJson, saveJson } from './persistence';

const KEY = 'analytics-visual-lab-open';

/** Default: collapsed (density). */
export function loadVisualLabOpen(defaultOpen = false): boolean {
  return loadJson<boolean>(KEY, defaultOpen);
}

export function saveVisualLabOpen(open: boolean): void {
  saveJson(KEY, open);
}
