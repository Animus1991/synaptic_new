import { cn } from '../../utils/cn';
import type { FsrsDueQueueItem } from '../../lib/leitnerDueQueue';
import { useI18n } from '../../lib/i18n';

type Props = {
  items: FsrsDueQueueItem[];
  onSelect?: (concept: string) => void;
  lang?: 'en' | 'el';
  /** Open the collapsible panel by default (Leitner tool keeps collapsed). */
  defaultOpen?: boolean;
  /** `card` — Tasks/Dashboard surface; `compact` — Leitner sidebar. */
  variant?: 'compact' | 'card';
  className?: string;
};

export function LeitnerDueQueuePanel({
  items,
  onSelect,
  lang: langProp,
  defaultOpen = false,
  variant = 'compact',
  className,
}: Props) {
  const { t, lang: i18nLang } = useI18n();
  const lang = langProp ?? i18nLang;

  if (items.length === 0) return null;

  const isCard = variant === 'card';

  return (
    <details
      className={cn(
        /* OPT-K119 — frameless due queue (spacing + wash, no hairlines) */
        isCard ? 'group border-0 bg-transparent shadow-none' : 'mb-3 group',
        className,
      )}
      data-testid="leitner-due-queue-panel"
      open={defaultOpen || undefined}
    >
      <summary
        className={cn(
          'cursor-pointer list-none [&::-webkit-details-marker]:hidden',
          isCard && 'px-1 py-2',
        )}
      >
        <p
          className={cn(
            'font-semibold flex items-center gap-1.5',
            isCard ? 'type-meta text-text-primary' : 'type-caption mb-1 text-text-muted',
          )}
        >
          {t('leitnerDueQueuePanel')}
          <span className="tabular-nums font-bold text-text-secondary">{items.length}</span>
          {isCard && (
            <span className="ml-auto type-caption font-normal text-text-tertiary">
              {t('leitnerDueQueueHint')}
            </span>
          )}
        </p>
      </summary>
      <ul
        className={cn(
          'space-y-0.5 overflow-y-auto border-0',
          isCard
            ? 'max-h-52 p-0.5'
            : 'mt-1 max-h-36 rounded-lg bg-surface-secondary/40 p-1',
        )}
      >
        {items.map((item) => {
          const dueLabel = item.overdue
            ? (lang === 'el' ? 'ληξ.' : 'overdue')
            : item.daysUntil === 0
              ? (lang === 'el' ? 'σήμερα' : 'today')
              : `T+${item.daysUntil}`;
          const retPct = Math.round(item.retrievability * 100);
          return (
            <li key={`${item.concept}-${item.dueAt}`}>
              <button
                type="button"
                data-testid="leitner-due-queue-item"
                onClick={() => onSelect?.(item.concept)}
                className={cn(
                  'w-full text-left rounded-lg border-0 transition-colors hover:bg-surface-secondary/70',
                  isCard ? 'px-2 py-1.5' : 'px-1.5 py-1',
                  item.overdue && 'bg-surface-secondary/40',
                )}
                title={`${item.label} · R=${retPct}% · ${item.intervalDays}d`}
              >
                <p className="type-caption font-medium text-text-primary truncate">
                  {item.label}
                </p>
                <p className="type-micro text-text-muted flex gap-2 mt-0.5">
                  <span className={cn(item.overdue && 'text-text-secondary font-semibold')}>{dueLabel}</span>
                  <span className="tabular-nums">R {retPct}%</span>
                  <span className="tabular-nums">{item.intervalDays}d</span>
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
