import { motion } from 'framer-motion';
import type { CSSProperties, KeyboardEventHandler, MouseEventHandler, ReactNode } from 'react';
import {
  BLUEPRINT_MOTION,
  blueprintStaggerDelay,
} from '../../lib/useBlueprintTheme';
import { MINIMAL_MOTION, useMinimalTheme } from '../../lib/useMinimalTheme';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { cn } from '../../utils/cn';

type MotionOnly = {
  delay?: number;
  staggerIndex?: number;
  /** Force default motion even on blueprint theme. */
  variant?: 'default' | 'blueprint';
  initial?: { opacity?: number; x?: number; y?: number };
  animate?: { opacity?: number; x?: number; y?: number };
  transition?: Record<string, unknown>;
};

type Props = MotionOnly & {
  children?: ReactNode;
  className?: string;
  id?: string;
  role?: string;
  style?: CSSProperties;
  onClick?: MouseEventHandler<HTMLDivElement>;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
  tabIndex?: number;
  'data-testid'?: string;
};

/** Dashboard / platform section wrapper — unified fadeUp entrance (Wave G+I). */
export function MotionSection({
  children,
  className,
  delay = 0,
  staggerIndex,
  variant,
  initial = { opacity: 0, y: 12 },
  animate = { opacity: 1, y: 0 },
  transition,
  onClick,
  onKeyDown,
  tabIndex,
  id,
  role,
  style,
  'data-testid': dataTestId,
}: Props) {
  const reduced = useReducedMotion();
  const isMinimal = useMinimalTheme();
  const useUnifiedMotion = variant !== 'default' && !reduced && !isMinimal;

  const resolvedInitial = isMinimal
    ? MINIMAL_MOTION.initial
    : useUnifiedMotion
      ? BLUEPRINT_MOTION.initial
      : initial;
  const resolvedAnimate = isMinimal
    ? MINIMAL_MOTION.animate
    : useUnifiedMotion
      ? BLUEPRINT_MOTION.animate
      : animate;
  const resolvedDelay = isMinimal ? delay : blueprintStaggerDelay(staggerIndex, delay);
  const resolvedTransition = transition ?? (
    isMinimal
      ? { ...MINIMAL_MOTION.transition, delay: resolvedDelay }
      : useUnifiedMotion
        ? { ...BLUEPRINT_MOTION.transition, delay: resolvedDelay }
        : { duration: 0.6, ease: [0, 0, 0.2, 1], delay: resolvedDelay }
  );

  const htmlProps = {
    className: cn(useUnifiedMotion && 'blueprint-motion-section', isMinimal && 'minimal-motion-section', className),
    onClick,
    onKeyDown,
    tabIndex,
    id,
    role,
    style,
    'data-testid': dataTestId,
  };

  if (reduced) {
    return <div {...htmlProps}>{children}</div>;
  }

  return (
    <motion.div
      initial={resolvedInitial}
      animate={resolvedAnimate}
      transition={resolvedTransition}
      {...htmlProps}
    >
      {children}
    </motion.div>
  );
}
