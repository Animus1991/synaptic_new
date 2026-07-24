/**
 * Wave O-M09 / P-S02 — shared framer-motion variants + transition helpers.
 *
 * All curves use Material 3 emphasized decelerate `[0.2, 0, 0, 1]` at 360 ms
 * (see `--motion-ease-emphasized` / `--motion-duration-emphasized` in index.css).
 * Global `MotionConfig reducedMotion="user"` in App.tsx automatically collapses
 * these to instant when the OS prefers reduced motion — do not re-gate here.
 */

import type { Transition, Variants } from 'framer-motion';

/** Canonical emphasized decelerate transition (360 ms). */
export const emphasizedTransition: Transition = {
  duration: 0.36,
  ease: [0.2, 0, 0, 1],
};

/** Slightly snappier backdrop / overlay fade (220 ms). */
export const emphasizedBackdropTransition: Transition = {
  duration: 0.22,
  ease: [0.2, 0, 0, 1],
};

/** Opacity + slight upward settle — page panels, toast, expand bodies. */
export const fadeUp: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 8 },
};

/** Horizontal slide-in — lesson steps, tab content. */
export const slideIn: Variants = {
  initial: { opacity: 0, x: 16 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
};

/** Soft scale — modals, command palette panels. */
export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.97, y: 8 },
};

/** Height collapse/expand — disclosure rows (Tasks expand, Library outline). */
export const expandHeight: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
};
