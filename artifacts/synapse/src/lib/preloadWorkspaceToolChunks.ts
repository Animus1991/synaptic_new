/**
 * B10 / B3 — Prefetch workspace tool chunks (reader first, then idle secondary tools).
 */

import { importWithRetry } from './lazyWithRetry';
import { preloadReaderModule } from './cognitiveReaderChunk';
import { workspaceFeatureFlags } from './workspaceFeatureFlags';

const CONCEPT_MAP_LOAD = () => import('../components/workspace/DraggableConceptMap').then((m) => m.DraggableConceptMap);

const SECONDARY_TOOLS: { flow: string; load: () => Promise<unknown> }[] = [
  {
    flow: 'scratchpad',
    load: () => import('../components/workspace/FormulaScratchpad').then((m) => m.FormulaScratchpad),
  },
  {
    flow: 'quiz',
    load: () => import('../components/workspace/QuizPanel').then((m) => m.QuizPanel),
  },
  {
    flow: 'leitner',
    load: () => import('../components/workspace/LeitnerPanel').then((m) => m.LeitnerPanel),
  },
  {
    flow: 'dashboard',
    load: () => import('../components/workspace/DashboardPanel').then((m) => m.DashboardPanel),
  },
];

let primaryStarted = false;
let secondaryStarted = false;

function schedulePrefetch(entry: { flow: string; load: () => Promise<unknown> }, delayMs: number): void {
  const trigger = () => {
    void importWithRetry(entry.load, {
      flow: `prefetch:ws-tool:${entry.flow}`,
      retries: 2,
      reloadOnStaleChunk: false,
    }).catch(() => {
      /* non-fatal */
    });
  };
  if (delayMs <= 0) {
    trigger();
    return;
  }
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(trigger, { timeout: 1200 + delayMs });
  } else {
    window.setTimeout(trigger, delayMs);
  }
}

/** Reader + concept-map — call as soon as workspace shell mounts (default tool is reader). */
export function preloadPrimaryWorkspaceTools(): void {
  if (primaryStarted || typeof window === 'undefined') return;
  primaryStarted = true;
  preloadReaderModule();
  schedulePrefetch({ flow: 'concept-map', load: CONCEPT_MAP_LOAD }, 120);
}

/** Idle prefetch for high-traffic secondary tools. */
export function preloadWorkspaceToolChunks(): void {
  if (secondaryStarted || typeof window === 'undefined') return;
  if (!workspaceFeatureFlags().idlePreload) return;
  secondaryStarted = true;
  preloadPrimaryWorkspaceTools();

  SECONDARY_TOOLS.forEach((entry, i) => {
    schedulePrefetch(entry, 600 + i * 350);
  });
}

/** Reset for unit tests. */
export function resetWorkspaceToolPreloadForTests(): void {
  primaryStarted = false;
  secondaryStarted = false;
}
