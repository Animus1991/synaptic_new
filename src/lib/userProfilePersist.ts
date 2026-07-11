import type { User } from '../types';
import { loadJson, saveJson } from './persistence';

export type PersistedUserProfile = {
  onboardingComplete: boolean;
  name: string;
  segment: User['segment'];
  role: User['role'];
};

const PROFILE_KEY = 'user-profile-v1';

export function loadPersistedUserProfile(): PersistedUserProfile | null {
  const profile = loadJson<PersistedUserProfile | null>(PROFILE_KEY, null);
  if (!profile?.onboardingComplete) return null;
  return profile;
}

export function savePersistedUserProfile(profile: PersistedUserProfile): void {
  saveJson(PROFILE_KEY, profile);
}

export function clearPersistedUserProfile(): void {
  try {
    localStorage.removeItem(`synapse:${PROFILE_KEY}`);
  } catch {
    // ignore
  }
}
