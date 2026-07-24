import type { ReactNode } from 'react';
import { CheckCircle2, AlertTriangle } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import {
  reactNodeToStatusText,
  useRegisterWorkspaceStatus,
  useWorkspaceStatusBus,
} from '../../lib/workspaceStatusBus';

type Props = {
  ok: boolean;
  children: ReactNode;
  testId: string;
  trailing?: ReactNode;
  statusTitle?: string;
  statusSource?: string;
};

/** Minimal QA / sync banner — high-contrast on Warm Sand via `.ws-status-*` tokens. */
export function WorkspaceQaStatusStrip({
  ok,
  children,
  testId,
  trailing,
  statusTitle,
  statusSource,
}: Props) {
  const bus = useWorkspaceStatusBus();
  const title = (statusTitle?.trim() || reactNodeToStatusText(children) || testId).slice(0, 180);
  useRegisterWorkspaceStatus({
    id: testId,
    severity: ok ? 'ok' : 'warn',
    title,
    source: statusSource ?? 'workspace',
  });
  const mirrored = Boolean(bus?.mirrorInPanel) && !bus?.revealedIds.has(testId);
  const Icon = ok ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        'ws-status-strip mb-3 flex items-center gap-2',
        ok ? 'ws-status-ok' : 'ws-status-warn',
        mirrored && 'ws-status-mirrored',
      )}
      data-testid={testId}
      data-ws-status={ok ? 'ok' : 'warn'}
      data-status-mirrored={mirrored || undefined}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 leading-snug">{children}</p>
      {trailing}
    </div>
  );
}
