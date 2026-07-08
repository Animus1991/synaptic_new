import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

export type StatusChipVariant = 'info' | 'warn' | 'error' | 'mastered' | 'weak' | 'due' | 'exam';

const VARIANT_CLASS: Record<StatusChipVariant, string> = {
  info: 'ux-chip-info',
  warn: 'ux-chip-warn',
  error: 'ux-chip-error',
  mastered: 'ux-chip-mastered',
  weak: 'ux-chip-warn',
  due: 'ux-chip-info',
  exam: 'ux-chip-warn',
};

type Props = {
  children: ReactNode;
  variant?: StatusChipVariant;
  className?: string;
};

/** Semantic status pill — stale, weak, due, exam, etc. */
export function StatusChip({ children, variant = 'info', className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
        VARIANT_CLASS[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
