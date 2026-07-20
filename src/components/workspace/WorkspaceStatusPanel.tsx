/**
 * OPT-M9 — Aggregated Status panel for mirrored strip bus items.
 * OPT-R11 — Console chrome under Minimal (Errors / Activity groups). Zero alert loss.
 */
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, ChevronDown, ChevronRight, Terminal } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';
import { useMinimalTheme } from '../../lib/useMinimalTheme';
import { AllCapsLabel } from '../ui/AllCapsLabel';
import {
  useWorkspaceStatusBus,
  type WorkspaceStatusItem,
  type WorkspaceStatusSeverity,
} from '../../lib/workspaceStatusBus';

function SeverityIcon({ severity }: { severity: WorkspaceStatusSeverity }) {
  if (severity === 'ok') return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent-emerald" />;
  if (severity === 'info') return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-brand-600" />;
  return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-accent-amber" />;
}

function isErrorSeverity(severity: WorkspaceStatusSeverity): boolean {
  return severity === 'warn' || severity === 'danger';
}

type Props = {
  className?: string;
  defaultOpen?: boolean;
};

function StatusItemButton({
  item,
  onReveal,
  revealLabel,
}: {
  item: WorkspaceStatusItem;
  onReveal: (id: string) => void;
  revealLabel: string;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-start gap-2 rounded-md border border-border-subtle bg-surface-card px-2 py-1.5 text-left text-[11px] text-text-secondary hover:border-border-default hover:text-text-primary"
      data-testid={`workspace-status-item-${item.id}`}
      data-severity={item.severity}
      onClick={() => onReveal(item.id)}
      title={revealLabel}
    >
      <SeverityIcon severity={item.severity} />
      <span className="min-w-0 flex-1">
        <span className="block leading-snug text-text-primary">{item.title}</span>
        {item.source ? (
          <span className="mt-0.5 block type-micro text-text-muted font-mono">{item.source}</span>
        ) : null}
      </span>
    </button>
  );
}

export function WorkspaceStatusPanel({ className, defaultOpen = false }: Props) {
  const { t } = useI18n();
  const bus = useWorkspaceStatusBus();
  const consoleMode = useMinimalTheme();
  const [open, setOpen] = useState(defaultOpen);
  if (!bus || bus.items.length === 0) return null;

  const warnCount = bus.items.filter((i) => isErrorSeverity(i.severity)).length;
  const errorItems = consoleMode ? bus.items.filter((i) => isErrorSeverity(i.severity)) : [];
  const activityItems = consoleMode ? bus.items.filter((i) => !isErrorSeverity(i.severity)) : bus.items;

  const revealInTool = (id: string) => {
    bus.revealInTool(id, 1600);
    window.requestAnimationFrame(() => {
      const safeId = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
        ? CSS.escape(id)
        : id.replace(/["\\]/g, '\\$&');
      const el = document.querySelector(`[data-testid="${safeId}"]`) as HTMLElement | null;
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      el.classList.add('ws-status-flash');
      window.setTimeout(() => el.classList.remove('ws-status-flash'), 1600);
    });
  };

  return (
    <div
      className={cn(
        'workspace-status-panel shrink-0 border-b border-border-default bg-surface-secondary/80',
        consoleMode && 'status-console',
        className,
      )}
      data-testid="workspace-status-panel"
      data-console={consoleMode ? 'true' : undefined}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        aria-expanded={open}
        data-testid="workspace-status-panel-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-1.5">
          {consoleMode ? <Terminal className="h-3.5 w-3.5 shrink-0 text-text-muted" aria-hidden /> : null}
          {consoleMode ? t('workspaceStatusConsole') : t('workspaceStatusPanel')}
          <span
            className={cn(
              'rounded-md border px-1.5 py-0.5 type-micro font-mono',
              warnCount > 0 ? 'ws-chip-warn' : 'ws-chip-neutral',
            )}
            data-testid="workspace-status-panel-count"
          >
            {bus.items.length}
          </span>
        </span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open ? (
        <div
          className={cn(
            'overflow-y-auto border-t border-border-subtle px-2 py-2',
            consoleMode ? 'max-h-56 space-y-2' : 'max-h-40',
          )}
          data-testid="workspace-status-panel-list"
        >
          {consoleMode ? (
            <>
              {errorItems.length > 0 ? (
                <div data-testid="workspace-status-console-errors">
                  <p className="status-console-section-label px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    <AllCapsLabel>{t('appInboxErrors')}</AllCapsLabel>
                  </p>
                  <ul className="space-y-1">
                    {errorItems.map((item) => (
                      <li key={item.id}>
                        <StatusItemButton
                          item={item}
                          onReveal={revealInTool}
                          revealLabel={t('workspaceStatusReveal')}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {activityItems.length > 0 ? (
                <div data-testid="workspace-status-console-activity">
                  <p className="status-console-section-label px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                    <AllCapsLabel>{t('appInboxActivity')}</AllCapsLabel>
                  </p>
                  <ul className="space-y-1">
                    {activityItems.map((item) => (
                      <li key={item.id}>
                        <StatusItemButton
                          item={item}
                          onReveal={revealInTool}
                          revealLabel={t('workspaceStatusReveal')}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <ul className="space-y-1">
              {bus.items.map((item) => (
                <li key={item.id}>
                  <StatusItemButton
                    item={item}
                    onReveal={revealInTool}
                    revealLabel={t('workspaceStatusReveal')}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
