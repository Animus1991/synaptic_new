import { cn } from '../../utils/cn';
import type { FsrsDueQueueItem } from '../../lib/leitnerDueQueue';
import { useI18n } from '../../lib/i18n';

type Props = {
  items: FsrsDueQueueItem[];
  onSelect?: (concept: string) => void;
  lang?: 'en' | 'el';
};

export function LeitnerDueQueuePanel({ items, onSelect, lang: langProp }: Props) {
  const { t, lang: i18nLang } = useI18n();
  const lang = langProp ?? i18nLang;

  if (items.length === 0) return null;

  return (
    <details className="mb-3 group" data-testid="leitner-due-queue-panel">
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
        <p className="text-[9px] font-semibold text-text-muted mb-1 flex items-center gap-1">
          {t('leitnerDueQueuePanel')}
          <span className="text-accent-amber font-bold">{items.length}</span>
        </p>
      </summary>
      <ul className="mt-1 max-h-36 overflow-y-auto space-y-0.5 rounded-lg border border-border-subtle/60 bg-surface-primary/40 p-1">
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
                  'w-full text-left rounded px-1.5 py-1 hover:bg-surface-muted/80 transition-colors',
                  item.overdue && 'border-l-2 border-accent-amber pl-1',
                )}
                title={`${item.label} · R=${retPct}% · ${item.intervalDays}d`}
              >
                <p className="text-[9px] font-medium text-text-primary truncate">{item.label}</p>
                <p className="text-[8px] text-text-muted flex gap-2">
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
