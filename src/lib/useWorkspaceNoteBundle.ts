import { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import {
  gatherWorkspaceNoteInputs,
  buildPendingWorkspaceNoteGathered,
  buildWorkspaceNoteBundleFromGathered,
  stabilizeWorkspaceNoteBundle,
  type BuildWorkspaceNoteBundleOpts,
  type WorkspaceNoteBundle,
  type WorkspaceNoteGathered,
} from './workspaceNoteContent';
import { findMatchingTopic } from './noteContentExtractors';
import { buildNoteBundleInWorker, warmWorkspaceWorker } from './workspaceWorkerClient';
import { markNoteBundleShellReady } from './workspacePerf';

/** Debounce for mastery/concept-driven worker refreshes (collapses store churn bursts). */
const BUNDLE_REFRESH_DEBOUNCE_MS = 350;

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
 *
 * Freeze fix (perf): the full pipeline (pending reset → main-thread gather →
 * shell build → worker build = 3 bundle identities, each cascading through
 * every downstream memo) now runs ONLY when the source content key changes
 * (course / files / lang). Concept, conceptBars and learnerModel changes —
 * which churn constantly while the tutor streams or panels log activity —
 * trigger a debounced worker-only refresh that keeps the current bundle
 * on screen and commits through stabilizeWorkspaceNoteBundle, so unchanged
 * fields keep their identity and downstream memos stay cached.
 */
export function useWorkspaceNoteBundle(opts: BuildWorkspaceNoteBundleOpts): WorkspaceNoteBundle {
  const sourceKey = useMemo(
    () => JSON.stringify({
      courseId: opts.courseId,
      lang: opts.lang,
      fileIds: opts.uploadedFiles.map((f) => f.id).join(','),
    }),
    [opts.courseId, opts.lang, opts.uploadedFiles],
  );

  const buildOpts = useMemo(
    () => buildOptsFrom(opts),
    [opts.concept, opts.conceptBars, opts.lang, opts.learnerModel],
  );

  const latestRef = useRef({ opts, buildOpts });
  latestRef.current = { opts, buildOpts };

  const [bundle, setBundle] = useState<WorkspaceNoteBundle>(() =>
    buildWorkspaceNoteBundleFromGathered(buildPendingWorkspaceNoteGathered(opts), buildOpts, true),
  );
  const reqGen = useRef(0);
  const gatheredRef = useRef<WorkspaceNoteGathered | null>(null);

  useEffect(() => {
    warmWorkspaceWorker();
  }, []);

  // Full pipeline — source identity changed (or first mount). Never re-runs on
  // conceptBars/learnerModel/concept identity churn.
  useEffect(() => {
    setBundle((prev) => stabilizeWorkspaceNoteBundle(
      prev,
      buildWorkspaceNoteBundleFromGathered(
        buildPendingWorkspaceNoteGathered(latestRef.current.opts),
        latestRef.current.buildOpts,
        true,
      ),
    ));

    let cancelled = false;
    const cancelSchedule = scheduleGather(() => {
      if (cancelled) return;
      const fullGathered = gatherWorkspaceNoteInputs(latestRef.current.opts);
      gatheredRef.current = fullGathered;
      if (cancelled) return;
      const shell = buildWorkspaceNoteBundleFromGathered(fullGathered, latestRef.current.buildOpts, true);
      startTransition(() => {
        setBundle((prev) => stabilizeWorkspaceNoteBundle(prev, shell));
        markNoteBundleShellReady(fullGathered.text.length);
      });

      const gen = ++reqGen.current;
      buildNoteBundleInWorker(fullGathered, latestRef.current.buildOpts)
        .then((full) => {
          if (cancelled || gen !== reqGen.current) return;
          startTransition(() => setBundle((prev) => stabilizeWorkspaceNoteBundle(prev, full)));
        })
        .catch(() => undefined);
    });

    return () => {
      cancelled = true;
      cancelSchedule();
    };
  }, [sourceKey]);

  // Mastery / learner-model / concept refresh — debounced, worker-only, keeps
  // the current bundle rendered (no pending reset, no synchronous rebuild).
  const refreshInitRef = useRef(true);
  useEffect(() => {
    if (refreshInitRef.current) {
      refreshInitRef.current = false;
      return undefined;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const base = gatheredRef.current;
      if (!base) return;
      const nextBuild = latestRef.current.buildOpts;
      const gathered: WorkspaceNoteGathered = {
        ...base,
        matchingTopic: findMatchingTopic(base.topics, nextBuild.concept),
      };
      gatheredRef.current = gathered;
      const gen = ++reqGen.current;
      buildNoteBundleInWorker(gathered, nextBuild)
        .then((full) => {
          if (cancelled || gen !== reqGen.current) return;
          startTransition(() => setBundle((prev) => stabilizeWorkspaceNoteBundle(prev, full)));
        })
        .catch(() => undefined);
    }, BUNDLE_REFRESH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [buildOpts]);

  return bundle;
}

/** @deprecated use shell path inside hook — kept for tests importing fast builder name */
export function buildWorkspaceNoteBundleFast(opts: BuildWorkspaceNoteBundleOpts): WorkspaceNoteBundle {
  const gathered = gatherWorkspaceNoteInputs(opts);
  return buildWorkspaceNoteBundleFromGathered(gathered, buildOptsFrom(opts), true);
}
