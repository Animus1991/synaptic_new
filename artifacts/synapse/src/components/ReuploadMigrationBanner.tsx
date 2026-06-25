import { useState } from 'react';
import { RefreshCw, X, Cpu } from 'lucide-react';
import { cn } from '../utils/cn';
import {
  dismissReuploadHint,
  isReuploadHintDismissed,
  reuploadMigrationMessage,
} from '../lib/pipelineMigration';

export function ReuploadMigrationBanner({
  courseId,
  lang,
  onReupload,
  onReprocess,
  reprocessing = false,
  compact = false,
  className,
}: {
  courseId: string;
  lang: 'en' | 'el';
  onReupload: () => void;
  onReprocess?: () => void;
  reprocessing?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState(() => isReuploadHintDismissed(courseId));
  if (dismissed) return null;

  const dismiss = () => {
    dismissReuploadHint(courseId);
    setDismissed(true);
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-accent-amber/30 bg-accent-amber/10',
        compact ? 'px-3 py-2.5 text-xs' : 'px-4 py-3 text-sm',
        className,
      )}
      data-testid="reupload-migration-banner"
    >
      <RefreshCw className={cn('shrink-0 text-accent-amber', compact ? 'mt-0.5 h-3.5 w-3.5' : 'mt-0.5 h-4 w-4')} />
      <div className="min-w-0 flex-1">
        <p className="text-text-primary leading-relaxed">{reuploadMigrationMessage(lang)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {onReprocess && (
            <button
              type="button"
              onClick={onReprocess}
              disabled={reprocessing}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border border-brand-500/40 bg-brand-500/15 font-medium text-brand-300 hover:bg-brand-500/20 disabled:opacity-60',
                compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
              )}
              data-testid="reprocess-migration-action"
            >
              <Cpu className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
              {reprocessing
                ? (lang === 'el' ? 'Επεξεργασία…' : 'Reprocessing…')
                : (lang === 'el' ? 'Επανεπεξεργασία κειμένου' : 'Reprocess stored text')}
            </button>
          )}
          <button
            type="button"
            onClick={onReupload}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border border-accent-amber/40 bg-accent-amber/15 font-medium text-accent-amber hover:bg-accent-amber/20',
              compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
            )}
            data-testid="reupload-migration-action"
          >
            <RefreshCw className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            {lang === 'el' ? 'Ανέβασμα ξανά' : 'Re-upload files'}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
        aria-label={lang === 'el' ? 'Απόκρυψη' : 'Dismiss'}
      >
        <X className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
    </div>
  );
}
