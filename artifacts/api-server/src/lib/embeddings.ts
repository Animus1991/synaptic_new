import { upstreamFetch } from './upstream';

export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return [];
  const upstream = await upstreamFetch('/embeddings', {
    model: 'text-embedding-3-small',
    input: texts.map((t) => t.slice(0, 2000)),
  });
  if (!upstream.ok) return null;
  const data = (await upstream.json()) as { data?: { embedding?: number[] }[] };
  const vectors = data.data?.map((d) => d.embedding ?? []) ?? [];
  if (vectors.length !== texts.length) return null;
  return vectors;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d > 0 ? dot / d : 0;
}
