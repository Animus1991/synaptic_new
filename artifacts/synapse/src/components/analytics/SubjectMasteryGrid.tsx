import { TrendingUp, Minus, ArrowDownRight } from '@/lib/lucide-shim';
import { CompactProgressBar } from '../ui/CompactProgressBar';
import { SectionLabel } from '../ui/SectionLabel';
import { CourseIcon } from '../ui/CourseIcon';
import { resolveCourseColor } from '../../lib/masteryPalette';
import type { SubjectMasteryTile } from '../../lib/subjectMasteryAnalytics';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../utils/cn';

type Props = {
  tiles: SubjectMasteryTile[];
  onSelect: (tile: SubjectMasteryTile) => void;
  className?: string;
};

export function SubjectMasteryGrid({ tiles, onSelect, className }: Props) {
  const { lang } = useI18n();
  const title = lang === 'el' ? 'Mastery ανά μάθημα' : 'Subject mastery';
  const empty = lang === 'el' ? 'Δεν υπάρχουν έτοιμα μαθήματα ακόμα.' : 'No ready courses yet.';
  const pending = lang === 'el' ? 'εκκρεμείς έννοιες' : 'pending concepts';

  return (
    <div className={cn('space-y-2', className)} data-testid="subject-mastery-grid">
      <SectionLabel>{title}</SectionLabel>
      {tiles.length === 0 ? (
        <p className="text-xs text-text-tertiary">{empty}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {tiles.map((tile) => {
            const TrendIcon = tile.trend === 'up' ? TrendingUp : tile.trend === 'down' ? ArrowDownRight : Minus;
            const trendTone =
              tile.trend === 'up'
                ? 'text-accent-emerald'
                : tile.trend === 'down'
                  ? 'text-accent-rose'
                  : 'text-text-muted';
            return (
              <button
                key={tile.courseId}
                type="button"
                data-testid={`subject-mastery-tile-${tile.courseId}`}
                onClick={() => onSelect(tile)}
                className="rounded-xl border border-border-subtle bg-surface-card p-3 text-left hover:border-brand-400/40 hover:bg-surface-hover transition-colors"
              >
                <div className="flex items-start gap-2">
                  <CourseIcon icon={tile.icon} size="sm" colorClassName="text-brand-600 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-text-primary truncate">{tile.title}</p>
                    <p className="text-[10px] text-text-tertiary mt-0.5">
                      {tile.pendingConcepts} {pending}
                    </p>
                  </div>
                  <span className={cn('inline-flex items-center gap-0.5 text-[10px] font-semibold', trendTone)}>
                    <TrendIcon className="h-3 w-3" aria-hidden />
                    {tile.mastery}%
                  </span>
                </div>
                <CompactProgressBar
                  pct={tile.mastery}
                  color={resolveCourseColor(tile.color)}
                  className="mt-2"
                  aria-label={`${tile.title} ${tile.mastery}%`}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
