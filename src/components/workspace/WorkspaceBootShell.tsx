import { X } from 'lucide-react';

/** Instant visual feedback while StudyWorkspace chunk loads. */
export function WorkspaceBootShell({
  compact = false,
  onClose,
  lang = 'en',
}: {
  compact?: boolean;
  onClose?: () => void;
  lang?: 'en' | 'el';
}) {
  const label = lang === 'el' ? '\u03a6\u03cc\u03c1\u03c4\u03c9\u03c3\u03b7 \u03c7\u03ce\u03c1\u03bf\u03c5 \u03bc\u03b5\u03bb\u03ad\u03c4\u03b7\u03c2' : 'Loading study workspace';
  const closeLabel = lang === 'el' ? '\u039a\u03bb\u03b5\u03af\u03c3\u03b9\u03bc\u03bf' : 'Close';

  return (
    <div
      className={
        compact
          ? 'flex h-full min-h-0 flex-col bg-surface-primary'
          : 'fixed inset-0 z-50 flex flex-col bg-surface-primary'
      }
      data-testid="workspace-boot-shell"
      aria-busy="true"
      aria-label={label}
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
          <div className="flex-1 animate-pulse rounded-2xl border border-border-subtle bg-surface-card/60" />
        </div>
      </div>
      <p className="sr-only">{label}</p>
    </div>
  );
}
