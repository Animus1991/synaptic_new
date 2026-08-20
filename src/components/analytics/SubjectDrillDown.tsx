import { useCallback, useEffect, useId, useRef } from 'react';
import { X } from '@/lib/lucide-shim';
import { CompactProgressBar } from '../ui/CompactProgressBar';
import type { SubjectMasteryTile } from '../../features/analytics/subjectMasteryAnalytics';
import { useI18n } from '../../lib/i18n';
import { AllCapsLabel } from '../ui/AllCapsLabel';

type Props = {
  tile: SubjectMasteryTile | null;
  onClose: () => void;
  onStudyConcept: (concept: string) => void;
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.tabIndex < 0 || element.getAttribute('aria-disabled') === 'true') return false;
    if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function SubjectDrillDown({ tile, onClose: onRequestClose, onStudyConcept }: Props) {
  const { t, lang } = useI18n();
  const dialogTitleId = useId();
  const courseTitleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onRequestClose);
  const isOpen = tile !== null;

  useEffect(() => {
    onCloseRef.current = onRequestClose;
  }, [onRequestClose]);

  const onClose = useCallback(() => {
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const opener = document.activeElement instanceof HTMLElement
      && document.activeElement !== document.body
      ? document.activeElement
      : null;
    const prevOverflow = document.body.style.overflow;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;

      const focusable = getFocusableElements(panel);
      if (focusable.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }

      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      const active = document.activeElement;
      const focusIsOutside = !active || !panel.contains(active);

      if (e.shiftKey && (active === first || focusIsOutside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || focusIsOutside)) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey, true);
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen, onClose]);

  if (!tile) return null;

  const title = lang === 'el' ? 'Έννοιες μαθήματος' : 'Course concepts';
  const study = lang === 'el' ? 'Μελέτη' : 'Study';
  const closeLabel = lang === 'el' ? 'Κλείσιμο' : 'Close';
  const masteryWord = t('analyticsMasteryWord');

  const topics = [...tile.topics].sort((a, b) => a.mastery - b.mastery);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${dialogTitleId} ${courseTitleId}`}
      data-testid="subject-drill-down"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border-subtle px-4 py-3">
          <div className="min-w-0">
            <h2 id={dialogTitleId} className="type-micro font-semibold uppercase tracking-wide text-text-tertiary"><AllCapsLabel>{title}</AllCapsLabel></h2>
            <h3 id={courseTitleId} className="type-meta font-semibold text-text-primary truncate">{tile.title}</h3>
            <p className="type-caption text-text-secondary mt-0.5 tabular-nums">{tile.mastery}% {masteryWord}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text-secondary"
            data-testid="subject-drill-down-close"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <ul className="overflow-y-auto p-3 space-y-2">
          {topics.length === 0 ? (
            <li className="type-caption text-text-tertiary px-1">
              {lang === 'el' ? 'Δεν υπάρχουν θέματα ακόμα.' : 'No topics yet.'}
            </li>
          ) : (
            topics.map((topic) => (
              <li
                key={topic.id}
                className="rounded-xl border-0 bg-surface-secondary/40 p-2.5"
                data-testid={`subject-drill-topic-${topic.id}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="type-caption font-medium text-text-primary truncate">{topic.title}</p>
                  <span className="type-micro tabular-nums text-text-secondary shrink-0">{Math.round(topic.mastery)}%</span>
                </div>
                <CompactProgressBar
                  pct={topic.mastery}
                  aria-label={`${topic.title} ${Math.round(topic.mastery)}%`}
                />
                <button
                  type="button"
                  className="mt-2 w-full min-h-11 rounded-lg border-0 bg-surface-secondary px-3 py-2 type-caption font-medium text-text-primary transition-colors hover:bg-brand-600/20"
                  onClick={() => onStudyConcept(topic.title)}
                  data-testid={`subject-drill-study-${topic.id}`}
                >
                  {study}
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
