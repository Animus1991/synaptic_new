/**
 * Wave 7 / SW-07 — LessonStepToolBar ↔ nextActionEngine parity (Prompt 7 spine).
 */

import type { WorkspaceToolId } from './taskFlows';
import type { NextActionRecommendation } from './nextActionEngine';
import { recommendedToolFromNextAction } from './discoverabilityNextActionSync';
import {
  recommendToolsForStep,
  type WorkspaceStep,
} from './workspaceStepTools';

function lessonRecommendedTool(
  primary: NextActionRecommendation['primary'],
  sourceBestTool: WorkspaceToolId | null,
): WorkspaceToolId | null {
  const base = recommendedToolFromNextAction(primary, sourceBestTool);
  if (primary === 'explain-zero' && !sourceBestTool) return 'feynman';
  return base;
}

export type LessonStepToolbarReport = {
  ok: boolean;
  heuristicTools: WorkspaceToolId[];
  recommendedTool: WorkspaceToolId | null;
  tools: WorkspaceToolId[];
  alignedWithNextAction: boolean;
};

function uniqueTools(tools: WorkspaceToolId[]): WorkspaceToolId[] {
  const seen = new Set<WorkspaceToolId>();
  return tools.filter((tool) => {
    if (seen.has(tool)) return false;
    seen.add(tool);
    return true;
  });
}

/** Merge step heuristics with engine recommendation — recommended tool first. */
export function buildLessonStepToolbarTools(opts: {
  step: WorkspaceStep;
  stepIndex: number;
  stepCount: number;
  nextAction?: NextActionRecommendation | null;
  sourceBestTool?: WorkspaceToolId | null;
}): LessonStepToolbarReport {
  const heuristicTools = recommendToolsForStep(opts.step, opts.stepIndex, opts.stepCount);
  const recommendedTool = opts.nextAction
    ? lessonRecommendedTool(opts.nextAction.primary, opts.sourceBestTool ?? null)
    : null;

  const merged = recommendedTool
    ? uniqueTools([recommendedTool, ...heuristicTools])
    : heuristicTools;

  const alignedWithNextAction = !recommendedTool
    || merged[0] === recommendedTool
    || heuristicTools.includes(recommendedTool);

  return {
    ok: alignedWithNextAction,
    heuristicTools,
    recommendedTool,
    tools: merged,
    alignedWithNextAction,
  };
}

export function lessonStepToolbarBanner(
  report: LessonStepToolbarReport,
  lang: 'en' | 'el',
): string | null {
  if (!report.recommendedTool) return null;
  const isEl = lang === 'el';
  const label = isEl ? 'Επόμενο εργαλείο' : 'Next tool';
  return report.alignedWithNextAction
    ? `${label} · ${report.recommendedTool}`
    : `${label} · ${report.recommendedTool} (${isEl ? 'συγχρονισμένο' : 'synced'})`;
}
