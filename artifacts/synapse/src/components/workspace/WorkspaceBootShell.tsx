import { useEffect, useState } from 'react';
import { X } from '@/lib/lucide-shim';
import { t, type Lang } from '../../lib/i18n';

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
  lang?: Lang;
  error?: string;
  onRetry?: () => void;
}) {
  const label = t('bootShellLoading', lang);
  const closeLabel = t('close', lang);
  const slowHint = t('bootShellSlowHint', lang);
  const [showSlowHint, setShowSlowHint] = useState(false);

  useEffect(() => {
    if (error) return;
    const timer = window.setTimeout(() => setShowSlowHint(true), 8000);
    return () => window.clearTimeout(timer);
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
                  {t('bootShellFailed', lang)}
                </p>
                <p className="relative z-10 max-w-md text-xs font-mono text-text-muted break-all">{error}</p>
                <div className="relative z-10 flex flex-wrap items-center justify-center gap-2 pt-1">
                  {onRetry && (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="rounded-md border border-brand-500/40 bg-brand-600/15 px-3 py-1.5 text-xs font-medium text-brand-200 hover:bg-brand-600/25"
                    >
                      {t('tryAgain', lang)}
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
                    {t('reloadPage', lang)}
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
