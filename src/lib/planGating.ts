import type { UserSettings } from '../types';

export type AuthPlan = NonNullable<UserSettings['authPlan']>;
export type PlanFeature = 'globalRag' | 'crossLibrary';

export function resolveAuthPlan(settings?: Pick<UserSettings, 'authPlan'> | null): AuthPlan {
  return settings?.authPlan ?? 'free';
}

export function hasOwnLlmKey(settings?: Pick<UserSettings, 'openaiApiKey'> | null): boolean {
  return Boolean(settings?.openaiApiKey?.trim());
}

/** Paid plans, or a user-supplied API key, unlock library-wide retrieval. */
export function planAllows(
  settings: Pick<UserSettings, 'authPlan' | 'openaiApiKey'> | undefined,
  feature: PlanFeature,
): boolean {
  if (feature === 'globalRag' || feature === 'crossLibrary') {
    if (hasOwnLlmKey(settings)) return true;
    const plan = resolveAuthPlan(settings);
    return plan === 'pro' || plan === 'team';
  }
  return true;
}
