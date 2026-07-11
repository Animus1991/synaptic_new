import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain, TrendingUp, Clock, Target, AlertTriangle, BarChart3,
  Zap, Calendar, CheckCircle2, XCircle, Lightbulb,
  Activity, Shield, Eye, HelpCircle, FlaskConical, Download
} from '@/lib/lucide-shim';
import type { LearnerModel, DashboardStats, Course, ActivityItem } from '../types';
import { computeCalibration, type PrerequisiteRepair } from '../lib/pedagogy';
import { buildRetentionForecast, summarizeRetentionForecast } from '../lib/adaptiveScheduler';
import {
  adaptiveRecommendations,
  retentionCurveFromActivities,
  weeklyMasteryFromActivities,
} from '../lib/retentionAnalytics';
import { CalibrationCompareBar } from './visuals/CalibrationCompareBar';
import { CalibrationChip } from './visuals/CalibrationChip';
import { resolveCourseColor } from '../lib/masteryPalette';
import { CourseIcon } from './ui/CourseIcon';
import { cn } from '../utils/cn';
import { Page, PageHeader, TabBar } from './ui/primitives';
import { ReadinessRing } from './visuals/ReadinessRing';
import { RetentionCurve } from './visuals/DiagramGenerator';
import { ConceptGraph } from './visuals/ConceptGraph';
import { useI18n, type I18nKey } from '../lib/i18n';
import { formatHeatmapDayTooltip } from '../lib/localeFormat';
import { readAllLearningEvents } from '../lib/learningEvents';
import {
  computeResearchMetrics,
  buildResearchExport,
  downloadResearchExport,
} from '../lib/researchAnalytics';
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
import {
  buildKnowledgeFlowSankey,
  buildMasteryWaterfall,
  buildConceptTreemap,
  buildLearningTimeline,
  buildConceptMasteryHeatmap,
} from '../lib/knowledgeFlowAnalytics';
import { KnowledgeFlowSankeyChart, MasteryWaterfallChart } from './analytics/KnowledgeFlowSankey';
import { ConceptTreemapChart } from './analytics/ConceptTreemapChart';
import { ConceptMasteryHeatmapChart } from './analytics/ConceptMasteryHeatmapChart';
import { LearningTimelineChart } from './analytics/LearningTimelineChart';
import { AnalyticsVisualLabPanel } from './analytics/AnalyticsVisualLabPanel';
import { SectionHeader } from './ui/platformChrome';

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

  return (
    <Page>
      <PageHeader
        title={t('analyticsTitle')}
        subtitle={t('analyticsSubtitle')}
        icon={BarChart3}
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
  const meaningfulActivityCount = countMeaningfulLearningActivities(activities);
  const hasConfidenceMetrics = meaningfulActivityCount >= 3;
  const calibration = hasConfidenceMetrics
    ? computeCalibration(learnerModel.confidenceCalibration)
    : null;
  const retentionPoints = retentionCurveFromActivities(activities);
  const weekly = learnerModel.weeklyMastery.some((v) => v > 0)
    ? learnerModel.weeklyMastery
    : weeklyMasteryFromActivities(activities);
  const hasRetentionData = activities.some(
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
  const sankeyModel = buildKnowledgeFlowSankey(activities, learningEvents, learnerModel, generatedCourseCount);
  const waterfallModel = buildMasteryWaterfall(activities, learnerModel, lang);
  const treemapModel = buildConceptTreemap(courses, learnerModel);
  const timelineModel = buildLearningTimeline(activities, lang);
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <ProgressKpiRow kpis={progressKpis} />
      </motion.div>

      <SectionHeader
        eyebrow={t('analyticsFlowSectionEyebrow')}
        title={t('analyticsFlowSectionTitle')}
        subtitle={t('analyticsFlowSectionSubtitle')}
      />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className="grid grid-cols-1 xl:grid-cols-2 gap-6"
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
        className="grid grid-cols-1 xl:grid-cols-2 gap-6"
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

      {calibration && (
        <CalibrationChip score={calibration.score} direction={calibration.direction} />
      )}
      {/* Readiness Ring + Retention Curve */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {hasConfidenceMetrics ? (
          <div className="platform-panel-lg flex items-center justify-center">
            <ReadinessRing value={learnerModel.overallMastery} size={200} sublabel={t('analyticsReadinessSublabel')} />
          </div>
        ) : (
          <div className="platform-panel-lg flex flex-col items-center justify-center text-center text-sm text-text-muted min-h-[200px]">
            <Target className="w-8 h-8 text-text-tertiary mb-2" />
            <p>{t('analyticsResearchEmpty')}</p>
          </div>
        )}
        {hasRetentionData ? (
          <RetentionCurve dataPoints={retentionPoints} />
        ) : (
          <div className="platform-panel-lg flex flex-col items-center justify-center text-center text-sm text-text-muted min-h-[200px]">
            <Activity className="w-8 h-8 text-text-tertiary mb-2" />
            <p>{t('analyticsResearchEmpty')}</p>
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
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-1">
            <Brain className="w-4 h-4 text-accent-cyan" />
            {t('analyticsFsrsForecastTitle')}
          </h3>
          <p className="text-[10px] text-text-muted mb-4">{t('analyticsFsrsForecastHint')}</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl border border-border-subtle bg-surface-card/40 px-3 py-2">
              <p className="text-[10px] text-text-muted">{t('analyticsFsrsRetrievability')}</p>
              <p className="text-lg font-semibold text-text-primary">
                {Math.round(fsrsSummary.avgRetrievabilityToday * 100)}%
              </p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface-card/40 px-3 py-2">
              <p className="text-[10px] text-text-muted">{t('analyticsFsrsDueWeek')}</p>
              <p className="text-lg font-semibold text-text-primary">{fsrsSummary.dueNext7Days}</p>
            </div>
            <div className="rounded-xl border border-border-subtle bg-surface-card/40 px-3 py-2">
              <p className="text-[10px] text-text-muted">{t('analyticsFsrsTracked')}</p>
              <p className="text-lg font-semibold text-text-primary">{fsrsSummary.trackedConcepts}</p>
            </div>
          </div>
          <div className="flex items-end gap-1 h-16">
            {fsrsForecast.map((point) => (
              <div
                key={point.dayOffset}
                className="flex-1 rounded-t bg-accent-cyan/80 min-h-[4px]"
                style={{ height: `${Math.max(8, point.avgRetrievability * 100)}%` }}
                title={`D+${point.dayOffset}: ${Math.round(point.avgRetrievability * 100)}%`}
              />
            ))}
          </div>
        </motion.div>
      )}

      {/* Weekly mastery + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="platform-panel-md">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-accent-emerald" />{t('analyticsWeeklyTrend')}</h3>
          <div className="flex items-end gap-1.5 h-28">
            {weekly.map((val, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[9px] text-text-muted font-medium">{val}%</span>
                <div className="w-full rounded-t transition-all duration-500" style={{ height: `${val * 1.2}%`, backgroundColor: i === weekly.length - 1 ? '#818cf8' : 'var(--viz-track)' }} />
                <span className="text-[9px] text-text-muted">{t(WEEKDAY_KEYS[i]!)}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Study Heatmap */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="platform-panel-md">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><Calendar className="w-4 h-4 text-accent-teal" />{t('analyticsStudyHeatmap')}</h3>
          <div className="grid grid-cols-[repeat(13,1fr)] gap-[3px]">
            {learnerModel.heatmapData.slice(-91).map((day, i) => {
              const intensity = day.minutes === 0 ? 0 : day.minutes < 15 ? 1 : day.minutes < 30 ? 2 : day.minutes < 60 ? 3 : 4;
              const colors = ['bg-surface-hover', 'bg-brand-900', 'bg-brand-700', 'bg-brand-500', 'bg-brand-400'];
              return (
                <div key={i} className={cn('heatmap-cell w-full aspect-square rounded-[2px]', colors[intensity])} title={formatHeatmapDayTooltip(day.date, day.minutes, lang)} />
              );
            })}
          </div>
          <div className="flex items-center justify-end gap-1 mt-2 text-[9px] text-text-muted">
            <span>{t('analyticsHeatmapLess')}</span>
            {['bg-surface-hover', 'bg-brand-900', 'bg-brand-700', 'bg-brand-500', 'bg-brand-400'].map((c, i) => (
              <div key={i} className={cn('w-2.5 h-2.5 rounded-[2px]', c)} />
            ))}
            <span>{t('analyticsHeatmapMore')}</span>
          </div>
        </motion.div>
      </div>

      {/* Confidence Calibration */}
      {hasConfidenceMetrics && confidenceBuckets.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <ConfidenceBucketChart
            buckets={confidenceBuckets}
            title={lang === 'el' ? 'Calibration ανά επίπεδο εμπιστοσύνης' : 'Calibration by confidence level'}
          />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="platform-panel-md">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><Eye className="w-4 h-4 text-accent-amber" />{t('analyticsConfidenceCalibration')}</h3>
        <p className="text-xs text-text-tertiary mb-4">{t('analyticsConfidenceHint')}</p>
        <div className="space-y-2">
          {learnerModel.confidenceCalibration.map((point, i) => {
            const gap = Math.abs(point.predicted - point.actual);
            const overconfident = point.predicted > point.actual;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xs text-text-secondary w-28 truncate">{point.concept}</span>
                <div className="flex-1 flex items-center gap-2">
                  <CalibrationCompareBar
                    predictedPct={point.predicted * 100}
                    actualPct={point.actual * 100}
                    youLabel={`${t('analyticsCalibrationYou')}: ${Math.round(point.predicted * 100)}%`}
                    actualLabel={`${t('analyticsCalibrationActual')}: ${Math.round(point.actual * 100)}%`}
                  />
                </div>
                <span className={cn('text-[10px] font-medium w-20 text-right', gap > 0.2 ? (overconfident ? 'text-accent-rose' : 'text-accent-amber') : 'text-accent-emerald')}>
                  {gap > 0.2 ? (overconfident ? `⚠ ${t('analyticsOverconfident')}` : `↑ ${t('analyticsUnderconfident')}`) : `✓ ${t('analyticsCalibrated')}`}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Course mastery */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="platform-panel-md">
        <h3 className="text-sm font-semibold mb-4">{t('analyticsCourseMastery')}</h3>
        <div className="space-y-3">
          {courses.filter(c => c.status !== 'generating').map(course => (
            <div key={course.id} className="flex items-center gap-3">
              <CourseIcon icon={course.icon} size="md" colorClassName="text-brand-600 shrink-0" />
              <span className="text-sm text-text-secondary w-36 truncate">{course.title}</span>
              <div className="flex-1 bg-surface-hover rounded-full h-2.5">
                <div className="h-2.5 rounded-full transition-all" style={{ width: `${course.mastery}%`, backgroundColor: resolveCourseColor(course.color) }} />
              </div>
              <span className="text-xs font-semibold text-text-primary w-10 text-right tabular-nums">{course.mastery}%</span>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
        <AnalyticsVisualLabPanel
          sankeyLinks={sankeyModel.links}
          sankeyHasData={sankeyModel.hasData}
          forecast={fsrsForecast}
          skills={[...learnerModel.weakAreas, ...learnerModel.almostKnown, ...learnerModel.strongAreas]}
        />
      </motion.div>
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
  const graph = buildMasteryGraph(learnerModel, courses);
  const masteryHeatmap = buildConceptMasteryHeatmap(activities, courses, learnerModel);
  return (
    <div className="space-y-6">
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
        <div className="platform-panel-xl text-center text-sm text-text-secondary">
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

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="platform-panel-md">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><CheckCircle2 className="w-4 h-4 text-accent-emerald" />{t('analyticsStrongAreas')}</h3>
        <div className="space-y-3">
          {learnerModel.strongAreas.map(a => (
            <SkillBar key={a.concept} concept={a.concept} mastery={a.mastery} retention={a.retentionPrediction} count={a.practiceCount} color="emerald" />
          ))}
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="platform-panel-md">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><XCircle className="w-4 h-4 text-accent-rose" />{t('analyticsWeakAreas')}</h3>
        <div className="space-y-3">
          {learnerModel.weakAreas.map(a => (
            <SkillBar key={a.concept} concept={a.concept} mastery={a.mastery} retention={a.retentionPrediction} count={a.practiceCount} color="rose" />
          ))}
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-panel border border-accent-amber/20 bg-accent-amber/5 p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4 text-accent-amber" />{t('analyticsAlmostKnown')}</h3>
        <div className="space-y-3">
          {learnerModel.almostKnown.map(a => (
            <SkillBar key={a.concept} concept={a.concept} mastery={a.mastery} retention={a.retentionPrediction} count={a.practiceCount} color="amber" />
          ))}
        </div>
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="platform-panel-md">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><Brain className="w-4 h-4 text-accent-rose" />{t('analyticsActiveMisconceptions')}</h3>
        <div className="space-y-3">
          {learnerModel.misconceptions.map(m => (
            <div key={m.id} className="p-3 rounded-xl bg-accent-rose/5 border border-accent-rose/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-accent-rose">{m.concept}</span>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', m.corrected ? 'bg-accent-emerald/10 text-accent-emerald' : 'bg-accent-rose/10 text-accent-rose')}>
                  {m.corrected ? t('analyticsMisconceptionCorrected') : t('analyticsMisconceptionActive')}
                </span>
              </div>
              <p className="text-xs text-text-secondary">{m.description}</p>
              <p className="text-[10px] text-accent-teal mt-1.5 flex items-center gap-1"><Zap className="w-3 h-3" />{m.suggestedFix}</p>
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
  const inference = inferBehaviorFromActivities(activities, readAllLearningEvents());
  const radarDimensions = buildLearningRadar(learnerModel, lang);
  const modelVars: { labelKey: I18nKey; value: string }[] = [
    { labelKey: 'analyticsRetrievalPerformance', value: `${Math.round(learnerModel.retrievalPerformance * 100)}%` },
    { labelKey: 'analyticsTransferAbility', value: `${Math.round(learnerModel.transferAbility * 100)}%` },
    { labelKey: 'analyticsCognitiveLoadPref', value: learnerModel.cognitiveLoadPreference },
    { labelKey: 'analyticsBestStudyTime', value: learnerModel.bestTimeOfDay || '—' },
    { labelKey: 'analyticsLearningVelocity', value: `${learnerModel.learningVelocity}×` },
    { labelKey: 'analyticsStreakDays', value: `${learnerModel.streakDays}` },
  ];
  return (
    <div className="space-y-6">
      {inference.inferenceConfidence === 'low' && (
        <p className="text-xs text-accent-amber">{t('analyticsBehaviorLowConfidence')}</p>
      )}
      {inference.inferenceConfidence !== 'low' && (
        <p className="text-xs text-text-tertiary">{t('analyticsBehaviorInferred')}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard icon={<Clock className="w-5 h-5 text-text-tertiary" />} label={t('analyticsAvgSession')} value={`${learnerModel.averageSessionLength}m`} sub={t('analyticsAvgSessionSub')} />
        <MetricCard icon={<Target className="w-5 h-5 text-text-tertiary" />} label={t('analyticsConfidence')} value={`${Math.round(learnerModel.averageConfidence * 100)}%`} sub={t('analyticsConfidenceSub')} />
        <MetricCard icon={<HelpCircle className="w-5 h-5 text-text-tertiary" />} label={t('analyticsHelpSeeking')} value={`${Math.round(learnerModel.helpSeekingRate * 100)}%`} sub={t('analyticsHelpSeekingSub')} />
        <MetricCard icon={<Shield className="w-5 h-5 text-text-tertiary" />} label={t('analyticsPersistence')} value={`${Math.round(learnerModel.persistenceScore * 100)}%`} sub={t('analyticsPersistenceSub')} />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <LearningRadarChart
          dimensions={radarDimensions}
          title={lang === 'el' ? 'Προφίλ μάθησης' : 'Learning profile'}
        />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="platform-panel-md">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><AlertTriangle className="w-4 h-4 text-accent-orange" />{t('analyticsErrorPatterns')}</h3>
        <div className="space-y-3">
          {learnerModel.errorPatterns.map((p, i) => (
            <div key={i} className="p-4 rounded-xl bg-surface-primary/50 border border-border-subtle">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{p.type}</span>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium capitalize',
                  p.category === 'calculation' ? 'bg-accent-amber/10 text-accent-amber' :
                  p.category === 'conceptual' ? 'bg-accent-rose/10 text-accent-rose' :
                  'bg-accent-cyan/10 text-accent-cyan'
                )}>{errorCategoryLabel(p.category, t)}</span>
              </div>
              <p className="text-xs text-text-tertiary">{p.frequency} {t('analyticsErrorOccurrences')}: {p.concepts.join(', ')}</p>
              <p className="text-xs text-accent-teal mt-1.5 flex items-center gap-1"><Zap className="w-3 h-3" />{p.suggestedRemedy}</p>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="platform-panel-md">
        <h3 className="text-sm font-semibold mb-4">{t('analyticsAdaptiveModelVars')}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {modelVars.map((item) => (
            <div key={item.labelKey} className="p-3 rounded-xl bg-surface-primary/50 border border-border-subtle text-center">
              <p className="text-[10px] text-text-muted mb-1">{t(item.labelKey)}</p>
              <p className="text-sm font-semibold capitalize">{item.value}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-text-muted mt-4 leading-relaxed">
          {t('analyticsAdaptiveModelFootnote')}
        </p>
      </motion.div>
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
  const tips = adaptiveRecommendations(learnerModel, activities, repairs);
  const profileInsights = buildLearnerInsights(learnerModel, activities, courses, lang);
  return (
    <div className="space-y-4">
      {profileInsights.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <LearnerInsightCards
            insights={profileInsights}
            title={lang === 'el' ? 'Insights μαθητή' : 'Learner profile insights'}
          />
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="rounded-panel border border-brand-500/20 bg-brand-500/5 p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><Lightbulb className="w-4 h-4 text-brand-400" />{t('analyticsInsightsLearnedTitle')}</h3>
        <p className="text-xs text-text-tertiary mb-4">{t('analyticsInsightsLearnedHint')}</p>
        <div className="space-y-3">
          {(learnerModel.interactionInsights.length > 0 ? learnerModel.interactionInsights : tips.slice(0, 2)).map((insight, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              className="flex items-start gap-3 p-3 rounded-xl bg-surface-card border border-border-subtle">
              <div className="w-6 h-6 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Lightbulb className="w-3 h-3 text-brand-400" />
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">{insight}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="platform-panel-md">
        <h3 className="text-sm font-semibold mb-3">{t('analyticsAdaptiveRecommendations')}</h3>
        <div className="space-y-2 text-sm text-text-secondary">
          {tips.length > 0 ? tips.map((tip, i) => (
            <p key={i}>• {tip}</p>
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
  const events = readAllLearningEvents();
  const metrics = computeResearchMetrics(learnerModel, activities, events);
  const hasData = metrics.bktConcepts.length > 0 || metrics.sampleActivities >= 3;

  const handleExport = () => {
    const manifest = buildResearchExport(learnerModel, activities, events, courses);
    downloadResearchExport(manifest);
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-secondary">{t('analyticsResearchSubtitle')}</p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          icon={<Target className="w-5 h-5 text-text-tertiary" />}
          label={t('analyticsResearchBrier')}
          value={metrics.brierScore != null ? metrics.brierScore.toFixed(3) : '—'}
          sub={t('analyticsConfidenceHint').slice(0, 40)}
        />
        <MetricCard
          icon={<Eye className="w-5 h-5 text-text-tertiary" />}
          label={t('analyticsResearchEce')}
          value={metrics.expectedCalibrationError != null ? metrics.expectedCalibrationError.toFixed(3) : '—'}
          sub={t('analyticsCalibrated')}
        />
        <MetricCard
          icon={<Clock className="w-5 h-5 text-text-tertiary" />}
          label={t('analyticsResearchSpacing')}
          value={`${Math.round(metrics.spacingDensity * 100)}%`}
          sub={t('analyticsSevenDayRecall')}
        />
        <MetricCard
          icon={<Brain className="w-5 h-5 text-text-tertiary" />}
          label={t('analyticsResearchInterleaving')}
          value={`${Math.round(metrics.interleavingRatio * 100)}%`}
          sub={t('analyticsVsBaseline')}
        />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="platform-panel-md">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-1">
          <FlaskConical className="w-4 h-4 text-brand-400" />
          {t('analyticsResearchBktTitle')}
        </h3>
        <p className="text-xs text-text-tertiary mb-4">{t('analyticsResearchBktHint')}</p>
        {!hasData ? (
          <p className="text-sm text-text-secondary">{t('analyticsResearchEmpty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-text-muted border-b border-border-subtle">
                  <th className="text-left py-2 pr-3">{t('analyticsResearchConcept')}</th>
                  <th className="text-right py-2 px-3">{t('analyticsResearchAttempts')}</th>
                  <th className="text-right py-2 pl-3">{t('analyticsResearchPLearned')}</th>
                </tr>
              </thead>
              <tbody>
                {metrics.bktConcepts.map((row) => (
                  <tr key={row.concept} className="border-b border-border-subtle/50">
                    <td className="py-2 pr-3 text-text-secondary truncate max-w-[200px]">{row.concept}</td>
                    <td className="py-2 px-3 text-right tabular-nums">{row.attempts}</td>
                    <td className="py-2 pl-3 text-right tabular-nums">{Math.round(row.pLearned * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[10px] text-text-muted mt-3">
          {t('analyticsResearchSample')}: {metrics.sampleActivities} activities · {metrics.sampleEvents} events
        </p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="platform-panel-md">
        <h3 className="text-sm font-semibold mb-4">{t('analyticsResearchForgetting')}</h3>
        <RetentionCurve dataPoints={metrics.forgettingCurve} />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="platform-panel-md">
        <h3 className="text-sm font-semibold mb-2">{t('analyticsResearchExport')}</h3>
        <p className="text-xs text-text-tertiary mb-4">{t('analyticsResearchExportHint')}</p>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-brand-600 hover:bg-brand-500 text-white transition-all"
        >
          <Download className="w-4 h-4" />
          {t('analyticsResearchExport')}
        </button>
      </motion.div>
    </div>
  );
}

function MetricCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="p-4 rounded-xl border border-border-subtle bg-surface-card">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-xs text-text-tertiary font-medium">{label}</span></div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] text-text-muted mt-0.5">{sub}</p>
    </div>
  );
}

function SkillBar({ concept, mastery, retention, count, color }: { concept: string; mastery: number; retention: number; count: number; color: string }) {
  const { t } = useI18n();
  const barColor = color === 'emerald' ? 'bg-accent-emerald' : color === 'rose' ? 'bg-accent-rose' : 'bg-accent-amber';
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium">{concept}</span>
        <span className={cn('text-xs font-medium', `text-accent-${color}`)}>{mastery}%</span>
      </div>
      <div className="w-full bg-surface-hover rounded-full h-2">
        <div className={cn('h-2 rounded-full transition-all', barColor)} style={{ width: `${Math.max(mastery, 3)}%` }} />
      </div>
      <div className="flex gap-3 mt-1 text-[10px] text-text-muted">
        <span>{t('analyticsSkillRetention')}: {Math.round(retention * 100)}%</span>
        <span>{t('analyticsSkillPracticed')} {count}×</span>
      </div>
    </div>
  );
}
