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
        isCard ? 'ux-card group' : 'mb-3 group',
        className,
      )}
      data-testid="leitner-due-queue-panel"
      open={defaultOpen || undefined}
    >
      <summary
        className={cn(
          'cursor-pointer list-none [&::-webkit-details-marker]:hidden',
          isCard && 'px-4 py-3 border-b border-border-subtle/60',
        )}
      >
        <p
          className={cn(
            'font-semibold text-text-muted flex items-center gap-1.5',
            isCard ? 'text-xs text-text-secondary' : 'text-[10px] mb-1',
          )}
        >
          {t('leitnerDueQueuePanel')}
          <span className="text-accent-amber font-bold">{items.length}</span>
          {isCard && (
            <span className="ml-auto text-[10px] font-normal text-text-tertiary">
              {t('leitnerDueQueueHint')}
            </span>
          )}
        </p>
      </summary>
      <ul
        className={cn(
          'space-y-0.5 overflow-y-auto',
          isCard
            ? 'max-h-52 p-2'
            : 'mt-1 max-h-36 rounded-lg border border-border-subtle/60 bg-surface-primary/40 p-1',
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
                  'w-full text-left rounded transition-colors hover:bg-surface-muted/80',
                  isCard ? 'px-2.5 py-2' : 'px-1.5 py-1',
                  item.overdue && 'border-l-2 border-accent-amber pl-1',
                )}
                title={`${item.label} · R=${retPct}% · ${item.intervalDays}d`}
              >
                <p className={cn('font-medium text-text-primary truncate', isCard ? 'text-xs' : 'text-[10px]')}>
                  {item.label}
                </p>
                <p className={cn('text-text-muted flex gap-2', isCard ? 'text-[10px] mt-0.5' : 'text-[10px]')}>
                  <span className={cn(item.overdue && 'text-accent-amber font-semibold')}>{dueLabel}</span>
                  <span>R {retPct}%</span>
                  <span>{item.intervalDays}d</span>
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </details>
  );
}
