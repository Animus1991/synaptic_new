/** @vitest-environment node */
import { describe, expect, it } from 'vitest';
import {
  buildPostExamStudyActions,
  filterPostExamLinks,
  isPostExamPhase,
} from './postExamNextSteps';

describe('isPostExamPhase (OPT-K65)', () => {
  it('returns false when examDate is missing', () => {
    expect(isPostExamPhase(undefined)).toBe(false);
    expect(isPostExamPhase('')).toBe(false);
  });

  it('returns false before exam day', () => {
    const now = Date.parse('2026-07-01T12:00:00.000Z');
    expect(isPostExamPhase('2026-07-10', now)).toBe(false);
  });

  it('returns true after exam day', () => {
    const now = Date.parse('2026-07-11T12:00:00.000Z');
    expect(isPostExamPhase('2026-07-10', now)).toBe(true);
  });
});

describe('buildPostExamStudyActions', () => {
  it('prioritizes due reviews, weak areas, and open misconceptions', () => {
    const actions = buildPostExamStudyActions({
      reviewDueCount: 3,
      weakAreas: [{ concept: 'Elasticity', mastery: 28 }],
      misconceptions: [{ id: 'm1', concept: 'Opportunity cost', corrected: false }],
    });
    expect(actions.map((a) => a.kind)).toEqual(['review', 'weak-area', 'misconception']);
    expect(actions[1]?.concept).toBe('Elasticity');
  });

  it('falls back to workspace when there is nothing personal to close', () => {
    const actions = buildPostExamStudyActions({});
    expect(actions).toEqual([
      { id: 'workspace', kind: 'workspace', titleKey: 'examPrepNextStepsOpenWorkspace' },
    ]);
  });
});

describe('filterPostExamLinks', () => {
  it('hides CS pathways when courses are not computing', () => {
    const links = filterPostExamLinks({ courseTitles: ['Microeconomics', 'History'] });
    expect(links.some((l) => l.id === 'cs-pathways')).toBe(false);
    expect(links.length).toBe(3);
  });

  it('keeps CS pathways for informatics courses', () => {
    const links = filterPostExamLinks({ courseTitles: ['Πληροφορική ΓΛ'] });
    expect(links.some((l) => l.id === 'cs-pathways')).toBe(true);
  });
});
