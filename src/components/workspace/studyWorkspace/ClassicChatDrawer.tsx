import { Panel, Separator } from 'react-resizable-panels';
import { MessageSquare, X } from '@/lib/lucide-shim';
import { cn } from '../../../utils/cn';
import type { StudyWorkspaceModel } from './useStudyWorkspace';

interface ClassicChatDrawerProps {
  model: StudyWorkspaceModel;
}

/**
 * Inline AI chat for classic workspace layout (CHAT-06).
 * Desktop: resizable right panel. Mobile: full-screen overlay — no Agent nav redirect.
 */
export function ClassicChatDrawer({ model }: ClassicChatDrawerProps) {
  const { renderCenterAgent, isMobile, onCloseInlineAgent, lang } = model;
  if (!renderCenterAgent) return null;

  const title = lang === 'el' ? 'Συνομιλία AI' : 'AI chat';
  const closeLabel = lang === 'el' ? 'Κλείσιμο συνομιλίας' : 'Close chat';

  const header = (
    <header className="workspace-glass-panel flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-2 shrink-0 bg-surface-card">
      <div className="flex items-center gap-2 min-w-0">
        <MessageSquare className="h-4 w-4 shrink-0 text-brand-700" aria-hidden />
        <span className="text-xs font-semibold text-text-primary truncate">{title}</span>
      </div>
      {onCloseInlineAgent && (
        <button
          type="button"
          onClick={onCloseInlineAgent}
          aria-label={closeLabel}
          data-testid="classic-chat-drawer-close"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-primary transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </header>
  );

  const body = (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      {header}
      <div className="flex-1 min-h-0 overflow-hidden">{renderCenterAgent()}</div>
    </div>
  );

  if (isMobile) {
    return (
      <div
        className={cn(
          'fixed inset-0 z-50 flex flex-col bg-surface-primary',
          'pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]',
        )}
        data-testid="classic-chat-drawer"
        role="dialog"
        aria-label={title}
      >
        {body}
      </div>
    );
  }

  return (
    <>
      <Separator className="w-1 bg-border-subtle hover:bg-brand-500/50 active:bg-brand-500 transition-colors cursor-col-resize z-20" />
      <Panel
        id="classic-chat-drawer"
        defaultSize={28}
        minSize={20}
        maxSize={45}
        className="flex flex-col min-h-0 overflow-hidden bg-surface-primary border-l border-border-subtle"
        data-testid="classic-chat-drawer"
      >
        {body}
      </Panel>
    </>
  );
}
