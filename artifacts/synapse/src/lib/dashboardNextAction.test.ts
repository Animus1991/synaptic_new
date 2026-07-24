import { describe, expect, it } from 'vitest';
import { selectDashboardNextAction } from './dashboardNextAction';
import type { LearnerModel, Task } from '../types';
import { mockLearnerModel, mockDashboardStats, mockTasks } from '../demo/mockData';
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

describe('selectDashboardNextAction', () => {
  it('returns null when fresh workspace live has next action', () => {
    const live = createWorkspaceLiveSync({
      snapshot,
      agentContext: { concept: 'x' },
      nextAction: { primary: 'study-section', reason: 'read', secondary: [] },
      weakConceptCount: 0,
      hasSource: true,
      quizPassed: false,
    });
    expect(
      selectDashboardNextAction({
        lang: 'en',
        learnerModel: mockLearnerModel,
        tasks: mockTasks,
        stats: mockDashboardStats,
        workspaceLive: live,
      }),
    ).toBeNull();
  });

  it('suggests weak area when no workspace session', () => {
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
    const action = selectDashboardNextAction({
      lang: 'en',
      learnerModel: lm,
      tasks: mockTasks.filter((t) => t.status === 'completed') as Task[],
      stats: { ...mockDashboardStats, reviewsDue: 0 },
      workspaceLive: null,
    });
    expect(action?.kind).toBe('weak-area');
    expect(action?.concept).toBe('Elasticity');
    expect(action?.workspaceTool).toBe('quiz');
  });

  it('suggests critical task over weak area', () => {
    const critical: Task = {
      ...mockTasks[0]!,
      id: 'crit-1',
      status: 'pending',
      priority: 'critical',
      title: 'Fix tariffs quiz',
    };
    const action = selectDashboardNextAction({
      lang: 'el',
      learnerModel: mockLearnerModel,
      tasks: [critical],
      stats: mockDashboardStats,
      workspaceLive: null,
      daysToExam: null,
    });
    expect(action?.kind).toBe('critical-task');
    expect(action?.taskId).toBe('crit-1');
  });

  it('suggests exam prep when countdown is within 14 days', () => {
    const action = selectDashboardNextAction({
      lang: 'en',
      learnerModel: mockLearnerModel,
      tasks: mockTasks,
      stats: mockDashboardStats,
      workspaceLive: null,
      daysToExam: 5,
    });
    expect(action?.kind).toBe('exam-prep');
    expect(action?.workspaceTool).toBe('simulator');
    expect(action?.simulatorTab).toBe('exam-prep');
  });
});
