import { normalizeFocusTerm } from './workspaceFocus';

function tokenSet(s: string): Set<string> {
  return new Set(
    normalizeFocusTerm(s)
      .split(/\s+/)
      .filter((t) => t.length > 1),
  );
}

/** Jaccard similarity 0–1 between two table cells. */
export function cellSimilarity(a: string, b: string): number {
  const ta = tokenSet(a);
  const tb = tokenSet(b);
  if (ta.size === 0 && tb.size === 0) return 1;
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union > 0 ? inter / union : 0;
}

/** Index of row whose dimension best matches focus term (correlation bus). */
export function findFocusBaselineRow(
  items: string[][],
  focusTerm?: string,
): number {
  if (!focusTerm?.trim() || items.length === 0) return 0;
  let best = 0;
  let bestScore = -1;
  for (let i = 0; i < items.length; i++) {
    const dim = items[i]?.[0] ?? '';
    const sim = cellSimilarity(dim, focusTerm);
    if (sim > bestScore) {
      bestScore = sim;
      best = i;
    }
  }
  return bestScore > 0.2 ? best : 0;
}

/** Per-cell diff score vs baseline row (1 = identical, 0 = fully different). */
export function rowDiffScores(row: string[], baseline: string[]): number[] {
  return row.map((cell, i) => cellSimilarity(cell, baseline[i] ?? ''));
}

export function isDiffHighlight(similarity: number, threshold = 0.72): boolean {
  return similarity < threshold;
}

/** Annotate differing cells for CSV export (W7 diff + export harmony). */
export function annotateDiffCells(
  items: string[][],
  baselineIndex: number,
): string[][] {
  const baseline = items[baselineIndex] ?? [];
  return items.map((row, ri) =>
    row.map((cell, ci) => {
      if (ri === baselineIndex || ci === 0) return cell;
      const sim = cellSimilarity(cell, baseline[ci] ?? '');
      return isDiffHighlight(sim) ? `${cell} [≠]` : cell;
    }),
  );
}
