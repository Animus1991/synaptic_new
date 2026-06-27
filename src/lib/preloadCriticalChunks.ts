/**
 * Idle-time prefetch for the chunks behind the most common user flows.
 * Reduces the chance of getting stranded on a spinner when a flow is opened
 * for the first time on a flaky network.
 *
 * Each entry uses `importWithRetry` so transient failures don't poison the
 * cached module promise — the lazy boundary will simply re-trigger on demand.
 */

import { importWithRetry } from './lazyWithRetry';
import { preloadStudyWorkspace } from './studyWorkspaceChunk';

interface PrefetchEntry {
  flow: string;
  load: () => Promise<unknown>;
}

const ENTRIES: PrefetchEntry[] = [
  { flow: 'agent', load: () => import('../components/Agent') },
  { flow: 'analytics', load: () => import('../components/Analytics') },
  { flow: 'teacher', load: () => import('../components/TeacherDashboard') },
  { flow: 'lesson', load: () => import('../components/LessonView') },
  { flow: 'practical-lesson', load: () => import('../components/PracticalLessonView') },
  { flow: 'review-session', load: () => import('../components/ReviewSessionView') },
];

let started = false;

export function preloadCriticalChunks(): void {
  if (started || typeof window === 'undefined') return;
  started = true;

  // Workspace first — biggest single chunk, highest blast radius.
  preloadStudyWorkspace();

  // Schedule the rest with small staggering so we don't saturate the network
  // while the user is still loading visible content.
  ENTRIES.forEach((entry, i) => {
    const trigger = () => {
      void importWithRetry(entry.load, { flow: `prefetch:${entry.flow}`, retries: 2, reloadOnStaleChunk: false }).catch(() => {
        /* prefetch failures are non-fatal — the lazy boundary handles re-attempts */
      });
    };
    const delay = 400 + i * 250;
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(trigger, { timeout: 2000 + delay });
    } else {
      window.setTimeout(trigger, delay);
    }
  });
}
