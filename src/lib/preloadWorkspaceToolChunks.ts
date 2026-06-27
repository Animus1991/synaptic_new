/**
 * B10 — Prefetch top workspace tool chunks on idle (quiz, leitner, dashboard).
 */

import { importWithRetry } from './lazyWithRetry';
import { workspaceFeatureFlags } from './workspaceFeatureFlags';

const TOP_TOOLS: { flow: string; load: () => Promise<unknown> }[] = [
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

let started = false;

export function preloadWorkspaceToolChunks(): void {
  if (started || typeof window === 'undefined') return;
  if (!workspaceFeatureFlags().idlePreload) return;
  started = true;

  TOP_TOOLS.forEach((entry, i) => {
    const trigger = () => {
      void importWithRetry(entry.load, {
        flow: `prefetch:ws-tool:${entry.flow}`,
        retries: 2,
        reloadOnStaleChunk: false,
      }).catch(() => {
        /* non-fatal */
      });
    };
    const delay = 600 + i * 350;
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(trigger, { timeout: 2500 + delay });
    } else {
      window.setTimeout(trigger, delay);
    }
  });
}

/** Reset for unit tests. */
export function resetWorkspaceToolPreloadForTests(): void {
  started = false;
}
