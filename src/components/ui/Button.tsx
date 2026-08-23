import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';
import { PrimaryCTA, SecondaryCTA } from './primitives';

/**
 * OPT-K167 — outline danger + coarse tap floor + theme focus ring.
 * X1 (Canon cross-pollination, docs/INDEX.md) — shared button primitive with a variant/size
 * system, consolidating the danger/ghost styles that were previously ad-hoc per feature
 * component. `primary`/`secondary` delegate to the existing PrimaryCTA/SecondaryCTA so those
 * two call sites never drift out of sync with this one; `ghost`/`danger` are new variants
 * sharing the same height/radius/focus conventions.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, className, variant = 'secondary', size = 'md', ...props },
  ref,
) {
  if (variant === 'primary') {
    return (
      <PrimaryCTA ref={ref} size={size} className={className} {...props}>
        {children}
      </PrimaryCTA>
    );
  }
  if (variant === 'secondary') {
    return (
      <SecondaryCTA ref={ref} size={size} className={className} {...props}>
        {children}
      </SecondaryCTA>
    );
  }
  if (variant === 'ghost') {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'ux-ghost-btn synapse-tap-target inline-flex items-center justify-center gap-2 rounded-[var(--canon-radius-pill,9999px)] font-medium transition-all duration-300 platform-pill',
          'border-0 bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text-primary',
          'disabled:opacity-60 disabled:pointer-events-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring,var(--color-brand-400))] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-primary)]',
          size === 'sm' ? 'px-3 py-2 type-caption min-h-[var(--btn-height-sm,2rem)]' : 'px-4 type-meta min-h-[var(--btn-height)]',
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
  // OPT-K167 — danger is an outline (Canon), not a solid red fill.
  return (
    <button
      ref={ref}
      type="button"
      className={cn(
        'ux-danger-btn synapse-tap-target inline-flex items-center justify-center gap-2 rounded-[var(--canon-radius-pill,9999px)] font-semibold transition-all duration-300',
        'border border-[color-mix(in_srgb,var(--color-state-danger)_50%,transparent)] bg-transparent',
        'text-[var(--color-state-danger)] hover:bg-[color-mix(in_srgb,var(--color-state-danger)_8%,transparent)]',
        'disabled:opacity-60 disabled:pointer-events-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-state-danger)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface-primary)]',
        size === 'sm' ? 'px-4 py-2 type-caption min-h-[var(--btn-height-sm,2rem)]' : 'px-5 type-meta min-h-[var(--btn-height)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
