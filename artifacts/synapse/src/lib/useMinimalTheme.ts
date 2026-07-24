import { useEffect, useState } from 'react';

function readIsMinimal(): boolean {
  if (typeof document === 'undefined') return false;
  const t = document.documentElement.getAttribute('data-theme');
  return t === 'minimal' || t === 'minimal-dark';
}

/** True when Primer-inspired minimal theme (light or dark) is active. */
export function useMinimalTheme(): boolean {
  const [isMinimal, setIsMinimal] = useState(readIsMinimal);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setIsMinimal(readIsMinimal());
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    sync();
    return () => observer.disconnect();
  }, []);

  return isMinimal;
}

export function isMinimalThemeAttr(theme: string | null | undefined): boolean {
  return theme === 'minimal' || theme === 'minimal-dark';
}

/** Quiet entrance — opacity only (OPT-M3 / OPT-R17). */
export const MINIMAL_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.18, ease: [0, 0, 0.2, 1] as const },
};

/** OPT-R17 — shared entrance: opacity-only under Minimal; fadeUp otherwise. */
export function entranceMotion(
  isMinimal: boolean,
  opts?: { delay?: number; y?: number; duration?: number },
) {
  const delay = opts?.delay ?? 0;
  if (isMinimal) {
    return {
      initial: MINIMAL_MOTION.initial,
      animate: MINIMAL_MOTION.animate,
      transition: { ...MINIMAL_MOTION.transition, delay },
    } as const;
  }
  const y = opts?.y ?? 10;
  return {
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: opts?.duration ?? 0.2, ease: [0.4, 0, 0.2, 1] as const },
  } as const;
}
