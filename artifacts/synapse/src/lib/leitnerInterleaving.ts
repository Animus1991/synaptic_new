/**
 * Interleaved Leitner sessions — mix cards from different term clusters
 * to improve transfer (research-backed interleaving).
 */

function clusterKey(front: string): string {
  const trimmed = front.trim().toLowerCase();
  const first = trimmed.split(/\s+/)[0] ?? trimmed;
  return first.slice(0, 12) || trimmed.slice(0, 8);
}

/** Round-robin merge when multiple clusters exist; otherwise spread duplicates. */
export function interleaveLeitnerDeck<T extends { front: string }>(cards: T[]): T[] {
  if (cards.length <= 2) return [...cards];

  const buckets = new Map<string, T[]>();
  for (const card of cards) {
    const key = clusterKey(card.front);
    const list = buckets.get(key) ?? [];
    list.push(card);
    buckets.set(key, list);
  }

  if (buckets.size <= 1) return spreadAdjacentDuplicates(cards);

  const keys = [...buckets.keys()];
  const out: T[] = [];
  let remaining = cards.length;
  while (remaining > 0) {
    let progressed = false;
    for (const key of keys) {
      const bucket = buckets.get(key)!;
      if (bucket.length === 0) continue;
      out.push(bucket.shift()!);
      remaining -= 1;
      progressed = true;
    }
    if (!progressed) break;
  }
  return out;
}

function spreadAdjacentDuplicates<T extends { front: string }>(cards: T[]): T[] {
  const out = [...cards];
  for (let i = 1; i < out.length; i++) {
    if (clusterKey(out[i]!.front) === clusterKey(out[i - 1]!.front)) {
      const swapIdx = out.findIndex((c, j) => j > i && clusterKey(c.front) !== clusterKey(out[i - 1]!.front));
      if (swapIdx > i) {
        [out[i], out[swapIdx]] = [out[swapIdx]!, out[i]!];
      }
    }
  }
  return out;
}

export function countInterleaveClusters(cards: { front: string }[]): number {
  return new Set(cards.map((c) => clusterKey(c.front))).size;
}
