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

/** Option-B entrance motion — unified fadeUp (Wave G+I). */
export const BLUEPRINT_MOTION = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0, 0, 0.2, 1] as const },
};

/** @deprecated Use BLUEPRINT_MOTION — kept for import stability. */
export const UX_FADE_UP_MOTION = BLUEPRINT_MOTION;

export const UX_MOTION_STAGGER_STEP = 0.09;

export function blueprintStaggerDelay(staggerIndex?: number, baseDelay = 0): number {
  if (staggerIndex == null) return baseDelay;
  return baseDelay + staggerIndex * UX_MOTION_STAGGER_STEP;
}
