import { describe, expect, it } from 'vitest';
import { mockTasks } from '../demo/mockData';
import {
  resolveStudyPlanLaunch,
  sessionForStudyPlanKind,
  studyPlanKindFromLabel,
} from './studyPlanLaunch';

describe('studyPlanLaunch', () => {
  it('maps EN and EL labels to kinds', () => {
    expect(studyPlanKindFromLabel('Retry mistakes')).toBe('mistakes');
    expect(studyPlanKindFromLabel('Επανάληψη λαθών')).toBe('mistakes');
    expect(studyPlanKindFromLabel('Spaced reviews')).toBe('reviews');
    expect(studyPlanKindFromLabel('Διαστηματικές επαναλήψεις')).toBe('reviews');
    expect(studyPlanKindFromLabel('Weak concepts')).toBe('weak');
    expect(studyPlanKindFromLabel('Αδύναμες έννοιες')).toBe('weak');
  });

  it('maps kinds to the matching session launcher', () => {
    expect(sessionForStudyPlanKind('reviews')).toBe('review');
    expect(sessionForStudyPlanKind('mistakes')).toBe('10min');
    expect(sessionForStudyPlanKind('weak')).toBe('25min');
  });

  it('prefers explicit task ids from the block', () => {
    const launch = resolveStudyPlanLaunch(
      { kind: 'reviews', label: 'Spaced reviews', items: [], taskIds: ['task1'] },
      mockTasks,
    );
    expect(launch.tab).toBe('reviews');
    expect(launch.session).toBe('review');
    expect(launch.taskIds).toEqual(['task1']);
  });

  it('falls back to titles, then to kind predicates', () => {
    const byTitle = resolveStudyPlanLaunch(
      { label: 'Spaced reviews', items: ['Review: Supply & Demand Equilibrium'] },
      mockTasks,
    );
    expect(byTitle.taskIds).toEqual(['task1']);

    const byKind = resolveStudyPlanLaunch(
      { kind: 'mistakes', label: 'Retry mistakes', items: [] },
      mockTasks,
    );
    expect(byKind.tab).toBe('mistakes');
    expect(byKind.taskIds).toContain('task4');
  });
});
