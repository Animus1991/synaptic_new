import { useMemo, useState } from 'react';
import { Calendar, ArrowRight } from '@/lib/lucide-shim';
import { EXAM_CALENDAR_FEED, filterExamCalendar } from '../../lib/examPrep/examCalendarFeed';
import { useI18n } from '../../lib/i18n';
import { PlatformSection } from '../ui/primitives';

type PresetFilter = 'all' | 'general' | 'panhellenic-informatics';

/* OPT-K101 — residual markup debt: decorative brand type -> ink */
export function ExamCalendarPanel() {
  const { t } = useI18n();
  const [preset, setPreset] = useState<PresetFilter>('all');
  const entries = useMemo(() => filterExamCalendar(EXAM_CALENDAR_FEED, preset), [preset]);

  return (
    <div id="exam-calendar-panel" data-testid="exam-calendar-panel">
    <PlatformSection
      tone="muted"
      title={t('examCalendarTitle')}
      icon={Calendar}
    >
      <div className="flex flex-wrap gap-2 mb-4">
        {(['all', 'general', 'panhellenic-informatics'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPreset(p)}
            data-testid={`exam-calendar-filter-${p}`}
            className={`rounded-full px-3 py-1 type-micro font-medium border transition-colors ${
              preset === p
                ? 'border-brand-500/40 bg-surface-secondary text-text-primary border border-border-subtle'
                : 'border-border-subtle text-text-secondary hover:bg-surface-hover'
            }`}
          >
            {p === 'all'
              ? t('examCalendarFilterAll')
              : p === 'general'
                ? t('examCalendarFilterGeneral')
                : t('examCalendarFilterPanhellenic')}
          </button>
        ))}
      </div>

      <ul className="proximity-track-wide space-y-3">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className="rounded-xl border border-border-subtle bg-surface-card/40 p-3"
            data-testid={`exam-calendar-entry-${entry.id}`}
          >
            {/* OPT-K9b — link beside title cluster, not far-right of ultrawide card */}
            <div className="proximity-row items-start">
              <div className="proximity-row-label min-w-0">
                <p className="type-micro text-text-muted mb-1">{entry.date}</p>
                <p className="text-sm font-semibold text-text-primary">{t(entry.titleKey as never)}</p>
                <p className="text-xs text-text-secondary mt-1">{t(entry.bodyKey as never)}</p>
              </div>
              {entry.linkUrl && entry.linkLabelKey && (
                <a
                  href={entry.linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 type-micro text-text-primary hover:underline"
                >
                  {t(entry.linkLabelKey as never)}
                  <ArrowRight className="w-3 h-3" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
    </PlatformSection>
    </div>
  );
}
