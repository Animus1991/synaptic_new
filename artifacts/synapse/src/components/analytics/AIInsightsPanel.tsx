import { useEffect, useMemo, useState } from 'react';
import { Lightbulb, ArrowRight } from '@/lib/lucide-shim';
import type { ActivityItem, Course, LearnerModel } from '../../types';
import { buildLearnerInsights } from '../../lib/progressInsights';
import { useAnalyticsDateRange } from './AnalyticsDateRangeContext';
import { filterActivitiesByRange } from '../../lib/analyticsDateRange';
import { SectionLabel } from '../ui/SectionLabel';
import { useI18n } from '../../lib/i18n';
import { configuredProxyBase } from '../../lib/authClient';
import { useAppStore } from '../../store/useStore';
import { cn } from '../../utils/cn';

export type AnalyticsInsightAction = {
  id: string;
  title: string;
  detail: string;
  concept?: string;
};

export type AnalyticsInsightsPayload = {
  observations: string[];
  actions: AnalyticsInsightAction[];
  source: 'api' | 'local';
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
): AnalyticsInsightsPayload {
  const profile = buildLearnerInsights(learnerModel, activities, courses, lang);
  const weak = learnerModel.weakAreas[0];
  const actions: AnalyticsInsightAction[] = [];
  if (weak) {
    actions.push({
      id: `study-${weak.concept}`,
      title: lang === 'el' ? `Μελέτη: ${weak.concept}` : `Study: ${weak.concept}`,
      detail: lang === 'el'
        ? 'Άνοιξε το workspace στο αδύναμο concept.'
        : 'Open the workspace focused on this weak concept.',
      concept: weak.concept,
    });
  }
  const almost = learnerModel.almostKnown[0];
  if (almost && almost.concept !== weak?.concept) {
    actions.push({
      id: `push-${almost.concept}`,
      title: lang === 'el' ? `Ολοκλήρωσε: ${almost.concept}` : `Finish: ${almost.concept}`,
      detail: lang === 'el'
        ? 'Είσαι κοντά — μια σύντομη επανάληψη αρκεί.'
        : 'You are close — a short review should lock it in.',
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
  const { lang } = useI18n();
  const store = useAppStore();
  const openStudyWorkspaceForConcept = store.openStudyWorkspaceForConcept;
  const userSettings = store.user.settings;
  const scoped = useMemo(() => filterActivitiesByRange(activities, range), [activities, range]);
  const local = useMemo(
    () => buildLocalInsights(learnerModel, scoped, courses, lang),
    [learnerModel, scoped, courses, lang],
  );
  const [payload, setPayload] = useState<AnalyticsInsightsPayload>(local);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPayload(local);
  }, [local]);

  useEffect(() => {
    const base = configuredProxyBase(userSettings);
    const token = authToken || userSettings?.authToken;
    if (!base || !token) return;
    let cancelled = false;
    setBusy(true);
    void (async () => {
      try {
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
  }, [range, authToken, userSettings]);

  return (
    <div className={cn('space-y-3', className)} data-testid="ai-insights-panel" aria-busy={busy || undefined}>
      <SectionLabel
        icon={Lightbulb}
        action={(
          <span className="text-[10px] text-text-muted">
            {payload.source === 'api'
              ? (lang === 'el' ? 'API' : 'API')
              : (lang === 'el' ? 'τοπικά' : 'local')}
          </span>
        )}
      >
        {lang === 'el' ? 'AI Insights' : 'AI Insights'}
      </SectionLabel>

      <div className="rounded-xl border border-border-subtle bg-surface-card p-3 space-y-2">
        {payload.observations.length === 0 ? (
          <p className="text-xs text-text-tertiary">
            {lang === 'el'
              ? 'Συνέχισε τη μελέτη για πιο πλούσια insights.'
              : 'Keep studying to unlock richer insights.'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {payload.observations.map((obs, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                <Lightbulb className="h-3.5 w-3.5 shrink-0 text-brand-600 mt-0.5" aria-hidden />
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {payload.actions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2" data-testid="ai-insights-actions">
          {payload.actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="rounded-xl border border-brand-500/25 bg-brand-600/5 p-3 text-left hover:bg-brand-600/10 transition-colors"
              onClick={() => {
                if (action.concept) openStudyWorkspaceForConcept(action.concept);
              }}
              data-testid={`ai-insight-action-${action.id}`}
            >
              <p className="text-xs font-semibold text-brand-800 flex items-center gap-1">
                {action.title}
                <ArrowRight className="h-3 w-3" aria-hidden />
              </p>
              <p className="text-[10px] text-text-tertiary mt-1 leading-relaxed">{action.detail}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
