import type { SpacingData } from '../types';

/** Build Anki-import tags encoding FSRS interval for SM-2 scheduling parity. */
export function buildAnkiSchedulingTags(spacing: SpacingData): string[] {
  const tags = ['synapse:fsrs'];
  if (spacing.interval > 0) tags.push(`interval:${Math.round(spacing.interval)}`);
  if (spacing.nextReview) tags.push(`due:${spacing.nextReview.slice(0, 10)}`);
  if (spacing.reviewCount > 0) tags.push(`reviews:${spacing.reviewCount}`);
  return tags;
}

export function matchSpacingForCard(
  front: string,
  spacingIntervals: SpacingData[],
): SpacingData | undefined {
  const key = front.trim().toLowerCase();
  if (!key) return undefined;
  return spacingIntervals.find((s) => {
    const sKey = s.concept.trim().toLowerCase();
    return sKey === key || sKey.includes(key.slice(0, 6)) || key.includes(sKey.slice(0, 6));
  });
}

export function mergeCardTags(base: string[] | undefined, extra: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of [...(base ?? []), ...extra]) {
    const norm = t.trim();
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    out.push(norm);
  }
  return out;
}
