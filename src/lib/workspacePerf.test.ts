import { describe, expect, it, beforeEach } from 'vitest';
import {
  evaluateWorkspacePerfBudget,
  getWorkspaceTTIMetrics,
  markWorkspaceContinue,
  markWorkspaceModuleLoaded,
  markWorkspaceShellPaint,
  markWorkspaceBodyReady,
  markNoteBundleShellReady,
  markNoteBundleWorkerReady,
  markWorkspaceIntelReady,
  resetWorkspacePerfForTests,
  WORKSPACE_INTERACTIVE_BUDGET_MS,
} from './workspacePerf';

describe('workspacePerf TTI marks', () => {
  beforeEach(() => {
    resetWorkspacePerfForTests();
  });

  it('records ordered deltas from Continue click', () => {
    markWorkspaceContinue();
    markWorkspaceModuleLoaded();
    markWorkspaceShellPaint();
    markWorkspaceBodyReady();
    markNoteBundleShellReady(12_000);
    markNoteBundleWorkerReady('worker', true);
    markWorkspaceIntelReady();

    const m = getWorkspaceTTIMetrics();
    expect(m.moduleMs).toBeTypeOf('number');
    expect(m.shellMs).toBeTypeOf('number');
    expect(m.bodyMs).toBeTypeOf('number');
    expect(m.bundleShellMs).toBeTypeOf('number');
    expect(m.bundleWorkerMs).toBeTypeOf('number');
    expect(m.intelMs).toBeTypeOf('number');
    expect(m.workerPath).toBe('worker');
    expect(m.hasSourceIntel).toBe(true);
    expect(m.textChars).toBe(12_000);
  });

  it('evaluates perf budget from body ready mark', () => {
    markWorkspaceContinue();
    markWorkspaceBodyReady();
    const budget = evaluateWorkspacePerfBudget(getWorkspaceTTIMetrics(), WORKSPACE_INTERACTIVE_BUDGET_MS);
    expect(budget.interactiveMs).toBeTypeOf('number');
    expect(budget.withinBudget).toBe(true);
  });
});
