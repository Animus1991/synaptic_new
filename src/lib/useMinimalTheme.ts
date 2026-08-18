function readIsMinimal(): boolean {
  if (typeof document === 'undefined') return false;
  const t = document.documentElement.getAttribute('data-theme');
  return t === 'minimal' || t === 'minimal-dark';
}

/**
 * OPT-K168 — calm layout is the product baseline on every resolved theme.
 * Palette still comes from `data-theme`; this hook no longer forks markup.
 * Use {@link isMinimalThemeAttr} / {@link readIsMinimalTheme} when you need
 * the actual Minimal family (token/font differences), not layout.
 */
export function useMinimalTheme(): boolean {
  return true;
}

/** True when the document theme is the Primer Minimal family. */
export function readIsMinimalTheme(): boolean {
  return readIsMinimal();
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

/** OPT-K168 / OPT-R17 — opacity-only entrance on every theme. */
export function entranceMotion(
  _isMinimal?: boolean,
  opts?: { delay?: number; y?: number; duration?: number },
) {
  const delay = opts?.delay ?? 0;
  return {
    initial: MINIMAL_MOTION.initial,
    animate: MINIMAL_MOTION.animate,
    transition: { ...MINIMAL_MOTION.transition, delay },
  } as const;
}
