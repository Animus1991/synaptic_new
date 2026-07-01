import { describe, it, expect, beforeEach } from 'vitest';
import { createLocalEmbedder, hashText, isEmbeddingRuntime, resetLocalEmbedder } from './localEmbedder';

describe('localEmbedder', () => {
  beforeEach(() => {
    resetLocalEmbedder();
  });

  it('returns null outside a browser/worker runtime', async () => {
    const embedder = createLocalEmbedder();
    expect(isEmbeddingRuntime()).toBe(false);
    expect(embedder.ready).toBe(false);
    const result = await embedder.embed(['hello', 'world']);
    expect(result).toBeNull();
  });

  it('produces deterministic content hashes', async () => {
    const h1 = await hashText('same text');
    const h2 = await hashText('same text');
    const h3 = await hashText('different text');
    expect(h1).toHaveLength(16);
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });
});
