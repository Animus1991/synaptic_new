import { Play, BookOpen, X } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { workspaceEntryPrefetchHandlers } from '../../lib/workspaceEntryPrefetch';
import { useI18n } from '../../lib/i18n';
import { useMinimalTheme } from '../../lib/useMinimalTheme';
import { PrimaryCTA, SecondaryCTA } from './primitives';
import { BlueprintSurface } from './BlueprintSurface';

type Props = {
  courseTitle: string;
  onOpenWorkspace: () => void;
  onViewCourse?: () => void;
  onDismiss: () => void;
  className?: string;
};

/** Post-upload CTA strip — open workspace or explore course (PLATFORM_UI_UX §2.3). */
export function PostUploadBanner({ courseTitle, onOpenWorkspace, onViewCourse, onDismiss, className }: Props) {
  const { t } = useI18n();
  /** OPT-R10 — quieter create-loop banner under Minimal. */
  const createQuiet = useMinimalTheme();
  return (
    <BlueprintSurface
      hint
      className={cn(
        'p-4 flex flex-col sm:flex-row sm:items-center gap-4 border-brand-500/30',
        createQuiet && 'post-upload-create',
        className,
      )}
      data-testid="post-upload-banner"
      role="status"
    >
      <div className="flex-1 min-w-0">
        <p className="ws-eyebrow text-text-secondary mb-1">{t('postUploadCourseReady')}</p>
        <p className="text-sm font-semibold text-text-primary truncate">{courseTitle}</p>
        <p className="text-xs text-text-secondary mt-1">{t('postUploadHint')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <PrimaryCTA
          onClick={onOpenWorkspace}
          data-testid="post-upload-open-workspace"
          {...workspaceEntryPrefetchHandlers()}
        >
          <Play className="w-4 h-4" />
          {t('postUploadOpenWorkspace')}
        </PrimaryCTA>
        <SecondaryCTA onClick={onViewCourse ?? onDismiss}>
          <BookOpen className="w-3.5 h-3.5" />
          {t('postUploadBrowseModules')}
        </SecondaryCTA>
        <button type="button" onClick={onDismiss} aria-label={t('close')} className="p-2 rounded-lg text-text-muted hover:text-text-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>
    </BlueprintSurface>
  );
}
