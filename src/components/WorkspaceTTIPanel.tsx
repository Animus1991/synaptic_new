import { useEffect, useState } from 'react';
import { getWorkspaceTTIMetrics, type WorkspaceTTIMetrics } from '../lib/workspacePerf';

const WORKER_PATH_LABEL: Record<WorkspaceTTIMetrics['workerPath'], string> = {
  worker: 'Worker (off-thread)',
  'idle-fallback': 'Idle fallback (main thread)',
  'sync-fallback': 'Sync fallback (main thread)',
  none: 'Pending',
};

const WORKER_PATH_CLASS: Record<WorkspaceTTIMetrics['workerPath'], string> = {
  worker: 'text-emerald-600 dark:text-emerald-400',
  'idle-fallback': 'text-amber-600 dark:text-amber-400',
  'sync-fallback': 'text-rose-600 dark:text-rose-400',
  none: 'text-text-muted',
};

/** Last Study Workspace TTI snapshot (Settings → developer readout). */
export function WorkspaceTTIPanel() {
  const [metrics, setMetrics] = useState<WorkspaceTTIMetrics>(() => getWorkspaceTTIMetrics());

  useEffect(() => {
    const tick = () => setMetrics(getWorkspaceTTIMetrics());
    tick();
    const id = window.setInterval(tick, 1500);
    return () => window.clearInterval(id);
  }, []);

  const row = (label: string, ms?: number) => (
    <div className="flex justify-between gap-4 text-xs">
      <span className="text-text-secondary">{label}</span>
      <span className="font-mono text-text-primary tabular-nums">{ms != null ? `${ms} ms` : '—'}</span>
    </div>
  );

  const workerOk = metrics.workerPath === 'worker';
  const intelFromWorker = metrics.hasSourceIntel === true;

  return (
    <div
      className="rounded-xl border border-border-subtle bg-surface-input/50 p-3 space-y-1.5"
      data-testid="workspace-tti-panel"
    >
      <p className="type-caption text-text-muted mb-2">
        Open Study Workspace once (Continue), then read timings from the click.
      </p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 type-caption pb-1 border-b border-border-subtle/60">
        <span className="text-text-muted">BM25/PMI path:</span>
        <span className={`font-mono font-medium ${WORKER_PATH_CLASS[metrics.workerPath]}`}>
          {WORKER_PATH_LABEL[metrics.workerPath]}
        </span>
        {workerOk && intelFromWorker && (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
            sourceIntel ✓
          </span>
        )}
        {metrics.workerPath !== 'none' && metrics.workerPath !== 'worker' && (
          <span className="text-text-muted">(check Worker support / chunk load)</span>
        )}
      </div>
      {row('Module loaded', metrics.moduleMs)}
      {row('Shell painted', metrics.shellMs)}
      {row('Body mounted', metrics.bodyMs)}
      {row('Note shell (light)', metrics.bundleShellMs)}
      {row('Note worker (full)', metrics.bundleWorkerMs)}
      {row('Intel panels', metrics.intelMs)}
      {metrics.textChars != null && metrics.textChars > 0 && (
        <div className="flex justify-between gap-4 text-xs pt-1 border-t border-border-subtle/60">
          <span className="text-text-secondary">Source chars</span>
          <span className="font-mono text-text-primary tabular-nums">{metrics.textChars.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}
