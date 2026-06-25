/**
 * Progress / Dashboard session view-model — weak-area metadata, tool activity,
 * and focus suggestions for the workspace Dashboard tool.
 */

import type { WorkspaceToolId } from './taskFlows';
import type { ToolActivityCount } from './conceptBusPanelModel';
import { buildToolActivityBreakdown, engagedToolCount } from './conceptBusPanelModel';
import type { ConceptBusState } from './workspaceConceptBus';
import { isGenericStudyConcept } from './workspaceContentFallback';

export type DashboardWeakSpot = { concept: string; mastery: number; course: string };

export type DashboardSessionContent = {
  sectionLabel?: string;
  weakExtraction: boolean;
  passageGrounded: boolean;
  hasSource: boolean;
  weakSpotCount: number;
  toolActivityCount: number;
  engagedToolCount: number;
  suggestFocusTool: WorkspaceToolId | null;
};

export function suggestDashboardFocusTool(opts: {
  leitnerDueCount: number;
  weakSpotCount: number;
  reviewsDue: number;
  conceptMastery: number;
}): WorkspaceToolId | null {
  if (opts.leitnerDueCount > 0) return 'leitner';
  if (opts.weakSpotCount > 0) return 'reader';
  if (opts.reviewsDue > 0) return 'quiz';
  if (opts.conceptMastery < 40) return 'feynman';
  return null;
}

export function filterDashboardWeakSpots(spots: DashboardWeakSpot[], query: string): DashboardWeakSpot[] {
  const q = query.trim().toLowerCase();
  if (!q) return spots;
  return spots.filter(
    (spot) =>
      spot.concept.toLowerCase().includes(q)
      || spot.course.toLowerCase().includes(q),
  );
}

export function filterDashboardToolActivity(
  activity: ToolActivityCount[],
  query: string,
): ToolActivityCount[] {
  const q = query.trim().toLowerCase();
  if (!q) return activity;
  return activity.filter((row) => row.tool.toLowerCase().includes(q));
}

/** Session tool breakdown for Progress panel — wraps concept bus hit counts. */
export function buildDashboardToolActivity(conceptBus?: ConceptBusState): ToolActivityCount[] {
  return conceptBus ? buildToolActivityBreakdown(conceptBus) : [];
}

export function buildDashboardSessionContent(opts: {
  concept: string;
  sectionLabel?: string;
  hasSource: boolean;
  conceptMastery: number;
  weakSpotCount: number;
  leitnerDueCount?: number;
  reviewsDue?: number;
  conceptBus?: ConceptBusState;
}): DashboardSessionContent {
  const {
    concept,
    sectionLabel,
    hasSource,
    conceptMastery,
    weakSpotCount,
    leitnerDueCount = 0,
    reviewsDue = 0,
    conceptBus,
  } = opts;

  if (!hasSource) {
    return {
      sectionLabel,
      weakExtraction: true,
      passageGrounded: false,
      hasSource: false,
      weakSpotCount: 0,
      toolActivityCount: 0,
      engagedToolCount: 0,
      suggestFocusTool: null,
    };
  }

  const generic = isGenericStudyConcept(concept);
  const toolActivity = buildDashboardToolActivity(conceptBus);
  const toolActivityCount = toolActivity.reduce((sum, row) => sum + row.count, 0);

  return {
    sectionLabel,
    weakExtraction: generic,
    passageGrounded: generic && weakSpotCount > 0,
    hasSource: true,
    weakSpotCount,
    toolActivityCount,
    engagedToolCount: conceptBus ? engagedToolCount(conceptBus) : 0,
    suggestFocusTool: suggestDashboardFocusTool({
      leitnerDueCount,
      weakSpotCount,
      reviewsDue,
      conceptMastery,
    }),
  };
}
