import { useEffect, useState } from 'react';

/** True when `data-theme="blueprint"` is active on the document root. */
export function useBlueprintTheme(): boolean {
  const [isBlueprint, setIsBlueprint] = useState(
    () =>
      typeof document !== 'undefined'
      && document.documentElement.getAttribute('data-theme') === 'blueprint',
  );

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsBlueprint(root.getAttribute('data-theme') === 'blueprint');
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return isBlueprint;
}

/** Option-B entrance motion — prototype fadeUp (12px, 0.6s). */
export const BLUEPRINT_MOTION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0, 0, 0.2, 1] as const },
};

export function blueprintStaggerDelay(staggerIndex?: number, baseDelay = 0): number {
  if (staggerIndex == null) return baseDelay;
  return baseDelay + staggerIndex * 0.09;
}
