import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Brain, TrendingUp, Clock, Target, AlertTriangle, BarChart3,
  Zap, Calendar, CheckCircle2, XCircle, Lightbulb,
  Activity, Shield, Eye, HelpCircle, FlaskConical, Download,
  GitBranch, ChevronRight, ArrowUpRight, ArrowDownRight, Minus,
} from '@/lib/lucide-shim';
import type { LearnerModel, DashboardStats, Course, ActivityItem } from '../types';
import { computeCalibration, type PrerequisiteRepair } from '../lib/pedagogy';
import { buildRetentionForecast, summarizeRetentionForecast } from '../lib/adaptiveScheduler';
import {
  adaptiveRecommendations,
  retentionCurveFromActivities,
  weeklyMasteryFromActivities,
} from '../features/analytics/retentionAnalytics';
import { CalibrationCompareBar } from './visuals/CalibrationCompareBar';
import { CalibrationChip } from './visuals/CalibrationChip';
import { resolveCourseColor } from '../lib/masteryPalette';
import { CourseIcon } from './ui/CourseIcon';
import { cn } from '../utils/cn';
import { Page, PageHeader, TabBar } from './ui/primitives';
import { Button } from './ui/Button';
import { CompactProgressBar } from './ui/CompactProgressBar';
import { useWarmSandPageScope, warmSandScopeProps } from '../lib/useDocumentTheme';
import { ReadinessRing } from './visuals/ReadinessRing';
import { RetentionCurve } from './visuals/DiagramGenerator';
import { ConceptGraph } from './visuals/ConceptGraph';
import { useI18n, type I18nKey } from '../lib/i18n';
import { CollapsibleChromeSection } from './workspace/CollapsibleChromeSection';
import { formatHeatmapDayTooltip } from '../lib/localeFormat';
import { useMinimalTheme } from '../lib/useMinimalTheme';
import { readAllLearningEvents } from '../lib/learningEvents';
import {
  computeResearchMetrics,
  buildResearchExport,
  downloadResearchExport,
} from '../features/analytics/researchAnalytics';
import { inferBehaviorFromActivities } from '../lib/behaviorInference';
import {
  buildConfidenceBuckets,
  buildLearnerInsights,
  buildLearningRadar,
  buildProgressKpis,
} from '../lib/progressInsights';
import {
  ConfidenceBucketChart,
  LearnerInsightCards,
  LearningRadarChart,
  ProgressKpiRow,
} from './analytics/ProgressInsightsSections';
import { HubSection, UtilityRow } from './ui/UtilityPrimitives';
import {
  buildKnowledgeFlowSankey,
  buildMasteryWaterfall,
  buildConceptTreemap,
  buildLearningTimeline,
  buildConceptMasteryHeatmap,
} from '../features/analytics/knowledgeFlowAnalytics';
import { KnowledgeFlowSankeyChart, MasteryWaterfallChart } from './analytics/KnowledgeFlowSankey';
import { ConceptTreemapChart } from './analytics/ConceptTreemapChart';
import { ConceptMasteryHeatmapChart } from './analytics/ConceptMasteryHeatmapChart';
import { LearningTimelineChart } from './analytics/LearningTimelineChart';
import { AnalyticsVisualLabPanel } from './analytics/AnalyticsVisualLabPanel';
import {
  AnalyticsDateRangeFilter,
  AnalyticsDateRangeProvider,
  useAnalyticsDateRange,
} from './analytics/AnalyticsDateRangeContext';
import { SubjectMasteryGrid } from './analytics/SubjectMasteryGrid';
import { SubjectDrillDown } from './analytics/SubjectDrillDown';
import { StudyBehaviorCharts } from './analytics/StudyBehaviorCharts';
import { AIInsightsPanel } from './analytics/AIInsightsPanel';
import { buildSubjectMasteryTiles, type SubjectMasteryTile } from '../features/analytics/subjectMasteryAnalytics';
import { filterActivitiesByRange, filterEventsByRange } from '../features/analytics/analyticsDateRange';
import { useAppStore } from '../store/useStore';
import { SectionHeader } from './ui/platformChrome';
import { SectionLabel } from './ui/SectionLabel';
import { loadVisualLabOpen, saveVisualLabOpen } from '../lib/visualLabPrefs';

interface AnalyticsProps {
  learnerModel: LearnerModel;
  stats: DashboardStats;
  courses: Course[];
  activities?: ActivityItem[];
  prerequisiteRepairs?: PrerequisiteRepair[];
  daysToExam?: number | null;
}

type AnalyticsTab = 'overview' | 'mastery' | 'behavior' | 'insights' | 'research';

const WEEKDAY_KEYS: I18nKey[] = [
  'analyticsWeekMon', 'analyticsWeekTue', 'analyticsWeekWed', 'analyticsWeekThu',
  'analyticsWeekFri', 'analyticsWeekSat', 'analyticsWeekSun',
];

function errorCategoryLabel(category: string, t: (key: I18nKey) => string): string {
  if (category === 'calculation') return t('analyticsCatCalculation');
  if (category === 'conceptual') return t('analyticsCatConceptual');
  return t('analyticsCatProcedural');
}

type GraphNode = {
  id: string;
  label: string;
  mastery: number;
  type: 'concept' | 'formula' | 'definition' | 'theory';
  x: number;
  y: number;
};
type GraphEdge = { from: string; to: string; relation: 'prerequisite' | 'related' | 'contrasts' | 'example-of' };

const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'n';

function classifyNode(label: string): GraphNode['type'] {
  const lower = label.toLowerCase();
  if (/(formula|equation|=|theorem|law of)/.test(lower)) return 'formula';
  if (/(definition|defined|is the|means)/.test(lower)) return 'definition';
  if (/(theory|model|principle)/.test(lower)) return 'theory';
  return 'concept';
}

/** Lay out N nodes on a circle inside the SVG viewport. */
function radialLayout(count: number, width: number, height: number): { x: number; y: number }[] {
  if (count === 0) return [];
  if (count === 1) return [{ x: width / 2, y: height / 2 }];
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - 60;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });
}

/**
 * Build a concept-mastery graph from the learner's actual data:
 *   - Nodes from course topics (with their mastery), plus learner skill nodes if not already present.
 *   - Prerequisite edges from each topic's `prerequisites` field, resolving by title similarity.
 *   - Falls back to an empty graph when there is no real data.
 */
function buildMasteryGraph(
  learnerModel: LearnerModel,
  courses: Course[],
): { nodes: GraphNode[]; edges: GraphEdge[]; height: number } {
  const generated = courses.filter((c) => c.status !== 'generating');
  const skills = [
    ...learnerModel.strongAreas,
    ...learnerModel.almostKnown,
    ...learnerModel.weakAreas,
  ];
  const labelToId = new Map<string, string>();
  const items: { label: string; mastery: number }[] = [];

  for (const c of generated) {
    for (const t of c.topics) {
      const key = t.title.trim();
      if (!key || labelToId.has(key.toLowerCase())) continue;
      const id = `t-${slug(key)}`;
      labelToId.set(key.toLowerCase(), id);
      items.push({ label: key, mastery: Math.round(t.mastery) });
    }
  }
  for (const s of skills) {
    const key = s.concept.trim();
    if (!key || labelToId.has(key.toLowerCase())) continue;
    const id = `s-${slug(key)}`;
    labelToId.set(key.toLowerCase(), id);
    items.push({ label: key, mastery: Math.round(s.mastery) });
  }

  if (items.length === 0) return { nodes: [], edges: [], height: 380 };

  const width = 660;
  const height = Math.max(380, 200 + items.length * 18);
  const positions = radialLayout(items.length, width, height);
  const nodes: GraphNode[] = items.map((it, i) => ({
    id: labelToId.get(it.label.toLowerCase())!,
    label: it.label,
    mastery: it.mastery,
    type: classifyNode(it.label),
    x: positions[i]!.x,
    y: positions[i]!.y,
  }));

  const edges: GraphEdge[] = [];
  for (const c of generated) {
    for (const t of c.topics) {
      const toId = labelToId.get(t.title.toLowerCase());
      if (!toId) continue;
      for (const pre of t.prerequisites ?? []) {
        const fromId = labelToId.get(pre.toLowerCase());
        if (fromId && fromId !== toId) edges.push({ from: fromId, to: toId, relation: 'prerequisite' });
      }
    }
  }
  return { nodes, edges, height };
}

/* OPT-K98 — markup debt: decorative brand type -> ink */
export function Analytics({
  learnerModel,
  stats,
  courses,
  activities = [],
  prerequisiteRepairs = [],
  daysToExam = null,
}: AnalyticsProps) {
  const [tab, setTab] = useState<AnalyticsTab>('overview');
  const { t } = useI18n();
  const warmSandPage = useWarmSandPageScope();

  return (
    <AnalyticsDateRangeProvider>
      <div
        {...warmSandScopeProps(warmSandPage)}
        className="enterprise-calm analytics-quiet"
        data-testid="analytics-page"
        data-type-rhythm="dashboard"
        /* OPT-K128 / OPT-K130 — Analytics clarity: CTA-only border diet (wash panels) */
        data-border-diet="cta-only"
      >
      <Page gap="sm">
        <PageHeader
          title={t('analyticsTitle')}
          subtitle={t('analyticsSubtitle')}
          icon={BarChart3}
          actions={<AnalyticsDateRangeFilter />}
        />

        <TabBar
          ariaLabel={t('analyticsTabListAria')}
          activeKey={tab}
          onChange={(key) => setTab(key as AnalyticsTab)}
          tabs={[
            { key: 'overview', label: t('analyticsTabOverview'), icon: BarChart3 },
            { key: 'mastery', label: t('analyticsTabMastery'), icon: Brain },
            { key: 'behavior', label: t('analyticsTabBehavior'), icon: Activity },
            { key: 'insights', label: t('analyticsTabInsights'), icon: Lightbulb },
            { key: 'research', label: t('analyticsTabResearch'), icon: FlaskConical },
          ]}
        />

        {tab === 'overview' && (
          <OverviewTab
            learnerModel={learnerModel}
            stats={stats}
            courses={courses}
            activities={activities}
            daysToExam={daysToExam}
          />
        )}
        {tab === 'mastery' && (
          <MasteryTab learnerModel={learnerModel} courses={courses} activities={activities} />
        )}
        {tab === 'behavior' && <BehaviorTab learnerModel={learnerModel} activities={activities} />}
        {tab === 'insights' && (
          <InsightsTab
            learnerModel={learnerModel}
            activities={activities}
            repairs={prerequisiteRepairs}
            courses={courses}
          />
        )}
        {tab === 'research' && (
          <ResearchTab learnerModel={learnerModel} activities={activities} courses={courses} />
        )}
      </Page>
      </div>
    </AnalyticsDateRangeProvider>
  );
}

function countMeaningfulLearningActivities(activities: ActivityItem[]): number {
  return activities.filter((a) =>
    a.type === 'quiz_passed'
    || a.type === 'quiz_failed'
    || a.type === 'review_done'
    || a.type === 'task_complete',
  ).length;
}

function OverviewTab({
  learnerModel,
  stats,
  courses,
  activities,
  daysToExam,
}: {
  learnerModel: LearnerModel;
  stats: DashboardStats;
  courses: Course[];
  activities: ActivityItem[];
  daysToExam: number | null;
}) {
  const { t, lang } = useI18n();
  const { range } = useAnalyticsDateRange();
  const store = useAppStore();
  const [drillTile, setDrillTile] = useState<SubjectMasteryTile | null>(null);
  const [visualLabOpen, setVisualLabOpen] = useState(() => loadVisualLabOpen(false));
  const rangedActivities = useMemo(
    () => filterActivitiesByRange(activities, range),
    [activities, range],
  );
  const subjectTiles = useMemo(
    () => buildSubjectMasteryTiles(courses, activities, range),
    [courses, activities, range],
  );
  const meaningfulActivityCount = countMeaningfulLearningActivities(rangedActivities);
  const hasConfidenceMetrics = meaningfulActivityCount >= 3;
  const calibration = hasConfidenceMetrics
    ? computeCalibration(learnerModel.confidenceCalibration)
    : null;
  const retentionPoints = retentionCurveFromActivities(rangedActivities);
  const weekly = weeklyMasteryFromActivities(rangedActivities);
  const hasRetentionData = rangedActivities.some(
    (a) => a.type === 'quiz_passed' || a.type === 'quiz_failed' || a.type === 'review_done',
  );
  const fsrsSummary = summarizeRetentionForecast(learnerModel.spacingIntervals);
  const fsrsForecast = buildRetentionForecast(learnerModel.spacingIntervals, 14);
  const progressKpis = buildProgressKpis(learnerModel, stats, daysToExam, lang);
  const confidenceBuckets = hasConfidenceMetrics
    ? buildConfidenceBuckets(learnerModel, lang)
    : [];
  const generatedCourseCount = courses.filter((c) => c.status !== 'generating').length;
  const learningEvents = readAllLearningEvents();
  const sankeyModel = buildKnowledgeFlowSankey(rangedActivities, learningEvents, learnerModel, generatedCourseCount);
  const waterfallModel = buildMasteryWaterfall(rangedActivities, learnerModel, lang);
  const treemapModel = buildConceptTreemap(courses, learnerModel);
  const timelineModel = buildLearningTimeline(rangedActivities, lang);
  return (
    <div className="hub-section-stack analytics-hub-stack" data-soft-sep="stack">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <ProgressKpiRow kpis={progressKpis} />
      </motion.div>

      {/* L-A01: canvas flow banner — opens disclosure without removing chart body */}
      <CollapsibleChromeSection
        title={t('chromeAnalyticsExtras')}
        data-testid="analytics-extras-chrome"
      >
        <div className="px-1 pb-2">
          <button
            type="button"
            data-testid="analytics-flow-banner"
            className="flex w-full min-h-11 items-center gap-3 rounded-xl border-0 bg-surface-secondary/55 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-hover"
            onClick={() => {
              const el = document.querySelector('[data-testid="analytics-flow-disclosure"]') as HTMLDetailsElement | null;
              if (el) {
                el.open = true;
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            }}
          >
            <GitBranch className="w-4 h-4 text-text-secondary shrink-0" aria-hidden />
            <span className="flex-1 type-meta font-medium text-text-primary">{t('analyticsFlowBanner')}</span>
            <ChevronRight className="w-4 h-4 text-text-muted shrink-0" aria-hidden />
          </button>
        </div>
      </CollapsibleChromeSection>

      {calibration && (
        <CalibrationChip score={calibration.score} direction={calibration.direction} />
      )}

      {/* Readiness Ring + Retention Curve */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {hasConfidenceMetrics ? (
          <div className="platform-panel-lg flex items-center justify-center">
            <ReadinessRing value={learnerModel.overallMastery} size={200} sublabel={t('analyticsReadinessSublabel')} />
          </div>
        ) : (
          <div className="platform-panel-lg flex flex-col items-center justify-center text-center min-h-36 px-4">
            <Target className="w-6 h-6 text-text-tertiary mb-2" aria-hidden />
            <p className="type-caption text-text-secondary">{t('analyticsReadinessEmpty')}</p>
          </div>
        )}
        {hasRetentionData ? (
          <RetentionCurve dataPoints={retentionPoints} />
        ) : (
          <div className="platform-panel-lg flex flex-col items-center justify-center text-center min-h-36 px-4">
            <Activity className="w-6 h-6 text-text-tertiary mb-2" aria-hidden />
            <p className="type-caption text-text-secondary">{t('analyticsRetentionEmpty')}</p>
          </div>
        )}
      </motion.div>

      {fsrsSummary.trackedConcepts > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="platform-panel-md"
          data-testid="analytics-fsrs-forecast"
        >
          <SectionLabel icon={Brain}>{t('analyticsFsrsForecastTitle')}</SectionLabel>
          <p className="type-micro text-text-muted mb-2.5">{t('analyticsFsrsForecastHint')}</p>
          {/* OPT-K128 — denser wash FSRS tiles (width parity with KPI rhythm) */}
          <div className="grid grid-cols-3 gap-2.5 mb-2.5" data-testid="analytics-fsrs-kpi-row">
            <div className="rounded-xl bg-surface-secondary/50 px-3 py-2 min-h-[3.75rem]">
              <p className="type-micro text-text-muted">{t('analyticsFsrsRetrievability')}</p>
              <p className="ux-kpi-value-sm">
                {Math.round(fsrsSummary.avgRetrievabilityToday * 100)}%
              </p>
            </div>
            <div className="rounded-xl bg-surface-secondary/50 px-3 py-2 min-h-[3.75rem]">
              <p className="type-micro text-text-muted">{t('analyticsFsrsDueWeek')}</p>
              <p className="ux-kpi-value-sm">{fsrsSummary.dueNext7Days}</p>
            </div>
            <div className="rounded-xl bg-surface-secondary/50 px-3 py-2 min-h-[3.75rem]">
              <p className="type-micro text-text-muted">{t('analyticsFsrsTracked')}</p>
              <p className="ux-kpi-value-sm">{fsrsSummary.trackedConcepts}</p>
            </div>
          </div>
          {/* OPT-K130 — quiet FSRS spark columns (no solid purple cage track) */}
          <div
            className="flex items-end gap-1.5 h-16 rounded-lg px-0.5"
            data-testid="analytics-fsrs-day-bars"
          >
            {fsrsForecast.map((point) => {
              const label =
                point.dayOffset === 0
                  ? t('analyticsTimelineDayToday')
                  : point.dayOffset === 1
                    ? t('analyticsFsrsDayTomorrow')
                    : point.dayOffset === 3 || point.dayOffset === 7 || point.dayOffset === 14
                      ? t('analyticsRetentionDayPlus').replace('{n}', String(point.dayOffset))
                      : '';
              const pct = Math.max(0, Math.min(1, point.avgRetrievability));
              return (
              <div key={point.dayOffset} className="flex-1 flex flex-col items-center gap-1 min-w-0 h-full justify-end">
                <div
                  className="w-[55%] max-w-[10px] rounded-full min-h-[4px] mx-auto"
                  style={{
                    height: `${Math.max(8, pct * 100)}%`,
                    backgroundColor: 'var(--viz-bar-fill)',
                    opacity: 0.35 + pct * 0.55,
                  }}
                  title={`${label || `D+${point.dayOffset}`}: ${Math.round(pct * 100)}%`}
                />
                <span className="h-3 type-micro text-text-muted tabular-nums leading-none truncate w-full text-center">
                  {label}
                </span>
              </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* OPT-K130 — equal-width 3-col pack (no CSS-columns stagger) */}
      <div
        className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch"
        data-testid="analytics-overview-mastery-row"
      >
        <div className="flex min-h-0 min-w-0 flex-col space-y-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="platform-panel-md">
            <h3 className="type-meta font-semibold flex items-center gap-2 mb-2.5"><TrendingUp className="w-4 h-4 text-text-secondary" aria-hidden />{t('analyticsWeeklyTrend')}</h3>
            <div className="flex items-end gap-1.5 h-28" data-testid="analytics-weekly-trend">
              {weekly.map((val, i) => (
                <div key={i} className="analytics-weekly-col flex h-full flex-1 flex-col items-center justify-end gap-1 min-h-0">
                  <div
                    className="analytics-weekly-bar w-[70%] max-w-[14px] rounded-full transition-all duration-500"
                    style={{
                      height: `${Math.max(6, val * 1.2)}%`,
                      backgroundColor: i === weekly.length - 1
                        ? 'var(--viz-bar-fill)'
                        : 'var(--viz-bar-fill-muted)',
                      opacity: i === weekly.length - 1 ? 0.95 : 0.55,
                    }}
                    title={`${val}%`}
                  />
                  <span className="analytics-weekly-meta flex items-baseline gap-0.5 type-micro text-text-muted leading-none">
                    <span>{t(WEEKDAY_KEYS[i]!)}</span>
                    <span className="tabular-nums font-medium text-text-secondary">{val}%</span>
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="platform-panel-md flex-1">
            <h3 className="type-meta font-semibold flex items-center gap-2 mb-2.5"><Calendar className="w-4 h-4 text-text-secondary" aria-hidden />{t('analyticsStudyHeatmap')}</h3>
            <div className="grid grid-cols-[repeat(13,1fr)] gap-[3px]" data-testid="analytics-heatmap-grid">
              {learnerModel.heatmapData.slice(-91).map((day, i) => {
                const intensity = day.minutes === 0 ? 0 : day.minutes < 15 ? 1 : day.minutes < 30 ? 2 : day.minutes < 60 ? 3 : 4;
                const heatmapVar = `var(--color-heatmap-scale-${intensity})`;
                return (
                  <div
                    key={i}
                    className="heatmap-cell w-full aspect-square rounded-sm"
                    style={{ backgroundColor: heatmapVar }}
                    title={formatHeatmapDayTooltip(day.date, day.minutes, lang)}
                  />
                );
              })}
            </div>
            <div className="flex items-center justify-end gap-1 mt-2 type-micro text-text-muted">
              <span>{t('analyticsHeatmapLess')}</span>
              {[0, 1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: `var(--color-heatmap-scale-${step})` }}
                />
              ))}
              <span>{t('analyticsHeatmapMore')}</span>
            </div>
          </motion.div>
        </div>

        <div className="space-y-3 min-w-0">
          <div className="platform-panel-md">
            <h3 className="type-meta font-semibold mb-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-text-secondary" aria-hidden />
              {t('analyticsCoursesColumn')}
            </h3>
            <div className="space-y-2">
              {courses.filter(c => c.status !== 'generating').slice(0, 6).map(course => (
                <div key={course.id} className="flex items-center gap-2">
                  <CourseIcon icon={course.icon} size="sm" colorClassName="text-text-secondary shrink-0" />
                  <span className="type-caption text-text-secondary min-w-0 flex-1 truncate">{course.title}</span>
                  <div className="w-20 shrink-0">
                    <CompactProgressBar
                      pct={course.mastery}
                      color={resolveCourseColor(course.color)}
                      size="md"
                      aria-label={`${course.title} ${course.mastery}%`}
                    />
                  </div>
                  <span className="type-micro font-semibold tabular-nums w-8 text-right shrink-0">{course.mastery}%</span>
                </div>
              ))}
              {courses.filter(c => c.status !== 'generating').length === 0 && (
                <p className="type-caption text-text-muted">{t('analyticsSubjectMasteryEmpty')}</p>
              )}
            </div>
          </div>
          <div className="platform-panel-md">
            <h3 className="type-meta font-semibold mb-2.5 flex items-center gap-2">
              <Brain className="w-4 h-4 text-text-secondary" aria-hidden />
              {t('analyticsConceptsColumn')}
            </h3>
            <div className="space-y-2">
              {[...learnerModel.weakAreas, ...learnerModel.almostKnown, ...learnerModel.strongAreas]
                .slice(0, 6)
                .map((skill) => (
                  <div key={skill.concept} className="flex items-center gap-2">
                    <span className="type-caption text-text-secondary min-w-0 flex-1 truncate">{skill.concept}</span>
                    <div className="w-20 shrink-0">
                      <CompactProgressBar
                        pct={skill.mastery}
                        color={
                          skill.mastery >= 75
                            ? 'var(--color-accent-emerald)'
                            : skill.mastery >= 50
                              ? 'var(--color-accent-amber)'
                              : 'var(--color-accent-rose)'
                        }
                        size="md"
                        aria-label={`${skill.concept} ${Math.round(skill.mastery)}%`}
                      />
                    </div>
                    <span className="type-micro font-semibold tabular-nums w-8 text-right">{Math.round(skill.mastery)}%</span>
                  </div>
                ))}
              {learnerModel.weakAreas.length + learnerModel.almostKnown.length + learnerModel.strongAreas.length === 0 && (
                <p className="type-caption text-text-muted">{t('analyticsConceptsEmpty')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="min-w-0">
          <div className="platform-panel-md h-full">
            <h3 className="type-meta font-semibold mb-2.5 flex items-center gap-2">
              <Eye className="w-4 h-4 text-text-secondary" aria-hidden />
              {t('analyticsCalibrationColumn')}
            </h3>
            <div className="space-y-2">
              {learnerModel.confidenceCalibration.slice(0, 5).map((point, i) => {
                const gap = Math.abs(point.predicted - point.actual);
                const overconfident = point.predicted > point.actual;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="type-caption text-text-secondary truncate">{point.concept}</span>
                      <span
                        className={cn(
                          'type-micro font-medium inline-flex items-center gap-0.5 shrink-0',
                          gap <= 0.2 && 'text-accent-emerald',
                        )}
                        style={gap > 0.2 ? {
                          color: overconfident
                            ? 'var(--color-calibration-over)'
                            : 'var(--color-calibration-under)',
                        } : undefined}
                      >
                        {gap > 0.2
                          ? (overconfident
                            ? <><ArrowUpRight className="w-3 h-3" aria-hidden />{t('analyticsOverconfident')}</>
                            : <><ArrowDownRight className="w-3 h-3" aria-hidden />{t('analyticsUnderconfident')}</>)
                          : <><Minus className="w-3 h-3" aria-hidden />{t('analyticsCalibrated')}</>}
                      </span>
                    </div>
                    <CalibrationCompareBar
                      predictedPct={point.predicted * 100}
                      actualPct={point.actual * 100}
                      youLabel={`${t('analyticsCalibrationYou')}: ${Math.round(point.predicted * 100)}%`}
                      actualLabel={`${t('analyticsCalibrationActual')}: ${Math.round(point.actual * 100)}%`}
                    />
                  </div>
                );
              })}
              {learnerModel.confidenceCalibration.length === 0 && (
                <p className="type-caption text-text-muted py-4 text-center">{t('analyticsCalibrationEmpty')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {hasConfidenceMetrics && confidenceBuckets.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <ConfidenceBucketChart
            buckets={confidenceBuckets}
            title={lang === 'el' ? 'Calibration ανά επίπεδο εμπιστοσύνης' : 'Calibration by confidence level'}
          />
        </motion.div>
      )}

      <SubjectMasteryGrid tiles={subjectTiles} onSelect={setDrillTile} />
      <SubjectDrillDown
        tile={drillTile}
        onClose={() => setDrillTile(null)}
        onStudyConcept={(concept) => {
          setDrillTile(null);
          store.openStudyWorkspaceForConcept(concept);
        }}
      />

      <details
        className="ux-disclosure"
        data-testid="analytics-flow-disclosure"
        defaultOpen={sankeyModel.hasData || waterfallModel.hasData || treemapModel.hasData || timelineModel.hasData}
      >
        <summary className="ux-disclosure-summary">{t('analyticsFlowDisclosure')}</summary>
        <div className="ux-disclosure-body space-y-4">
          <SectionHeader
            eyebrow={t('analyticsFlowSectionEyebrow')}
            title={t('analyticsFlowSectionTitle')}
            subtitle={t('analyticsFlowSectionSubtitle')}
          />

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 }}
            className="grid grid-cols-1 xl:grid-cols-2 gap-3"
          >
            <KnowledgeFlowSankeyChart
              links={sankeyModel.links}
              hasData={sankeyModel.hasData}
              title={t('analyticsSankeyTitle')}
              hint={t('analyticsSankeyHint')}
              emptyLabel={t('analyticsSankeyEmpty')}
            />
            <MasteryWaterfallChart
              steps={waterfallModel.steps}
              hasData={waterfallModel.hasData}
              title={t('analyticsWaterfallTitle')}
              hint={t('analyticsWaterfallHint')}
              emptyLabel={t('analyticsWaterfallEmpty')}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="grid grid-cols-1 xl:grid-cols-2 gap-3"
          >
            <ConceptTreemapChart
              blocks={treemapModel.blocks}
              totalWeight={treemapModel.totalWeight}
              hasData={treemapModel.hasData}
              lang={lang}
              title={t('analyticsTreemapTitle')}
              hint={t('analyticsTreemapHint')}
              emptyLabel={t('analyticsTreemapEmpty')}
              weightLabel={t('analyticsTreemapWeight')}
              masteryLabel={t('analyticsTreemapMastery')}
              prereqLabel={t('analyticsTreemapPrereqs')}
            />
            <LearningTimelineChart
              events={timelineModel.events}
              hasData={timelineModel.hasData}
              title={t('analyticsTimelineTitle')}
              hint={t('analyticsTimelineHint')}
              emptyLabel={t('analyticsTimelineEmpty')}
              deltaLabel={t('analyticsTimelineDelta')}
              dayLabel={(daysAgo) =>
                daysAgo === 0
                  ? t('analyticsTimelineDayToday')
                  : daysAgo === 1
                    ? t('analyticsTimelineDayAgoOne')
                    : t('analyticsTimelineDayAgoMany').replace('{n}', String(daysAgo))
              }
            />
          </motion.div>
        </div>
      </details>

      {/* L-A03 + M-A05 — canvas-parity Visual Lab disclosure. Body is animated via
          AnimatePresence so open/close matches the sticky footer chevron cadence. */}
      <details
        className="ux-disclosure"
        data-testid="analytics-visual-lab-disclosure"
        open={visualLabOpen}
        onToggle={(e) => {
          const next = (e.target as HTMLDetailsElement).open;
          setVisualLabOpen(next);
          saveVisualLabOpen(next);
        }}
      >
        <summary className="ux-disclosure-summary">{t('analyticsVisualLabDisclosure')}</summary>
        <div className="ux-disclosure-body">
          <AnimatePresence initial={false}>
            {visualLabOpen && (
              <motion.div
                key="analytics-visual-lab-panel"
                initial={{ opacity: 0, y: 8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 8, height: 0 }}
                transition={{ duration: 0.36, ease: [0.2, 0, 0, 1] }}
                style={{ overflow: 'hidden' }}
              >
                <AnalyticsVisualLabPanel
                  sankeyLinks={sankeyModel.links}
                  sankeyHasData={sankeyModel.hasData}
                  forecast={fsrsForecast}
                  skills={[...learnerModel.weakAreas, ...learnerModel.almostKnown, ...learnerModel.strongAreas]}
                  overallMastery={learnerModel.overallMastery}
                  courseCount={generatedCourseCount}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </details>

      {/* L-A04: sticky Visual Lab footer (canvas) — keeps disclosure body intact */}
      <div
        className="analytics-visual-lab-footer sticky bottom-2 z-20 mt-3 rounded-xl border-0 bg-surface-card/95 shadow-none backdrop-blur-sm"
        data-testid="analytics-visual-lab-footer"
      >
        <button
          type="button"
          className="flex w-full min-h-11 items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-hover/80"
          aria-expanded={visualLabOpen}
          onClick={() => {
            const next = !visualLabOpen;
            setVisualLabOpen(next);
            saveVisualLabOpen(next);
            requestAnimationFrame(() => {
              document
                .querySelector('[data-testid="analytics-visual-lab-disclosure"]')
                ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            });
          }}
        >
          <FlaskConical className="w-4 h-4 text-text-secondary shrink-0" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block type-meta font-medium text-text-primary">{t('analyticsVisualLabFooter')}</span>
            <span className="block type-micro text-text-muted truncate">{t('analyticsVisualLabFooterHint')}</span>
          </span>
          <ChevronRight
            className={cn(
              'w-4 h-4 text-text-muted shrink-0 transition-transform duration-300 ease-out motion-reduce:transition-none',
              visualLabOpen && 'rotate-90 text-text-secondary',
            )}
            aria-hidden
          />
        </button>
      </div>
    </div>
  );
}

function MasteryTab({
  learnerModel,
  courses,
  activities,
}: {
  learnerModel: LearnerModel;
  courses: Course[];
  activities: ActivityItem[];
}) {
  const { t } = useI18n();
  const { range } = useAnalyticsDateRange();
  const store = useAppStore();
  const [drillTile, setDrillTile] = useState<SubjectMasteryTile | null>(null);
  const subjectTiles = useMemo(
    () => buildSubjectMasteryTiles(courses, activities, range),
    [courses, activities, range],
  );
  const rangedActivities = useMemo(
    () => filterActivitiesByRange(activities, range),
    [activities, range],
  );
  const graph = buildMasteryGraph(learnerModel, courses);
  const masteryHeatmap = buildConceptMasteryHeatmap(rangedActivities, courses, learnerModel);
  return (
    <div className="hub-section-stack" data-soft-sep="stack">
      <SubjectMasteryGrid tiles={subjectTiles} onSelect={setDrillTile} />
      <SubjectDrillDown
        tile={drillTile}
        onClose={() => setDrillTile(null)}
        onStudyConcept={(concept) => {
          setDrillTile(null);
          store.openStudyWorkspaceForConcept(concept);
        }}
      />

      {/* Concept Graph */}
      {graph.nodes.length > 0 ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <ConceptGraph
            nodes={graph.nodes}
            edges={graph.edges}
            width={660}
            height={Math.max(380, graph.height)}
          />
        </motion.div>
      ) : (
        <div className="platform-panel-xl text-center type-body text-text-secondary">
          {t('analyticsMasteryMapEmpty')}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }}>
        <ConceptMasteryHeatmapChart
          model={masteryHeatmap}
          title={t('analyticsMasteryHeatmapTitle')}
          hint={t('analyticsMasteryHeatmapHint')}
          emptyLabel={t('analyticsMasteryHeatmapEmpty')}
          bandLabels={{
            weak: t('analyticsMasteryBandWeak'),
            developing: t('analyticsMasteryBandDeveloping'),
            proficient: t('analyticsMasteryBandProficient'),
            strong: t('analyticsMasteryBandStrong'),
          }}
          dayTooltip={(concept, daysAgo, mastery) => {
            const day =
              daysAgo === 0
                ? t('analyticsMasteryHeatmapToday')
                : t('analyticsMasteryHeatmapDayAgo').replace('{n}', String(daysAgo));
            return t('analyticsMasteryHeatmapTooltip')
              .replace('{concept}', concept)
              .replace('{day}', day)
              .replace('{pct}', String(mastery));
          }}
          formatDayLabel={(daysAgo) =>
            daysAgo === 0
              ? t('analyticsMasteryHeatmapToday')
              : t('analyticsMasteryHeatmapDayAgo').replace('{n}', String(daysAgo))
          }
        />
      </motion.div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="platform-panel-md">
        <h3 className="type-meta font-semibold flex items-center gap-2 mb-4"><CheckCircle2 className="w-4 h-4 text-accent-emerald" />{t('analyticsStrongAreas')}</h3>
        <div className="space-y-3">
          {learnerModel.strongAreas.map(a => (
            <SkillBar key={a.concept} concept={a.concept} mastery={a.mastery} retention={a.retentionPrediction} count={a.practiceCount} color="emerald" />
          ))}
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="platform-panel-md">
        <h3 className="type-meta font-semibold flex items-center gap-2 mb-4"><XCircle className="w-4 h-4 text-accent-rose" />{t('analyticsWeakAreas')}</h3>
        <div className="space-y-3">
          {learnerModel.weakAreas.map(a => (
            <SkillBar key={a.concept} concept={a.concept} mastery={a.mastery} retention={a.retentionPrediction} count={a.practiceCount} color="rose" />
          ))}
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="ux-banner-warn rounded-panel border-0 bg-accent-amber/5 p-5">
        <h3 className="ux-banner-warn-accent type-meta font-semibold flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4" aria-hidden />{t('analyticsAlmostKnown')}</h3>
        <div className="space-y-3">
          {learnerModel.almostKnown.map(a => (
            <SkillBar key={a.concept} concept={a.concept} mastery={a.mastery} retention={a.retentionPrediction} count={a.practiceCount} color="amber" />
          ))}
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="platform-panel-md">
        <h3 className="type-meta font-semibold flex items-center gap-2 mb-4"><Brain className="w-4 h-4 text-accent-rose" />{t('analyticsActiveMisconceptions')}</h3>
        <div className="space-y-3">
          {learnerModel.misconceptions.map(m => (
            <div key={m.id} className="p-3 rounded-xl border-0 bg-accent-rose/5">
              <div className="flex items-center justify-between mb-1">
                <span className="type-meta font-medium text-accent-rose">{m.concept}</span>
                <span className={cn('type-micro px-2 py-0.5 rounded-full font-medium', m.corrected ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-accent-rose/10 text-accent-rose')}>
                  {m.corrected ? t('analyticsMisconceptionCorrected') : t('analyticsMisconceptionActive')}
                </span>
              </div>
              <p className="type-caption text-text-secondary">{m.description}</p>
              <p className="type-micro text-accent-teal mt-1.5 flex items-center gap-1"><Zap className="w-3 h-3" />{m.suggestedFix}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
    </div>
  );
}

function BehaviorTab({
  learnerModel,
  activities,
}: {
  learnerModel: LearnerModel;
  activities: ActivityItem[];
}) {
  const { t, lang } = useI18n();
  const isMinimal = useMinimalTheme();
  const { range } = useAnalyticsDateRange();
  const rangedActivities = useMemo(
    () => filterActivitiesByRange(activities, range),
    [activities, range],
  );
  const inference = inferBehaviorFromActivities(rangedActivities, filterEventsByRange(readAllLearningEvents(), range));
  const radarDimensions = buildLearningRadar(learnerModel, lang);
  const modelVars: { labelKey: I18nKey; value: string; barPct?: number }[] = [
    { labelKey: 'analyticsRetrievalPerformance', value: `${Math.round(learnerModel.retrievalPerformance * 100)}%`, barPct: Math.round(learnerModel.retrievalPerformance * 100) },
    { labelKey: 'analyticsTransferAbility', value: `${Math.round(learnerModel.transferAbility * 100)}%`, barPct: Math.round(learnerModel.transferAbility * 100) },
    { labelKey: 'analyticsCognitiveLoadPref', value: learnerModel.cognitiveLoadPreference },
    { labelKey: 'analyticsBestStudyTime', value: learnerModel.bestTimeOfDay || '—' },
    { labelKey: 'analyticsLearningVelocity', value: `${learnerModel.learningVelocity}×` },
    { labelKey: 'analyticsStreakDays', value: `${learnerModel.streakDays}` },
  ];
  const behaviorMetrics = [
    { icon: <Clock className="w-5 h-5 text-text-tertiary" />, label: t('analyticsAvgSession'), value: `${learnerModel.averageSessionLength}m`, sub: t('analyticsAvgSessionSub') },
    { icon: <Target className="w-5 h-5 text-text-tertiary" />, label: t('analyticsConfidence'), value: `${Math.round(learnerModel.averageConfidence * 100)}%`, sub: t('analyticsConfidenceSub') },
    { icon: <HelpCircle className="w-5 h-5 text-text-tertiary" />, label: t('analyticsHelpSeeking'), value: `${Math.round(learnerModel.helpSeekingRate * 100)}%`, sub: t('analyticsHelpSeekingSub') },
    { icon: <Shield className="w-5 h-5 text-text-tertiary" />, label: t('analyticsPersistence'), value: `${Math.round(learnerModel.persistenceScore * 100)}%`, sub: t('analyticsPersistenceSub') },
  ];
  return (
    <div className="hub-section-stack" data-soft-sep="stack">
      <StudyBehaviorCharts activities={rangedActivities} />
      {inference.inferenceConfidence === 'low' && (
        <p className="type-caption text-accent-amber" data-soft-card="off">{t('analyticsBehaviorLowConfidence')}</p>
      )}
      {inference.inferenceConfidence !== 'low' && (
        <p className="type-caption text-text-tertiary" data-soft-card="off">{t('analyticsBehaviorInferred')}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="analytics-behavior-metrics">
        {behaviorMetrics.map((m) => (
          <MetricCard key={m.label} icon={m.icon} label={m.label} value={m.value} sub={m.sub} />
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <LearningRadarChart
          dimensions={radarDimensions}
          title={lang === 'el' ? 'Προφίλ μάθησης' : 'Learning profile'}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="platform-panel-md">
        <h3 className="type-meta font-semibold flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4 text-accent-orange" />{t('analyticsErrorPatterns')}</h3>
        <div className="space-y-3">
          {learnerModel.errorPatterns.map((p, i) => (
            <div key={i} className="p-4 rounded-xl bg-surface-secondary/50">
              <div className="flex items-center justify-between mb-2">
                <span className="type-meta font-medium">{p.type}</span>
                <span className={cn('type-micro px-2 py-0.5 rounded-full font-medium capitalize',
                  p.category === 'calculation' ? 'bg-accent-amber/10 text-accent-amber' :
                  p.category === 'conceptual' ? 'bg-accent-rose/10 text-accent-rose' :
                  'bg-accent-cyan/10 text-accent-cyan'
                )}>{errorCategoryLabel(p.category, t)}</span>
              </div>
              <p className="type-caption text-text-tertiary">{p.frequency} {t('analyticsErrorOccurrences')}: {p.concepts.join(', ')}</p>
              <p className="type-caption text-accent-teal mt-1.5 flex items-center gap-1"><Zap className="w-3 h-3" />{p.suggestedRemedy}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {isMinimal ? (
        <HubSection title={t('analyticsAdaptiveModelVars')} data-testid="analytics-adaptive-model-vars">
          {modelVars.map((item) => (
            <UtilityRow
              key={item.labelKey}
              label={t(item.labelKey)}
              value={item.value}
              barPct={item.barPct}
            />
          ))}
          <p className="utility-row-hint mt-2">{t('analyticsAdaptiveModelFootnote')}</p>
        </HubSection>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="platform-panel-md" data-testid="analytics-adaptive-model-vars">
          <h3 className="type-meta font-semibold mb-4">{t('analyticsAdaptiveModelVars')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {modelVars.map((item) => (
              <div key={item.labelKey} className="p-3 rounded-xl bg-surface-secondary/50 text-center">
                <p className="type-micro text-text-muted mb-1">{t(item.labelKey)}</p>
                <p className="type-meta font-semibold capitalize">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="type-micro text-text-muted mt-4 leading-relaxed">
            {t('analyticsAdaptiveModelFootnote')}
          </p>
        </motion.div>
      )}
    </div>
  );
}

function InsightsTab({
  learnerModel,
  activities,
  repairs,
  courses,
}: {
  learnerModel: LearnerModel;
  activities: ActivityItem[];
  repairs: PrerequisiteRepair[];
  courses: Course[];
}) {
  const { t, lang } = useI18n();
  const { range } = useAnalyticsDateRange();
  const rangedActivities = useMemo(
    () => filterActivitiesByRange(activities, range),
    [activities, range],
  );
  const tips = adaptiveRecommendations(learnerModel, rangedActivities, repairs);
  const profileInsights = buildLearnerInsights(learnerModel, rangedActivities, courses, lang);
  return (
    <div className="space-y-4" data-soft-sep="stack">
      <AIInsightsPanel
        learnerModel={learnerModel}
        activities={rangedActivities}
        courses={courses}
      />

      {profileInsights.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <LearnerInsightCards
            insights={profileInsights}
            title={lang === 'el' ? 'Insights μαθητή' : 'Learner profile insights'}
          />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-panel border-0 bg-brand-500/5 p-5">
        <h3 className="type-meta font-semibold flex items-center gap-2 mb-4"><Lightbulb className="w-4 h-4 text-text-secondary" />{t('analyticsInsightsLearnedTitle')}</h3>
        <p className="type-caption text-text-tertiary mb-4">{t('analyticsInsightsLearnedHint')}</p>
        <div className="space-y-3">
          {(learnerModel.interactionInsights.length > 0 ? learnerModel.interactionInsights : tips.slice(0, 2)).map((insight, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className="flex items-start gap-3 p-3 rounded-xl border-0 bg-surface-secondary/45">
              <div className="w-6 h-6 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Lightbulb className="w-3 h-3 text-text-secondary" />
              </div>
              <p className="type-body text-text-secondary leading-relaxed">{insight}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="platform-panel-md">
        <h3 className="type-meta font-semibold mb-3">{t('analyticsAdaptiveRecommendations')}</h3>
        <div className="space-y-2 type-body text-text-secondary">
          {tips.length > 0 ? tips.map((tip, i) => (
            <p key={i}>‶ {tip}</p>
          )) : (
            <p>{t('analyticsRecommendationsEmpty')}</p>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ResearchTab({
  learnerModel,
  activities,
  courses,
}: {
  learnerModel: LearnerModel;
  activities: ActivityItem[];
  courses: Course[];
}) {
  const { t } = useI18n();
  const { range } = useAnalyticsDateRange();
  const rangedActivities = useMemo(
    () => filterActivitiesByRange(activities, range),
    [activities, range],
  );
  const events = filterEventsByRange(readAllLearningEvents(), range);
  const metrics = computeResearchMetrics(learnerModel, rangedActivities, events);
  const hasData = metrics.bktConcepts.length > 0 || metrics.sampleActivities >= 3;

  const handleExport = () => {
    const manifest = buildResearchExport(learnerModel, rangedActivities, events, courses);
    downloadResearchExport(manifest);
  };

  const researchMetrics = [
    {
      icon: <Target className="w-5 h-5 text-text-tertiary" />,
      label: t('analyticsResearchBrier'),
      value: metrics.brierScore != null ? metrics.brierScore.toFixed(3) : '—',
      sub: t('analyticsConfidenceHint').slice(0, 40),
    },
    {
      icon: <Eye className="w-5 h-5 text-text-tertiary" />,
      label: t('analyticsResearchEce'),
      value: metrics.expectedCalibrationError != null ? metrics.expectedCalibrationError.toFixed(3) : '—',
      sub: t('analyticsCalibrated'),
    },
    {
      icon: <Clock className="w-5 h-5 text-text-tertiary" />,
      label: t('analyticsResearchSpacing'),
      value: `${Math.round(metrics.spacingDensity * 100)}%`,
      sub: t('analyticsSevenDayRecall'),
    },
    {
      icon: <Brain className="w-5 h-5 text-text-tertiary" />,
      label: t('analyticsResearchInterleaving'),
      value: `${Math.round(metrics.interleavingRatio * 100)}%`,
      sub: t('analyticsVsBaseline'),
    },
  ];

  return (
    <div className="hub-section-stack" data-soft-sep="stack">
      <p className="type-body text-text-secondary" data-soft-card="off">{t('analyticsResearchSubtitle')}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" data-testid="analytics-research-metrics">
        {researchMetrics.map((m) => (
          <MetricCard key={m.label} icon={m.icon} label={m.label} value={m.value} sub={m.sub} />
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="platform-panel-md">
        <h3 className="type-meta font-semibold flex items-center gap-2 mb-1">
          <FlaskConical className="w-4 h-4 text-text-secondary" />
          {t('analyticsResearchBktTitle')}
        </h3>
        <p className="type-caption text-text-tertiary mb-4">{t('analyticsResearchBktHint')}</p>
        {!hasData ? (
          <p className="type-body text-text-secondary">{t('analyticsResearchEmpty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full type-caption">
              <thead>
                <tr className="text-text-muted border-b border-transparent">
                  <th className="text-left py-2 pr-3 type-caption font-medium">{t('analyticsResearchConcept')}</th>
                  <th className="text-right py-2 px-3 type-caption font-medium">{t('analyticsResearchAttempts')}</th>
                  <th className="text-right py-2 pl-3 type-caption font-medium">{t('analyticsResearchPLearned')}</th>
                </tr>
              </thead>
              <tbody>
                {metrics.bktConcepts.map((row) => (
                  <tr key={row.concept} className="border-b border-transparent">
                    <td className="py-2 pr-3 text-text-secondary truncate max-w-[200px]">{row.concept}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{row.attempts}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{Math.round(row.pLearned * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="type-micro text-text-muted mt-3">
          {t('analyticsResearchSample')}: {metrics.sampleActivities} activities · {metrics.sampleEvents} events
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="platform-panel-md">
        <h3 className="type-meta font-semibold mb-4">{t('analyticsResearchForgetting')}</h3>
        <RetentionCurve dataPoints={metrics.forgettingCurve} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="platform-panel-md">
        <h3 className="type-meta font-semibold mb-2">{t('analyticsResearchExport')}</h3>
        <p className="type-caption text-text-tertiary mb-4">{t('analyticsResearchExportHint')}</p>
        <Button type="button" variant="primary" size="sm" onClick={handleExport}>
          <Download className="w-4 h-4" />
          {t('analyticsResearchExport')}
        </Button>
      </motion.div>
    </div>
  );
}

function parseTrailingPct(value: string): number | undefined {
  const m = value.trim().match(/^(\d+(?:\.\d+)?)%$/);
  if (!m) return undefined;
  return Number(m[1]);
}

function MetricCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <UtilityRow
      icon={icon}
      label={label}
      value={value}
      hint={sub}
      barPct={parseTrailingPct(value)}
    />
  );
}

function SkillBar({ concept, mastery, retention, count }: { concept: string; mastery: number; retention: number; count: number; color?: string }) {
  const { t } = useI18n();
  return (
    <UtilityRow
      label={concept}
      value={`${mastery}%`}
      barPct={mastery}
      hint={`${t('analyticsSkillRetention')}: ${Math.round(retention * 100)}% · ${t('analyticsSkillPracticed')} ${count}×`}
    />
  );
}
