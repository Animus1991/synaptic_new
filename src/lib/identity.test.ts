import { describe, expect, it } from 'vitest';
import { buildInitialUser, levelFromXp, nameFromEmail } from './identity';
import { defaultSettings } from '../demo/mockData';
import type { UserSettings } from '../types';

describe('levelFromXp', () => {
  it('returns 1 for zero, negative, or invalid xp', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(-50)).toBe(1);
    expect(levelFromXp(Number.NaN)).toBe(1);
  });

  it('grows monotonically with xp and is clamped to 99', () => {
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(4850)).toBe(7);
    expect(levelFromXp(10_000_000)).toBe(99);
  });
});

describe('nameFromEmail', () => {
  it('derives a title-cased name from the local part', () => {
    expect(nameFromEmail('alex.chen@x.com')).toBe('Alex Chen');
    expect(nameFromEmail('maria-p@x.com')).toBe('Maria P');
  });

  it('falls back to Learner for empty or missing email', () => {
    expect(nameFromEmail(undefined)).toBe('Learner');
    expect(nameFromEmail('@x.com')).toBe('Learner');
  });
});

describe('buildInitialUser', () => {
  const demoSettings: UserSettings = { ...defaultSettings, showDemoContent: true };
  const prodSettings: UserSettings = { ...defaultSettings, showDemoContent: false };

  it('keeps demo level consistent with demo xp', () => {
    const user = buildInitialUser({ settings: demoSettings });
    expect(user.level).toBe(levelFromXp(user.xp));
  });

  it('recomputes demo level when persisted xp overrides the mock value', () => {
    const user = buildInitialUser({ settings: demoSettings, persistedXp: 0 });
    expect(user.xp).toBe(0);
    expect(user.level).toBe(1);
  });

  it('builds a clean production identity from persisted xp and auth email', () => {
    const user = buildInitialUser({
      settings: prodSettings,
      persistedXp: 4850,
      authEmail: 'alex.chen@example.com',
      streak: 3,
    });
    expect(user.name).toBe('Alex Chen');
    expect(user.level).toBe(levelFromXp(4850));
    expect(user.streak).toBe(3);
  });
});
