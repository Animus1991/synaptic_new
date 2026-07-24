import { describe, expect, it } from 'vitest';
import { EXPECTED_REPAIRS, SPACED_ABSOLUTE_ADVANTAGE } from './greekOcrFixtures';
import { VARIAN_CH31_REPAIRS } from './varianCh31Fixtures';
import { runDocumentTextPipeline } from './documentTextPipeline';
import { normalizeDocumentText } from './textSegmentation';

describe('documentTextPipeline (Wave 8B-β)', () => {
  it('repairs all greekOcrFixtures regression vectors', () => {
    for (const { input, mustContain, mustNotContain = [] } of [...EXPECTED_REPAIRS, ...VARIAN_CH31_REPAIRS]) {
      const { text: out } = runDocumentTextPipeline(input);
      for (const frag of mustContain) {
        expect(out, `input=${input.slice(0, 40)}`).toContain(frag);
      }
      for (const bad of mustNotContain) {
        expect(out, `input=${input.slice(0, 40)}`).not.toContain(bad);
      }
    }
  });

  it('normalizeDocumentText delegates to full pipeline', () => {
    const out = normalizeDocumentText(SPACED_ABSOLUTE_ADVANTAGE);
    expect(out).toContain('Απόλυτα');
    expect(out).toContain('πλεονεκτήματα');
  });

  it('improves hygiene score after repair', () => {
    const raw = SPACED_ABSOLUTE_ADVANTAGE;
    const { hygiene } = runDocumentTextPipeline(raw);
    expect(hygiene.hygieneScore).toBeGreaterThan(50);
    expect(hygiene.spacedGlyphRatio).toBeLessThan(0.15);
  });
});
