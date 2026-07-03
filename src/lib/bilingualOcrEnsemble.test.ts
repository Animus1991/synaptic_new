import { describe, expect, it } from 'vitest';
import {
  BILINGUAL_OCR_MODELS,
  buildPostProcessCandidates,
  mergeBilingualOcrCandidates,
  mergeParallelTesseractOutputs,
  normalizeBilingualExtractedText,
  repairMixedScriptBoundaries,
  scoreBilingualOcrText,
} from './bilingualOcrEnsemble';
import { GLUED_TWO_SPACES_LECTURE, SPACED_INCOME_DISTRIBUTION } from './greekOcrFixtures';

describe('bilingualOcrEnsemble', () => {
  it('lists all concurrent OCR / repair model ids', () => {
    expect(BILINGUAL_OCR_MODELS.length).toBeGreaterThanOrEqual(6);
    expect(BILINGUAL_OCR_MODELS).toContain('tesseract-eng+ell');
    expect(BILINGUAL_OCR_MODELS).toContain('tesseract-eng');
    expect(BILINGUAL_OCR_MODELS).toContain('tesseract-ell');
    expect(BILINGUAL_OCR_MODELS).toContain('trocr-handwritten');
  });

  it('scores repaired Greek higher than spaced-glyph noise', () => {
    const noisy = scoreBilingualOcrText(SPACED_INCOME_DISTRIBUTION);
    const repaired = scoreBilingualOcrText(normalizeBilingualExtractedText(SPACED_INCOME_DISTRIBUTION));
    expect(repaired).toBeGreaterThan(noisy);
  });

  it('merges parallel tesseract outputs via post-process candidates', () => {
    const merged = mergeParallelTesseractOutputs([
      { modelId: 'tesseract-eng', text: 'Comparative advantage in trade' },
      { modelId: 'tesseract-ell', text: 'Συγκριτικό πλεονέκτημα' },
      { modelId: 'tesseract-eng+ell', text: GLUED_TWO_SPACES_LECTURE },
    ]);
    expect(merged.text.length).toBeGreaterThan(10);
    expect(merged.modelsUsed.length).toBeGreaterThan(1);
  });

  it('builds post-process variants from a raw OCR line', () => {
    const candidates = buildPostProcessCandidates(GLUED_TWO_SPACES_LECTURE, 'tesseract-eng+ell');
    expect(candidates.some((c) => c.modelId === 'greek-document-repair')).toBe(true);
    expect(candidates.some((c) => c.text.includes('Δύο'))).toBe(true);
  });

  it('repairs mixed Greek–Latin script boundaries', () => {
    expect(repairMixedScriptBoundaries('Tradeεμπόριο')).toMatch(/Trade εμπόριο/);
  });

  it('picks highest-scoring candidate in merge', () => {
    const merged = mergeBilingualOcrCandidates([
      { modelId: 'tesseract-eng', text: 'a', score: 1 },
      { modelId: 'tesseract-ell', text: 'Η ελληνική οικονομία αναπτύσσεται.', score: 50 },
    ]);
    expect(merged.winningModel).toBe('tesseract-ell');
  });
});
