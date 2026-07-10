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
  const activeIndex = 1;

  return (
    <BlueprintSurface
      className={cn('dashboard-live-preview p-5', className)}
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
        {HERO_PIPELINE_STEP_IDS.map((stepId, index) => {
          const active = index === activeIndex;
          const progress = index < activeIndex ? 100 : index === activeIndex ? 82 : 35;
          return (
            <div
              key={stepId}
              className={cn('dashboard-live-preview-step', active && 'dashboard-live-preview-step-active')}
            >
              <div className="dashboard-live-preview-rail" aria-hidden>
                <span className={cn('dashboard-live-preview-dot', active && 'dashboard-live-preview-dot-active')} />
                {index < HERO_PIPELINE_STEP_IDS.length - 1 ? (
                  <span className="dashboard-live-preview-line" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-text-primary">{t(STEP_TITLE_KEYS[stepId])}</h3>
                  <span className="dashboard-live-preview-status">
                    {active ? t('dashboardLivePreviewActive') : t('dashboardLivePreviewQueued')}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{t(STEP_BODY_KEYS[stepId])}</p>
                <div className="dashboard-live-preview-progress-track" aria-hidden>
                  <div
                    className={cn(
                      'dashboard-live-preview-progress-bar',
                      active && 'dashboard-live-preview-progress-bar-active',
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <DashboardLivePreviewWatches className="mt-5" />
    </BlueprintSurface>
  );
}
