import { useEffect, useState, startTransition } from 'react';

/**
 * Phase 1A — defer intelligence derivations until after first paint + idle slot.
 * Shell chrome, step rail, and active tool can render before heavy useMemo chains run.
 */
export function useWorkspaceIntelHydration(): boolean {
  const [intelReady, setIntelReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const activate = () => {
      if (cancelled) return;
      startTransition(() => setIntelReady(true));
    };

    const ric = window.requestIdleCallback;
    if (typeof ric === 'function') {
      const id = ric(activate, { timeout: 100 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(id);
      };
    }

    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(activate);
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(id);
    };
  }, []);

  return intelReady;
}
