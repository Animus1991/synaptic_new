import { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import {
  gatherWorkspaceNoteInputs,
  buildPendingWorkspaceNoteGathered,
  buildWorkspaceNoteBundleFromGathered,
  type BuildWorkspaceNoteBundleOpts,
  type WorkspaceNoteBundle,
} from './workspaceNoteContent';
import { buildNoteBundleInWorker, warmWorkspaceWorker } from './workspaceWorkerClient';
import { markNoteBundleShellReady } from './workspacePerf';

const buildOptsFrom = (opts: BuildWorkspaceNoteBundleOpts) => ({
  concept: opts.concept,
  conceptBars: opts.conceptBars,
  lang: opts.lang,
  learnerModel: opts.learnerModel,
});

function scheduleGather(cb: () => void): () => void {
  if (typeof window === 'undefined') {
    cb();
    return () => undefined;
  }
  const ric = window.requestIdleCallback;
  if (typeof ric === 'function') {
    const id = ric(cb, { timeout: 48 });
    return () => window.cancelIdleCallback?.(id);
  }
  const id = window.requestAnimationFrame(() => window.requestAnimationFrame(cb));
  return () => window.cancelAnimationFrame(id);
}

/**
 * Hybrid note bundle: instant pending shell → deferred gather → worker full bundle (1C).
 */
export function useWorkspaceNoteBundle(opts: BuildWorkspaceNoteBundleOpts): WorkspaceNoteBundle {
  const optsKey = useMemo(
    () => JSON.stringify({
      courseId: opts.courseId,
      concept: opts.concept,
      lang: opts.lang,
      fileIds: opts.uploadedFiles.map((f) => f.id).join(','),
    }),
    [opts.courseId, opts.concept, opts.lang, opts.uploadedFiles],
  );

  const buildOpts = useMemo(
    () => buildOptsFrom(opts),
    [optsKey, opts.concept, opts.conceptBars, opts.lang, opts.learnerModel],
  );

  const pendingGathered = useMemo(
    () => buildPendingWorkspaceNoteGathered(opts),
    [optsKey, opts],
  );

  const [bundle, setBundle] = useState<WorkspaceNoteBundle>(() =>
    buildWorkspaceNoteBundleFromGathered(pendingGathered, buildOpts, true),
  );
  const reqGen = useRef(0);

  useEffect(() => {
    warmWorkspaceWorker();
  }, []);

  // Phase 1 — defer text join off the Continue click critical path
  useEffect(() => {
    setBundle(buildWorkspaceNoteBundleFromGathered(pendingGathered, buildOpts, true));

    let cancelled = false;
    const cancelSchedule = scheduleGather(() => {
      if (cancelled) return;
      const fullGathered = gatherWorkspaceNoteInputs(opts);
      if (cancelled) return;
      const shell = buildWorkspaceNoteBundleFromGathered(fullGathered, buildOpts, true);
      startTransition(() => {
        setBundle(shell);
        markNoteBundleShellReady(fullGathered.text.length);
      });

      const gen = ++reqGen.current;
      buildNoteBundleInWorker(fullGathered, buildOpts)
        .then((full) => {
          if (cancelled || gen !== reqGen.current) return;
          startTransition(() => setBundle(full));
        })
        .catch(() => undefined);
    });

    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, [optsKey, opts, pendingGathered, buildOpts]);

  return bundle;
}

/** @deprecated use shell path inside hook — kept for tests importing fast builder name */
export function buildWorkspaceNoteBundleFast(opts: BuildWorkspaceNoteBundleOpts): WorkspaceNoteBundle {
  const gathered = gatherWorkspaceNoteInputs(opts);
  return buildWorkspaceNoteBundleFromGathered(gathered, buildOptsFrom(opts), true);
}
