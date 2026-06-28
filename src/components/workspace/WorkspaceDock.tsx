import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import {
  WORKSPACE_TOOL_GROUPS,
  WORKSPACE_TOOLS,
  workspaceToolLabel,
  workspaceToolDescription,
} from '../../lib/workspaceToolRegistry';
import { loadJson, saveJson } from '../../lib/persistence';
import { WorkspaceStudyRoomTrigger } from './WorkspaceStudyRoomTrigger';

interface Props {
  activeTool: WorkspaceToolId;
  onSelectTool: (tool: WorkspaceToolId) => void;
  availableTools?: WorkspaceToolId[];
  lang?: 'en' | 'el';
  onOpenStudyRoom?: () => void;
  studyRoomOpen?: boolean;
}

const EXPAND_KEY = 'workspace-dock-expanded';

/**
 * Canonical Study Workspace tool navigator (desktop).
 * Single source of truth for all tools, grouped by WORKSPACE_TOOL_GROUPS.
 * Collapsible: a calm icon-only rail by default, expandable to a labeled,
 * grouped list. Replaces the redundant top WorkspaceToolStrip on desktop.
 */
export function WorkspaceDock({ activeTool, onSelectTool, availableTools, lang = 'en', onOpenStudyRoom, studyRoomOpen = false }: Props) {
  const isEl = lang === 'el';
  const [expanded, setExpanded] = useState<boolean>(() => loadJson<boolean>(EXPAND_KEY, true));

  const toggleExpanded = () => {
    setExpanded((prev) => {
      const next = !prev;
      saveJson(EXPAND_KEY, next);
      return next;
    });
  };

  const visible = availableTools
    ? WORKSPACE_TOOLS.filter((t) => availableTools.includes(t.id))
    : WORKSPACE_TOOLS;

  return (
    <nav
      className={cn(
        'flex flex-col shrink-0 border-r border-border-subtle bg-surface-card overflow-y-auto hide-scrollbar transition-[width] duration-200',
        expanded ? 'w-52' : 'w-16',
      )}
      data-testid="workspace-dock"
      aria-label={isEl ? 'Εργαλεία μελέτης' : 'Study tools'}
    >
      <button
        type="button"
        onClick={toggleExpanded}
        data-testid="workspace-dock-toggle"
        aria-expanded={expanded}
        title={
          expanded
            ? isEl
              ? 'Σύμπτυξη εργαλειοθήκης'
              : 'Collapse tools'
            : isEl
              ? 'Ανάπτυξη εργαλειοθήκης'
              : 'Expand tools'
        }
        className={cn(
          'flex items-center shrink-0 border-b border-border-subtle/60 px-3 py-2.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text-secondary',
          expanded ? 'justify-between' : 'justify-center',
        )}
      >
        {expanded && <span className="ws-eyebrow">{isEl ? 'Εργαλεία' : 'Tools'}</span>}
        {expanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
      </button>

      <div className="flex flex-col gap-0.5 py-1.5">
        {WORKSPACE_TOOL_GROUPS.map((group, gi) => {
          const groupTools = group.tools
            .map((id) => visible.find((t) => t.id === id))
            .filter(Boolean) as typeof visible;
          if (groupTools.length === 0) return null;
          return (
            <div
              key={group.label}
              className={cn('flex flex-col', gi > 0 && 'mt-1 border-t border-border-subtle/50 pt-1.5')}
            >
              {expanded && (
                <span className="ws-eyebrow px-3 pb-1 pt-1 text-text-muted">
                  {isEl ? group.labelEl : group.label}
                </span>
              )}
              {groupTools.map(({ id, icon: Icon }) => {
                const label = workspaceToolLabel(id, lang);
                const desc = workspaceToolDescription(id, lang);
                const active = activeTool === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectTool(id)}
                    title={expanded ? desc : `${label} — ${desc}`}
                    aria-label={label}
                    aria-current={active ? 'true' : undefined}
                    data-testid={`dock-tool-${id}`}
                    className={cn(
                      'group relative flex items-center transition-colors outline-none',
                      'focus-visible:ring-2 focus-visible:ring-brand-400/60 focus-visible:ring-inset',
                      expanded ? 'gap-2.5 px-3 py-2' : 'h-11 justify-center px-1',
                      active
                        ? 'bg-brand-100/80 text-brand-800 font-semibold'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary',
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute left-0 top-0 h-full w-[2px] transition-colors',
                        active ? 'bg-brand-400' : 'bg-transparent group-hover:bg-border-subtle',
                      )}
                    />
                    <Icon className={cn('shrink-0', expanded ? 'h-[18px] w-[18px]' : 'h-5 w-5')} />
                    {expanded && (
                      <span className={cn('ws-meta truncate', active && 'font-medium')}>{label}</span>
                    )}
                  </button>
                );
              })}
            </div>

          );
        })}
      </div>

      {onOpenStudyRoom && (
        <div className="mt-auto border-t border-border-subtle/60 p-2">
          <WorkspaceStudyRoomTrigger
            lang={lang}
            open={studyRoomOpen}
            onClick={onOpenStudyRoom}
            variant="chip"
            compact={!expanded}
            className={cn('w-full justify-center', !expanded && 'px-1.5')}
          />
        </div>
      )}
    </nav>
  );
}

export { WORKSPACE_TOOLS, WORKSPACE_TOOL_GROUPS } from '../../lib/workspaceToolRegistry';
