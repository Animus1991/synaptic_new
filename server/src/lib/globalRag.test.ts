import { describe, expect, it, beforeEach, vi } from 'vitest';
import { chunkText } from './chunkText';

const embedCalls: string[][] = [];

vi.mock('./embeddings', () => ({
  embedTexts: vi.fn(async (texts: string[]) => {
    embedCalls.push([...texts]);
    return texts.map((t) => {
      if (t.toLowerCase().includes('elasticity')) return [1, 0, 0];
      if (t.toLowerCase().includes('supply')) return [0, 1, 0];
      return [0.5, 0.5, 0];
    });
  }),
  cosine: (a: number[], b: number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!,
}));

import { getVectorChunkStore, resetVectorChunkStoreForTests } from '../store/vectorChunkStore';
import { indexLibraryVectors, indexTranscriptText } from './libraryVectorIndex';
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

describe('incremental vector index', () => {
  beforeEach(() => {
    resetVectorChunkStoreForTests();
    embedCalls.length = 0;
  });

  it('reuses embeddings when content_hash is unchanged', async () => {
    const library = {
      uploadedFiles: [
        {
          id: 'f1',
          name: 'micro.pdf',
          extractedText:
            'Price elasticity of demand measures how quantity demanded responds to price changes across markets and time.\n\n' +
            'Elastic goods see larger percentage shifts than inelastic goods when prices move.',
          status: 'analyzed',
        },
      ],
      glossaryEntries: [],
      generatedCourses: [],
      updatedAt: new Date().toISOString(),
    };

    const first = await indexLibraryVectors('acct1', library);
    expect(first.embedded).toBeGreaterThan(0);
    expect(first.reused).toBe(0);
    const callsAfterFirst = embedCalls.length;

    const second = await indexLibraryVectors('acct1', library);
    expect(second.reused).toBe(first.indexedChunks);
    expect(second.embedded).toBe(0);
    expect(embedCalls.length).toBe(callsAfterFirst);
  });

  it('indexes transcript text for a single file without removing other files', async () => {
    await getVectorChunkStore().replaceAccountChunks('acct1', [
      {
        id: 'doc#0',
        fileId: 'doc',
        fileName: 'notes.pdf',
        index: 0,
        text: 'Supply shocks shift equilibrium prices.',
        charStart: 0,
        charEnd: 40,
        contentHash: 'def',
        embedding: [0, 1, 0],
      },
    ]);

    await indexTranscriptText('acct1', {
      id: 'audio1',
      name: 'lecture.mp3',
      extractedText: 'Elasticity measures responsiveness.\n\nPrice changes affect quantity demanded.\n\n'.repeat(8),
    });

    const store = getVectorChunkStore();
    expect(await store.count('acct1')).toBeGreaterThan(1);

    const { hits: supplyHits } = await searchGlobalLibrary('acct1', 'supply shocks', { topK: 2 });
    expect(supplyHits.some((h) => h.fileName === 'notes.pdf')).toBe(true);

    const { hits: audioHits } = await searchGlobalLibrary('acct1', 'elasticity responsiveness', { topK: 2 });
    expect(audioHits.some((h) => h.fileName === 'lecture.mp3')).toBe(true);
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
