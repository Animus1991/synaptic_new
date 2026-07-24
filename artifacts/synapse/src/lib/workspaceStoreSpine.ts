/**
 * §2.1 Store spine — bridges workspace live state, Agent handoff, and Dashboard projections.
 */

import type { AgentWorkspaceContext } from './agentWorkspaceContext';
import type { NextActionRecommendation } from './nextActionEngine';
import type { WorkspaceContext } from './workspaceContextModel';

/** Live workspace state synced from StudyWorkspace while open (and retained briefly after close). */
export type WorkspaceLiveSync = {
  snapshot: WorkspaceContext;
  agentContext: AgentWorkspaceContext;
  nextAction: NextActionRecommendation | null;
  weakConceptCount: number;
  hasSource: boolean;
  quizPassed: boolean;
  stepMark?: 'understood' | 'confusing';
  updatedAt: string;
};

export function createWorkspaceLiveSync(input: Omit<WorkspaceLiveSync, 'updatedAt'>): WorkspaceLiveSync {
  return { ...input, updatedAt: new Date().toISOString() };
}

/**
 * Merge live workspace context with an optional handoff from a specific action
 * (e.g. explain-zero on a section). Handoff wins on overlapping fields.
 */
export function mergeAgentWorkspaceContext(
  live: AgentWorkspaceContext | null | undefined,
  handoff?: AgentWorkspaceContext | null,
): AgentWorkspaceContext | null {
  if (!live && !handoff) return null;
  if (!live) return handoff ?? null;
  if (!handoff) return live;
  return {
    ...live,
    ...handoff,
    courseId: handoff.courseId ?? live.courseId,
    courseName: handoff.courseName ?? live.courseName,
    stepIndex: handoff.stepIndex ?? live.stepIndex,
    stepCount: handoff.stepCount ?? live.stepCount,
    stepTitle: handoff.stepTitle ?? live.stepTitle,
    stepType: handoff.stepType ?? live.stepType,
    concept: handoff.concept ?? live.concept,
    activeTool: handoff.activeTool ?? live.activeTool,
    activeToolLabel: handoff.activeToolLabel ?? live.activeToolLabel,
    sourceQuality: handoff.sourceQuality ?? live.sourceQuality,
    oldPipeline: handoff.oldPipeline ?? live.oldPipeline,
    pipelineVersion: handoff.pipelineVersion ?? live.pipelineVersion,
    lowConfidenceSection: handoff.lowConfidenceSection ?? live.lowConfidenceSection,
    handwrittenSource: handoff.handwrittenSource ?? live.handwrittenSource,
    selectionExcerpt: handoff.selectionExcerpt ?? live.selectionExcerpt,
    graphRelation: handoff.graphRelation ?? live.graphRelation,
  };
}

/** Resolve Agent context: explicit override → live sync → handoff only. */
export function resolveAgentWorkspaceContext(opts: {
  live?: WorkspaceLiveSync | null;
  handoff?: AgentWorkspaceContext | null;
  pinned?: AgentWorkspaceContext | null;
}): AgentWorkspaceContext | null {
  if (opts.pinned) return opts.pinned;
  return mergeAgentWorkspaceContext(opts.live?.agentContext, opts.handoff);
}

export function workspaceLiveIsStale(live: WorkspaceLiveSync | null, maxAgeMs = 30 * 60 * 1000): boolean {
  if (!live) return true;
  const age = Date.now() - new Date(live.updatedAt).getTime();
  return age > maxAgeMs;
}
