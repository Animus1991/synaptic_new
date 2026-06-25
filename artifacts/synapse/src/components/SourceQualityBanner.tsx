import { AlertTriangle, Cpu, FileSearch, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../utils/cn';
import { lowSourceQualityMessage } from '../lib/sourceQualityPrompt';

type Props = {
  score: number;
  lang: 'en' | 'el';
  onReprocess?: () => void;
  onReupload?: () => void;
  onInspectExtraction?: () => void;
  onContinueAnyway?: () => void;
  reprocessing?: boolean;
  compact?: boolean;
  className?: string;
  dismissKey?: string;
};

function isDismissed(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function dismiss(key: string): void {
  try {
    sessionStorage.setItem(key, '1');
  } catch {
    /* ignore */
  }
}

export function SourceQualityBanner({
  score,
  lang,
  onReprocess,
  onReupload,
  onInspectExtraction,
  onContinueAnyway,
  reprocessing = false,
  compact = false,
  className,
  dismissKey,
}: Props) {
  const storageKey = dismissKey ?? `synapse-low-quality-dismissed:${Math.round(score)}`;
  const [dismissed, setDismissed] = useState(() => isDismissed(storageKey));

  const handleDismiss = () => {
    dismiss(storageKey);
    setDismissed(true);
    onContinueAnyway?.();
  };

  if (dismissed) return null;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-2xl border border-accent-rose/30 bg-accent-rose/10',
        compact ? 'px-3 py-2.5 text-xs' : 'px-4 py-3 text-sm',
        className,
      )}
      data-testid="source-quality-banner"
      role="alert"
    >
      <AlertTriangle className={cn('shrink-0 text-accent-rose', compact ? 'mt-0.5 h-3.5 w-3.5' : 'mt-0.5 h-4 w-4')} />
      <div className="min-w-0 flex-1">
        <p className="text-text-primary leading-relaxed">{lowSourceQualityMessage(lang, score)}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {onReprocess && (
            <button
              type="button"
              onClick={onReprocess}
              disabled={reprocessing}
              data-testid="source-quality-reprocess"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border border-brand-500/40 bg-brand-500/15 font-medium text-brand-300 hover:bg-brand-500/20 disabled:opacity-60',
                compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
              )}
            >
              <Cpu className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
              {reprocessing
                ? (lang === 'el' ? 'Επεξεργασία…' : 'Reprocessing…')
                : (lang === 'el' ? 'Επανεπεξεργασία κειμένου' : 'Reprocess stored text')}
            </button>
          )}
          {onReupload && (
            <button
              type="button"
              onClick={onReupload}
              data-testid="source-quality-reupload"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border border-accent-amber/40 bg-accent-amber/15 font-medium text-accent-amber hover:bg-accent-amber/20',
                compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
              )}
            >
              <RefreshCw className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
              {lang === 'el' ? 'Ανέβασμα ξανά' : 'Re-upload'}
            </button>
          )}
          {onInspectExtraction && (
            <button
              type="button"
              onClick={onInspectExtraction}
              data-testid="source-quality-inspect"
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-surface-card/40 font-medium text-text-secondary hover:text-text-primary',
                compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
              )}
            >
              <FileSearch className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
              {lang === 'el' ? 'Έλεγχος εξαγωγής' : 'Inspect extraction'}
            </button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            data-testid="source-quality-continue"
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border border-white/10 font-medium text-text-muted hover:text-text-secondary',
              compact ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs',
            )}
          >
            {lang === 'el' ? 'Συνέχεια ούτως ή άλλως' : 'Continue anyway'}
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-text-primary"
        aria-label={lang === 'el' ? 'Απόκρυψη' : 'Dismiss'}
      >
        <X className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
    </div>
  );
}
