import type { ReactNode } from 'react';
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

/** Minimal QA / sync banner — high-contrast on Warm Sand via `.ws-status-*` tokens.
 * OPT-K153 — text-first (no check/warn glyphs). */
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
      <p className="min-w-0 flex-1 leading-snug">{children}</p>
      {trailing}
    </div>
  );
}
