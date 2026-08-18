import { describe, expect, it } from 'vitest';
import { planAllows, resolveAuthPlan } from './planGating';

describe('planGating', () => {
  it('treats a missing plan as free', () => {
    expect(resolveAuthPlan(undefined)).toBe('free');
    expect(planAllows(undefined, 'globalRag')).toBe(false);
  });

  it('unlocks library-wide search on pro/team', () => {
    expect(planAllows({ authPlan: 'free' }, 'globalRag')).toBe(false);
    expect(planAllows({ authPlan: 'pro' }, 'crossLibrary')).toBe(true);
    expect(planAllows({ authPlan: 'team' }, 'globalRag')).toBe(true);
  });

  it('unlocks paid features when the user brings their own API key', () => {
    expect(planAllows({ authPlan: 'free', openaiApiKey: 'sk-test' }, 'globalRag')).toBe(true);
  });
});
