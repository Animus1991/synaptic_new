import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import {
  BLUEPRINT_MOTION,
  useBlueprintTheme,
} from '../../lib/useBlueprintTheme';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { cn } from '../../utils/cn';

type Props = {
  viewKey: string;
  children: ReactNode;
  className?: string;
};

/** Top-level shell view transition — blueprint fadeUp with reduced-motion fallback (Wave E12). */
export function PlatformViewTransition({ viewKey, children, className }: Props) {
  const reduced = useReducedMotion();
  const isBlueprint = useBlueprintTheme();

  if (reduced) {
    return (
      <div className={className} data-platform-view={viewKey}>
        {children}
      </div>
    );
  }

  const useBlueprintMotion = isBlueprint;
  const initial = useBlueprintMotion ? BLUEPRINT_MOTION.initial : { opacity: 0 };
  const animate = useBlueprintMotion ? BLUEPRINT_MOTION.animate : { opacity: 1 };
  const exit = useBlueprintMotion ? { opacity: 0, y: -8 } : { opacity: 0 };
  const transition = useBlueprintMotion
    ? { duration: 0.35, ease: [0, 0, 0.2, 1] as const }
    : { duration: 0.15 };

  return (
    <motion.div
      key={viewKey}
      className={cn(useBlueprintMotion && 'platform-view-transition', className)}
      data-platform-view={viewKey}
      initial={initial}
      animate={animate}
      exit={exit}
      transition={transition}
    >
      {children}
    </motion.div>
  );
}
