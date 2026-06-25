import { X } from 'lucide-react';
import { cn } from '../../utils/cn';
import type { Lang } from '../../lib/i18n';
import type { WorkspaceToolId } from '../../lib/taskFlows';
import {
  getSelectionActionDefs,
  selectionExcerptPreview,
  type WorkspaceSelectionActionId,
} from '../../lib/workspaceSelectionActions';

type Props = {
  lang: Lang;
  excerpt: string;
  originTool: WorkspaceToolId;
  onAction: (action: WorkspaceSelectionActionId) => void;
  onDismiss: () => void;
  className?: string;
  'data-testid'?: string;
};

/** §13.5 — identical selection affordances across Reader, Concept Map, and other tools. */
export function WorkspaceSelectionActionBar({
  lang,
  excerpt,
  originTool,
  onAction,
  onDismiss,
  className,
  'data-testid': testId = 'workspace-selection-actions',
}: Props) {
  const actions = getSelectionActionDefs(lang, originTool);
  const preview = selectionExcerptPreview(excerpt);

  return (
    <div
      className={cn(
        'flex shrink-0 flex-col gap-1.5 border-b border-accent-cyan/20 bg-accent-cyan/5 px-3 py-2',
        className,
      )}
      data-testid={testId}
      role="toolbar"
      aria-label={lang === 'el' ? 'Ενέργειες επιλογής' : 'Selection actions'}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="flex-1 truncate text-[10px] italic text-text-secondary" title={excerpt}>
          &ldquo;{preview}&rdquo;
        </span>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded p-1 text-text-muted hover:text-text-primary"
          aria-label={lang === 'el' ? 'Κλείσιμο' : 'Dismiss'}
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            title={action.hint}
            data-testid={`selection-action-${action.id}`}
            onClick={() => onAction(action.id)}
            className={cn(
              'inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-medium transition-colors',
              action.id === 'ask-agent'
                ? 'border-accent-cyan/40 bg-accent-cyan/15 text-accent-cyan hover:bg-accent-cyan/20'
                : 'border-white/10 bg-surface-card/80 text-text-secondary hover:border-brand-500/30 hover:text-brand-200',
            )}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
