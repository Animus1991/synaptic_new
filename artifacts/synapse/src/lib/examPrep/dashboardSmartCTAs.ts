import type { DashboardStats } from '../../types';
import type { DashboardNextAction } from '../dashboardNextAction';
import { t, type Lang } from '../i18n';
import type { WorkspaceToolId } from '../taskFlows';
import type { SyllabusCoverageSnapshot } from './syllabusCoverageTracker';
import { pickNextIncompleteTopic, recommendToolForTopic } from './coveragePracticeActions';

export type DashboardSmartCTA = {
  id: string;
  label: string;
  hint?: string;
  tool: WorkspaceToolId;
  concept?: string;
  courseId?: string;
  simulatorTab?: 'exam-prep';
};

export type WorkspacePracticeLaunch = {
  tool: WorkspaceToolId;
  concept?: string;
  courseId?: string;
  simulatorTab?: 'exam-prep';
};

function dashboardActionToSmartCTA(action: DashboardNextAction): DashboardSmartCTA | null {
  if (!action.workspaceTool) return null;
  return {
    id: `scheduler-${action.kind}`,
    label: action.label,
    hint: action.reason,
    tool: action.workspaceTool,
    concept: action.concept,
    courseId: action.courseId,
    simulatorTab: action.simulatorTab,
  };
}

export function buildDashboardSmartCTAs(opts: {
  lang: Lang;
  dashboardAction: DashboardNextAction | null;
  snapshot: SyllabusCoverageSnapshot | null;
  stats: DashboardStats;
  daysToExam: number | null;
  primaryCourseId?: string | null;
}): DashboardSmartCTA[] {
  const ctas: DashboardSmartCTA[] = [];
  const seen = new Set<string>();

  const push = (cta: DashboardSmartCTA) => {
    const key = `${cta.tool}:${cta.concept ?? ''}:${cta.simulatorTab ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    ctas.push(cta);
  };

  if (opts.dashboardAction) {
    const fromScheduler = dashboardActionToSmartCTA(opts.dashboardAction);
    if (fromScheduler) push(fromScheduler);
  }

  if (opts.snapshot && opts.snapshot.remainingTopics > 0) {
    const topic = pickNextIncompleteTopic(opts.snapshot);
    if (topic) {
      const tool = recommendToolForTopic(topic, opts.stats, opts.daysToExam);
      push({
        id: `coverage-${topic.topicId}`,
        label: t('dashboardSmartCtaQuizTopic', opts.lang).replace('{topic}', topic.title),
        hint: t('dashboardSmartCtaCoverageHint', opts.lang),
        tool,
        concept: topic.title,
        courseId: opts.snapshot.courseId,
        simulatorTab: tool === 'simulator' ? 'exam-prep' : undefined,
      });
    }
  }

  if (opts.stats.reviewsDue > 0) {
    push({
      id: 'reviews-leitner',
      label: t('dashboardSmartCtaLeitnerReviews', opts.lang).replace(
        '{count}',
        String(opts.stats.reviewsDue),
      ),
      hint: t('dashboardSmartCtaReviewsHint', opts.lang),
      tool: 'leitner',
      courseId: opts.primaryCourseId ?? opts.snapshot?.courseId,
    });
  }

  return ctas.slice(0, 3);
}

export function smartCTAToWorkspaceLaunch(cta: DashboardSmartCTA): WorkspacePracticeLaunch {
  return {
    tool: cta.tool,
    concept: cta.concept,
    courseId: cta.courseId,
    simulatorTab: cta.simulatorTab,
  };
}
