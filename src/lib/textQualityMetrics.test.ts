import { describe, expect, it } from 'vitest';
import { SPACED_ABSOLUTE_ADVANTAGE } from './greekOcrFixtures';
import { analyzeTextHygiene, hygieneFlagLabel, textLayerLooksCorrupted } from './textQualityMetrics';
import { runDocumentTextPipeline } from './documentTextPipeline';

describe('textQualityMetrics', () => {
  it('flags spaced-glyph corruption before repair', () => {
    const h = analyzeTextHygiene(SPACED_ABSOLUTE_ADVANTAGE);
    expect(h.corruptionScore).toBeGreaterThan(30);
    expect(h.flags).toContain('spaced-glyphs');
    expect(textLayerLooksCorrupted(SPACED_ABSOLUTE_ADVANTAGE)).toBe(true);
  });

  it('reports lower corruption after pipeline', () => {
    const repaired = runDocumentTextPipeline(SPACED_ABSOLUTE_ADVANTAGE).text;
    const after = analyzeTextHygiene(repaired);
    expect(after.corruptionScore).toBeLessThan(analyzeTextHygiene(SPACED_ABSOLUTE_ADVANTAGE).corruptionScore);
  });

  it('labels hygiene flags in EN and EL', () => {
    expect(hygieneFlagLabel('spaced-glyphs', 'en')).toBe('Spaced glyphs');
    expect(hygieneFlagLabel('spaced-glyphs', 'el')).toContain('γράμματα');
    expect(hygieneFlagLabel('unknown-flag', 'en')).toBe('unknown flag');
  });
});
