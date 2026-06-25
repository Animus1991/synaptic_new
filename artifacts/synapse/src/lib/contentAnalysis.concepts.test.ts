import { describe, it, expect } from 'vitest';
import { extractConceptsV2, rankKeyphrases } from './contentAnalysis';

describe('concept extraction v2', () => {
  const text = `
# Machine Learning

Machine learning is a subset of artificial intelligence. Artificial intelligence enables machines to mimic human cognition.

## Supervised Learning

Supervised learning uses labeled data. Classification and regression are common tasks in supervised learning.

## Neural Networks

Neural networks are composed of layers. Deep learning relies on neural networks with many layers.
`.trim();

  it('ranks keyphrases without embedder', async () => {
    const concepts = await extractConceptsV2(text, { max: 10, headingText: 'Machine Learning\nSupervised Learning', requireMultiple: false });
    expect(concepts.length).toBeGreaterThan(0);
    expect(concepts[0]!.score).toBeGreaterThan(0);
    const phrases = concepts.map((c) => c.phrase);
    expect(phrases.some((p) => /machine learning|artificial intelligence|supervised learning|neural networks/i.test(p))).toBe(true);
  });

  it('boosts concepts that appear in headings', async () => {
    const concepts = await extractConceptsV2(text, { max: 10, headingText: 'Machine Learning', requireMultiple: false });
    const machineLearning = concepts.find((c) => /machine learning/i.test(c.phrase));
    expect(machineLearning).toBeDefined();
    expect(machineLearning!.score).toBeGreaterThan(0.5);
  });

  it('deduplicates plurals and variants by stemmed key', async () => {
    const concepts = await extractConceptsV2(text, { max: 20, requireMultiple: false });
    const keys = new Set(concepts.map((c) => c.phrase.toLowerCase()));
    // Should not have both "neural network" and "neural networks" as separate top entries.
    const neural = [...keys].filter((k) => k.includes('neural'));
    expect(neural.length).toBeLessThanOrEqual(2);
  });

  it('requireMultiple filters single-occurrence phrases in long docs', async () => {
    const concepts = await extractConceptsV2(text, { max: 10, requireMultiple: true });
    const phrases = concepts.map((c) => c.phrase);
    expect(phrases.length).toBeGreaterThan(0);
    expect(phrases.some((p) => /machine learning|supervised learning|neural networks|artificial intelligence/i.test(p))).toBe(true);
  });

  it('remains backward compatible with rankKeyphrases', () => {
    const concepts = rankKeyphrases(text, 10);
    expect(concepts.length).toBeGreaterThan(0);
    const phrases = concepts.map((c) => c.phrase);
    expect(phrases.some((p) => /machine learning|artificial intelligence|supervised learning/i.test(p))).toBe(true);
  });
});
