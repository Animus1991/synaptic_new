import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import {
  WORKSPACE_TOOL_GROUPS,
  WORKSPACE_TOOLS,
  workspaceToolLabel,
} from '../../lib/workspaceToolRegistry';

interface Props {
  open: boolean;
  onClose: () => void;
  activeTool: WorkspaceToolId;
  availableTools: WorkspaceToolId[];
  onSelectTool: (tool: WorkspaceToolId) => void;
  lang: 'en' | 'el';
}

export function WorkspaceMobileToolDrawer({
  open,
  onClose,
  activeTool,
  availableTools,
  onSelectTool,
  lang,
}: Props) {
  const el = lang === 'el';

  const handleSelect = (tool: WorkspaceToolId) => {
    onSelectTool(tool);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] lg:hidden" role="presentation">
          <motion.button
            type="button"
            aria-label={el ? 'Κλείσιμο' : 'Close'}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={el ? 'Εργαλεία μελέτης' : 'Study tools'}
            data-testid="workspace-mobile-tool-drawer"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="absolute bottom-0 left-0 right-0 max-h-[78vh] overflow-hidden rounded-t-2xl border border-border-subtle bg-surface-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-text-primary">
                  {el ? 'Εργαλεία μελέτης' : 'Study tools'}
                </p>
                <p className="text-[11px] text-text-muted">
                  {el ? 'Τρέχον:' : 'Current:'}{' '}
                  <span className="text-text-secondary">{workspaceToolLabel(activeTool, lang)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={el ? 'Κλείσιμο' : 'Close'}
                className="rounded-lg p-2 text-text-muted hover:bg-surface-hover"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto px-3 py-3 space-y-4" data-testid="workspace-mobile-tool-list">
              {WORKSPACE_TOOL_GROUPS.map((group) => {
                const toolsInGroup = group.tools.filter((id) => availableTools.includes(id));
                if (toolsInGroup.length === 0) return null;
                return (
                  <div key={group.label}>
                    <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-text-muted">
                      {el ? group.labelEl : group.label}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {toolsInGroup.map((toolId) => {
                        const meta = WORKSPACE_TOOLS.find((t) => t.id === toolId)!;
                        const Icon = meta.icon;
                        const active = activeTool === toolId;
                        return (
                          <button
                            key={toolId}
                            type="button"
                            data-testid={`mobile-tool-${toolId}`}
                            onClick={() => handleSelect(toolId)}
                            className={cn(
                              'flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors min-h-[52px]',
                              active
                                ? 'border-brand-500/40 bg-brand-600/15 text-brand-200'
                                : 'border-border-subtle bg-surface-primary/50 text-text-secondary hover:border-white/15 hover:bg-surface-hover',
                            )}
                          >
                            <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', active ? 'text-brand-300' : 'text-text-muted')} />
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold truncate">
                                {el ? meta.labelEl : meta.label}
                              </span>
                              <span className="block text-[10px] text-text-muted truncate mt-0.5">
                                {el ? meta.descEl : meta.desc}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
