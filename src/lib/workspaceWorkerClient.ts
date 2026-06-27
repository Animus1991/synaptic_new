/**
 * B11 — shared workspace note-bundle worker (warm on entry prefetch, use on mount).
 */

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

/** Reset singleton for unit tests. */
export function resetWorkspaceWorkerForTests(): void {
  worker?.terminate();
  worker = null;
  warmStarted = false;
}
