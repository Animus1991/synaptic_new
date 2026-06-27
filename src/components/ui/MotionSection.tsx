import { motion } from 'framer-motion';
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react';
import { useReducedMotion } from '../../lib/useReducedMotion';

type MotionOnly = {
  delay?: number;
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

/** Dashboard / platform section wrapper — animates unless prefers-reduced-motion. */
export function MotionSection({
  children,
  className,
  delay = 0,
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
  const htmlProps = { className, onClick, id, role, style, 'data-testid': dataTestId };

  if (reduced) {
    return <div {...htmlProps}>{children}</div>;
  }

  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={transition ?? { delay }}
      {...htmlProps}
    >
      {children}
    </motion.div>
  );
}
