/**
 * COL-02 — resolve divergent shared annotations (local vs remote).
 */
import { useMemo } from 'react';
import type { AnnotationConflict } from '../../lib/annotationConflict';
import { resolveAnnotationConflict } from '../../lib/annotationConflict';
import type { SharedAnnotationDto } from '../../lib/authClient';
import { AllCapsLabel } from '../ui/AllCapsLabel';

type Props = {
  conflicts: AnnotationConflict[];
  language?: 'el' | 'en';
  onResolved: (remaining: AnnotationConflict[], chosen: SharedAnnotationDto) => void;
  onDismissAll?: () => void;
};

export function AnnotationConflictPanel({
  conflicts,
  language = 'en',
  onResolved,
  onDismissAll,
}: Props) {
  const el = language === 'el';
  const current = conflicts[0];
  const remainingCount = conflicts.length;

  const copy = useMemo(() => ({
    title: el ? 'Σύγκρουση επισημάνσεων' : 'Annotation conflict',
    body: el
      ? 'Η ίδια επισήμανση άλλαξε τοπικά και απομακρυσμένα. Επίλεξε ποια έκδοση κρατάς.'
      : 'The same annotation changed locally and remotely. Choose which version to keep.',
    local: el ? 'Τοπική' : 'Local',
    remote: el ? 'Απομακρυσμένη' : 'Remote',
    dismiss: el ? 'Αγνόηση όλων' : 'Dismiss all',
    more: el ? `Ακόμη ${remainingCount - 1}` : `${remainingCount - 1} more`,
  }), [el, remainingCount]);

  if (!current) return null;

  const pick = (choice: 'local' | 'remote') => {
    const { remaining, chosen } = resolveAnnotationConflict(conflicts, current.id, choice);
    if (chosen) onResolved(remaining, chosen);
  };

  return (
    <div
      className="annotation-conflict-panel ux-callout"
      role="alertdialog"
      aria-labelledby="annotation-conflict-title"
      data-testid="annotation-conflict-panel"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="annotation-conflict-title" className="ux-section-header m-0">
            {copy.title}
          </h3>
          <p className="text-sm opacity-80 mt-1 mb-0">{copy.body}</p>
        </div>
        {onDismissAll ? (
          <button type="button" className="ux-secondary-cta text-xs" onClick={onDismissAll}>
            {copy.dismiss}
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 mt-3 md:grid-cols-2">
        <button
          type="button"
          className="ux-calm-panel text-left p-3"
          data-testid="annotation-conflict-keep-local"
          onClick={() => pick('local')}
        >
          <div className="text-xs uppercase tracking-wide opacity-60"><AllCapsLabel>{copy.local}</AllCapsLabel></div>
          <div className="text-sm mt-1 whitespace-pre-wrap">{current.local.text}</div>
          <div className="text-xs opacity-50 mt-2">
            L{current.local.lineStart + 1} · rev {current.local.revision ?? 0}
          </div>
        </button>
        <button
          type="button"
          className="ux-spark-panel text-left p-3"
          data-testid="annotation-conflict-keep-remote"
          onClick={() => pick('remote')}
        >
          <div className="text-xs uppercase tracking-wide opacity-60"><AllCapsLabel>{copy.remote}</AllCapsLabel></div>
          <div className="text-sm mt-1 whitespace-pre-wrap">{current.remote.text}</div>
          <div className="text-xs opacity-50 mt-2">
            L{current.remote.lineStart + 1} · rev {current.remote.revision ?? 0}
          </div>
        </button>
      </div>

      {remainingCount > 1 ? (
        <p className="text-xs opacity-60 mt-2 mb-0">{copy.more}</p>
      ) : null}
    </div>
  );
}
