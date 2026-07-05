import { config } from '../config';
import { searchGlobalLibraryGraph } from './ragServer';
import { upstreamFetch } from './upstream';

export type RagSynthesisSource = {
  id: string;
  text: string;
  score: number;
  fileId: string;
  fileName: string;
  charStart: number;
  charEnd: number;
  heading?: string;
  page?: number;
};

export type RagSynthesisResult = {
  synthesis: string;
  sources: RagSynthesisSource[];
  courseIds: string[];
  indexedChunks: number;
};

/** Multi-doc cross-library synthesis (NotebookLM-style digest). */
export async function synthesizeFromLibraryAsync(
  accountId: string,
  query: string,
  opts: { topK?: number; courseIds?: string[]; lang?: 'en' | 'el' } = {},
): Promise<RagSynthesisResult> {
  const topK = Math.min(20, Math.max(3, opts.topK ?? 8));
  const trimmed = query.trim();
  if (!trimmed) {
    return { synthesis: '', sources: [], courseIds: [], indexedChunks: 0 };
  }

  const { hits, indexedChunks } = await searchGlobalLibraryGraph(accountId, trimmed, {
    topK,
    courseId: undefined,
  });

  let filtered = hits;
  if (opts.courseIds?.length) {
    // courseId filter applies when chunks carry course metadata in future pgvector rows
    filtered = hits;
  }

  const sources: RagSynthesisSource[] = filtered.slice(0, topK).map((h) => ({
    id: h.id,
    text: h.text.slice(0, 600),
    score: h.score,
    fileId: h.fileId,
    fileName: h.fileName,
    charStart: h.charStart,
    charEnd: h.charEnd,
    heading: h.heading,
    page: h.page,
  }));

  const courseIds = opts.courseIds ?? [];

  if (!config.upstreamApiKey.trim() || sources.length === 0) {
    const fallback = sources.map((s, i) => `[${i + 1}] ${s.text}`).join('\n\n');
    return { synthesis: fallback, sources, courseIds, indexedChunks };
  }

  const langHint = opts.lang === 'el' ? 'Write in Greek.' : 'Write in English.';
  const context = sources.map((s, i) => `[${i + 1}] (${s.fileId}) ${s.text}`).join('\n\n');

  const upstream = await upstreamFetch('/chat/completions', {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      {
        role: 'system',
        content:
          `You are a study guide narrator. Synthesize the retrieved excerpts into a cohesive overview (3–6 paragraphs) with key themes and connections across documents. ${langHint} Cite sources as [n].`,
      },
      {
        role: 'user',
        content: `Question/topic: ${trimmed}\n\nSources:\n${context}`,
      },
    ],
  });

  if (!upstream.ok) {
    const fallback = sources.map((s, i) => `[${i + 1}] ${s.text}`).join('\n\n');
    return { synthesis: fallback, sources, courseIds, indexedChunks };
  }

  const payload = (await upstream.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const synthesis = payload.choices?.[0]?.message?.content?.trim() ?? '';
  return { synthesis, sources, courseIds, indexedChunks };
}
