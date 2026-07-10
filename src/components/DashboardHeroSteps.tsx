import { cn } from '../utils/cn';
import { HERO_PIPELINE_STEP_IDS } from '../lib/colorCodingReference';
import { useI18n, type I18nKey } from '../lib/i18n';
import { blueprintStaggerDelay } from '../lib/useBlueprintTheme';
import { BlueprintSurface } from './ui/BlueprintSurface';

const STEP_TITLE_KEYS: Record<(typeof HERO_PIPELINE_STEP_IDS)[number], I18nKey> = {
  ingest: 'dashboardPipelineIngestTitle',
  analyze: 'dashboardPipelineAnalyzeTitle',
  teach: 'dashboardPipelineTeachTitle',
  adapt: 'dashboardPipelineAdaptTitle',
};

const STEP_BODY_KEYS: Record<(typeof HERO_PIPELINE_STEP_IDS)[number], I18nKey> = {
  ingest: 'dashboardPipelineIngestBody',
  analyze: 'dashboardPipelineAnalyzeBody',
  teach: 'dashboardPipelineTeachBody',
  adapt: 'dashboardPipelineAdaptBody',
};

/** Compact hero step cards — left column of blueprint dashboard hero (Wave E13). */
export function DashboardHeroSteps({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-1', className)} data-testid="dashboard-hero-steps">
      {HERO_PIPELINE_STEP_IDS.map((stepId, index) => (
        <BlueprintSurface
          key={stepId}
          nest
          hint
          className="dashboard-hero-step-card blueprint-fade-up p-4"
          style={{ animationDelay: `${blueprintStaggerDelay(index)}ms` }}
        >
          <p className="dashboard-live-preview-eyebrow">
            {String(index + 1).padStart(2, '0')}
          </p>
          <h3 className="mt-2 text-sm font-semibold text-text-primary">{t(STEP_TITLE_KEYS[stepId])}</h3>
          <p className="mt-2 text-sm leading-6 text-text-secondary">{t(STEP_BODY_KEYS[stepId])}</p>
        </BlueprintSurface>
      ))}
    </div>
  );
}
