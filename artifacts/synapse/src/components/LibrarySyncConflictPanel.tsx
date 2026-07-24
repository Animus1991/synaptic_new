/**
 * OPT-L5 — resolve divergent library items after a signed-in pull (local vs remote).
 */
import { useMemo } from 'react';
import type { LibrarySyncConflictItem } from '../lib/librarySync';
import { t } from '../lib/i18n';
import { AllCapsLabel } from './ui/AllCapsLabel';

type Props = {
  conflicts: LibrarySyncConflictItem[];
  language?: 'el' | 'en';
  onKeepRemote: () => void;
  onRestoreLocal: () => void;
  onDismiss?: () => void;
};

export function LibrarySyncConflictPanel({
  conflicts,
  language = 'en',
  onKeepRemote,
  onRestoreLocal,
  onDismiss,
}: Props) {
  const lang = language === 'el' ? 'el' : 'en';
  const preview = useMemo(() => conflicts.slice(0, 4), [conflicts]);
  const more = Math.max(0, conflicts.length - preview.length);

  if (conflicts.length === 0) return null;

  return (
    <div
      className="library-sync-conflict-panel ux-callout"
      role="alertdialog"
      aria-labelledby="library-sync-conflict-title"
      data-testid="library-sync-conflict-panel"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id="library-sync-conflict-title" className="ux-section-header m-0">
            {t('librarySyncConflictTitle', lang)}
          </h3>
          <p className="text-sm opacity-80 mt-1 mb-0">
            {t('librarySyncConflictBody', lang).replace('{count}', String(conflicts.length))}
          </p>
        </div>
        {onDismiss ? (
          <button
            type="button"
            className="ux-secondary-cta text-xs"
            data-testid="library-sync-conflict-dismiss"
            onClick={onDismiss}
          >
            {t('librarySyncConflictDismiss', lang)}
          </button>
        ) : null}
      </div>

      <ul className="mt-2 mb-0 pl-4 text-xs opacity-75 space-y-0.5">
        {preview.map((c) => (
          <li key={`${c.kind}:${c.id}`}>
            <span className="uppercase tracking-wide opacity-60 mr-1">
              <AllCapsLabel>{c.kind}</AllCapsLabel>
            </span>
            {c.localLabel === c.remoteLabel
              ? c.localLabel
              : `${c.localLabel} ↔ ${c.remoteLabel}`}
          </li>
        ))}
        {more > 0 ? (
          <li data-testid="library-sync-conflict-more">
            {t('librarySyncConflictMore', lang).replace('{count}', String(more))}
          </li>
        ) : null}
      </ul>

      <div className="flex flex-wrap gap-2 mt-3">
        <button
          type="button"
          className="ux-secondary-cta text-xs"
          data-testid="library-sync-conflict-keep-local"
          onClick={onRestoreLocal}
        >
          {t('librarySyncConflictKeepLocal', lang)}
        </button>
        <button
          type="button"
          className="ux-primary-cta text-xs"
          data-testid="library-sync-conflict-keep-remote"
          onClick={onKeepRemote}
        >
          {t('librarySyncConflictKeepRemote', lang)}
        </button>
      </div>
    </div>
  );
}
