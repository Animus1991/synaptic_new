import { describe, expect, it, beforeEach } from 'vitest';
import {
  getWorkspaceTTIMetrics,
  markWorkspaceContinue,
  markWorkspaceModuleLoaded,
  markWorkspaceShellPaint,
  markWorkspaceBodyReady,
  markNoteBundleShellReady,
  markNoteBundleWorkerReady,
  markWorkspaceIntelReady,
  resetWorkspacePerfForTests,
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
});
