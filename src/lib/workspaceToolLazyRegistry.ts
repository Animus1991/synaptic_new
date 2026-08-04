/**
 * Phase B — lazy code-split registry for workspace tool panels.
 * Reader, concept-map & scratchpad lazy-loaded; prefetch on workspace mount / entry hover (B3).
 *
 * PERF (switch speed): every panel loader is registered in a tool→loader map so
 * chunks can be prefetched on switch intent (click/hover) and warmed in idle
 * slices after mount — first-time tool switches then only pay the mount render,
 * not the dynamic import (which in dev also includes on-demand transform).
 */

import { lazyWithRetry } from './lazyWithRetry';
import { loadReaderModule } from './cognitiveReaderChunk';

const toolChunkLoaders = {
  reader: () => loadReaderModule(),
  'concept-map': () => import('../components/workspace/DraggableConceptMap'),
  scratchpad: () => import('../components/workspace/FormulaScratchpad'),
  whiteboard: () => import('../components/workspace/WhiteboardPanel'),
  dashboard: () => import('../components/workspace/DashboardPanel'),
  leitner: () => import('../components/workspace/LeitnerPanel'),
  timer: () => import('../components/workspace/TimerPanel'),
  simulator: () => import('../components/workspace/SimulatorPanel'),
  compare: () => import('../components/workspace/ComparePanel'),
  debate: () => import('../components/workspace/DebatePanel'),
  feynman: () => import('../components/workspace/FeynmanCheck'),
  annotations: () => import('../components/workspace/AnnotationOverlay'),
  quiz: () => import('../components/workspace/QuizPanel'),
  discover: () => import('../components/workspace/WorkspaceDiscoverabilityPanel'),
  'concept-bus': () => import('../components/workspace/ConceptBusPanel'),
  'weak-areas': () => import('../components/workspace/WeakAreasFocusRail'),
} satisfies Record<string, () => Promise<unknown>>;

export type WorkspaceToolChunkId = keyof typeof toolChunkLoaders;

const prefetchedChunks = new Set<WorkspaceToolChunkId>();

/** Warm a panel chunk ahead of mount (switch intent: hover / click / command). */
export function prefetchWorkspaceToolChunk(tool: string): void {
  const loader = (toolChunkLoaders as Record<string, () => Promise<unknown>>)[tool];
  if (!loader || prefetchedChunks.has(tool as WorkspaceToolChunkId)) return;
  prefetchedChunks.add(tool as WorkspaceToolChunkId);
  loader().catch(() => {
    prefetchedChunks.delete(tool as WorkspaceToolChunkId);
  });
}

/**
 * Warm every panel chunk, one per idle slice, so first-time switches never pay
 * the import. Returns a disposer that stops the remaining schedule.
 */
export function prefetchAllWorkspaceToolChunks(): () => void {
  const pending = (Object.keys(toolChunkLoaders) as WorkspaceToolChunkId[])
    .filter((tool) => !prefetchedChunks.has(tool));
  if (typeof window === 'undefined' || pending.length === 0) return () => undefined;
  let disposed = false;
  let cancel: (() => void) | undefined;
  const schedule = (cb: () => void): (() => void) => {
    const ric = window.requestIdleCallback;
    if (typeof ric === 'function') {
      const id = ric(cb, { timeout: 1500 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(cb, 150);
    return () => window.clearTimeout(id);
  };
  const step = () => {
    if (disposed) return;
    const next = pending.shift();
    if (!next) return;
    prefetchWorkspaceToolChunk(next);
    if (pending.length > 0) cancel = schedule(step);
  };
  cancel = schedule(step);
  return () => {
    disposed = true;
    cancel?.();
  };
}

export const LazyCognitiveReader = lazyWithRetry(
  () => toolChunkLoaders.reader().then((m) => ({ default: m.CognitiveReader })),
  'workspace-tool-reader',
);

export const LazyDraggableConceptMap = lazyWithRetry(
  () => toolChunkLoaders['concept-map']().then((m) => ({ default: m.DraggableConceptMap })),
  'workspace-tool-concept-map',
);

export const LazyFormulaScratchpad = lazyWithRetry(
  () => toolChunkLoaders.scratchpad().then((m) => ({ default: m.FormulaScratchpad })),
  'workspace-tool-scratchpad',
);

export const LazyWhiteboardPanel = lazyWithRetry(
  () => toolChunkLoaders.whiteboard().then((m) => ({ default: m.WhiteboardPanel })),
  'workspace-tool-whiteboard',
);

export const LazyDashboardPanel = lazyWithRetry(
  () => toolChunkLoaders.dashboard().then((m) => ({ default: m.DashboardPanel })),
  'workspace-tool-dashboard',
);

export const LazyLeitnerPanel = lazyWithRetry(
  () => toolChunkLoaders.leitner().then((m) => ({ default: m.LeitnerPanel })),
  'workspace-tool-leitner',
);

export const LazyTimerPanel = lazyWithRetry(
  () => toolChunkLoaders.timer().then((m) => ({ default: m.TimerPanel })),
  'workspace-tool-timer',
);

export const LazySimulatorPanel = lazyWithRetry(
  () => toolChunkLoaders.simulator().then((m) => ({ default: m.SimulatorPanel })),
  'workspace-tool-simulator',
);

export const LazyComparePanel = lazyWithRetry(
  () => toolChunkLoaders.compare().then((m) => ({ default: m.ComparePanel })),
  'workspace-tool-compare',
);

export const LazyDebatePanel = lazyWithRetry(
  () => toolChunkLoaders.debate().then((m) => ({ default: m.DebatePanel })),
  'workspace-tool-debate',
);

export const LazyFeynmanCheck = lazyWithRetry(
  () => toolChunkLoaders.feynman().then((m) => ({ default: m.FeynmanCheck })),
  'workspace-tool-feynman',
);

export const LazyAnnotationOverlay = lazyWithRetry(
  () => toolChunkLoaders.annotations().then((m) => ({ default: m.AnnotationOverlay })),
  'workspace-tool-annotations',
);

export const LazyQuizPanel = lazyWithRetry(
  () => toolChunkLoaders.quiz().then((m) => ({ default: m.QuizPanel })),
  'workspace-tool-quiz',
);

export const LazyWorkspaceDiscoverabilityPanel = lazyWithRetry(
  () => toolChunkLoaders.discover().then((m) => ({ default: m.WorkspaceDiscoverabilityPanel })),
  'workspace-intel-discover',
);

export const LazyConceptBusPanel = lazyWithRetry(
  () => toolChunkLoaders['concept-bus']().then((m) => ({ default: m.ConceptBusPanel })),
  'workspace-intel-concept-bus',
);

export const LazyWeakAreasFocusRail = lazyWithRetry(
  () => toolChunkLoaders['weak-areas']().then((m) => ({ default: m.WeakAreasFocusRail })),
  'workspace-intel-weak-areas',
);
