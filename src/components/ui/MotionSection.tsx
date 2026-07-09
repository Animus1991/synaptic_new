import { motion } from 'framer-motion';
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import {
  BLUEPRINT_MOTION,
  blueprintStaggerDelay,
  useBlueprintTheme,
} from '../../lib/useBlueprintTheme';
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
  'data-testid'?: string;
};

/** Dashboard / platform section wrapper — blueprint fadeUp when Option-B theme is active. */
export function MotionSection({
  children,
  className,
  delay = 0,
  staggerIndex,
  variant,
  initial = { opacity: 0, y: 10 },
  animate = { opacity: 1, y: 0 },
  transition,
  onClick,
  id,
  role,
  style,
  'data-testid': dataTestId,
}: Props) {
  const reduced = useReducedMotion();
  const isBlueprint = useBlueprintTheme();
  const useBlueprintMotion = (variant === 'blueprint' || (variant !== 'default' && isBlueprint)) && !reduced;

  const resolvedInitial = useBlueprintMotion ? BLUEPRINT_MOTION.initial : initial;
  const resolvedAnimate = useBlueprintMotion ? BLUEPRINT_MOTION.animate : animate;
  const resolvedDelay = blueprintStaggerDelay(staggerIndex, delay);
  const resolvedTransition = transition ?? (
    useBlueprintMotion
      ? { ...BLUEPRINT_MOTION.transition, delay: resolvedDelay }
      : { delay: resolvedDelay }
  );

  const htmlProps = {
    className: cn(useBlueprintMotion && 'blueprint-motion-section', className),
    onClick,
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
