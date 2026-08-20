/**
 * Normalize historical mixed retention values to the application's canonical
 * percentage scale. Legacy/demo probabilities in [0, 1] are migrated at the
 * boundary; current persisted percentages remain unchanged.
 */
export function retentionPredictionPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const percent = value >= 0 && value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, percent));
}

export function retentionPredictionProbability(value: number): number {
  return retentionPredictionPercent(value) / 100;
}

export function updateRetentionPredictionPercent(value: number, deltaPercentagePoints: number): number {
  return Math.max(0, Math.min(100, retentionPredictionPercent(value) + deltaPercentagePoints));
}
