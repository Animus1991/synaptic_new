/**
 * OPT-AI-C — draft class announcement from cohort topic mastery heatmap.
 */

import type { Lang } from './i18n';

export type CohortTopicMastery = {
  topicLabel?: string;
  topicId?: string;
  masteryLevel?: number;
  avgScore?: number;
  classId?: string;
};

export type CohortWeakDraft = {
  title: string;
  body: string;
  weakCount: number;
};

export type TopicMasteryHeatmapRow = {
  classId: string;
  className?: string;
  topics: {
    topicId: string;
    topicLabel: string;
    avgScore: number | null;
    gradedCount?: number;
    masteryLevel: number;
  }[];
};

/** Flatten org topic-mastery heatmaps into draft input rows. */
export function flattenTopicMasteryHeatmap(
  heatmaps: TopicMasteryHeatmapRow[] | null | undefined,
): CohortTopicMastery[] {
  if (!heatmaps?.length) return [];
  return heatmaps.flatMap((hm) =>
    hm.topics.map((topic) => ({
      classId: hm.classId,
      topicId: topic.topicId,
      topicLabel: topic.topicLabel,
      masteryLevel: topic.masteryLevel,
      avgScore: topic.avgScore ?? undefined,
    })),
  );
}

export function buildCohortWeakConceptsDraft(
  topics: CohortTopicMastery[] | null | undefined,
  classId: string | null | undefined,
  lang: Lang,
): CohortWeakDraft | null {
  if (!topics?.length || !classId) return null;
  const weak = topics
    .filter((t) => (t.classId == null || t.classId === classId) && (t.masteryLevel ?? 1) < 0.5)
    .slice(0, 8);
  if (weak.length === 0) return null;

  const lines = weak.map((t) => {
    const label = t.topicLabel?.trim() || t.topicId || 'Topic';
    const score = t.avgScore != null ? Math.round(t.avgScore) : Math.round((t.masteryLevel ?? 0) * 100);
    return `• ${label} (${score}%)`;
  });

  if (lang === 'el') {
    return {
      title: 'Εστίαση σε αδύναμα θέματα',
      body: `Με βάση το cohort heatmap, προτείνω επανάληψη στα εξής:\n${lines.join('\n')}`,
      weakCount: weak.length,
    };
  }
  return {
    title: 'Focus: weak cohort topics',
    body: `Based on the cohort heatmap, prioritize review of:\n${lines.join('\n')}`,
    weakCount: weak.length,
  };
}

/** Agent polish prompt after drafting a weak-topics announcement. */
export function buildCohortDraftPolishPrompt(
  draft: CohortWeakDraft,
  lang: Lang,
): string {
  if (lang === 'el') {
    return `Βελτίωσε αυτή την ανακοίνωση τάξης ώστε να είναι σαφής και ενθαρρυντική, χωρίς να αλλάξεις τα θέματα:\nΤίτλος: ${draft.title}\n\n${draft.body}`;
  }
  return `Polish this class announcement so it is clear and encouraging without changing the topics:\nTitle: ${draft.title}\n\n${draft.body}`;
}
