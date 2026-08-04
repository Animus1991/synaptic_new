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
      // Longer timeout: avoid kicking heavy useMemo chains while the body chunk is still settling.
      const id = ric(activate, { timeout: 800 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(id);
      };
    }

    // Fallback: wait a couple frames + short delay so first interactions stay responsive.
    let timeoutId = 0;
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        timeoutId = window.setTimeout(activate, 250);
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  return intelReady;
}
