import type { LearnerModel, SkillNode, ConfidencePoint } from '../types';

/** SM-2 inspired interval in days, modulated by confidence and performance. */
export function computeReviewInterval(
  reviewCount: number,
  confidence: number,
  correct: boolean,
): number {
  if (!correct) return 1;
  const base = [1, 2, 4, 7, 14, 21, 30][Math.min(reviewCount, 6)] ?? 30;
  const confMod = confidence >= 80 ? 1.2 : confidence >= 60 ? 1.0 : 0.75;
  return Math.max(1, Math.round(base * confMod));
}

export function updateSkillMastery(skill: SkillNode, correct: boolean, confidence: number): SkillNode {
  const delta = correct ? Math.min(12, 100 - skill.mastery) : -Math.min(15, skill.mastery);
  const mastery = Math.max(0, Math.min(100, skill.mastery + delta));
  return {
    ...skill,
    mastery,
    practiceCount: skill.practiceCount + 1,
    retentionPrediction: correct
      ? Math.min(100, skill.retentionPrediction + 4)
      : Math.max(0, skill.retentionPrediction - 8),
    errorRate: correct
      ? Math.max(0, skill.errorRate - 0.05)
      : Math.min(1, skill.errorRate + 0.1),
    lastPracticed: new Date().toISOString(),
    averageResponseTime: skill.averageResponseTime,
  };
}

export function computeOverallMastery(skills: SkillNode[]): number {
  if (skills.length === 0) return 0;
  return Math.round(skills.reduce((s, n) => s + n.mastery, 0) / skills.length);
}

export function computeCalibrationGap(points: ConfidencePoint[]): number {
  if (points.length === 0) return 0;
  return Math.round(
    points.reduce((s, p) => s + Math.abs(p.predicted - p.actual), 0) / points.length,
  );
}

export function deriveInsights(model: LearnerModel): string[] {
  const insights: string[] = [];
  const gap = computeCalibrationGap(model.confidenceCalibration);
  if (gap > 15) insights.push('You tend to be overconfident — rate lower before submitting answers.');
  if (gap < -10) insights.push('You underestimate yourself — trust retrieval more on familiar topics.');
  if (model.weakAreas.length > 0) {
    insights.push(`Priority repair: ${model.weakAreas[0].concept} (${model.weakAreas[0].mastery}% mastery).`);
  }
  if (model.retrievalPerformance < 60) insights.push('Retrieval practice is your highest-leverage activity this week.');
  if (model.learningVelocity > 1.2) insights.push('Learning velocity is above average — interleave harder transfer questions.');
  return insights.length > 0 ? insights : model.interactionInsights;
}
