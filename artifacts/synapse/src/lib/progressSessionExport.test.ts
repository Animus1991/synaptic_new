import { describe, expect, it } from 'vitest';
import {
  buildProgressSessionExportPayload,
  buildProgressSessionHtml,
  buildProgressSessionJson,
  progressSessionFilename,
} from './progressSessionExport';
import type { DashboardSessionContent } from './dashboardSessionModel';

const session: DashboardSessionContent = {
  sectionLabel: 'Supply and demand',
  weakExtraction: false,
  passageGrounded: false,
  hasSource: true,
  weakSpotCount: 1,
  toolActivityCount: 3,
  engagedToolCount: 2,
  suggestFocusTool: 'quiz',
};

describe('progressSessionExport', () => {
  it('builds HTML with readiness, weak spots, and next action', () => {
    const payload = buildProgressSessionExportPayload({
      lang: 'en',
      concept: 'Elasticity',
      courseName: 'Econ 101',
      sectionLabel: 'Supply and demand',
      readiness: 62,
      streak: 4,
      reviewsDue: 2,
      studyTimeToday: 25,
      studyTimeWeek: 90,
      conceptsMastered: 3,
      totalConcepts: 10,
      weakSpots: [{ concept: 'Elasticity', mastery: 35, course: 'Econ 101' }],
      weakSpotsDetail: [{
        concept: 'Elasticity',
        mastery: 35,
        course: 'Econ 101',
        source: 'bus',
        reasons: [{ id: 'quiz-wrong', label: '2× quiz mistakes', severity: 'high' }],
        remediation: [{ id: 'quiz', label: 'Quiz', hint: 'Retest' }],
      }],
      toolActivity: [{ tool: 'quiz', count: 2, lastAt: 1 }],
      nextActions: [{ label: 'Review tariffs', type: 'review', minutes: 15, xp: 20 }],
      session,
      nextAction: {
        primary: 'test-me',
        reason: 'Verify understanding with a quick check.',
        secondary: ['flashcards'],
      },
    });

    const html = buildProgressSessionHtml(payload);
    expect(html).toContain('Elasticity');
    expect(html).toContain('62%');
    expect(html).toContain('2× quiz mistakes');
    expect(html).toContain('Test me');
    expect(html).toContain('Quiz ×2');

    const json = JSON.parse(buildProgressSessionJson(payload));
    expect(json.concept).toBe('Elasticity');
    expect(json.weakSpots[0].remediation[0].id).toBe('quiz');
  });

  it('generates stable filenames', () => {
    expect(progressSessionFilename('Price Elasticity', 'html')).toMatch(/^progress-Price-Elasticity-\d{4}-\d{2}-\d{2}\.html$/);
  });
});
