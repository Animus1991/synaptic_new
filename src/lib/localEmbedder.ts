/**
 * Offline local embedder for Synapse.
 *
 * Runs a quantized sentence-transformer model via Transformers.js
 * (dynamic import so it is only loaded when embeddings are requested).
 * Embeddings are cached by a stable content hash so repeated calls over the
 * same corpus are deterministic and fast.
 *
 * The model loads once and is shared across the application. Hybrid RAG
 * (`retrieveForQueryHybrid`) no longer uses this embedder — server pgvector
 * (1536d) is the canonical retrieval space when a proxy is configured.
 * If the model fails to load, the embedder returns `null`.
 */

export interface LocalEmbedder {
  embed(texts: string[]): Promise<number[][] | null>;
  ready: boolean;
}

/** Stable content hash for the embedding cache (browser + Web Worker compatible). */
export async function hashText(text: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 16);
  }
  // Synchronous fallback for environments without Web Crypto (e.g. some test runners).
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return (hash >>> 0).toString(16).padStart(16, '0');
}

interface Pipeline {
  (texts: string[], options: { pooling: 'mean'; normalize: true }): Promise<{ data: number[]; dims: number[] }>;
}

const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
const MAX_BATCH = 32;

let pipelinePromise: Promise<Pipeline | null> | null = null;
const cache = new Map<string, number[]>();

async function loadPipeline(): Promise<Pipeline | null> {
  if (typeof window === 'undefined') {
    // Transformers.js expects Web APIs; skip in Node/Vitest.
    return null;
  }
  try {
    const { pipeline } = await import('@huggingface/transformers');
    return (await pipeline('feature-extraction', MODEL_NAME, {
      dtype: 'q8',
    })) as Pipeline;
  } catch (err) {
    console.warn('[localEmbedder] failed to load model:', (err as Error).message);
    return null;
  }
}

function getPipeline(): Promise<Pipeline | null> {
  if (!pipelinePromise) pipelinePromise = loadPipeline();
  return pipelinePromise;
}

function flattenEmbedding(data: number[], dims: number[]): number[] {
  // The pipeline returns a flat TypedArray; reshape if needed.
  if (dims.length === 1) return Array.from(data);
  const expected = dims.reduce((a, b) => a * b, 1);
  if (expected !== data.length) return Array.from(data);
  return Array.from(data);
}

/** Create a deterministic, offline embedder backed by Transformers.js. */
export function createLocalEmbedder(): LocalEmbedder {
  return {
    ready: typeof window !== 'undefined',
    async embed(texts: string[]): Promise<number[][] | null> {
      if (texts.length === 0) return [];
      const pipe = await getPipeline();
      if (!pipe) return null;

      const out: number[][] = [];
      const uncached: { text: string; index: number }[] = [];

      for (let i = 0; i < texts.length; i++) {
        const text = texts[i]!;
        const h = await hashText(text);
        const cached = cache.get(h);
        if (cached) {
          out[i] = cached;
        } else {
          uncached.push({ text, index: i });
        }
      }

      for (let i = 0; i < uncached.length; i += MAX_BATCH) {
        const batch = uncached.slice(i, i + MAX_BATCH);
        const batchTexts = batch.map((b) => b.text);
        const result = await pipe(batchTexts, { pooling: 'mean', normalize: true });
        const flat = flattenEmbedding(Array.from(result.data), result.dims);
        const dim = flat.length / batchTexts.length;
        for (let j = 0; j < batch.length; j++) {
          const embedding = flat.slice(j * dim, (j + 1) * dim);
          const h = await hashText(batchTexts[j]!);
          cache.set(h, embedding);
          out[batch[j]!.index] = embedding;
        }
      }

      return out;
    },
  };
}

/** Reset the model cache and loader. Useful for tests. */
export function resetLocalEmbedder(): void {
  pipelinePromise = null;
  cache.clear();
}

/** Default singleton embedder for the application. */
export const localEmbedder = createLocalEmbedder();
