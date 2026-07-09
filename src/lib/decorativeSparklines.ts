import type { RetentionForecastPoint } from './adaptiveScheduler';
import type { SkillNode } from '../types';

export type SparklineItem = {
  id: string;
  label: string;
  values: number[];
};

/** Build sparkline series from FSRS forecast + weakest tracked concepts (Wave E10). */
export function buildRetentionSparklineItems(
  forecast: RetentionForecastPoint[],
  skills: SkillNode[],
  maxItems = 6,
): SparklineItem[] {
  const items: SparklineItem[] = [];

  if (forecast.length >= 2) {
    items.push({
      id: 'fsrs-avg',
      label: 'FSRS',
      values: forecast.map((p) => p.avgRetrievability),
    });
  }

  const ranked = [...skills]
    .filter((s) => s.practiceCount > 0 || s.mastery > 0)
    .sort((a, b) => a.retentionPrediction - b.retentionPrediction);

  for (const skill of ranked) {
    if (items.length >= maxItems) break;
    const end = Math.max(0.15, Math.min(1, skill.retentionPrediction / 100));
    const values = Array.from({ length: 8 }, (_, i) => 1 - (1 - end) * (i / 7));
    items.push({
      id: skill.concept,
      label: skill.concept,
      values,
    });
  }

  if (items.length === 0 && forecast.length >= 2) {
    return items;
  }

  while (items.length < Math.min(3, maxItems)) {
    const i = items.length;
    items.push({
      id: `placeholder-${i}`,
      label: `T${i + 1}`,
      values: [0.92, 0.88, 0.84, 0.8, 0.76, 0.72, 0.68, 0.65],
    });
  }

  return items.slice(0, maxItems);
}

/** SVG polyline path for normalized 0–1 values. */
export function sparklinePath(values: number[], width: number, height: number, pad = 2): string {
  if (values.length < 2) return '';
  const innerH = height - pad * 2;
  const step = width / (values.length - 1);
  const pts = values.map((v, i) => {
    const x = i * step;
    const y = pad + innerH - Math.max(0, Math.min(1, v)) * innerH;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return `M${pts.join(' L')}`;
}
