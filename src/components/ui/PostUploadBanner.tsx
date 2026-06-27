import { Play, BookOpen, X } from '@/lib/lucide-shim';
import { cn } from '../../utils/cn';
import { workspaceEntryPrefetchHandlers } from '../../lib/workspaceEntryPrefetch';

type Props = {
  courseTitle: string;
  lang?: 'en' | 'el';
  onOpenWorkspace: () => void;
  onViewCourse?: () => void;
  onDismiss: () => void;
  className?: string;
};

/** Post-upload CTA strip — open workspace or explore course (PLATFORM_UI_UX §2.3). */
export function PostUploadBanner({ courseTitle, lang = 'en', onOpenWorkspace, onViewCourse, onDismiss, className }: Props) {
  const isEl = lang === 'el';
  return (
    <div
      className={cn('ws-bento-soft p-4 flex flex-col sm:flex-row sm:items-center gap-4 border-brand-500/30', className)}
      data-testid="post-upload-banner"
      role="status"
    >
      <div className="flex-1 min-w-0">
        <p className="ws-eyebrow text-brand-700 mb-1">{isEl ? 'Το μάθημα είναι έτοιμο' : 'Course ready'}</p>
        <p className="text-sm font-semibold text-text-primary truncate">{courseTitle}</p>
        <p className="text-xs text-text-secondary mt-1">
          {isEl
            ? 'Άνοιξε το Study Workspace για διαδραστική μελέτη ή εξερεύνησε τα modules.'
            : 'Open Study Workspace to start learning interactively, or browse modules first.'}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenWorkspace}
          data-testid="post-upload-open-workspace"
          {...workspaceEntryPrefetchHandlers()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <Play className="w-4 h-4" />
          {isEl ? 'Άνοιγμα Workspace' : 'Open Workspace'}
        </button>
        <button
          type="button"
          onClick={onViewCourse ?? onDismiss}
          className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium platform-pill transition-colors"
        >
          <BookOpen className="w-3.5 h-3.5" />
          {isEl ? 'Περιήγηση modules' : 'Browse modules'}
        </button>
        <button type="button" onClick={onDismiss} aria-label={isEl ? 'Κλείσιμο' : 'Dismiss'} className="p-2 rounded-lg text-text-muted hover:text-text-secondary">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
