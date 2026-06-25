/**
 * Offline local embedder for Synapse.
 *
 * Transformers.js is not available in this environment, so all embedding
 * requests return null and callers fall back to lexical (BM25) retrieval.
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
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return (hash >>> 0).toString(16).padStart(16, '0');
}

/** Create a stub embedder that always returns null (falls back to lexical retrieval). */
export function createLocalEmbedder(): LocalEmbedder {
  return {
    ready: false,
    async embed(_texts: string[]): Promise<number[][] | null> {
      return null;
    },
  };
}

/** Reset the model cache and loader. Useful for tests. */
export function resetLocalEmbedder(): void {
  // no-op in stub mode
}

/** Default singleton embedder for the application. */
export const localEmbedder = createLocalEmbedder();
