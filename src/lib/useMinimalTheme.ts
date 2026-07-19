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

/** Quiet entrance — opacity only (OPT-M3). */
export const MINIMAL_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.18, ease: [0, 0, 0.2, 1] as const },
};
