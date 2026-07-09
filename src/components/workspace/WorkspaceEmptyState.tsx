import { cn } from '../../utils/cn';
import { FileSearch, RefreshCw, Upload } from '@/lib/lucide-shim';
import { useI18n } from '../../lib/i18n';
import type { WorkspaceEmptyAction, WorkspaceEmptyTool } from '../../lib/workspaceEmptyState';
import { workspaceEmptyTitle } from '../../lib/workspaceEmptyState';
import { useWorkspaceEmptyActions } from './WorkspaceEmptyActionsContext';
import { PrimaryCTA, SecondaryCTA } from '../ui/primitives';

interface Props {
  message: string;
  /** Learning-outcome heading; defaults from hasSource when omitted. */
  title?: string;
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
  title,
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
  const contextOrLegacy = contextActions.length > 0 ? contextActions : legacySecondary;
  const actions: WorkspaceEmptyAction[] = actionsOverride ?? (
    contextActions.length > 0 && legacySecondary.length > 0
      ? [...contextActions, ...legacySecondary]
      : contextOrLegacy
  );
  const showLegacyUpload = !hasSource && onUpload && actions.length === 0;
  const heading = title ?? workspaceEmptyTitle({ hasSource, lang });
  const Icon = hasSource ? FileSearch : Upload;

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
      role="status"
    >
      {!compact && (
        <div className="grid h-12 w-12 place-items-center rounded-xl border border-brand-500/20 bg-brand-500/10 mb-4">
          <Icon className="h-5 w-5 text-brand-600" aria-hidden />
        </div>
      )}
      <h3 className={cn('ws-serif text-base font-medium text-text-primary', compact ? 'text-sm' : 'mb-1')}>
        {heading}
      </h3>
      <p className={cn('text-sm text-text-secondary leading-relaxed', compact ? 'max-w-none' : 'max-w-md')}>
        {message}
      </p>
      {(actions.length > 0 || showLegacyUpload) && (
        <div className={cn('flex flex-col gap-2', compact ? 'mt-2 w-full' : 'mt-5 items-center')}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            {t('workspaceEmptyNextStep')}
          </p>
          <div className={cn('flex flex-wrap gap-2', compact ? '' : 'items-center justify-center')}>
            {showLegacyUpload && (
              <PrimaryCTA
                size="sm"
                onClick={onUpload}
                data-testid="workspace-empty-upload"
              >
                <Upload className="w-4 h-4" aria-hidden />
                {t('uploadMaterial')}
              </PrimaryCTA>
            )}
            {actions.map((action, index) => {
              const Cta = action.primary || index === 0 ? PrimaryCTA : SecondaryCTA;
              return (
                <Cta
                  key={`${action.id}-${action.label}`}
                  size="sm"
                  onClick={action.onClick}
                  data-testid={`workspace-empty-${action.id}`}
                >
                  {action.id === 'reprocess' && <RefreshCw className="w-3.5 h-3.5" aria-hidden />}
                  {action.id === 'upload' && <Upload className="w-3.5 h-3.5" aria-hidden />}
                  {action.label}
                </Cta>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
