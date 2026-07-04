import { describe, expect, it } from 'vitest';
import {
  buildConceptQueue,
  examPacingState,
  recommendDailyPlan,
  scoreConceptPriority,
} from './unifiedAdaptiveScheduler';
import { mockLearnerModel, mockDashboardStats, mockTasks } from '../demo/mockData';
import type { LearnerModel, SpacingData, Task } from '../types';
import type { BetaMastery } from './pedagogy';
import { createWorkspaceLiveSync } from './workspaceStoreSpine';
import type { WorkspaceContextSnapshot } from './workspaceSelectors';

const snapshot: WorkspaceContextSnapshot = {
  courseLabel: 'Micro',
  sectionLabel: 'Trade',
  sectionTitle: 'Trade',
  stepLabel: 'Step 2/8',
  toolLabel: 'Reader',
  toolDescription: 'Source',
  stepType: 'core',
  lowConfidenceSection: false,
  genericConcept: false,
  stepIndex: 1,
  stepCount: 8,
  activeTool: 'reader',
  activeConcept: 'x',
  sourceQuality: 80,
  oldPipeline: false,
};

const now = new Date('2026-07-01T12:00:00.000Z');

describe('scoreConceptPriority', () => {
  it('boosts overdue FSRS reviews', () => {
    const spacing: SpacingData = {
      concept: 'Elasticity',
      interval: 3,
      nextReview: '2026-06-28T00:00:00.000Z',
      stability: 2,
      difficulty: 0.5,
      reviewCount: 2,
    };
    const scored = scoreConceptPriority({
      concept: 'Elasticity',
      spacing,
      weakMastery: 45,
      now,
    });
    expect(scored.fsrsDue).toBe(true);
    expect(scored.priority).toBeGreaterThan(50);
    expect(scored.reasons).toContain('fsrs-due');
  });

  it('applies exam pacing boost for weak concepts', () => {
    const base = scoreConceptPriority({
      concept: 'Tariffs',
      weakMastery: 35,
      now,
      examPacing: examPacingState(5),
    });
    const calm = scoreConceptPriority({
      concept: 'Tariffs',
      weakMastery: 35,
      now,
      examPacing: examPacingState(null),
    });
    expect(base.priority).toBeGreaterThan(calm.priority);
    expect(base.reasons).toContain('exam-pacing');
  });
});

describe('buildConceptQueue', () => {
  it('ranks due + weak concepts above stable ones', () => {
    const lm: LearnerModel = {
      ...mockLearnerModel,
      spacingIntervals: [
        {
          concept: 'DueConcept',
          interval: 1,
          nextReview: '2026-06-30T00:00:00.000Z',
          stability: 1,
          difficulty: 0.4,
          reviewCount: 1,
        },
      ],
      weakAreas: [
        {
          concept: 'StableConcept',
          courseId: 'c1',
          mastery: 85,
          lastPracticed: '',
          retentionPrediction: 0.9,
          practiceCount: 10,
          averageResponseTime: 2,
          errorRate: 0.1,
        },
        {
          concept: 'WeakConcept',
          courseId: 'c1',
          mastery: 28,
          lastPracticed: '',
          retentionPrediction: 0.3,
          practiceCount: 2,
          averageResponseTime: 5,
          errorRate: 0.6,
        },
      ],
    };
    const beta: BetaMastery[] = [
      { concept: 'WeakConcept', alpha: 2, beta: 8, firstAttempts: 3, importance: 1.2 },
    ];
    const queue = buildConceptQueue({ learnerModel: lm, betaMastery: beta, now });
    expect(queue[0]?.concept).toBe('DueConcept');
    expect(queue.some((c) => c.concept === 'WeakConcept')).toBe(true);
  });
});

describe('recommendDailyPlan', () => {
  it('returns null dashboard action when workspace live is fresh', () => {
    const live = createWorkspaceLiveSync({
      snapshot,
      agentContext: { concept: 'x' },
      nextAction: { primary: 'study-section', reason: 'read', secondary: [] },
      weakConceptCount: 0,
      hasSource: true,
      quizPassed: false,
    });
    const plan = recommendDailyPlan({
      lang: 'en',
      learnerModel: mockLearnerModel,
      betaMastery: [],
      tasks: mockTasks,
      stats: mockDashboardStats,
      workspaceLive: live,
    });
    expect(plan.dashboardAction).toBeNull();
  });

  it('suggests weak area from concept queue when no workspace session', () => {
    const lm: LearnerModel = {
      ...mockLearnerModel,
      spacingIntervals: [],
      weakAreas: [
        {
          concept: 'Elasticity',
          courseId: 'c1',
          mastery: 32,
          lastPracticed: '',
          retentionPrediction: 0.3,
          practiceCount: 2,
          averageResponseTime: 4,
          errorRate: 0.6,
        },
      ],
    };
    const plan = recommendDailyPlan({
      lang: 'en',
      learnerModel: lm,
      betaMastery: [{ concept: 'Elasticity', alpha: 2, beta: 7, firstAttempts: 2, importance: 1 }],
      tasks: mockTasks.filter((t) => t.status === 'completed') as Task[],
      stats: { ...mockDashboardStats, reviewsDue: 0 },
      workspaceLive: null,
    });
    expect(plan.dashboardAction?.kind).toBe('weak-area');
    expect(plan.dashboardAction?.concept).toBe('Elasticity');
  });

  it('suggests critical task over weak area', () => {
    const critical: Task = {
      ...mockTasks[0]!,
      id: 'crit-1',
      status: 'pending',
      priority: 'critical',
      title: 'Fix tariffs quiz',
    };
    const plan = recommendDailyPlan({
      lang: 'el',
      learnerModel: mockLearnerModel,
      betaMastery: [],
      tasks: [critical],
      stats: mockDashboardStats,
      workspaceLive: null,
      daysToExam: null,
    });
    expect(plan.dashboardAction?.kind).toBe('critical-task');
    expect(plan.dashboardAction?.taskId).toBe('crit-1');
  });

  it('suggests exam prep when countdown is within 14 days', () => {
    const plan = recommendDailyPlan({
      lang: 'en',
      learnerModel: mockLearnerModel,
      betaMastery: [],
      tasks: mockTasks,
      stats: mockDashboardStats,
      workspaceLive: null,
      daysToExam: 5,
    });
    expect(plan.dashboardAction?.kind).toBe('exam-prep');
    expect(plan.examPacing.active).toBe(true);
  });

  it('suggests feynman for weak area after quiz fail streak', () => {
    const lm: LearnerModel = {
      ...mockLearnerModel,
      spacingIntervals: [],
      weakAreas: [
        {
          concept: 'Elasticity',
          courseId: 'c1',
          mastery: 32,
          lastPracticed: '',
          retentionPrediction: 0.3,
          practiceCount: 2,
          averageResponseTime: 4,
          errorRate: 0.6,
        },
      ],
    };
    const activities = [
      { id: '1', type: 'quiz_failed' as const, description: 'Missed quiz on Elasticity', timestamp: '2026-07-04T12:00:00Z' },
      { id: '2', type: 'quiz_failed' as const, description: 'Missed quiz on Elasticity', timestamp: '2026-07-04T11:00:00Z' },
      { id: '3', type: 'quiz_failed' as const, description: 'Missed quiz on Elasticity', timestamp: '2026-07-04T10:00:00Z' },
    ];
    const plan = recommendDailyPlan({
      lang: 'en',
      learnerModel: lm,
      betaMastery: [{ concept: 'Elasticity', alpha: 2, beta: 7, firstAttempts: 2, importance: 1 }],
      tasks: mockTasks.filter((t) => t.status === 'completed') as Task[],
      stats: { ...mockDashboardStats, reviewsDue: 0 },
      workspaceLive: null,
      activities,
    });
    expect(plan.dashboardAction?.kind).toBe('weak-area');
    expect(plan.dashboardAction?.workspaceTool).toBe('feynman');
  });

  it('returns workspace action when workspace opts provided', () => {
    const plan = recommendDailyPlan({
      lang: 'en',
      learnerModel: mockLearnerModel,
      betaMastery: [],
      tasks: mockTasks,
      stats: mockDashboardStats,
      workspace: {
        lang: 'en',
        hasSource: true,
        sourceQuality: 40,
        showMigration: false,
        showLowQuality: true,
        stepIndex: 0,
        stepCount: 5,
        quizPassed: false,
        weakConceptCount: 0,
      },
    });
    expect(plan.workspaceAction?.primary).toBe('reprocess');
  });

  it('orders study plan blocks using concept queue', () => {
    const tasks: Task[] = [
      {
        ...mockTasks[0]!,
        id: 'r1',
        title: 'Review Elasticity',
        status: 'pending',
        isSpacedRepetition: true,
        category: 'review',
        tags: ['Elasticity'],
      },
      {
        ...mockTasks[0]!,
        id: 'r2',
        title: 'Review Stable topic',
        status: 'pending',
        isSpacedRepetition: true,
        category: 'review',
        tags: ['Stable'],
      },
    ];
    const lm: LearnerModel = {
      ...mockLearnerModel,
      spacingIntervals: [
        {
          concept: 'Elasticity',
          interval: 1,
          nextReview: '2026-06-29T00:00:00.000Z',
          stability: 1,
          difficulty: 0.5,
          reviewCount: 1,
        },
      ],
    };
    const plan = recommendDailyPlan({
      lang: 'en',
      learnerModel: lm,
      betaMastery: [],
      tasks,
      stats: mockDashboardStats,
      now,
    });
    const reviewBlock = plan.studyPlanBlocks.find((b) => b.items.length > 0);
    expect(reviewBlock?.items[0]).toContain('Elasticity');
  });
});
