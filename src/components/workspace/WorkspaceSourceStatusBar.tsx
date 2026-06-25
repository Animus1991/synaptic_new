import { AlertTriangle, Cpu, FileSearch, RefreshCw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { reuploadMigrationMessage } from '../../lib/pipelineMigration';
import { lowSourceQualityMessage } from '../../lib/sourceQualityPrompt';

type Props = {
  lang: 'en' | 'el';
  score: number | null;
  sectionCount?: number;
  showMigration: boolean;
  showQualityWarning: boolean;
  reprocessing?: boolean;
  onInspect?: () => void;
  onReprocess?: () => void;
  onReupload?: () => void;
  onContinue?: () => void;
  className?: string;
};

/** Single consolidated source-quality + pipeline strip (replaces stacked banners). */
export function WorkspaceSourceStatusBar({
  lang,
  score,
  sectionCount,
  showMigration,
  showQualityWarning,
  reprocessing = false,
  onInspect,
  onReprocess,
  onReupload,
  onContinue,
  className,
}: Props) {
  const isEl = lang === 'el';
  if (!showMigration && !showQualityWarning) return null;

  const message = showMigration
    ? reuploadMigrationMessage(lang)
    : (score != null ? lowSourceQualityMessage(lang, score) : '');

  return (
    <div
      className={cn(
        'mb-4 max-w-2xl mx-auto rounded-xl border border-accent-amber/30 bg-accent-amber/8 px-3 py-2.5',
        className,
      )}
      data-testid="workspace-source-status-bar"
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-accent-amber" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[10px]">
            {typeof score === 'number' && (
              <span className="font-semibold text-text-primary" data-testid="source-status-score">
                {isEl ? 'Ποιότητα πηγής' : 'Source quality'} {score}/100
                {typeof sectionCount === 'number' && (
                  <span className="font-normal text-text-muted">
                    {' '}· {sectionCount} {isEl ? 'ενότητες' : 'sections'}
                  </span>
                )}
              </span>
            )}
            {showMigration && (
              <span className="rounded-full border border-accent-amber/40 bg-accent-amber/10 px-1.5 py-0.5 text-accent-amber">
                pipeline v2.4
              </span>
            )}
          </div>
          <p className="mt-1 text-[10px] leading-relaxed text-text-secondary">{message}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {onInspect && (
              <button
                type="button"
                onClick={onInspect}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-surface-card/50 px-2 py-1 text-[10px] font-medium text-text-secondary hover:text-text-primary"
                data-testid="source-status-inspect"
              >
                <FileSearch className="h-3 w-3" />
                {isEl ? 'Προεπισκόπηση' : 'Preview'}
              </button>
            )}
            {onReprocess && (
              <button
                type="button"
                onClick={onReprocess}
                disabled={reprocessing}
                className="inline-flex items-center gap-1 rounded-lg border border-brand-500/40 bg-brand-500/15 px-2 py-1 text-[10px] font-medium text-brand-300 disabled:opacity-60"
                data-testid="source-status-reprocess"
              >
                <Cpu className={cn('h-3 w-3', reprocessing && 'animate-pulse')} />
                {reprocessing
                  ? (isEl ? 'Επεξεργασία…' : 'Processing…')
                  : (isEl ? 'Επανεπεξεργασία' : 'Reprocess')}
              </button>
            )}
            {onReupload && (
              <button
                type="button"
                onClick={onReupload}
                className="inline-flex items-center gap-1 rounded-lg border border-accent-amber/40 bg-accent-amber/15 px-2 py-1 text-[10px] font-medium text-accent-amber"
                data-testid="source-status-reupload"
              >
                <RefreshCw className="h-3 w-3" />
                {isEl ? 'Ανέβασμα ξανά' : 'Re-upload'}
              </button>
            )}
            {onContinue && (
              <button
                type="button"
                onClick={onContinue}
                className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-text-muted hover:text-text-secondary"
                data-testid="source-status-continue"
              >
                {isEl ? 'Συνέχεια' : 'Continue'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
