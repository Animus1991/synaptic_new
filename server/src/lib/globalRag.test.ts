import { describe, expect, it, beforeEach, vi } from 'vitest';
import { chunkText } from './chunkText';

vi.mock('./embeddings', () => ({
  embedTexts: vi.fn(async (texts: string[]) =>
    texts.map((t) => {
      if (t.toLowerCase().includes('elasticity')) return [1, 0, 0];
      if (t.toLowerCase().includes('supply')) return [0, 1, 0];
      return [0.5, 0.5, 0];
    }),
  ),
  cosine: (a: number[], b: number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!,
}));

import { getVectorChunkStore, resetVectorChunkStoreForTests } from '../store/vectorChunkStore';
import { searchGlobalLibrary } from './ragServer';

describe('chunkText (server)', () => {
  it('splits long notes into offset-tracked chunks', () => {
    const text = 'Elasticity measures responsiveness.\n\nPrice changes affect quantity demanded.\n\n'.repeat(20);
    const chunks = chunkText(text, 'f1', 'notes.txt');
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]!.fileId).toBe('f1');
    expect(chunks[0]!.contentHash).toHaveLength(16);
  });
});

describe('global RAG search', () => {
  beforeEach(() => {
    resetVectorChunkStoreForTests();
  });

  it('returns semantic hits for indexed account chunks', async () => {
    await getVectorChunkStore().replaceAccountChunks('acct1', [
      {
        id: 'f1#0',
        fileId: 'f1',
        fileName: 'micro.pdf',
        index: 0,
        text: 'Price elasticity of demand measures responsiveness.',
        charStart: 0,
        charEnd: 48,
        contentHash: 'abc',
        embedding: [1, 0, 0],
      },
      {
        id: 'f2#0',
        fileId: 'f2',
        fileName: 'macro.pdf',
        index: 0,
        text: 'Supply shocks shift equilibrium prices.',
        charStart: 0,
        charEnd: 40,
        contentHash: 'def',
        embedding: [0, 1, 0],
      },
    ]);

    const { hits } = await searchGlobalLibrary('acct1', 'elasticity of demand', { topK: 2 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]!.fileName).toBe('micro.pdf');
  });
});
