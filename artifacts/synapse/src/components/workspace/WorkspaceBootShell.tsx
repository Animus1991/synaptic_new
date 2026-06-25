/** Instant visual feedback while StudyWorkspace chunk loads — avoids “dead click” perception. */
export function WorkspaceBootShell({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? 'flex h-full min-h-0 flex-col bg-surface-primary'
          : 'fixed inset-0 z-50 flex flex-col bg-surface-primary'
      }
      data-testid="workspace-boot-shell"
      aria-busy="true"
      aria-label="Loading study workspace"
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface-card px-4 py-3">
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
      <p className="sr-only">Loading study workspace…</p>
    </div>
  );
}
