import { cn } from '../utils/cn';
import { HERO_PIPELINE_STEP_IDS } from '../lib/colorCodingReference';
import { useI18n, type I18nKey } from '../lib/i18n';
import { BlueprintSurface } from './ui/BlueprintSurface';
import { DashboardLivePreviewWatches } from './DashboardLivePreviewWatches';

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

/** Static ingest→adapt pipeline preview when no workspace resume (Option-B Wave E13). */
export function DashboardBuildPipelinePreview({ className }: { className?: string }) {
  const { t } = useI18n();

  return (
    <BlueprintSurface
      className={cn('dashboard-live-preview ux-canvas-frame p-5', className)}
      data-testid="dashboard-build-pipeline-preview"
    >
      <div className="dashboard-live-preview-topline" aria-hidden />
      <div className="mb-4">
        <p className="dashboard-live-preview-eyebrow">{t('dashboardBuildPreviewEyebrow')}</p>
        <h2 className="dashboard-preview-title mt-2">
          {t('dashboardBuildPreviewTitle')}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">{t('dashboardBuildPreviewSubtitle')}</p>
      </div>

      <div className="space-y-3">
        {HERO_PIPELINE_STEP_IDS.map((stepId, index) => (
          <div key={stepId} className="dashboard-live-preview-step">
            <div className="dashboard-live-preview-rail" aria-hidden>
              <span className="dashboard-live-preview-dot" />
              {index < HERO_PIPELINE_STEP_IDS.length - 1 ? (
                <span className="dashboard-live-preview-line" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-text-primary">{t(STEP_TITLE_KEYS[stepId])}</h3>
                <span className="dashboard-live-preview-status">{t('dashboardPipelineStage')}</span>
              </div>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{t(STEP_BODY_KEYS[stepId])}</p>
            </div>
          </div>
        ))}
      </div>

      <DashboardLivePreviewWatches className="mt-5" />
    </BlueprintSurface>
  );
}
