import { beforeEach, describe, expect, it } from 'vitest';
import { mergeSessions, remoteSessionToLocal } from './sessionSync';
import { replaceAllDeckStates } from './leitnerDeckSync';
import { replaceAllStepSchedules } from './spacedStepSchedule';
import { replaceAllConceptBuses } from './workspacePersistence';
import type { UserSettings } from '../types';

const settings = {
  language: 'en',
  llmModel: 'gpt-4o-mini',
  theme: 'dark',
} as unknown as UserSettings;

describe('sessionSync leitner deck states', () => {
  beforeEach(() => {
    replaceAllConceptBuses({});
    replaceAllStepSchedules({});
    replaceAllDeckStates({});
  });

  it('preserves local deck states when remote is older', () => {
    const merged = mergeSessions(
      {
        learnerModel: {} as never,
        dashboardStats: {} as never,
        tasks: [],
        xp: 1,
        betaMastery: [],
        firstAttemptKeys: [],
        openMistakes: [],
        activities: [],
        userSettings: settings,
        leitnerDeckStates: {
          local: { index: 2, boxCounts: [1, 0, 0, 0], lastSyncedAt: '2026-07-02T00:00:00.000Z', cardOrder: ['A'] },
        },
        updatedAt: '2026-07-02T10:00:00.000Z',
      },
      {
        xp: 2,
        leitnerDeckStates: {
          remote: { index: 0, boxCounts: [0, 1, 0, 0], lastSyncedAt: '2026-07-01T00:00:00.000Z', cardOrder: ['B'] },
        },
        updatedAt: '2026-07-01T10:00:00.000Z',
      },
    );
    expect(merged.leitnerDeckStates?.local?.index).toBe(2);
    expect(merged.leitnerDeckStates?.remote?.boxCounts[1]).toBe(1);
    expect(merged.xp).toBe(1);
  });

  it('maps remote leitner deck states into local session shape', () => {
    const local = remoteSessionToLocal({
      xp: 3,
      userSettings: settings,
      leitnerDeckStates: {
        'task:elasticity': {
          index: 1,
          boxCounts: [0, 1, 2, 0],
          lastSyncedAt: '2026-07-02T00:00:00.000Z',
          cardOrder: ['Elasticity'],
        },
      },
      updatedAt: '2026-07-02T11:00:00.000Z',
    });
    expect(local.leitnerDeckStates?.['task:elasticity']?.boxCounts[2]).toBe(2);
    expect(local.updatedAt).toBe('2026-07-02T11:00:00.000Z');
  });
});
