import { useEffect, useMemo, useRef, useState } from 'react';
import {
  buildWorkspaceNoteBundle,
  type BuildWorkspaceNoteBundleOpts,
  type WorkspaceNoteBundle,
} from './workspaceNoteContent';

let worker: Worker | null = null;

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (worker) return worker;
  try {
    worker = new Worker(new URL('../workers/workspace.worker.ts', import.meta.url), { type: 'module' });
    return worker;
  } catch {
    return null;
  }
}

/** Fast first paint — skips PMI co-occurrence, BM25 excerpts, and source intelligence. */
export function buildWorkspaceNoteBundleFast(opts: BuildWorkspaceNoteBundleOpts): WorkspaceNoteBundle {
  return buildWorkspaceNoteBundle({ ...opts, lightweight: true });
}

/**
 * Hybrid note bundle: sync fast path, then worker-refined full bundle (Phase B4).
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

  const fastBundle = useMemo(() => buildWorkspaceNoteBundleFast(opts), [optsKey, opts]);
  const [bundle, setBundle] = useState(fastBundle);
  const reqId = useRef(0);

  useEffect(() => {
    setBundle(fastBundle);
    const w = getWorker();
    if (!w) {
      setBundle(buildWorkspaceNoteBundle(opts));
      return;
    }
    const id = `ws-${++reqId.current}`;
    const onMessage = (ev: MessageEvent<{ id: string; bundle?: WorkspaceNoteBundle; error?: string }>) => {
      if (ev.data.id !== id) return;
      if (ev.data.bundle) setBundle(ev.data.bundle);
      w.removeEventListener('message', onMessage);
    };
    w.addEventListener('message', onMessage);
    w.postMessage({ id, opts: { ...opts, lightweight: false } });
    return () => {
      w.removeEventListener('message', onMessage);
    };
  }, [optsKey, fastBundle, opts]);

  return bundle;
}
