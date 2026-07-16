import type { SharedAnnotationDto } from '../../lib/authClient';
import type { AnnotationConflict } from '../../lib/annotationRealtimeSync';
import { cn } from '../../utils/cn';

type Props = {
  conflicts: AnnotationConflict[];
  lang?: 'en' | 'el';
  onChoose: (id: string, choice: 'local' | 'remote') => void;
  onDismissAll?: () => void;
  className?: string;
};

function preview(ann: SharedAnnotationDto): string {
  const t = ann.text.trim();
  return t.length > 80 ? `${t.slice(0, 80)}…` : t;
}

/** Concurrent shared-annotation conflict chooser (Wave 3 / TOOL-AN-02). */
export function AnnotationConflictPanel({
  conflicts,
  lang = 'en',
  onChoose,
  onDismissAll,
  className,
}: Props) {
  if (conflicts.length === 0) return null;
  const title = lang === 'el' ? 'Σύγκρουση σχολίων' : 'Annotation conflicts';
  const hint = lang === 'el'
    ? 'Τοπική και απομακρυσμένη έκδοση διαφέρουν. Επίλεξε ποια κρατάς.'
    : 'Local and remote versions differ. Choose which to keep.';
  const keepLocal = lang === 'el' ? 'Τοπικό' : 'Keep local';
  const keepRemote = lang === 'el' ? 'Απομακρυσμένο' : 'Keep remote';
  const dismiss = lang === 'el' ? 'Αγνόηση όλων' : 'Dismiss all';

  return (
    <div
      className={cn(
        'rounded-xl border border-accent-amber/35 bg-accent-amber/10 p-3 space-y-2',
        className,
      )}
      data-testid="annotation-conflict-panel"
      role="region"
      aria-label={title}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-accent-amber">{title}</p>
          <p className="text-[11px] text-text-secondary mt-0.5">{hint}</p>
        </div>
        {onDismissAll && (
          <button
            type="button"
            onClick={onDismissAll}
            className="text-[10px] font-medium text-text-tertiary hover:text-text-primary"
            data-testid="annotation-conflict-dismiss-all"
          >
            {dismiss}
          </button>
        )}
      </div>
      <ul className="space-y-2">
        {conflicts.map((c) => (
          <li
            key={c.id}
            className="rounded-lg border border-border-subtle bg-surface-card/80 p-2"
            data-testid={`annotation-conflict-${c.id}`}
          >
            <p className="text-[10px] text-text-muted mb-1">#{c.id.slice(0, 8)}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div>
                <p className="font-medium text-text-secondary mb-0.5">{keepLocal}</p>
                <p className="text-text-primary line-clamp-2">{preview(c.local)}</p>
                <p className="text-text-muted mt-0.5">L{c.local.lineStart + 1}–{c.local.lineEnd + 1}</p>
              </div>
              <div>
                <p className="font-medium text-text-secondary mb-0.5">{keepRemote}</p>
                <p className="text-text-primary line-clamp-2">{preview(c.remote)}</p>
                <p className="text-text-muted mt-0.5">L{c.remote.lineStart + 1}–{c.remote.lineEnd + 1}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg border border-border-default px-2 py-1 text-[10px] font-medium hover:bg-surface-hover"
                onClick={() => onChoose(c.id, 'local')}
                data-testid={`annotation-conflict-keep-local-${c.id}`}
              >
                {keepLocal}
              </button>
              <button
                type="button"
                className="rounded-lg bg-brand-600/15 px-2 py-1 text-[10px] font-medium text-brand-700 hover:bg-brand-600/25"
                onClick={() => onChoose(c.id, 'remote')}
                data-testid={`annotation-conflict-keep-remote-${c.id}`}
              >
                {keepRemote}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
