/**
 * Greek PDF reader display helpers — repair stale pipeline text and flag residual OCR.
 */

import { repairDisplayPipeline } from './documentTextPipeline';
import { analyzeTextHygiene } from './textQualityMetrics';

/** Re-run recognition repair on stored extractedText (e.g. pipeline v2.2.0 uploads). */
export function repairStaleGreekReaderText(text: string, glossaryTerms: string[] = []): string {
  return repairDisplayPipeline(text, glossaryTerms);
}

/** Residual spaced/glued Greek after repair — show low-confidence reader banner. */
export function readerGreekOcrNeedsReview(text: string): boolean {
  const sample = text.trim();
  if (!sample) return false;
  const hygiene = analyzeTextHygiene(sample);
  if (hygiene.primaryLang === 'en') return false;
  return hygiene.flags.includes('spaced-glyphs') || hygiene.flags.includes('glued-words');
}
