/**
 * TOOL-PR-02 — Per-tool dwell / time-on-tool for the workspace session.
 */

import type { WorkspaceToolId } from './taskFlows';

export type ToolTimeState = {
  /** Accumulated milliseconds per tool. */
  msByTool: Partial<Record<WorkspaceToolId, number>>;
  activeTool: WorkspaceToolId | null;
  activeStartedAt: number | null;
};

export function createToolTimeState(): ToolTimeState {
  return { msByTool: {}, activeTool: null, activeStartedAt: null };
}

/** Flush current dwell into the previous tool, then start timing `nextTool`. */
export function switchToolTime(
  state: ToolTimeState,
  nextTool: WorkspaceToolId | null,
  now: number = Date.now(),
): ToolTimeState {
  const msByTool = { ...state.msByTool };
  if (state.activeTool && state.activeStartedAt != null) {
    const delta = Math.max(0, now - state.activeStartedAt);
    msByTool[state.activeTool] = (msByTool[state.activeTool] ?? 0) + delta;
  }
  return {
    msByTool,
    activeTool: nextTool,
    activeStartedAt: nextTool ? now : null,
  };
}

/** Snapshot including open dwell segment (without mutating). */
export function snapshotToolTimeMs(
  state: ToolTimeState,
  now: number = Date.now(),
): Partial<Record<WorkspaceToolId, number>> {
  const out = { ...state.msByTool };
  if (state.activeTool && state.activeStartedAt != null) {
    const delta = Math.max(0, now - state.activeStartedAt);
    out[state.activeTool] = (out[state.activeTool] ?? 0) + delta;
  }
  return out;
}

export function formatToolTimeMinutes(ms: number): string {
  const mins = Math.max(0, Math.round(ms / 60_000));
  if (mins < 1 && ms >= 1_000) return '<1m';
  return `${mins}m`;
}

export type ToolTimeRow = { tool: WorkspaceToolId; ms: number; minutesLabel: string };

export function buildToolTimeBreakdown(
  msByTool: Partial<Record<WorkspaceToolId, number>>,
  limit = 13,
): ToolTimeRow[] {
  return (Object.entries(msByTool) as [WorkspaceToolId, number][])
    .filter(([, ms]) => ms > 0)
    .map(([tool, ms]) => ({ tool, ms, minutesLabel: formatToolTimeMinutes(ms) }))
    .sort((a, b) => b.ms - a.ms)
    .slice(0, limit);
}
