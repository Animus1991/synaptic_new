/**
 * Wave 5C — single spine: nextActionEngine drives Discoverability recommendations.
 */

import type { WorkspaceToolId } from './taskFlows';
import type { DiscoverabilityActionId } from './workspaceDiscoverability';
import type { NextActionId, NextActionRecommendation } from './nextActionEngine';

/** Map engine primary action → workspace tool for «recommended tool» CTA. */
export function recommendedToolFromNextAction(
  primary: NextActionId,
  sourceBestTool: WorkspaceToolId | null,
): WorkspaceToolId | null {
  switch (primary) {
    case 'study-section':
      return 'reader';
    case 'test-me':
      return 'quiz';
    case 'flashcards':
      return 'leitner';
    case 'explain-zero':
    case 'ask-agent':
      return sourceBestTool ?? 'reader';
    case 'reprocess':
      return null;
    default:
      return sourceBestTool;
  }
}

/** Map engine primary → discoverability quick-action id (when applicable). */
export function discoverabilityActionFromNextAction(
  primary: NextActionId,
): DiscoverabilityActionId | null {
  switch (primary) {
    case 'study-section':
      return 'open-reader-focus';
    case 'test-me':
      return 'jump-quiz';
    case 'flashcards':
      return 'open-leitner-due';
    default:
      return null;
  }
}

/** Prepend aligned quick action so panel shortcuts match the engine. */
export function prioritizeQuickActionsForNextAction(
  quickActionIds: DiscoverabilityActionId[],
  primary: NextActionId,
): DiscoverabilityActionId[] {
  const aligned = discoverabilityActionFromNextAction(primary);
  if (!aligned) return quickActionIds;
  return [aligned, ...quickActionIds.filter((id) => id !== aligned)];
}

export function applyNextActionToDiscoverability(opts: {
  nextAction: NextActionRecommendation | null | undefined;
  sourceBestTool: WorkspaceToolId | null;
  subline: string;
  quickActionIds: DiscoverabilityActionId[];
}): {
  subline: string;
  recommendedTool: WorkspaceToolId | null;
  quickActionIds: DiscoverabilityActionId[];
  nextAction: NextActionRecommendation | null;
} {
  const { nextAction, sourceBestTool, subline, quickActionIds } = opts;
  if (!nextAction) {
    return {
      subline,
      recommendedTool: sourceBestTool,
      quickActionIds,
      nextAction: null,
    };
  }
  return {
    subline: nextAction.reason,
    recommendedTool: recommendedToolFromNextAction(nextAction.primary, sourceBestTool),
    quickActionIds: prioritizeQuickActionsForNextAction(quickActionIds, nextAction.primary),
    nextAction,
  };
}
