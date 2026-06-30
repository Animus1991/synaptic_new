import pg from 'pg';
import { config } from '../config';
import { cosine } from '../lib/embeddings';
import type { ServerSourceChunk } from '../lib/chunkText';

const { Pool } = pg;

export type IndexedChunk = ServerSourceChunk & {
  courseId?: string;
  embedding?: number[];
};

export type VectorSearchHit = {
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

export interface VectorChunkStore {
  replaceAccountChunks(accountId: string, chunks: IndexedChunk[]): Promise<void>;
  search(
    accountId: string,
    queryEmbedding: number[],
    opts: { topK: number; courseId?: string; queryText?: string },
  ): Promise<VectorSearchHit[]>;
  count(accountId: string): Promise<number>;
}

function lexicalScore(query: string, text: string): number {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  if (terms.length === 0) return 0;
  const hay = text.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (hay.includes(term)) hits += 1;
  }
  return hits / terms.length;
}

class MemoryVectorChunkStore implements VectorChunkStore {
  private rows = new Map<string, IndexedChunk[]>();

  clearForTests(): void {
    this.rows.clear();
  }

  async replaceAccountChunks(accountId: string, chunks: IndexedChunk[]): Promise<void> {
    this.rows.set(accountId, chunks);
  }

  async search(
    accountId: string,
    queryEmbedding: number[],
    opts: { topK: number; courseId?: string; queryText?: string },
  ): Promise<VectorSearchHit[]> {
    let pool = this.rows.get(accountId) ?? [];
    if (opts.courseId) {
      pool = pool.filter((c) => !c.courseId || c.courseId === opts.courseId);
    }
    const scored = pool.map((chunk) => {
      const sem = chunk.embedding ? cosine(queryEmbedding, chunk.embedding) : 0;
      const lex = opts.queryText ? lexicalScore(opts.queryText, chunk.text) : 0;
      const score = chunk.embedding ? 0.5 * sem + 0.5 * lex : lex;
      return { chunk, score };
    });
    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, opts.topK)
      .map(({ chunk, score }) => ({
        id: chunk.id,
        text: chunk.text,
        score,
        fileId: chunk.fileId,
        fileName: chunk.fileName,
        charStart: chunk.charStart,
        charEnd: chunk.charEnd,
        heading: chunk.heading,
        page: chunk.page,
      }));
  }

  async count(accountId: string): Promise<number> {
    return (this.rows.get(accountId) ?? []).length;
  }
}

class PostgresVectorChunkStore implements VectorChunkStore {
  private pool: pg.Pool;
  private pgvectorReady: boolean | null = null;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  private async ensurePgvector(): Promise<boolean> {
    if (this.pgvectorReady !== null) return this.pgvectorReady;
    try {
      await this.pool.query('SELECT 1 FROM library_chunks LIMIT 1');
      this.pgvectorReady = true;
    } catch {
      this.pgvectorReady = false;
    }
    return this.pgvectorReady;
  }

  async replaceAccountChunks(accountId: string, chunks: IndexedChunk[]): Promise<void> {
    if (!(await this.ensurePgvector())) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM library_chunks WHERE account_id = $1', [accountId]);
      for (const chunk of chunks) {
        const embeddingSql = chunk.embedding
          ? `[${chunk.embedding.join(',')}]`
          : null;
        await client.query(
          `INSERT INTO library_chunks (
            account_id, chunk_id, file_id, file_name, course_id, content_hash,
            text, heading, page, char_start, char_end, embedding, tsv, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12::vector, to_tsvector('simple', $7), NOW()
          )`,
          [
            accountId,
            chunk.id,
            chunk.fileId,
            chunk.fileName,
            chunk.courseId ?? null,
            chunk.contentHash,
            chunk.text,
            chunk.heading ?? null,
            chunk.page ?? null,
            chunk.charStart,
            chunk.charEnd,
            embeddingSql,
          ],
        );
      }
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }

  async search(
    accountId: string,
    queryEmbedding: number[],
    opts: { topK: number; courseId?: string; queryText?: string },
  ): Promise<VectorSearchHit[]> {
    if (!(await this.ensurePgvector())) return [];
    const vec = `[${queryEmbedding.join(',')}]`;
    const queryText = opts.queryText ?? '';
    if (opts.courseId) {
      const res = await this.pool.query<{
        chunk_id: string;
        text: string;
        file_id: string;
        file_name: string;
        char_start: number;
        char_end: number;
        heading: string | null;
        page: number | null;
        sem_score: number;
        lex_score: number;
      }>(
        `SELECT chunk_id, text, file_id, file_name, char_start, char_end, heading, page,
                1 - (embedding <=> $2::vector) AS sem_score,
                ts_rank(tsv, plainto_tsquery('simple', $5)) AS lex_score
         FROM library_chunks
         WHERE account_id = $1 AND embedding IS NOT NULL
           AND (course_id IS NULL OR course_id = $4)
         ORDER BY (0.5 * (1 - (embedding <=> $2::vector)) + 0.5 * ts_rank(tsv, plainto_tsquery('simple', $5))) DESC
         LIMIT $3`,
        [accountId, vec, opts.topK, opts.courseId, queryText],
      );
      return res.rows.map((row) => ({
        id: row.chunk_id,
        text: row.text,
        score: 0.5 * Number(row.sem_score) + 0.5 * Number(row.lex_score),
        fileId: row.file_id,
        fileName: row.file_name,
        charStart: row.char_start,
        charEnd: row.char_end,
        heading: row.heading ?? undefined,
        page: row.page ?? undefined,
      }));
    }

    const res = await this.pool.query<{
      chunk_id: string;
      text: string;
      file_id: string;
      file_name: string;
      char_start: number;
      char_end: number;
      heading: string | null;
      page: number | null;
      sem_score: number;
      lex_score: number;
    }>(
      `SELECT chunk_id, text, file_id, file_name, char_start, char_end, heading, page,
              1 - (embedding <=> $2::vector) AS sem_score,
              ts_rank(tsv, plainto_tsquery('simple', $4)) AS lex_score
       FROM library_chunks
       WHERE account_id = $1 AND embedding IS NOT NULL
       ORDER BY (0.5 * (1 - (embedding <=> $2::vector)) + 0.5 * ts_rank(tsv, plainto_tsquery('simple', $4))) DESC
       LIMIT $3`,
      [accountId, vec, opts.topK, queryText],
    );
    return res.rows.map((row) => ({
      id: row.chunk_id,
      text: row.text,
      score: 0.5 * Number(row.sem_score) + 0.5 * Number(row.lex_score),
      fileId: row.file_id,
      fileName: row.file_name,
      charStart: row.char_start,
      charEnd: row.char_end,
      heading: row.heading ?? undefined,
      page: row.page ?? undefined,
    }));
  }

  async count(accountId: string): Promise<number> {
    if (!(await this.ensurePgvector())) return 0;
    const res = await this.pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM library_chunks WHERE account_id = $1',
      [accountId],
    );
    return Number(res.rows[0]?.count ?? 0);
  }
}

const memoryStore = new MemoryVectorChunkStore();
let postgresStore: PostgresVectorChunkStore | null = null;

export function getVectorChunkStore(): VectorChunkStore {
  if (config.databaseUrl?.trim()) {
    postgresStore ??= new PostgresVectorChunkStore(config.databaseUrl.trim());
    return {
      replaceAccountChunks: async (accountId, chunks) => {
        await memoryStore.replaceAccountChunks(accountId, chunks);
        await postgresStore!.replaceAccountChunks(accountId, chunks);
      },
      search: async (accountId, queryEmbedding, opts) => {
        const pgHits = await postgresStore!.search(accountId, queryEmbedding, opts);
        if (pgHits.length > 0) return pgHits;
        return memoryStore.search(accountId, queryEmbedding, opts);
      },
      count: async (accountId) => {
        const pgCount = await postgresStore!.count(accountId);
        if (pgCount > 0) return pgCount;
        return memoryStore.count(accountId);
      },
    };
  }
  return memoryStore;
}

/** Test helper */
export function resetVectorChunkStoreForTests(): void {
  memoryStore.clearForTests();
}
