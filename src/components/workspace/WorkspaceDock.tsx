import { cn } from '../../utils/cn';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import { WORKSPACE_TOOL_GROUPS, WORKSPACE_TOOLS, workspaceToolLabel } from '../../lib/workspaceToolRegistry';

interface Props {
  activeTool: WorkspaceToolId;
  onSelectTool: (tool: WorkspaceToolId) => void;
  availableTools?: WorkspaceToolId[];
  lang?: 'en' | 'el';
}

export function WorkspaceDock({ activeTool, onSelectTool, availableTools, lang = 'en' }: Props) {
  const visible = availableTools
    ? WORKSPACE_TOOLS.filter((t) => availableTools.includes(t.id))
    : WORKSPACE_TOOLS;

  return (
    <div className="flex flex-col w-14 shrink-0 border-r border-border-subtle bg-surface-card py-2 gap-0.5 overflow-y-auto hide-scrollbar" data-testid="workspace-dock">
      {WORKSPACE_TOOL_GROUPS.map((group, gi) => {
        const groupTools = group.tools
          .map((id) => visible.find((t) => t.id === id))
          .filter(Boolean) as typeof visible;
        if (groupTools.length === 0) return null;
        return (
          <div key={group.label} className={cn(gi > 0 && 'mt-1 pt-1 border-t border-border-subtle/60')}>
            {groupTools.map(({ id, icon: Icon }) => {
              const toolLabel = workspaceToolLabel(id, lang);
              return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectTool(id)}
                title={toolLabel}
                aria-label={toolLabel}
                aria-current={activeTool === id ? 'true' : undefined}
                data-testid={`dock-tool-${id}`}
                className={cn(
                  'relative flex flex-col items-center justify-center gap-0.5 w-full py-2 px-1 transition-all group',
                  activeTool === id
                    ? 'text-brand-400 bg-brand-600/10'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
                )}
              >
                {activeTool === id && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-brand-500 rounded-r" />
                )}
                <Icon className="w-[18px] h-[18px]" />
                <span className="text-[9px] font-medium leading-tight text-center max-w-full truncate">{toolLabel}</span>
              </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export { WORKSPACE_TOOLS, WORKSPACE_TOOL_GROUPS } from '../../lib/workspaceToolRegistry';
