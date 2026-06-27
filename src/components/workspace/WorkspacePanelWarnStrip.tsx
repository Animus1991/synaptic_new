import type { ReactNode } from 'react';
import { AlertTriangle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';

type Props = {
  children: ReactNode;
  testId: string;
  trailing?: ReactNode;
  /** strip = inline banner; box = padded panel for nested lists */
  layout?: 'strip' | 'box';
  className?: string;
};

/** Warm Sand warn banner for panel-level extraction / quality notices. */
export function WorkspacePanelWarnStrip({
  children,
  testId,
  trailing,
  layout = 'strip',
  className,
}: Props) {
  return (
    <div
      className={cn(
        'ws-status-strip ws-status-warn',
        layout === 'strip' && 'mb-3 flex items-start gap-2 px-3 py-2',
        layout === 'box' && 'rounded-xl p-3',
        className,
      )}
      data-testid={testId}
      data-ws-status="warn"
      role="status"
    >
      {layout === 'strip' && (
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
      )}
      <div className={cn('min-w-0 flex-1 leading-snug', layout === 'strip' && 'text-[10px]')}>
        {children}
      </div>
      {trailing}
    </div>
  );
}
