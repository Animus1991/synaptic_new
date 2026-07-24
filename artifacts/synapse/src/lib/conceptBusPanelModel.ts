/**
 * View-model for the Concept Bus panel — maps raw bus state into rows that
 * surface term ↔ tool activity correlation for the workspace UI.
 */

import type { WorkspaceToolId } from './taskFlows';
import { normalizeFocusTerm } from './workspaceFocus';
import {
  conceptEngagement,
  isConfident,
  isStruggling,
  recentConcepts,
  type ConceptActivity,
  type ConceptBusState,
  type ConceptSignal,
} from './workspaceConceptBus';

export type ConceptBusRow = {
  key: string;
  concept: string;
  tools: WorkspaceToolId[];
  lastTool?: WorkspaceToolId;
  signals: ConceptSignal[];
  engagement: number;
  struggling: boolean;
  confident: boolean;
  lastAt: number;
  isFocus: boolean;
};

export function buildConceptBusRows(
  state: ConceptBusState,
  focusTerm?: string,
  limit = 12,
): ConceptBusRow[] {
  const focusKey = focusTerm ? normalizeFocusTerm(focusTerm) : '';
  return recentConcepts(state, limit).map((activity) => rowFromActivity(activity, focusKey));
}

export function rowFromActivity(activity: ConceptActivity, focusKey = ''): ConceptBusRow {
  return {
    key: activity.key,
    concept: activity.concept,
    tools: activity.tools,
    lastTool: activity.lastTool,
    signals: activity.signals.slice(-6),
    engagement: conceptEngagement(activity),
    struggling: isStruggling(activity),
    confident: isConfident(activity),
    lastAt: activity.lastAt,
    isFocus: Boolean(focusKey && activity.key === focusKey),
  };
}

/** Distinct tools engaged this session (for correlation chips). */
export function engagedToolCount(state: ConceptBusState): number {
  const tools = new Set<WorkspaceToolId>();
  for (const activity of Object.values(state)) {
    for (const t of activity.tools) tools.add(t);
  }
  return tools.size;
}

export type ToolActivityCount = {
  tool: WorkspaceToolId;
  count: number;
  lastAt: number;
  /** Dwell milliseconds this session (TOOL-PR-02). */
  ms?: number;
};

/** Per-tool engagement counts for Progress / MiniDashboard breakdown. */
export function buildToolActivityBreakdown(state: ConceptBusState, limit = 13): ToolActivityCount[] {
  const counts = new Map<WorkspaceToolId, { count: number; lastAt: number }>();
  for (const activity of Object.values(state)) {
    const hits = activity.toolHitCounts ?? {};
    for (const [tool, hitCount] of Object.entries(hits) as [WorkspaceToolId, number][]) {
      const prev = counts.get(tool) ?? { count: 0, lastAt: 0 };
      counts.set(tool, {
        count: prev.count + hitCount,
        lastAt: Math.max(prev.lastAt, activity.lastAt),
      });
    }
  }
  return [...counts.entries()]
    .map(([tool, meta]) => ({ tool, ...meta }))
    .sort((a, b) => b.lastAt - a.lastAt || b.count - a.count)
    .slice(0, limit);
}

/** Attach dwell ms onto activity rows (and include time-only tools). */
export function attachToolTimeToActivity(
  activity: ToolActivityCount[],
  msByTool: Partial<Record<WorkspaceToolId, number>>,
): ToolActivityCount[] {
  const byTool = new Map(activity.map((row) => [row.tool, { ...row }]));
  for (const [tool, ms] of Object.entries(msByTool) as [WorkspaceToolId, number][]) {
    if (!ms || ms <= 0) continue;
    const prev = byTool.get(tool);
    if (prev) {
      byTool.set(tool, { ...prev, ms });
    } else {
      byTool.set(tool, { tool, count: 0, lastAt: Date.now(), ms });
    }
  }
  return [...byTool.values()].sort(
    (a, b) => (b.ms ?? 0) - (a.ms ?? 0) || b.lastAt - a.lastAt || b.count - a.count,
  );
}
