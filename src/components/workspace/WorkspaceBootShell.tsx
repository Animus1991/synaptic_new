import { useEffect, useState } from 'react';
import { X } from '@/lib/lucide-shim';

/** Instant visual feedback while StudyWorkspace chunk loads. */
export function WorkspaceBootShell({
  compact = false,
  onClose,
  lang = 'en',
  error,
  onRetry,
}: {
  compact?: boolean;
  onClose?: () => void;
  lang?: 'en' | 'el';
  error?: string;
  onRetry?: () => void;
}) {
  const label = lang === 'el' ? '\u03a6\u03cc\u03c1\u03c4\u03c9\u03c3\u03b7 \u03c7\u03ce\u03c1\u03bf\u03c5 \u03bc\u03b5\u03bb\u03ad\u03c4\u03b7\u03c2' : 'Loading study workspace';
  const closeLabel = lang === 'el' ? '\u039a\u03bb\u03b5\u03af\u03c3\u03b9\u03bc\u03bf' : 'Close';
  const slowHint = lang === 'el'
    ? '\u0391\u03c5\u03c4\u03cc \u03bc\u03c0\u03bf\u03c1\u03b5\u03af \u03bd\u03b1 \u03b4\u03b9\u03b1\u03c1\u03ba\u03ad\u03c3\u03b5\u03b9 \u03bc\u03b5\u03c1\u03b9\u03ba\u03ac \u03b4\u03b5\u03c5\u03c4\u03b5\u03c1\u03cc\u03bb\u03b5\u03c0\u03c4\u03b1 \u03c4\u03b7\u03bd \u03c0\u03c1\u03ce\u03c4\u03b7 \u03c6\u03cc\u03c1\u03c4\u03c9\u03c3\u03b7.'
    : 'First load can take a few seconds while tools initialize.';
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    if (error) return;
    const t = window.setTimeout(() => setShowSlowHint(true), 8000);
    return () => window.clearTimeout(t);
  }, [error]);

  return (
    <div
      className={
        compact
          ? 'flex h-full min-h-0 flex-col bg-surface-primary'
          : 'fixed inset-0 z-50 flex flex-col bg-surface-primary'
      }
      data-testid="workspace-boot-shell"
      aria-busy={error ? undefined : true}
      aria-label={error ? undefined : label}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface-card px-4 py-3">
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-secondary hover:bg-surface-hover hover:text-text-primary transition-colors"
            aria-label={closeLabel}
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <div className="h-8 w-8" />
        )}
        <div className="h-4 w-40 animate-pulse rounded bg-brand-600/20" />
        <div className="h-8 w-20 animate-pulse rounded-lg bg-surface-elevated" />
      </div>
      <div className="flex min-h-0 flex-1">
        <div className="hidden w-14 shrink-0 border-r border-border-subtle bg-surface-card/80 sm:block">
          <div className="space-y-3 p-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="mx-auto h-8 w-8 animate-pulse rounded-lg bg-brand-600/15" />
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4">
          <div className="h-6 w-2/3 max-w-md animate-pulse rounded bg-brand-600/20" />
          <div className="relative flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-border-subtle bg-surface-card/60 px-6 text-center">
            {!error && <div className="absolute inset-0 animate-pulse rounded-2xl bg-brand-600/5" />}
            {error ? (
              <>
                <p className="relative z-10 text-sm font-semibold text-red-400">
                  {lang === 'el' ? '\u0391\u03c0\u03bf\u03c4\u03c5\u03c7\u03af\u03b1 \u03c6\u03cc\u03c1\u03c4\u03c9\u03c3\u03b7\u03c2 \u03c7\u03ce\u03c1\u03bf\u03c5 \u03bc\u03b5\u03bb\u03ad\u03c4\u03b7\u03c2' : 'Failed to load study workspace'}
                </p>
                <p className="relative z-10 max-w-md text-xs font-mono text-text-muted break-all">{error}</p>
                <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 pt-1">
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="rounded-md border border-brand-500/40 bg-brand-600/15 px-3 py-1.5 text-xs font-medium text-brand-200 hover:bg-brand-600/25"
                    >
                      {lang === 'el' ? '\u0394\u03bf\u03ba\u03b9\u03bc\u03ac\u03c3\u03c4\u03b5 \u03be\u03b1\u03bd\u03ac' : 'Try again'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      try { sessionStorage.removeItem('sw-chunk-reload-attempt'); } catch { /* ignore */ }
                      window.location.reload();
                    }}
                    className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-hover"
                  >
                    {lang === 'el' ? '\u0395\u03c0\u03b1\u03bd\u03b1\u03c6\u03cc\u03c1\u03c4\u03c9\u03c3\u03b7' : 'Reload'}
                  </button>
                </div>
              </>

            ) : (
              <>
                <p className="relative z-10 text-sm font-medium text-text-secondary">{label}</p>
                {showSlowHint && (
                  <p className="relative z-10 max-w-sm text-xs text-text-muted">{slowHint}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}