import { describe, expect, it } from 'vitest';
import { runDocumentTextPipeline } from './documentTextPipeline';
import { VARIAN_CH31_REPAIRS } from './varianCh31Fixtures';

describe('Varian Ch31 OCR repair (Wave 8B-β)', () => {
  it.each(VARIAN_CH31_REPAIRS)('repairs: $input', ({ input, mustContain, mustNotContain = [] }) => {
    const { text: out } = runDocumentTextPipeline(input);
    for (const frag of mustContain) {
      expect(out, `expected "${frag}" in "${out}"`).toContain(frag);
    }
    for (const bad of mustNotContain) {
      expect(out, `unexpected "${bad}" in "${out}"`).not.toContain(bad);
    }
  });
});
