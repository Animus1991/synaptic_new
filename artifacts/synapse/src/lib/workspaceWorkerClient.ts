/**
 * B11 / 1B — shared workspace note-bundle worker (warm on entry prefetch, full build off-thread).
 */

import type { BuildWorkspaceNoteBundleOpts, WorkspaceNoteBundle, WorkspaceNoteGathered } from './workspaceNoteContent';
import { buildWorkspaceNoteBundleFromGathered } from './workspaceNoteContent';
import { markNoteBundleWorkerReady, type WorkspaceTTIMetrics } from './workspacePerf';

export type WorkspaceWorkerBuildOpts = Pick<
  BuildWorkspaceNoteBundleOpts,
  'concept' | 'conceptBars' | 'lang' | 'learnerModel'
>;

export type WorkspaceWorkerRequest = {
  id: string;
  gathered: WorkspaceNoteGathered;
  buildOpts: WorkspaceWorkerBuildOpts;
};

export type WorkspaceWorkerResponse = {
  id: string;
  bundle?: WorkspaceNoteBundle;
  error?: string;
};

let worker: Worker | null = null;
let warmStarted = false;

export function getWorkspaceWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../workers/workspace.worker.ts', import.meta.url), { type: 'module' });
    return worker;
  } catch {
    return null;
  }
}

/** Spawn worker script early so PMI/BM25 path is ready when StudyWorkspace mounts. */
export function warmWorkspaceWorker(): void {
  if (warmStarted || typeof window === 'undefined') return;
  warmStarted = true;
  getWorkspaceWorker();
}

function deferOnMainIdle<T>(fn: () => T): Promise<T> {
  return new Promise((resolve) => {
    const run = () => resolve(fn());
    if (typeof window === 'undefined') {
      run();
      return;
    }
    const ric = window.requestIdleCallback;
    if (typeof ric === 'function') {
      ric(run, { timeout: 2500 });
    } else {
      window.setTimeout(run, 0);
    }
  });
}

function markWorkerBundleReady(
  path: Exclude<WorkspaceTTIMetrics['workerPath'], 'none'>,
  bundle: WorkspaceNoteBundle,
): void {
  markNoteBundleWorkerReady(path, bundle.sourceIntelligence != null);
}

/**
 * Full note bundle off main thread. Falls back to idle-deferred sync build — never blocks first paint.
 */
export function buildNoteBundleInWorker(
  gathered: WorkspaceNoteGathered,
  buildOpts: WorkspaceWorkerBuildOpts,
): Promise<WorkspaceNoteBundle> {
  const w = getWorkspaceWorker();
  if (!w) {
    return deferOnMainIdle(() => {
      const bundle = buildWorkspaceNoteBundleFromGathered(gathered, buildOpts, false);
      markWorkerBundleReady('idle-fallback', bundle);
      return bundle;
    });
  }

  return new Promise((resolve, reject) => {
    const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const onMessage = (ev: MessageEvent<WorkspaceWorkerResponse>) => {
      if (ev.data.id !== id) return;
      w.removeEventListener('message', onMessage);
      if (ev.data.error) {
        deferOnMainIdle(() => {
          const bundle = buildWorkspaceNoteBundleFromGathered(gathered, buildOpts, false);
          markWorkerBundleReady('sync-fallback', bundle);
          return bundle;
        }).then(resolve).catch(reject);
        return;
      }
      if (ev.data.bundle) {
        markWorkerBundleReady('worker', ev.data.bundle);
        resolve(ev.data.bundle);
        return;
      }
      reject(new Error('Worker returned empty bundle'));
    };
    w.addEventListener('message', onMessage);
    try {
      w.postMessage({ id, gathered, buildOpts } satisfies WorkspaceWorkerRequest);
    } catch (err) {
      w.removeEventListener('message', onMessage);
      deferOnMainIdle(() => {
        const bundle = buildWorkspaceNoteBundleFromGathered(gathered, buildOpts, false);
        markWorkerBundleReady('sync-fallback', bundle);
        return bundle;
      }).then(resolve).catch(reject);
      void err;
    }
  });
}

/** Reset singleton for unit tests. */
export function resetWorkspaceWorkerForTests(): void {
  worker?.terminate();
  worker = null;
  warmStarted = false;
}
