import { cn } from '../utils/cn';
import type { Lang } from '../lib/i18n';

const OPTIONS: { id: 'theory' | 'balanced' | 'practice'; en: string; el: string }[] = [
  { id: 'theory', en: 'Theory', el: 'Θεωρία' },
  { id: 'balanced', en: 'Balanced', el: 'Ισορροπία' },
  { id: 'practice', en: 'Practice', el: 'Πράξη' },
];

/** Decorative Theory / Practice lens pill on blueprint dashboard hero (OB-μ4). Non-interactive. */
export function DashboardHeroLensChip({ lang, className }: { lang: Lang; className?: string }) {
  return (
    <div
      className={cn('dashboard-hero-lens-chip', className)}
      data-testid="dashboard-hero-lens-chip"
      aria-hidden
    >
      {OPTIONS.map((opt) => (
        <span
          key={opt.id}
          className={cn(
            'dashboard-hero-lens-chip-segment',
            opt.id === 'balanced' && 'dashboard-hero-lens-chip-segment-active',
          )}
        >
          {lang === 'el' ? opt.el : opt.en}
        </span>
      ))}
    </div>
  );
}
