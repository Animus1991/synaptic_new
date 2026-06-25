import { describe, expect, it } from 'vitest';
import { auditProgressConceptBusMirror } from './progressConceptBusMirrorQA';
import type { DashboardSessionContent } from './dashboardSessionModel';

const session: DashboardSessionContent = {
  sectionLabel: 'Markets',
  weakExtraction: false,
  passageGrounded: false,
  hasSource: true,
  weakSpotCount: 1,
  toolActivityCount: 4,
  engagedToolCount: 2,
  suggestFocusTool: 'feynman',
};

describe('progressConceptBusMirrorQA', () => {
  it('mirrors concept bus, feynman activity, and next action in export', () => {
    const report = auditProgressConceptBusMirror({
      lang: 'en',
      concept: 'Elasticity',
      conceptBusRows: [{
        key: 'elasticity',
        concept: 'Elasticity',
        tools: ['quiz', 'feynman'],
        lastTool: 'feynman',
        signals: ['explained'],
        engagement: 3,
        struggling: true,
        confident: false,
        lastAt: 1,
        isFocus: true,
      }],
      toolActivity: [
        { tool: 'quiz', count: 2, lastAt: 1 },
        { tool: 'feynman', count: 1, lastAt: 2 },
      ],
      weakSpotsDetail: [{
        concept: 'Elasticity',
        mastery: 35,
        course: 'Econ 101',
        source: 'bus',
        reasons: [{ id: 'quiz-wrong', label: '2├Ω quiz mistakes', severity: 'high' }],
        remediation: [{ id: 'feynman', label: 'Feynman', hint: 'Explain' }],
      }],
      session,
      nextAction: {
        primary: 'explain-zero',
        reason: 'Explain the concept in your own words.',
        secondary: ['test-me'],
      },
      readiness: 55,
      streak: 2,
      reviewsDue: 1,
      conceptsMastered: 2,
      totalConcepts: 8,
      nextActions: [],
    });

    expect(report.ok).toBe(true);
    expect(report.feynmanActivityCount).toBe(1);
    expect(report.exportIncludesBus).toBe(true);
    expect(report.bannerSummary).toContain('Feynman ├Ω1');
  });
});
