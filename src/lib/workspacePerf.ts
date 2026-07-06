/**
 * Study Workspace TTI marks — Continue click → shell paint → intel → worker bundle.
 * Exposed on documentElement.dataset for DevTools + Settings developer panel.
 */

export type WorkspaceTTIMetrics = {
  continueMs?: number;
  moduleMs?: number;
  shellMs?: number;
  bodyMs?: number;
  intelMs?: number;
  bundleShellMs?: number;
  bundleWorkerMs?: number;
  workerPath: 'worker' | 'idle-fallback' | 'sync-fallback' | 'none';
  textChars?: number;
  /** True when worker/full bundle included sourceIntelligence (BM25/PMI path). */
  hasSourceIntel?: boolean;
};

export type WorkspacePerfBudget = {
  interactiveMs: number;
  budgetMs: number;
  withinBudget: boolean;
};

/** B11/L12 — default Continue → interactive budget (matches dev e2e gate). */
export const WORKSPACE_INTERACTIVE_BUDGET_MS = 12_000;

const marks = {
  continueAt: 0,
  moduleAt: 0,
  shellAt: 0,
  bodyAt: 0,
  intelAt: 0,
  bundleShellAt: 0,
  bundleWorkerAt: 0,
  workerPath: 'none' as WorkspaceTTIMetrics['workerPath'],
  textChars: 0,
  hasSourceIntel: false,
};

function sinceContinue(): number | undefined {
  return marks.continueAt > 0 ? Math.round(performance.now() - marks.continueAt) : undefined;
}

function publish(): void {
  if (typeof document === 'undefined') return;
  const m = getWorkspaceTTIMetrics();
  document.documentElement.dataset.workspaceTti = JSON.stringify(m);
  if (import.meta.env.DEV) {
    console.debug('[workspace-tti]', m);
  }
}

export function markWorkspaceContinue(): void {
  marks.continueAt = performance.now();
  marks.moduleAt = 0;
  marks.shellAt = 0;
  marks.bodyAt = 0;
  marks.intelAt = 0;
  marks.bundleShellAt = 0;
  marks.bundleWorkerAt = 0;
  marks.workerPath = 'none';
  marks.textChars = 0;
  marks.hasSourceIntel = false;
  publish();
}

export function markWorkspaceModuleLoaded(): void {
  if (marks.continueAt <= 0) return;
  marks.moduleAt = performance.now();
  publish();
}

export function markWorkspaceShellPaint(): void {
  if (marks.continueAt <= 0) return;
  marks.shellAt = performance.now();
  publish();
}

export function markWorkspaceBodyReady(): void {
  if (marks.continueAt <= 0) return;
  marks.bodyAt = performance.now();
  publish();
}

export function markWorkspaceIntelReady(): void {
  if (marks.continueAt <= 0) return;
  marks.intelAt = performance.now();
  publish();
}

export function markNoteBundleShellReady(textChars = 0): void {
  if (marks.continueAt <= 0) return;
  marks.bundleShellAt = performance.now();
  marks.textChars = textChars;
  publish();
}

export function markNoteBundleWorkerReady(
  path: Exclude<WorkspaceTTIMetrics['workerPath'], 'none'>,
  hasSourceIntel = false,
): void {
  if (marks.continueAt <= 0) return;
  marks.bundleWorkerAt = performance.now();
  marks.workerPath = path;
  marks.hasSourceIntel = hasSourceIntel;
  publish();
}

export function getWorkspaceTTIMetrics(): WorkspaceTTIMetrics {
  const base = marks.continueAt;
  const delta = (at: number) => (base > 0 && at > 0 ? Math.round(at - base) : undefined);
  return {
    continueMs: sinceContinue(),
    moduleMs: delta(marks.moduleAt),
    shellMs: delta(marks.shellAt),
    bodyMs: delta(marks.bodyAt),
    intelMs: delta(marks.intelAt),
    bundleShellMs: delta(marks.bundleShellAt),
    bundleWorkerMs: delta(marks.bundleWorkerAt),
    workerPath: marks.workerPath,
    textChars: marks.textChars || undefined,
    hasSourceIntel: marks.hasSourceIntel || undefined,
  };
}

/** Evaluate interactive TTI against budget (body ready or intel ready). */
export function evaluateWorkspacePerfBudget(
  metrics: WorkspaceTTIMetrics = getWorkspaceTTIMetrics(),
  budgetMs = WORKSPACE_INTERACTIVE_BUDGET_MS,
): WorkspacePerfBudget {
  const interactiveMs =
    metrics.bodyMs != null ? metrics.bodyMs
    : metrics.intelMs != null ? metrics.intelMs
    : metrics.shellMs != null ? metrics.shellMs
    : metrics.continueMs ?? 0;
  return {
    interactiveMs,
    budgetMs,
    withinBudget: interactiveMs >= 0 && interactiveMs <= budgetMs,
  };
}

/** Reset for unit tests. */
export function resetWorkspacePerfForTests(): void {
  marks.continueAt = 0;
  marks.moduleAt = 0;
  marks.shellAt = 0;
  marks.bodyAt = 0;
  marks.intelAt = 0;
  marks.bundleShellAt = 0;
  marks.bundleWorkerAt = 0;
  marks.workerPath = 'none';
  marks.textChars = 0;
  marks.hasSourceIntel = false;
  if (typeof document !== 'undefined') {
    delete document.documentElement.dataset.workspaceTti;
  }
}
