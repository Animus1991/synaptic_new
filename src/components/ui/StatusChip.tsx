import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import { useMinimalTheme } from '../../lib/useMinimalTheme';

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

// In minimal/soft mode: neutral bg but retain semantic text color for signal.
const SOFT_TEXT_CLASS: Record<StatusChipVariant, string> = {
  info:     'text-text-secondary',
  warn:     'text-accent-amber',
  error:    'text-accent-rose',
  mastered: 'text-accent-teal',
  weak:     'text-accent-amber',
  due:      'text-text-secondary',
  exam:     'text-accent-amber',
};

type Props = {
  children: ReactNode;
  variant?: StatusChipVariant;
  className?: string;
};

/** Semantic status pill — stale, weak, due, exam, etc. */
export function StatusChip({ children, variant = 'info', className }: Props) {
  const soft = useMinimalTheme();
  return (
    <span
      className={cn(
        'ux-status-badge inline-flex items-center rounded-md px-2 py-0.5 type-micro font-semibold',
        soft
          ? /* OPT-K110 — wash chip, no outline; semantic text color preserved for signal */
            cn('border border-transparent bg-surface-secondary', SOFT_TEXT_CLASS[variant])
          : VARIANT_CLASS[variant],
        className,
      )}
      data-variant={variant}
      data-soft={soft ? 'true' : undefined}
    >
      {children}
    </span>
  );
}
