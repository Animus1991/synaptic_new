import { AnimatePresence, motion } from 'framer-motion';
import { X } from '@/lib/lucide-shim';
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
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="absolute bottom-0 left-0 right-0 max-h-[82vh] overflow-hidden rounded-t-2xl border border-border-subtle bg-surface-card shadow-2xl pb-[env(safe-area-inset-bottom)]"
          >
            {/* Drag affordance */}
            <div className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
              <span className="h-1 w-10 rounded-full bg-border-subtle" aria-hidden />
            </div>
            <div className="flex items-center justify-between border-b border-border-subtle px-4 pb-3 pt-1">
              <div className="min-w-0">
                <p className="ws-eyebrow text-text-muted">{el ? 'Εργαλεία μελέτης' : 'Study tools'}</p>
                <p className="mt-0.5 truncate text-[12px] text-text-secondary">
                  {el ? 'Τρέχον:' : 'Current:'}{' '}
                  <span className="text-text-primary font-medium">{workspaceToolLabel(activeTool, lang)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={el ? 'Κλείσιμο' : 'Close'}
                className="rounded-md p-2 text-text-muted hover:bg-surface-hover min-h-[40px] min-w-[40px] inline-flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-3 py-3 space-y-3.5 max-h-[calc(82vh-80px)]" data-testid="workspace-mobile-tool-list">
              {WORKSPACE_TOOL_GROUPS.map((group) => {
                const toolsInGroup = group.tools.filter((id) => availableTools.includes(id));
                if (toolsInGroup.length === 0) return null;
                return (
                  <div key={group.label}>
                    <p className="mb-2 px-1 ws-eyebrow text-text-muted">
                      {el ? group.labelEl : group.label}
                    </p>
                    <div className="grid grid-cols-1 gap-2 xs:grid-cols-2">
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
                            aria-current={active ? 'true' : undefined}
                            className={cn(
                              'flex items-start gap-2.5 rounded-md border p-3 text-left transition-colors min-h-[56px]',
                              active
                                ? 'border-brand-600/30 bg-brand-100/70 text-brand-800'
                                : 'border-border-subtle bg-surface-primary/50 text-text-secondary hover:border-brand-400/30 hover:bg-surface-hover',
                            )}
                          >
                            <Icon className={cn('h-4 w-4 shrink-0 mt-0.5', active ? 'text-brand-700' : 'text-text-muted')} aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] font-semibold leading-tight truncate">
                                {el ? meta.labelEl : meta.label}
                              </span>
                              <span className="mt-0.5 block text-[11px] leading-snug text-text-muted line-clamp-2">
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
