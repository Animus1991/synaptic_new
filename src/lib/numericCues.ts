import { splitSentences } from './contentAnalysis';
import { conceptRelevanceScore, relevantExcerpt } from './noteContentExtractors';

export type NumericCue = {
  id: string;
  label: string;
  /** Baseline value extracted from notes. */
  baseline: number;
  min: number;
  max: number;
  unit?: string;
  context: string;
};

/**
 * Extract adjustable numeric parameters mentioned in note excerpts.
 * Powers the generic (non-economics) parametric sandbox.
 */
export function extractNumericCues(text: string, concept: string, max = 4): NumericCue[] {
  const excerpt = relevantExcerpt(text, concept, 10000);
  const cues: NumericCue[] = [];
  const seen = new Set<string>();

  for (const sent of splitSentences(excerpt)) {
    if (conceptRelevanceScore(sent, concept) < 0.12) continue;
    const matches = sent.matchAll(/\b(\d+(?:\.\d+)?)\s*(%|percent|kg|g|m\/s|km|years?|months?|°C|°F|USD|\$)?/gi);
    for (const m of matches) {
      const val = parseFloat(m[1]!);
      if (!Number.isFinite(val) || val <= 0) continue;
      const unit = m[2]?.replace(/percent/i, '%') || undefined;
      const label = unit ? `${val}${unit === '%' ? '%' : ` ${unit}`}` : String(val);
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const spread = unit === '%' ? 30 : Math.max(val * 0.4, 1);
      cues.push({
        id: `cue-${cues.length}`,
        label,
        baseline: val,
        min: Math.max(0, val - spread),
        max: val + spread,
        unit,
        context: sent.trim().slice(0, 140),
      });
      if (cues.length >= max) return cues;
    }
  }
  return cues;
}

export function sandboxDeltaInsight(
  cues: NumericCue[],
  values: Record<string, number>,
  concept: string,
  lang: 'en' | 'el',
): string {
  if (cues.length === 0) return '';
  const c = cues[0]!;
  const v = values[c.id] ?? c.baseline;
  const pct = ((v - c.baseline) / Math.max(c.baseline, 1e-6)) * 100;
  const dir = pct >= 0 ? (lang === 'el' ? 'αύξηση' : 'increase') : (lang === 'el' ? 'μείωση' : 'decrease');
  return lang === 'el'
    ? `Η ${c.label} για «${concept}» δείχνει ${dir} ${Math.abs(pct).toFixed(0)}% από την τιμή στις σημειώσεις.`
    : `${c.label} for «${concept}» shows a ${Math.abs(pct).toFixed(0)}% ${dir} vs. your notes baseline.`;
}
