import { describe, expect, it } from 'vitest';
import {
  createWorkspaceLiveSync,
  mergeAgentWorkspaceContext,
  resolveAgentWorkspaceContext,
} from './workspaceStoreSpine';
import type { WorkspaceContextSnapshot } from './workspaceSelectors';

const baseSnapshot: WorkspaceContextSnapshot = {
  courseLabel: 'Micro II',
  sectionLabel: 'Trade',
  sectionTitle: 'Trade',
  stepLabel: 'Βήμα 4/8',
  toolLabel: 'Ανάγνωση',
  toolDescription: 'Κείμενο πηγής',
  stepType: 'core',
  lowConfidenceSection: false,
  genericConcept: false,
  courseId: 'c1',
  stepIndex: 3,
  stepCount: 8,
  activeTool: 'reader',
  activeConcept: 'trade',
  sourceQuality: 37,
  oldPipeline: true,
  pipelineVersion: '2.0.0',
};

describe('workspaceStoreSpine', () => {
  it('merges live context with handoff step override', () => {
    const live = {
      courseId: 'c1',
      courseName: 'Micro II',
      stepIndex: 3,
      stepCount: 8,
      stepTitle: 'Trade',
      concept: 'tariffs',
      activeTool: 'reader',
      activeToolLabel: 'Ανάγνωση',
      sourceQuality: 37,
      oldPipeline: true,
    };
    const handoff = { stepTitle: 'Ricardo model', stepIndex: 5 };
    const merged = mergeAgentWorkspaceContext(live, handoff);
    expect(merged?.stepTitle).toBe('Ricardo model');
    expect(merged?.stepIndex).toBe(5);
    expect(merged?.sourceQuality).toBe(37);
  });

  it('preserves graphRelation from handoff when live lacks it', () => {
    const live = { courseId: 'c1', concept: 'Supply & Demand' };
    const handoff = {
      graphRelation: {
        sourceLabel: 'Supply & Demand',
        targetLabel: 'Elasticity',
        relationType: 'prerequisite' as const,
        weight: 0.9,
      },
    };
    const merged = mergeAgentWorkspaceContext(live, handoff);
    expect(merged?.graphRelation?.targetLabel).toBe('Elasticity');
  });

  it('resolveAgent prefers pinned over live', () => {
    const live = createWorkspaceLiveSync({
      snapshot: baseSnapshot,
      agentContext: { concept: 'live' },
      nextAction: null,
      weakConceptCount: 0,
      hasSource: true,
      quizPassed: false,
    });
    const pinned = { concept: 'pinned' };
    expect(resolveAgentWorkspaceContext({ live, pinned })?.concept).toBe('pinned');
  });

  it('createWorkspaceLiveSync stamps updatedAt', () => {
    const sync = createWorkspaceLiveSync({
      snapshot: baseSnapshot,
      agentContext: { concept: 'x' },
      nextAction: null,
      weakConceptCount: 1,
      hasSource: true,
      quizPassed: false,
    });
    expect(sync.updatedAt).toBeTruthy();
  });
});
