import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';

type Props = {
  ok: boolean;
  children: ReactNode;
  testId: string;
  trailing?: ReactNode;
};

/** Minimal QA / sync banner — high-contrast on Warm Sand via `.ws-status-*` tokens. */
export function WorkspaceQaStatusStrip({ ok, children, testId, trailing }: Props) {
  const Icon = ok ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn('ws-status-strip mb-3 flex items-center gap-2', ok ? 'ws-status-ok' : 'ws-status-warn')}
      data-testid={testId}
      data-ws-status={ok ? 'ok' : 'warn'}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 leading-snug">{children}</p>
      {trailing}
    </div>
  );
}
