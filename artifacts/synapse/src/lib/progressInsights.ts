/**
 * UX-04 — Progress / learner insights derived from LearnerModel + activities.
 */

import type { ActivityItem, Course, DashboardStats, LearnerModel } from '../types';
import type { Lang } from './i18n';
import { computeCalibration, computeCalibrationGap } from './pedagogy';
import { weeklyMasteryFromActivities } from './retentionAnalytics';

export type InsightTone = 'good' | 'warn' | 'neutral';

export type ProgressInsight = {
  insight: string;
  evidence: string;
  tone: InsightTone;
};

export type ProgressKpi = {
  label: string;
  value: string;
  sub: string;
  tone: 'good' | 'warn' | 'neutral' | null;
};

export type ConfidenceBucket = {
  /** Confidence band label, e.g. 21–40% */
  label: string;
  rangeLabel: string;
  /** Accuracy % within the band (mockup large figure) */
  correctPct: number;
  wrongPct: number;
  sampleCount: number;
};

export type RadarDimension = {
  subject: string;
  score: number;
};

export function buildProgressKpis(
  learnerModel: LearnerModel,
  stats: DashboardStats,
  daysToExam: number | null,
  lang: Lang,
): ProgressKpi[] {
  const weeklyDelta = learnerModel.weeklyMastery.length >= 2
    ? learnerModel.weeklyMastery[learnerModel.weeklyMastery.length - 1]! - learnerModel.weeklyMastery[0]!
    : stats.masteryTrend.length >= 2
      ? stats.masteryTrend[stats.masteryTrend.length - 1]! - stats.masteryTrend[0]!
      : 0;
  const deltaLabel = weeklyDelta >= 0
    ? (lang === 'el' ? `+${weeklyDelta}% αυτή την εβδομάδα` : `+${weeklyDelta}% this week`)
    : (lang === 'el' ? `${weeklyDelta}% αυτή την εβδομάδα` : `${weeklyDelta}% this week`);

  const masteredThreshold = 75;
  const mastered = [
    ...learnerModel.strongAreas,
    ...learnerModel.almostKnown.filter((s) => s.mastery >= masteredThreshold),
  ].length;

  const examReadiness = Math.round(
    learnerModel.overallMastery * 0.55
    + learnerModel.retentionRate * 100 * 0.25
    + Math.min(100, stats.conceptsMastered / Math.max(stats.totalConcepts, 1) * 100) * 0.2,
  );

  const hours = Math.floor(learnerModel.totalStudyTime / 60);
  const mins = learnerModel.totalStudyTime % 60;
  const studyValue = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  return [
    {
      label: lang === 'el' ? 'Συνολικό mastery' : 'Overall Mastery',
      value: `${learnerModel.overallMastery}%`,
      sub: deltaLabel,
      tone: weeklyDelta >= 0 ? 'good' : 'warn',
    },
    {
      label: lang === 'el' ? 'Έννοιες mastered' : 'Concepts Mastered',
      value: `${mastered} / ${Math.max(stats.totalConcepts, mastered)}`,
      sub: lang === 'el' ? `≥${masteredThreshold}% threshold` : `≥${masteredThreshold}% threshold`,
      tone: mastered >= 3 ? 'good' : 'neutral',
    },
    {
      label: lang === 'el' ? 'Exam readiness' : 'Exam Readiness',
      value: `${examReadiness}%`,
      sub: daysToExam === null
        ? (lang === 'el' ? 'Δεν έχει οριστεί ημερομηνία' : 'No exam date set')
        : daysToExam === 0
          ? (lang === 'el' ? 'Εξέταση σήμερα' : 'Exam today')
          : (lang === 'el' ? `${daysToExam} ημέρες απομένουν` : `${daysToExam} days remaining`),
      tone: examReadiness >= 70 ? 'good' : examReadiness >= 50 ? 'warn' : 'warn',
    },
    {
      label: lang === 'el' ? 'Χρόνος μελέτης' : 'Total Study Time',
      value: studyValue,
      sub: lang === 'el' ? `${stats.studyTimeWeek} λεπτά αυτή την εβδομάδα` : `${stats.studyTimeWeek} min this week`,
      tone: stats.studyTimeWeek >= 60 ? 'good' : 'neutral',
    },
  ];
}

export function buildConfidenceBuckets(
  learnerModel: LearnerModel,
  lang: Lang,
): ConfidenceBucket[] {
  // Wave K-A01 — mockup horizontal 5-bin calibration (0–20 … 81–100)
  const bucketDefs = [
    { rangeLabel: '0–20%', min: 0, max: 0.2 },
    { rangeLabel: '21–40%', min: 0.2, max: 0.4 },
    { rangeLabel: '41–60%', min: 0.4, max: 0.6 },
    { rangeLabel: '61–80%', min: 0.6, max: 0.8 },
    { rangeLabel: '81–100%', min: 0.8, max: 1.01 },
  ];
  void lang;

  return bucketDefs.map((def) => {
    const points = learnerModel.confidenceCalibration.filter(
      (p) => p.predicted >= def.min && p.predicted < def.max,
    );
    const sampleCount = points.length;
    if (sampleCount === 0) {
      return {
        label: def.rangeLabel,
        rangeLabel: def.rangeLabel,
        correctPct: 0,
        wrongPct: 0,
        sampleCount: 0,
      };
    }
    const correct = points.filter((p) => p.actual >= p.predicted - 0.1).length;
    const correctPct = Math.round((correct / sampleCount) * 100);
    return {
      label: def.rangeLabel,
      rangeLabel: def.rangeLabel,
      correctPct,
      wrongPct: 100 - correctPct,
      sampleCount,
    };
  });
}

export function buildLearningRadar(learnerModel: LearnerModel, lang: Lang): RadarDimension[] {
  const labels = lang === 'el'
    ? ['Ταχύτητα recall', 'Ακρίβεια εννοιών', 'Εφαρμογή', 'Τεχνική εξέτασης', 'Retention', 'Transfer']
    : ['Recall Speed', 'Concept Accuracy', 'Application', 'Exam Technique', 'Retention', 'Transfer'];

  const skillNodes = [
    ...learnerModel.strongAreas,
    ...learnerModel.weakAreas,
    ...learnerModel.almostKnown,
  ];
  const avgResponseMs = skillNodes.length > 0
    ? skillNodes.reduce((sum, s) => sum + s.averageResponseTime, 0) / skillNodes.length
    : 8000;

  const scores = [
    Math.min(100, Math.round((1 - Math.min(avgResponseMs / 12000, 1)) * 100)),
    Math.round(learnerModel.retrievalPerformance * 100),
    Math.round(learnerModel.transferAbility * 100),
    Math.round(learnerModel.persistenceScore * 100),
    Math.round(learnerModel.retentionRate * 100),
    Math.round(learnerModel.transferAbility * 0.7 * 100 + learnerModel.retrievalPerformance * 0.3 * 100),
  ];

  return labels.map((subject, i) => ({ subject, score: scores[i] ?? 0 }));
}

export function buildLearnerInsights(
  learnerModel: LearnerModel,
  activities: ActivityItem[],
  courses: Course[],
  lang: Lang,
): ProgressInsight[] {
  const insights: ProgressInsight[] = [];
  const calibration = learnerModel.confidenceCalibration.length >= 2
    ? computeCalibration(learnerModel.confidenceCalibration)
    : null;

  if (calibration && calibration.direction === 'overconfident') {
    const gapPct = computeCalibrationGap(learnerModel.confidenceCalibration);
    insights.push({
      insight: lang === 'el' ? 'Τείνεις να υπερεκτιμάς το mastery' : 'You tend to overestimate mastery',
      evidence: lang === 'el'
        ? `Calibration gap ${gapPct}% — δοκίμασε recall πριν τις απαντήσεις`
        : `Calibration gap ${gapPct}% — try recall-before-reveal in quizzes`,
      tone: 'warn',
    });
  }

  const calcErrors = learnerModel.errorPatterns.filter((p) => p.category === 'calculation');
  const conceptualErrors = learnerModel.errorPatterns.filter((p) => p.category === 'conceptual');
  if (calcErrors.length > conceptualErrors.length && calcErrors.length > 0) {
    insights.push({
      insight: lang === 'el' ? 'Τα λάθη σου είναι κυρίως διαδικαστικά' : 'Your mistakes are mostly procedural, not conceptual',
      evidence: lang === 'el'
        ? `${calcErrors.reduce((s, p) => s + p.frequency, 0)} calculation errors vs ${conceptualErrors.reduce((s, p) => s + p.frequency, 0)} conceptual`
        : `${calcErrors.reduce((s, p) => s + p.frequency, 0)} calculation vs ${conceptualErrors.reduce((s, p) => s + p.frequency, 0)} conceptual errors`,
      tone: 'neutral',
    });
  }

  const weekly = learnerModel.weeklyMastery.some((v) => v > 0)
    ? learnerModel.weeklyMastery
    : weeklyMasteryFromActivities(activities);
  if (weekly.length >= 2 && weekly[weekly.length - 1]! > weekly[0]!) {
    insights.push({
      insight: lang === 'el' ? 'Βελτιώνεσαι σταθερά αυτή την εβδομάδα' : 'You are improving steadily this week',
      evidence: lang === 'el'
        ? `Mastery proxy ${weekly[0]}% → ${weekly[weekly.length - 1]}%`
        : `Mastery proxy ${weekly[0]}% → ${weekly[weekly.length - 1]}%`,
      tone: 'good',
    });
  }

  const weakest = learnerModel.weakAreas[0];
  if (weakest && weakest.mastery < 40) {
    insights.push({
      insight: lang === 'el' ? `Χρειάζεσαι περισσότερο spaced recall στο "${weakest.concept}"` : `You need more spaced recall on "${weakest.concept}"`,
      evidence: lang === 'el'
        ? `Mastery ${Math.round(weakest.mastery)}% · error rate ${Math.round(weakest.errorRate * 100)}%`
        : `Mastery ${Math.round(weakest.mastery)}% · error rate ${Math.round(weakest.errorRate * 100)}%`,
      tone: 'warn',
    });
  }

  const rising = learnerModel.almostKnown.find((s) => s.mastery >= 60);
  if (rising) {
    insights.push({
      insight: lang === 'el' ? `"${rising.concept}" είναι σχεδόν mastered` : `"${rising.concept}" is almost mastered`,
      evidence: lang === 'el'
        ? `${Math.round(rising.mastery)}% — μία focused session μπορεί να το κλειδώσει`
        : `${Math.round(rising.mastery)}% — one focused session could lock it in`,
      tone: 'good',
    });
  }

  for (const raw of learnerModel.interactionInsights.slice(0, 2)) {
    insights.push({ insight: raw, evidence: lang === 'el' ? 'Από τη συμπεριφορά σου στην πλατφόρμα' : 'Inferred from your platform behavior', tone: 'neutral' });
  }

  const primary = courses.find((c) => c.status !== 'generating');
  if (primary && primary.mastery >= 55) {
    insights.push({
      insight: lang === 'el' ? `Έτοιμος/η για exam-level ερωτήσεις στο ${primary.title}` : `Ready for exam-level questions in ${primary.title}`,
      evidence: lang === 'el' ? `Course mastery ${primary.mastery}%` : `Course mastery ${primary.mastery}%`,
      tone: 'good',
    });
  }

  return insights.slice(0, 6);
}
