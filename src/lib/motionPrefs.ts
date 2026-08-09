import { useReducedMotion } from './useReducedMotion';

/** Instant transitions when the user prefers reduced motion. */
export function useMotionTransition(
  animated: object = { type: 'spring', damping: 28, stiffness: 320 },
) {
  const reduce = useReducedMotion();
  return reduce ? { duration: 0 } : animated;
}

/** Skip enter animation when reduced motion is preferred. */
export function useMotionInitial<T extends object>(animated: T): T | false {
  const reduce = useReducedMotion();
  return reduce ? false : animated;
}
