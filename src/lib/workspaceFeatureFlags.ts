/**
 * B12 — Workspace v2 cohort tracking (`?ws=v2=1` or `?ws=v2`).
 * The v2 shell is the default for all users; the flag tags analytics cohorts only.
 */

const SESSION_KEY = 'synapse.ws.v2';

export type WorkspaceFeatureFlags = {
  /** True when user opted into canary cohort via URL or sessionStorage. */
  v2Canary: boolean;
  idlePreload: boolean;
};

function readUrlCanary(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  const ws = params.get('ws');
  return ws === 'v2' || ws === 'v2=1' || ws === '1';
}

export function persistWorkspaceV2CanaryFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  if (!readUrlCanary()) return false;
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* ignore */
  }
  return true;
}

export function isWorkspaceV2Canary(): boolean {
  if (typeof window === 'undefined') return false;
  if (readUrlCanary()) return true;
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/** Idle preload is on for everyone; v2Canary is cohort tagging only (not a feature gate). */
export function workspaceFeatureFlags(): WorkspaceFeatureFlags {
  return {
    v2Canary: isWorkspaceV2Canary(),
    idlePreload: true,
  };
}

/** Optional analytics hook — call once after boot when canary is active. */
export function reportWorkspaceCanaryCohort(): void {
  if (!isWorkspaceV2Canary() || typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('synapse:ws-v2-canary', { detail: { cohort: 'v2' } }));
}
