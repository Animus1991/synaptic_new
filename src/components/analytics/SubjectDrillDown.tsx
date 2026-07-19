import { X } from '@/lib/lucide-shim';
import { CompactProgressBar } from '../ui/CompactProgressBar';
import type { SubjectMasteryTile } from '../../lib/subjectMasteryAnalytics';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../utils/cn';

type Props = {
  tile: SubjectMasteryTile | null;
  onClose: () => void;
  onStudyConcept: (concept: string) => void;
};

export function SubjectDrillDown({ tile, onClose, onStudyConcept }: Props) {
  const { lang } = useI18n();
  if (!tile) return null;

  const title = lang === 'el' ? 'Έννοιες μαθήματος' : 'Course concepts';
  const study = lang === 'el' ? 'Μελέτη' : 'Study';
  const closeLabel = lang === 'el' ? 'Κλείσιμο' : 'Close';

  const topics = [...tile.topics].sort((a, b) => a.mastery - b.mastery);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-3"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid="subject-drill-down"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl border border-border-subtle bg-surface-card shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 border-b border-border-subtle px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-text-tertiary">{title}</p>
            <h3 className="text-sm font-semibold text-text-primary truncate">{tile.title}</h3>
            <p className="text-xs text-text-secondary mt-0.5 tabular-nums">{tile.mastery}% mastery</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded-lg p-1.5 text-text-muted hover:bg-surface-hover hover:text-text-secondary"
            data-testid="subject-drill-down-close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <ul className="overflow-y-auto p-3 space-y-2">
          {topics.length === 0 ? (
            <li className="text-xs text-text-tertiary px-1">
              {lang === 'el' ? 'Δεν υπάρχουν θέματα ακόμα.' : 'No topics yet.'}
            </li>
          ) : (
            topics.map((topic) => (
              <li
                key={topic.id}
                className="rounded-xl border border-border-subtle bg-surface-secondary/40 p-2.5"
                data-testid={`subject-drill-topic-${topic.id}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <p className="text-xs font-medium text-text-primary truncate">{topic.title}</p>
                  <span className="text-[10px] tabular-nums text-text-secondary shrink-0">{Math.round(topic.mastery)}%</span>
                </div>
                <CompactProgressBar pct={topic.mastery} />
                <button
                  type="button"
                  className={cn(
                    'mt-2 w-full rounded-lg border border-brand-500/30 bg-brand-600/10 px-2 py-1.5',
                    'text-[10px] font-semibold text-brand-800 hover:bg-brand-600/20',
                  )}
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
