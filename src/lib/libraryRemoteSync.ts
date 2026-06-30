import type { UserSettings } from '../types';
import { configuredProxyBase, pushRemoteLibrary } from './authClient';
import { hydrateLibrary, loadLibrarySync } from './libraryStorage';

const DEBOUNCE_MS = 4000;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight = false;

export function canAutoSyncLibrary(settings?: UserSettings): boolean {
  return !!(configuredProxyBase(settings) && settings?.authToken?.trim());
}

export function scheduleLibraryRemoteSync(settings: UserSettings): void {
  if (!canAutoSyncLibrary(settings)) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void flushLibraryRemoteSync(settings);
  }, DEBOUNCE_MS);
}

export async function flushLibraryRemoteSync(settings: UserSettings): Promise<void> {
  if (!canAutoSyncLibrary(settings) || inFlight) return;
  const token = settings.authToken!.trim();
  inFlight = true;
  try {
    const local = loadLibrarySync();
    const hydrated = await hydrateLibrary(local);
    await pushRemoteLibrary(token, settings, hydrated);
  } catch (err) {
    console.warn('[library-sync] auto push failed', err);
  } finally {
    inFlight = false;
  }
}
