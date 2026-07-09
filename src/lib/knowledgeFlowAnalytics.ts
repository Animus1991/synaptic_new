import type { ActivityItem, ActivityType, Course, LearnerModel } from '../types';
import type { LearningEvent } from './learningEvents';
import type { Lang } from './i18n';

export type SankeyLink = { from: string; to: string; value: number; color: string };

export type WaterfallStep = {
  label: string;
  delta: number;
  note: string;
  type: 'gain' | 'loss' | 'neutral';
};

const NODE_ORDER = [
  'Upload',
  'Course built',
  'Study',
  'Quiz',
  'Passed',
  'Failed',
  'Review',
  'Repair',
  'Mastered',
] as const;

type FlowNode = (typeof NODE_ORDER)[number];

const LINK_COLORS: Record<string, string> = {
  default: 'var(--palette-cyan)',
  pass: 'var(--palette-green)',
  fail: 'var(--palette-rose)',
  review: 'var(--palette-amber)',
  master: 'var(--color-accent-teal)',
};

function countActivities(activities: ActivityItem[], types: ActivityType[]): number {
  return activities.filter((a) => types.includes(a.type)).length;
}

function countEvents(events: LearningEvent[], type: LearningEvent['type']): number {
  return events.filter((e) => e.type === type).length;
}

function flowLink(from: FlowNode, to: FlowNode, value: number, tone: keyof typeof LINK_COLORS = 'default'): SankeyLink {
  return { from, to, value: Math.max(0, value), color: LINK_COLORS[tone] ?? LINK_COLORS.default };
}

/** Sankey pipeline from uploads → study → quiz → mastery, using activity + event counts. */
export function buildKnowledgeFlowSankey(
  activities: ActivityItem[],
  events: LearningEvent[],
  learnerModel: LearnerModel,
  courseCount: number,
): { links: SankeyLink[]; hasData: boolean; nodeTotals: Partial<Record<FlowNode, number>> } {
  const upload = countActivities(activities, ['upload']) + (courseCount > 0 ? 1 : 0);
  const courseBuilt = Math.max(countEvents(events, 'course_generated'), courseCount > 0 ? 1 : 0, upload > 0 ? 1 : 0);
  const study = countActivities(activities, ['lesson_complete', 'task_complete']);
  const passed = countActivities(activities, ['quiz_passed']);
  const failed = countActivities(activities, ['quiz_failed']);
  const quiz = passed + failed;
  const review = countActivities(activities, ['review_done']);
  const repair = countActivities(activities, ['mistake_fixed']);
  const mastered = countActivities(activities, ['mastery_up'])
    + learnerModel.strongAreas.filter((a) => a.mastery >= 80).length;

  const nodeTotals: Partial<Record<FlowNode, number>> = {
    Upload: upload,
    'Course built': courseBuilt,
    Study: study,
    Quiz: quiz,
    Passed: passed,
    Failed: failed,
    Review: review,
    Repair: repair,
    Mastered: mastered,
  };

  const totalSignal = Object.values(nodeTotals).reduce((s, v) => s + (v ?? 0), 0);
  const hasData = totalSignal >= 3 && (quiz > 0 || study > 0 || courseBuilt > 0);

  if (!hasData) {
    return { links: [], hasData: false, nodeTotals };
  }

  const links: SankeyLink[] = [
    flowLink('Upload', 'Course built', Math.min(upload, courseBuilt) || courseBuilt),
    flowLink('Course built', 'Study', Math.min(courseBuilt, study) || study || Math.ceil(courseBuilt * 0.6)),
    flowLink('Study', 'Quiz', Math.min(study || quiz, quiz) || quiz),
    flowLink('Quiz', 'Passed', passed, 'pass'),
    flowLink('Quiz', 'Failed', failed, 'fail'),
    flowLink('Failed', 'Repair', Math.min(failed, repair) || repair, 'fail'),
    flowLink('Repair', 'Review', Math.min(repair, review), 'review'),
    flowLink('Passed', 'Review', Math.min(passed, Math.ceil(passed * 0.35)), 'review'),
    flowLink('Passed', 'Mastered', Math.min(passed, mastered) || Math.ceil(passed * 0.45), 'master'),
    flowLink('Review', 'Mastered', Math.min(review, mastered), 'master'),
  ].filter((l) => l.value > 0);

  return { links, hasData: links.length > 0, nodeTotals };
}

export const SANKEY_NODE_ORDER: FlowNode[] = [...NODE_ORDER];

const ACTIVITY_DELTA: Partial<Record<ActivityType, { delta: number; type: WaterfallStep['type'] }>> = {
  upload: { delta: 0, type: 'neutral' },
  lesson_complete: { delta: 6, type: 'gain' },
  task_complete: { delta: 4, type: 'gain' },
  quiz_passed: { delta: 10, type: 'gain' },
  quiz_failed: { delta: -7, type: 'loss' },
  review_done: { delta: 6, type: 'gain' },
  mistake_fixed: { delta: 11, type: 'gain' },
  mastery_up: { delta: 14, type: 'gain' },
};

const WATERFALL_LABELS: Record<Lang, Record<ActivityType, string>> = {
  en: {
    upload: 'Material uploaded',
    lesson_complete: 'Lesson completed',
    task_complete: 'Task completed',
    quiz_passed: 'Quiz — correct',
    quiz_failed: 'Quiz — error',
    review_done: 'Spaced review',
    mistake_fixed: 'Error repaired',
    mastery_up: 'Concept mastered',
    streak: 'Streak',
    xp_earned: 'XP earned',
    study_time: 'Study session',
  },
  el: {
    upload: 'Ανέβασμα υλικού',
    lesson_complete: 'Ολοκλήρωση μαθήματος',
    task_complete: 'Ολοκλήρωση εργασίας',
    quiz_passed: 'Quiz — σωστό',
    quiz_failed: 'Quiz — λάθος',
    review_done: 'Διαστηματική επανάληψη',
    mistake_fixed: 'Διόρθωση λάθους',
    mastery_up: 'Έννοια mastered',
    streak: 'Streak',
    xp_earned: 'XP',
    study_time: 'Συνεδρία μελέτης',
  },
};

const MEANINGFUL: ActivityType[] = [
  'lesson_complete',
  'task_complete',
  'quiz_passed',
  'quiz_failed',
  'review_done',
  'mistake_fixed',
  'mastery_up',
];

/** Step-by-step mastery gains/losses from the activity log. */
export function buildMasteryWaterfall(
  activities: ActivityItem[],
  learnerModel: LearnerModel,
  lang: Lang,
): { steps: WaterfallStep[]; hasData: boolean; runningTotal: number } {
  const events = [...activities]
    .filter((a) => MEANINGFUL.includes(a.type))
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-8);

  if (events.length < 2) {
    return { steps: [], hasData: false, runningTotal: learnerModel.overallMastery };
  }

  const labels = WATERFALL_LABELS[lang];
  const steps: WaterfallStep[] = [];

  const baseline = Math.max(12, Math.min(48, Math.round(learnerModel.overallMastery * 0.35)));
  steps.push({
    label: lang === 'el' ? 'Αρχική γραμμή βάσης' : 'Initial baseline',
    delta: baseline,
    note: lang === 'el' ? 'Μετά το πρώτο μάθημα / quiz από το υλικό σου.' : 'After first lesson or quiz from your material.',
    type: 'neutral',
  });

  for (const act of events) {
    const meta = ACTIVITY_DELTA[act.type];
    if (!meta) continue;
    steps.push({
      label: labels[act.type] ?? act.type,
      delta: meta.delta,
      note: act.description.length > 72 ? `${act.description.slice(0, 69)}…` : act.description,
      type: meta.type,
    });
  }

  const runningTotal = steps.reduce((s, step) => s + step.delta, 0);
  return { steps, hasData: steps.length >= 2, runningTotal };
}

export function sankeyNodeLayout(): Record<FlowNode, { col: number; y: number }> {
  const cols: Record<FlowNode, number> = {
    Upload: 0,
    'Course built': 1,
    Study: 2,
    Quiz: 3,
    Passed: 4,
    Failed: 4,
    Review: 5,
    Repair: 5,
    Mastered: 6,
  };
  const ys: Record<FlowNode, number> = {
    Upload: 50,
    'Course built': 50,
    Study: 48,
    Quiz: 46,
    Passed: 28,
    Failed: 68,
    Review: 42,
    Repair: 72,
    Mastered: 24,
  };
  return NODE_ORDER.reduce(
    (acc, node) => {
      acc[node] = { col: cols[node], y: ys[node] };
      return acc;
    },
    {} as Record<FlowNode, { col: number; y: number }>,
  );
}

// ── Concept treemap (exam weight × mastery) ─────────────────────────────────

export type TreemapTone = 'cyan' | 'violet' | 'amber' | 'emerald' | 'rose';

export type TreemapBlock = {
  id: string;
  label: string;
  value: number;
  mastery: number;
  tone: TreemapTone;
  prereqs: string[];
};

function toneForMastery(mastery: number): TreemapTone {
  if (mastery >= 78) return 'emerald';
  if (mastery >= 55) return 'cyan';
  if (mastery >= 38) return 'violet';
  if (mastery >= 22) return 'amber';
  return 'rose';
}

function topicWeight(conceptCount: number, estimatedMinutes: number): number {
  return Math.max(10, Math.round(conceptCount * 2.5 + estimatedMinutes / 4));
}

/** Treemap blocks from course topics, falling back to learner skill nodes. */
export function buildConceptTreemap(
  courses: Course[],
  learnerModel: LearnerModel,
): { blocks: TreemapBlock[]; hasData: boolean; totalWeight: number } {
  const ready = courses.filter((c) => c.status !== 'generating');
  const fromTopics: TreemapBlock[] = [];

  for (const course of ready) {
    for (const topic of course.topics) {
      fromTopics.push({
        id: `${course.id}-${topic.id}`,
        label: topic.title,
        value: topicWeight(topic.conceptCount, topic.estimatedMinutes),
        mastery: Math.round(topic.mastery),
        tone: toneForMastery(topic.mastery),
        prereqs: topic.prerequisites.slice(0, 3),
      });
    }
  }

  let blocks = fromTopics;

  if (blocks.length === 0) {
    const skills = [
      ...learnerModel.weakAreas,
      ...learnerModel.almostKnown,
      ...learnerModel.strongAreas,
    ];
    blocks = skills.slice(0, 10).map((s) => ({
      id: `${s.courseId}-${s.concept}`,
      label: s.concept,
      value: Math.max(12, Math.round(s.practiceCount * 3 + (100 - s.mastery) * 0.15)),
      mastery: Math.round(s.mastery),
      tone: toneForMastery(s.mastery),
      prereqs: [],
    }));
  }

  blocks = [...blocks].sort((a, b) => b.value - a.value).slice(0, 12);
  const totalWeight = blocks.reduce((s, b) => s + b.value, 0);
  const hasData = blocks.length >= 2 && totalWeight > 0;

  return { blocks, hasData, totalWeight };
}

export function treemapAdvice(mastery: number, lang: Lang): string {
  if (mastery < 50) {
    return lang === 'el'
      ? 'Χρειάζεται στοχευμένη επανάληψη πριν την εξέταση.'
      : 'Needs focused revision before the exam.';
  }
  if (mastery < 75) {
    return lang === 'el'
      ? 'Σχεδόν επαρκές — μία ακόμη retrieval συνεδρία για σταθεροποίηση.'
      : 'Almost proficient — one more retrieval session should stabilize it.';
  }
  return lang === 'el'
    ? 'Ασφαλές για transfer ερωτήσεις και interleaving.'
    : 'Safe for transfer questions and interleaving.';
}

// ── Learning timeline with mastery deltas ───────────────────────────────────

export type TimelineEventType = 'lesson' | 'quiz' | 'review' | 'error' | 'mastery' | 'task';

export type LearningTimelineEvent = {
  id: string;
  daysAgo: number;
  label: string;
  type: TimelineEventType;
  detail: string;
  delta: number;
};

const TIMELINE_TYPES: ActivityType[] = [
  'lesson_complete',
  'task_complete',
  'quiz_passed',
  'quiz_failed',
  'review_done',
  'mistake_fixed',
  'mastery_up',
];

function mapTimelineType(type: ActivityType): TimelineEventType {
  if (type === 'lesson_complete') return 'lesson';
  if (type === 'task_complete') return 'task';
  if (type === 'quiz_passed') return 'quiz';
  if (type === 'quiz_failed') return 'error';
  if (type === 'review_done' || type === 'mistake_fixed') return 'review';
  return 'mastery';
}

function timelineDelta(type: ActivityType): number {
  const meta = ACTIVITY_DELTA[type];
  return meta?.delta ?? 0;
}

function timelineLabel(act: ActivityItem, lang: Lang): string {
  const labels = WATERFALL_LABELS[lang];
  const base = labels[act.type];
  if (act.description && act.description.length <= 64) return act.description;
  return base ?? act.type;
}

/** Recent learning events with estimated mastery delta per activity. */
export function buildLearningTimeline(
  activities: ActivityItem[],
  lang: Lang,
  limit = 14,
): { events: LearningTimelineEvent[]; hasData: boolean } {
  const now = Date.now();
  const events = [...activities]
    .filter((a) => TIMELINE_TYPES.includes(a.type))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)
    .map((act) => {
      const daysAgo = Math.max(
        0,
        Math.floor((now - new Date(act.timestamp).getTime()) / 86400000),
      );
      return {
        id: act.id,
        daysAgo,
        label: timelineLabel(act, lang),
        type: mapTimelineType(act.type),
        detail: act.description,
        delta: timelineDelta(act.type),
      };
    })
    .reverse();

  return { events, hasData: events.length >= 2 };
}
