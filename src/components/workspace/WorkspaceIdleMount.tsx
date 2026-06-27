import { useEffect, useState, type ReactNode } from 'react';

type Props = {
  children: ReactNode;
  /** When false, children never mount (e.g. closed tab). */
  enabled?: boolean;
  /** Max wait before forcing mount (ms). Defaults to 1200. */
  timeoutMs?: number;
};

function scheduleIdle(cb: () => void, timeoutMs: number): () => void {
  if (typeof window === 'undefined') {
    cb();
    return () => undefined;
  }
  const ric = window.requestIdleCallback;
  if (typeof ric === 'function') {
    const id = ric(() => cb(), { timeout: timeoutMs });
    return () => window.cancelIdleCallback?.(id);
  }
  const t = window.setTimeout(cb, 0);
  return () => window.clearTimeout(t);
}

/**
 * Defers mounting heavy secondary UI until the browser is idle (Phase B).
 * Keeps first paint focused on header + step rail + active tool.
 */
export function WorkspaceIdleMount({ children, enabled = true, timeoutMs = 1200 }: Props) {
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      return;
    }
    setReady(false);
    return scheduleIdle(() => setReady(true), timeoutMs);
  }, [enabled, timeoutMs]);

  if (!enabled || !ready) return null;
  return <>{children}</>;
}
