import { BlueprintSurface } from '../ui/BlueprintSurface';
import { SectionHeader } from '../ui/platformChrome';
import { useI18n } from '../../lib/i18n';

/** Decorative analytics well — prototype Visual Lab aesthetic wrapper (Wave E7). */
export function AnalyticsVisualLabPanel() {
  const { t, lang } = useI18n();
  const hint = lang === 'el'
    ? 'Gradient strokes cyan → violet → emerald για diagram polish.'
    : 'Cyan → violet → emerald gradient strokes for diagram polish.';

  return (
    <BlueprintSurface className="analytics-visual-lab p-5" data-testid="analytics-visual-lab">
      <SectionHeader
        eyebrow={lang === 'el' ? 'Οπτικό εργαστήριο' : 'Visual lab'}
        title={lang === 'el' ? 'Blueprint diagram rail' : 'Blueprint diagram rail'}
        subtitle={hint}
        animate={false}
      />
      <div className="mt-4 rounded-2xl border border-border-subtle/60 bg-surface-primary/30 p-4">
        <svg viewBox="0 0 320 72" className="w-full h-auto max-h-20" role="img" aria-label={hint}>
          <path
            className="blueprint-stroke-gradient"
            d="M8 56 C 60 12, 100 12, 160 36 S 260 60, 312 20"
            fill="none"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <circle cx="160" cy="36" r="5" className="blueprint-diagram-dot" />
        </svg>
        <p className="mt-2 text-xs text-text-muted">{t('analyticsFlowSectionSubtitle')}</p>
      </div>
    </BlueprintSurface>
  );
}
