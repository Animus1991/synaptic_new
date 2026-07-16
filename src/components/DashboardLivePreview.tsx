import { ArrowRight } from '@/lib/lucide-shim';
import { cn } from '../utils/cn';
import type { WorkspaceLiveSync } from '../lib/workspaceStoreSpine';
import { nextActionLabel } from '../lib/nextActionEngine';
import type { Lang, I18nKey } from '../lib/i18n';
import { useI18n } from '../lib/i18n';
import { workspaceEntryPrefetchHandlers } from '../lib/workspaceEntryPrefetch';
import { BlueprintSurface } from './ui/BlueprintSurface';
import { DashboardLivePreviewWatches } from './DashboardLivePreviewWatches';

type PreviewStep = {
  id: string;
  title: string;
  body: string;
};

function buildPreviewSteps(
  live: WorkspaceLiveSync,
  t: (key: I18nKey) => string,
): PreviewStep[] {
  const { snapshot } = live;
  const steps: PreviewStep[] = [];

  if (snapshot.courseLabel) {
    steps.push({
      id: 'course',
      title: snapshot.courseLabel,
      body: snapshot.sectionTitle || t('dashboardLivePreviewCourseBody'),
    });
  }
  if (snapshot.activeConcept) {
    steps.push({
      id: 'concept',
      title: snapshot.activeConcept,
      body: snapshot.sectionLabel || snapshot.toolDescription || t('dashboardLivePreviewConceptBody'),
    });
  }
  if (snapshot.toolLabel) {
    steps.push({
      id: 'tool',
      title: snapshot.toolLabel,
      body: snapshot.toolDescription || snapshot.stepLabel || t('dashboardLivePreviewToolBody'),
    });
  }
  if (snapshot.stepLabel && snapshot.stepLabel !== snapshot.sectionLabel) {
    steps.push({
      id: 'step',
      title: snapshot.stepLabel,
      body: t('dashboardLivePreviewStepBody').replace('{n}', String(snapshot.stepIndex + 1)).replace('{total}', String(snapshot.stepCount)),
    });
  }

  return steps.length > 0 ? steps : [{
    id: 'resume',
    title: t('dashboardResumeTitle'),
    body: t('dashboardResumeSubtitle'),
  }];
}

function activeStepIndex(steps: PreviewStep[], snapshot: WorkspaceLiveSync['snapshot']): number {
  if (steps.length <= 1) return 0;
  const ratio = snapshot.stepCount > 0 ? snapshot.stepIndex / Math.max(snapshot.stepCount - 1, 1) : 0;
  return Math.min(steps.length - 1, Math.round(ratio * (steps.length - 1)));
}

function stepProgress(index: number, activeIndex: number, snapshot: WorkspaceLiveSync['snapshot']): number {
  if (index < activeIndex) return 100;
  if (index > activeIndex) return 35;
  if (snapshot.stepCount > 0) {
    return Math.max(18, Math.round(((snapshot.stepIndex + 1) / snapshot.stepCount) * 100));
  }
  return 82;
}

export function DashboardLivePreview({
  live,
  lang,
  onOpenWorkspace,
  compact = false,
}: {
  live: WorkspaceLiveSync;
  lang: Lang;
  onOpenWorkspace?: () => void;
  /** Dense mockup strip (Wave J-D03) — eyebrow + title + Continue. */
  compact?: boolean;
}) {
  const { t } = useI18n();
  const steps = buildPreviewSteps(live, t);
  const activeIndex = activeStepIndex(steps, live.snapshot);
  const concept = live.snapshot.activeConcept?.trim();
  const course = live.snapshot.courseLabel?.trim();
  const headline = [concept, course].filter(Boolean).join(' · ')
    || course
    || concept
    || t('dashboardResumeTitle');
  const meta = live.snapshot.stepLabel
    || (live.snapshot.stepCount > 0
      ? t('dashboardLivePreviewStepBody')
          .replace('{n}', String(live.snapshot.stepIndex + 1))
          .replace('{total}', String(live.snapshot.stepCount))
      : t('dashboardResumeSubtitle'));

  if (compact) {
    return (
      <BlueprintSurface
        className="dashboard-live-preview border border-accent-emerald/25 bg-accent-emerald/[0.06] border-l-[3px] border-l-accent-emerald p-3 sm:p-3.5"
        data-tour="dashboard-resume"
        data-testid="dashboard-live-preview"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-secondary">
              {t('dashboardLivePreviewEyebrow')}
            </p>
            <h2 className="mt-1 truncate text-sm font-semibold text-text-primary">{headline}</h2>
            <p className="mt-0.5 text-[11px] text-text-tertiary line-clamp-1">{meta}</p>
          </div>
          {onOpenWorkspace && (
            <button
              type="button"
              onClick={onOpenWorkspace}
              data-testid="dashboard-resume-workspace"
              {...workspaceEntryPrefetchHandlers()}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-700 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-brand-800"
            >
              {t('dashboardResumeContinue')} <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </BlueprintSurface>
    );
  }

  return (
    <BlueprintSurface
      className="dashboard-live-preview ux-canvas-frame p-5"
      data-tour="dashboard-resume"
      data-testid="dashboard-live-preview"
    >
      <div className="dashboard-live-preview-topline" aria-hidden />
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="dashboard-live-preview-eyebrow">{t('dashboardLivePreviewEyebrow')}</p>
          <h2 className="dashboard-preview-title mt-2">{headline}</h2>
          <p className="mt-1 text-sm text-text-secondary">{t('dashboardResumeSubtitle')}</p>
        </div>
        {onOpenWorkspace && (
          <button
            type="button"
            onClick={onOpenWorkspace}
            data-testid="dashboard-resume-workspace"
            {...workspaceEntryPrefetchHandlers()}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-brand-800"
          >
            {t('dashboardResumeContinue')} <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => {
          const active = index === activeIndex;
          const progress = stepProgress(index, activeIndex, live.snapshot);
          return (
            <div
              key={step.id}
              className={cn('dashboard-live-preview-step', active && 'dashboard-live-preview-step-active')}
            >
              <div className="dashboard-live-preview-rail" aria-hidden>
                <span className={cn('dashboard-live-preview-dot', active && 'dashboard-live-preview-dot-active')} />
                {index < steps.length - 1 ? <span className="dashboard-live-preview-line" /> : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-text-primary">{step.title}</h3>
                  <span className="dashboard-live-preview-status">
                    {active ? t('dashboardLivePreviewActive') : t('dashboardLivePreviewQueued')}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{step.body}</p>
                <div className="dashboard-live-preview-progress-track" aria-hidden>
                  <div
                    className={cn('dashboard-live-preview-progress-bar', active && 'dashboard-live-preview-progress-bar-active')}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {live.nextAction && (
        <p className="mt-4 text-xs text-text-tertiary line-clamp-2">
          {t('dashboardNextColon')}{' '}
          <span className="font-medium text-brand-700">
            {nextActionLabel(live.nextAction.primary, lang)}
          </span>
          {' — '}{live.nextAction.reason}
        </p>
      )}

      <DashboardLivePreviewWatches className="mt-5" />
    </BlueprintSurface>
  );
}
