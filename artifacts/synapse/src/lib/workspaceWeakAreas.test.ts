import { describe, expect, it } from 'vitest';
import {
  buildWeakAreaWorkspaceFocus,
  collectWorkspaceWeakSpots,
  isWeakSpotFocused,
  resolveWorkspaceStepForConcept,
  shouldShowWeakAreasRail,
} from './workspaceWeakAreas';
import type { LearnerModel, SkillNode } from '../types';

function skill(concept: string, mastery: number): SkillNode {
  return {
    concept,
    courseId: 'c1',
    mastery,
    lastPracticed: '2026-01-01',
    retentionPrediction: 0.4,
    practiceCount: 3,
    averageResponseTime: 20,
    errorRate: 0.3,
  };
}

describe('workspaceWeakAreas', () => {
  const model = {
    weakAreas: [skill('Elasticity', 32), skill('Tariffs', 41)],
  } as unknown as LearnerModel;

  it('merges bus struggling insights with model weak areas', () => {
    const spots = collectWorkspaceWeakSpots(model, [
      {
        concept: 'Elasticity',
        key: 'elasticity',
        mastery: 28,
        engagement: 2,
        struggling: true,
        confident: false,
        tools: [],
        struggleScore: 3,
        lastAt: Date.now(),
      },
      {
        concept: 'Comparative advantage',
        key: 'comparative-advantage',
        mastery: 35,
        engagement: 1,
        struggling: true,
        confident: false,
        tools: [],
        struggleScore: 2,
        lastAt: Date.now(),
      },
    ], 'ECON 101');
    expect(spots.length).toBeGreaterThanOrEqual(2);
    expect(spots.some((s) => /elasticity/i.test(s.concept))).toBe(true);
    expect(spots.some((s) => /comparative/i.test(s.concept))).toBe(true);
  });

  it('builds focus with term for weak area', () => {
    const focus = buildWeakAreaWorkspaceFocus('Tariffs', {
      uploadedFiles: [{
        id: 'f1',
        name: 'notes.pdf',
        type: 'txt',
        size: 120,
        uploadedAt: '2026-01-01',
        status: 'analyzed',
        extractedText: 'Tariffs reduce imports.',
        courseId: 'c1',
      }],
    });
    expect(focus.term).toBe('Tariffs');
    expect(focus.originTool).toBe('dashboard');
  });

  it('matches focused weak spot labels', () => {
    expect(isWeakSpotFocused({ concept: 'Elasticity', mastery: 20, course: 'x', source: 'model' }, 'elasticity')).toBe(true);
    expect(isWeakSpotFocused({ concept: 'Tariffs', mastery: 20, course: 'x', source: 'model' }, 'Supply')).toBe(false);
  });

  it('resolves lesson step index from concept title overlap', () => {
    const steps = [
      { title: 'ΔΙΑΛΕΞΗ 1 ΕΙΣΑΓΩΓΗ', type: 'Core' },
      { title: 'Tariffs and trade policy', type: 'Deep Dive' },
      { title: 'Quiz', type: 'Quiz' },
    ];
    expect(resolveWorkspaceStepForConcept('Tariffs', steps)).toBe(1);
  });

  it('hides weak areas rail when no spots', () => {
    expect(shouldShowWeakAreasRail([])).toBe(false);
    expect(shouldShowWeakAreasRail([{ concept: 'Tariffs', mastery: 30, course: 'Eco', source: 'model' }])).toBe(true);
  });
});
