import { cn } from '../utils/cn';
import type { I18nKey } from '../lib/i18n';
import { useI18n } from '../lib/i18n';

const OPTIONS: { id: 'theory' | 'balanced' | 'practice'; labelKey: I18nKey }[] = [
  { id: 'theory', labelKey: 'dashboardLensTheory' },
  { id: 'balanced', labelKey: 'dashboardLensBalanced' },
  { id: 'practice', labelKey: 'dashboardLensPractice' },
];

/** Decorative Theory / Practice lens pill on blueprint dashboard hero (OB-μ4). Non-interactive. */
export function DashboardHeroLensChip({ theoryVsPractice = 50, className }: { theoryVsPractice?: number; className?: string }) {
  const { t } = useI18n();
  const activeId = theoryVsPractice < 34 ? 'theory' : theoryVsPractice > 66 ? 'practice' : 'balanced';

  return (
    <div
      className={cn('dashboard-hero-lens-chip', className)}
      data-testid="dashboard-hero-lens-chip"
      aria-label={t('dashboardLearningLensAria')}
      role="img"
    >
      {OPTIONS.map((opt) => (
        <span
          key={opt.id}
          className={cn(
            'dashboard-hero-lens-chip-segment',
            opt.id === activeId && 'dashboard-hero-lens-chip-segment-active',
          )}
        >
          {t(opt.labelKey)}
        </span>
      ))}
    </div>
  );
}
