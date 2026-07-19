/**
 * OPT-M9 — Aggregated Status panel for mirrored strip bus items.
 */
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, AlertCircle, ChevronDown, ChevronRight } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { useI18n } from '../../lib/i18n';
import {
  useWorkspaceStatusBus,
  type WorkspaceStatusSeverity,
} from '../../lib/workspaceStatusBus';

function SeverityIcon({ severity }: { severity: WorkspaceStatusSeverity }) {
  if (severity === 'ok') return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent-emerald" />;
  if (severity === 'info') return <AlertCircle className="h-3.5 w-3.5 shrink-0 text-brand-600" />;
  return <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-accent-amber" />;
}

type Props = {
  className?: string;
  defaultOpen?: boolean;
};

export function WorkspaceStatusPanel({ className, defaultOpen = false }: Props) {
  const { t } = useI18n();
  const bus = useWorkspaceStatusBus();
  const [open, setOpen] = useState(defaultOpen);
  if (!bus || bus.items.length === 0) return null;

  const warnCount = bus.items.filter((i) => i.severity === 'warn' || i.severity === 'danger').length;

  const revealInTool = (id: string) => {
    bus.revealInTool(id, 1600);
    // Defer scroll/flash until React clears mirrored clip.
    window.requestAnimationFrame(() => {
      const el = document.querySelector(`[data-testid="${CSS.escape(id)}"]`) as HTMLElement | null;
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
        className,
      )}
      data-testid="workspace-status-panel"
    >
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs font-medium text-text-secondary hover:bg-surface-hover hover:text-text-primary"
        aria-expanded={open}
        data-testid="workspace-status-panel-toggle"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="inline-flex items-center gap-1.5">
          {t('workspaceStatusPanel')}
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
        <ul className="max-h-40 space-y-1 overflow-y-auto border-t border-border-subtle px-2 py-2" data-testid="workspace-status-panel-list">
          {bus.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="flex w-full items-start gap-2 rounded-md border border-border-subtle bg-surface-card px-2 py-1.5 text-left text-[11px] text-text-secondary hover:border-border-default hover:text-text-primary"
                data-testid={`workspace-status-item-${item.id}`}
                data-severity={item.severity}
                onClick={() => revealInTool(item.id)}
                title={t('workspaceStatusReveal')}
              >
                <SeverityIcon severity={item.severity} />
                <span className="min-w-0 flex-1">
                  <span className="block leading-snug text-text-primary">{item.title}</span>
                  {item.source ? (
                    <span className="mt-0.5 block type-micro text-text-muted">{item.source}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
