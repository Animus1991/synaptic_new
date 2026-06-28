import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { WorkspaceNoteGathered } from './workspaceNoteContent';
import {
  buildNoteBundleInWorker,
  resetWorkspaceWorkerForTests,
} from './workspaceWorkerClient';
import { getWorkspaceTTIMetrics, markWorkspaceContinue, resetWorkspacePerfForTests } from './workspacePerf';

const gathered: WorkspaceNoteGathered = {
  text: 'Supply and demand curves show how price equilibrium forms in competitive markets with many buyers.',
  fileNames: ['econ.pdf'],
  hasSource: true,
  linkedCourseId: 'c1',
  scopedGlossary: [],
  topics: [],
  emptyMessage: 'Upload material',
};

const buildOpts = { concept: 'Supply & Demand', conceptBars: [], lang: 'en' as const };

describe('buildNoteBundleInWorker TTI', () => {
  beforeEach(() => {
    resetWorkspaceWorkerForTests();
    resetWorkspacePerfForTests();
    markWorkspaceContinue();
  });

  it('marks idle-fallback when Worker is unavailable', async () => {
    const originalWorker = globalThis.Worker;
    // @ts-expect-error test override
    globalThis.Worker = undefined;

    const bundle = await buildNoteBundleInWorker(gathered, buildOpts);
    const metrics = getWorkspaceTTIMetrics();

    expect(bundle.hasSource).toBe(true);
    expect(metrics.workerPath).toBe('idle-fallback');
    expect(metrics.bundleWorkerMs).toBeTypeOf('number');

    globalThis.Worker = originalWorker;
  });

  it('marks worker path when worker responds', async () => {
    class MockWorker {
      listeners = new Map<string, (ev: MessageEvent) => void>();
      addEventListener(type: string, fn: (ev: MessageEvent) => void) {
        this.listeners.set(type, fn);
      }
      removeEventListener(type: string) {
        this.listeners.delete(type);
      }
      postMessage(data: { id: string }) {
        queueMicrotask(() => {
          this.listeners.get('message')?.({
            data: {
              id: data.id,
              bundle: {
                hasSource: true,
                sourceIntelligence: { score: 72, headline: 'ok', signals: [] },
              },
            },
          } as MessageEvent);
        });
      }
      terminate() {}
    }

    vi.stubGlobal('Worker', MockWorker);

    const bundle = await buildNoteBundleInWorker(gathered, buildOpts);
    const metrics = getWorkspaceTTIMetrics();

    expect(metrics.workerPath).toBe('worker');
    expect(metrics.hasSourceIntel).toBe(true);
    expect(metrics.bundleWorkerMs).toBeTypeOf('number');
    expect(bundle.sourceIntelligence?.score).toBe(72);

    vi.unstubAllGlobals();
  });
});
