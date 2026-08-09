import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

type StickyMobileCtaBarProps = {
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
};

/**
 * Canon ReviewStickyCtaBar pattern — mobile-only safe-area primary actions.
 * Hidden from `sm` and up so desktop chrome stays unchanged.
 */
export function StickyMobileCtaBar({
  children,
  className,
  'data-testid': testId = 'sticky-mobile-cta-bar',
}: StickyMobileCtaBarProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'sm:hidden fixed inset-x-0 bottom-0 z-[160] print:hidden',
        'border-t border-border-subtle bg-surface-card/95 backdrop-blur-md',
        'px-3 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        'flex gap-2 shadow-[0_-8px_24px_rgba(0,0,0,0.12)]',
        className,
      )}
    >
      {children}
    </div>
  );
}
