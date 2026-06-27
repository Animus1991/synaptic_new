import { cn } from '../../utils/cn';
import { RefreshCw, Upload } from '@/lib/lucide-shim';
import { useI18n } from '../../lib/i18n';
import type { WorkspaceEmptyAction, WorkspaceEmptyTool } from '../../lib/workspaceEmptyState';
import { useWorkspaceEmptyActions } from './WorkspaceEmptyActionsContext';

interface Props {
  message: string;
  /** When true, hides the upload CTA — source exists but this tool found nothing to show. */
  hasSource?: boolean;
  onUpload?: () => void;
  /** Resolves upload / reprocess / related-tool CTAs from StudyWorkspace. */
  tool?: WorkspaceEmptyTool;
  /** Legacy single secondary — prefer `tool` + context. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Explicit actions override context. */
  actions?: WorkspaceEmptyAction[];
  /** Inline layout for intel panels (not full-height center). */
  compact?: boolean;
}

export function WorkspaceEmptyState({
  message,
  hasSource = false,
  onUpload,
  tool,
  secondaryLabel,
  onSecondary,
  actions: actionsOverride,
  compact = false,
}: Props) {
  const { t, lang } = useI18n();
  const contextActionsRaw = useWorkspaceEmptyActions(tool ?? 'reader');
  const contextActions = tool ? contextActionsRaw : [];
  const legacySecondary: WorkspaceEmptyAction[] = onSecondary && secondaryLabel
    ? [{ id: 'switch-tool', label: secondaryLabel, onClick: onSecondary }]
    : [];
  const actions: WorkspaceEmptyAction[] = actionsOverride ?? (contextActions.length > 0 ? contextActions : legacySecondary);
  const showLegacyUpload = !hasSource && onUpload && actions.length === 0;

  return (
    <div
      className={cn(
        compact
          ? 'flex flex-col items-start gap-2 p-3 text-left min-h-0'
          : 'flex flex-col items-center justify-center h-full min-h-[200px] p-8 text-center',
      )}
      data-testid="workspace-empty-state"
      data-has-source={hasSource ? 'true' : 'false'}
      data-tool={tool}
    >
      <p className={cn('text-sm text-text-secondary leading-relaxed', compact ? 'max-w-none' : 'max-w-md')}>
        {message}
      </p>
      {(actions.length > 0 || showLegacyUpload) && (
        <div className={cn(
          'flex flex-wrap gap-2',
          compact ? 'mt-1' : 'mt-5 items-center justify-center',
        )}>
          {showLegacyUpload && (
            <button
              type="button"
              onClick={onUpload}
              data-testid="workspace-empty-upload"
              className="ws-empty-cta-primary"
            >
              <Upload className="w-4 h-4" aria-hidden />
              {lang === 'el' ? 'Ανέβασμα υλικού' : t('uploadMaterial')}
            </button>
          )}
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              data-testid={`workspace-empty-${action.id}`}
              className={action.primary ? 'ws-empty-cta-primary' : 'ws-empty-cta-secondary'}
            >
              {action.id === 'reprocess' && <RefreshCw className="w-3.5 h-3.5" aria-hidden />}
              {action.id === 'upload' && <Upload className="w-3.5 h-3.5" aria-hidden />}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
