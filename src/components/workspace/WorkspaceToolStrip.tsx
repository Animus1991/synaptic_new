import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import {
  PRIMARY_WORKSPACE_TOOLS,
  SECONDARY_WORKSPACE_TOOLS,
  WORKSPACE_TOOLS,
} from '../../lib/workspaceToolRegistry';

interface Props {
  activeTool: WorkspaceToolId;
  availableTools: WorkspaceToolId[];
  onSelectTool: (tool: WorkspaceToolId) => void;
  lang: 'en' | 'el';
  className?: string;
}

export function WorkspaceToolStrip({
  activeTool,
  availableTools,
  onSelectTool,
  lang,
  className,
}: Props) {
  const el = lang === 'el';
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const primary = WORKSPACE_TOOLS.filter(
    (t) => PRIMARY_WORKSPACE_TOOLS.includes(t.id) && availableTools.includes(t.id),
  );
  const secondary = WORKSPACE_TOOLS.filter(
    (t) => SECONDARY_WORKSPACE_TOOLS.includes(t.id) && availableTools.includes(t.id),
  );
  const secondaryActive = secondary.some((t) => t.id === activeTool);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [moreOpen]);

  const renderTab = (id: WorkspaceToolId, label: string, labelEl: string, Icon: typeof WORKSPACE_TOOLS[0]['icon']) => {
    const active = activeTool === id;
    return (
      <button
        key={id}
        type="button"
        role="tab"
        aria-selected={active}
        data-testid={`workspace-tool-${id}`}
        onClick={() => onSelectTool(id)}
        title={el ? labelEl : label}
        className={cn(
          'inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors',
          active
            ? 'border-brand-500/40 bg-brand-600/15 text-brand-300'
            : 'border-transparent text-text-muted hover:border-border-subtle hover:bg-surface-hover hover:text-text-secondary',
        )}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{el ? labelEl : label}</span>
      </button>
    );
  };

  return (
    <div
      className={cn(
        'flex shrink-0 gap-1 overflow-x-auto border-b border-border-subtle bg-surface-card/90 px-2 py-1.5 hide-scrollbar',
        className,
      )}
      data-testid="workspace-tool-strip"
      role="tablist"
      aria-label={el ? 'Εργαλεία μελέτης' : 'Study tools'}
    >
      {primary.map(({ id, icon: Icon, label, labelEl }) => renderTab(id, label, labelEl, Icon))}
      {secondary.length > 0 && (
        <div className="relative shrink-0" ref={moreRef}>
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            data-testid="workspace-tool-more"
            className={cn(
              'inline-flex items-center gap-0.5 rounded-lg border px-2 py-1 text-[10px] font-medium transition-colors',
              secondaryActive || moreOpen
                ? 'border-brand-500/40 bg-brand-600/15 text-brand-300'
                : 'border-transparent text-text-muted hover:bg-surface-hover hover:text-text-secondary',
            )}
          >
            {el ? 'Περισσότερα' : 'More'}
            <ChevronDown className={cn('h-3 w-3 transition-transform', moreOpen && 'rotate-180')} />
          </button>
          {moreOpen && (
            <div
              className="absolute right-0 top-full z-50 mt-1 min-w-[140px] rounded-xl border border-border-subtle bg-surface-card py-1 shadow-xl"
              data-testid="workspace-tool-more-menu"
            >
              {secondary.map(({ id, icon: Icon, label, labelEl }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onSelectTool(id);
                    setMoreOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-1.5 text-left text-[10px] hover:bg-surface-hover',
                    activeTool === id ? 'text-brand-300' : 'text-text-secondary',
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  {el ? labelEl : label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
