import type { CSSProperties } from 'react';
import { cn } from '../../utils/cn';

type SkeletonProps = {
  className?: string;
  style?: CSSProperties;
};

/** Single shimmer bar — cyan sweep on blueprint (Wave E12). */
export function UxShimmerSkeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('ux-shimmer-skeleton', className)}
      style={style}
      aria-hidden
    />
  );
}

type PanelProps = {
  lines?: number;
  className?: string;
};

/** Stacked shimmer lines for panel/chart/modal loading placeholders. */
export function UxShimmerPanel({ lines = 4, className }: PanelProps) {
  return (
    <div className={cn('ux-shimmer-panel space-y-3', className)} role="status" aria-live="polite">
      {Array.from({ length: lines }, (_, i) => (
        <UxShimmerSkeleton
          key={i}
          className="h-3 rounded-md"
          style={{ width: `${Math.max(55, 100 - i * 10)}%` }}
        />
      ))}
    </div>
  );
}

/** Full-screen lazy chunk overlay skeleton. */
export function PlatformLazyOverlaySkeleton({ flow }: { flow?: string }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-surface-primary/95 backdrop-blur-sm p-6"
      data-testid="lazy-overlay-loading"
      data-flow={flow}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="ux-shimmer-panel w-full max-w-md rounded-2xl border border-border-subtle bg-surface-card/60 p-6 space-y-4">
        <UxShimmerSkeleton className="h-5 w-40 rounded-lg" />
        <UxShimmerPanel lines={5} />
        <div className="flex gap-2 pt-2">
          <UxShimmerSkeleton className="h-9 w-24 rounded-lg" />
          <UxShimmerSkeleton className="h-9 w-20 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
