import { useEffect, useMemo, useState } from 'react';
import { Lightbulb, ArrowRight } from '@/lib/lucide-shim';
import type { ActivityItem, Course, LearnerModel } from '../../types';
import { buildLearnerInsights } from '../../lib/progressInsights';
import { useAnalyticsDateRange } from './AnalyticsDateRangeContext';
import { filterActivitiesByRange } from '../../features/analytics/analyticsDateRange';
import { SectionLabel } from '../ui/SectionLabel';
import { useI18n, type I18nKey } from '../../lib/i18n';
import { configuredProxyBase } from '../../lib/authClient';
import { useAppStore } from '../../store/useStore';
import { cn } from '../../utils/cn';
import { buildInsightsAskPrompt } from '../../features/analytics/analyticsAskPrompt';
import { pathFocusFromWeakArea } from '../../lib/pathFocus';
import { generateAnalyticsInsightsWithLlm } from '../../lib/llmStudyContent';
import { isLlmAvailable } from '../../lib/llmClient';

export type AnalyticsInsightAction = {
  id: string;
  title: string;
  detail: string;
  concept?: string;
};

export type AnalyticsInsightsPayload = {
  observations: string[];
  actions: AnalyticsInsightAction[];
  source: 'api' | 'local' | 'llm';
};

type Props = {
  learnerModel: LearnerModel;
  activities: ActivityItem[];
  courses: Course[];
  authToken?: string;
  className?: string;
};

function buildLocalInsights(
  learnerModel: LearnerModel,
  activities: ActivityItem[],
  courses: Course[],
  lang: 'en' | 'el',
  t: (key: I18nKey) => string,
): AnalyticsInsightsPayload {
  const profile = buildLearnerInsights(learnerModel, activities, courses, lang);
  const weak = learnerModel.weakAreas[0];
  const actions: AnalyticsInsightAction[] = [];
  if (weak) {
    actions.push({
      id: `study-${weak.concept}`,
      title: t('analyticsInsightsStudyAction').replace('{concept}', weak.concept),
      detail: t('analyticsInsightsStudyDetail'),
      concept: weak.concept,
    });
  }
  const almost = learnerModel.almostKnown[0];
  if (almost && almost.concept !== weak?.concept) {
    actions.push({
      id: `push-${almost.concept}`,
      title: t('analyticsInsightsFinishAction').replace('{concept}', almost.concept),
      detail: t('analyticsInsightsFinishDetail'),
      concept: almost.concept,
    });
  }
  return {
    observations: profile.map((p) => p.insight),
    actions,
    source: 'local',
  };
}

export function AIInsightsPanel({
  learnerModel,
  activities,
  courses,
  authToken,
  className,
}: Props) {
  const { range } = useAnalyticsDateRange();
  const { lang, t } = useI18n();
  const store = useAppStore();
  const openStudyWorkspaceForConcept = store.openStudyWorkspaceForConcept;
  const openAgentFromWorkspace = store.openAgentFromWorkspace;
  const userSettings = store.user.settings;
  const scoped = useMemo(() => filterActivitiesByRange(activities, range), [activities, range]);
  const local = useMemo(
    () => buildLocalInsights(learnerModel, scoped, courses, lang, t),
    [learnerModel, scoped, courses, lang, t],
  );
  const [payload, setPayload] = useState<AnalyticsInsightsPayload>(local);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPayload(local);
  }, [local]);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    void (async () => {
      try {
        if (isLlmAvailable(userSettings) && local.observations.length > 0) {
          const rewritten = await generateAnalyticsInsightsWithLlm({
            observations: local.observations,
            lang,
            settings: userSettings,
          });
          if (!cancelled && rewritten?.length) {
            setPayload({ ...local, observations: rewritten, source: 'llm' });
            return;
          }
        }
        const base = configuredProxyBase(userSettings);
        const token = authToken || userSettings?.authToken;
        if (!base || !token) return;
        const res = await fetch(
          `${base.replace(/\/$/, '')}/v1/analytics/insights?range=${encodeURIComponent(range)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) return;
        const data = await res.json() as {
          observations?: string[];
          actions?: AnalyticsInsightAction[];
        };
        if (cancelled) return;
        if ((data.observations?.length ?? 0) > 0 || (data.actions?.length ?? 0) > 0) {
          setPayload({
            observations: data.observations ?? [],
            actions: data.actions ?? [],
            source: 'api',
          });
        }
      } catch { /* keep local */ }
      finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [range, authToken, userSettings, local, lang]);

  return (
    <div className={cn('space-y-3', className)} data-testid="ai-insights-panel" aria-busy={busy || undefined}>
      {/* OPT-K97 — analytics insight chrome as ink */}
      <SectionLabel
        icon={Lightbulb}
        action={(
          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="ai-insights-ask-agent"
              className="type-micro font-medium text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 rounded"
              onClick={() => {
                const weak = payload.actions.find((a) => a.concept?.trim())?.concept;
                openAgentFromWorkspace({
                  fullPage: true,
                  prompt: buildInsightsAskPrompt(payload, lang),
                  context: weak
                    ? { concept: weak, pathFocus: pathFocusFromWeakArea(weak) }
                    : undefined,
                });
              }}
            >
              {t('analyticsInsightsAskAgent')}
            </button>
            <span className="type-micro text-text-muted">
              {payload.source === 'llm'
                ? t('analyticsInsightsSourceModel')
                : payload.source === 'api'
                  ? t('analyticsInsightsSourceApi')
                  : t('analyticsInsightsSourceRules')}
            </span>
          </div>
        )}
      >
        {payload.source === 'llm' ? t('analyticsInsightsModel') : t('analyticsInsightsHeuristic')}
      </SectionLabel>

      <div className="rounded-xl border-0 bg-surface-secondary/50 p-3 space-y-2">
        {payload.observations.length === 0 ? (
          <p className="type-caption text-text-tertiary">
            {t('analyticsInsightsUnlockHint')}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {payload.observations.map((obs, i) => (
              <li key={i} className="flex items-start gap-2 type-caption text-text-secondary">
                <Lightbulb className="h-3.5 w-3.5 shrink-0 text-accent-amber/70 mt-0.5" aria-hidden />
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {payload.actions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="ai-insights-actions">
          {payload.actions.map((action) => (
            <div
              key={action.id}
              className="rounded-xl bg-surface-secondary/60 overflow-hidden"
              data-testid={`ai-insight-action-${action.id}`}
            >
              <button
                type="button"
                className="w-full text-left p-3 hover:bg-surface-hover/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 rounded-xl"
                onClick={() => {
                  if (action.concept) openStudyWorkspaceForConcept(action.concept);
                  else {
                    openAgentFromWorkspace({
                      fullPage: true,
                      prompt: buildInsightsAskPrompt(payload, lang),
                    });
                  }
                }}
              >
                <p className="type-caption font-semibold text-text-primary flex items-center gap-1.5">
                  <ArrowRight className="h-3 w-3 text-brand-400 shrink-0" aria-hidden />
                  {action.title}
                </p>
                <p className="type-micro text-text-tertiary mt-1.5 leading-relaxed pl-4">{action.detail}</p>
              </button>
              {action.concept && (
                <div className="px-3 pb-2.5">
                  <button
                    type="button"
                    className="type-micro font-medium text-text-tertiary hover:text-text-secondary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 rounded"
                    data-testid={`ai-insight-ask-${action.id}`}
                    onClick={() => {
                      openAgentFromWorkspace({
                        fullPage: true,
                        prompt: buildInsightsAskPrompt(payload, lang),
                        context: {
                          concept: action.concept,
                          pathFocus: pathFocusFromWeakArea(action.concept!),
                        },
                      });
                    }}
                  >
                    {t('analyticsInsightsAskAgentAbout')}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
