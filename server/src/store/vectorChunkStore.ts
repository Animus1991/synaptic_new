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

export type ChunkMeta = {
  contentHash: string;
  embedding?: number[];
};

export type SyncResult = {
  upserted: number;
  removed: number;
};

export interface VectorChunkStore {
  replaceAccountChunks(accountId: string, chunks: IndexedChunk[]): Promise<void>;
  syncAccountChunks(
    accountId: string,
    chunks: IndexedChunk[],
    opts: { activeFileIds: string[] },
  ): Promise<SyncResult>;
  syncFileChunks(accountId: string, fileId: string, chunks: IndexedChunk[]): Promise<SyncResult>;
  getChunkMeta(accountId: string): Promise<Map<string, ChunkMeta>>;
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

  async getChunkMeta(accountId: string): Promise<Map<string, ChunkMeta>> {
    const meta = new Map<string, ChunkMeta>();
    for (const row of this.rows.get(accountId) ?? []) {
      meta.set(row.id, { contentHash: row.contentHash, embedding: row.embedding });
    }
    return meta;
  }

  async syncAccountChunks(
    accountId: string,
    chunks: IndexedChunk[],
    opts: { activeFileIds: string[] },
  ): Promise<SyncResult> {
    const activeFiles = new Set(opts.activeFileIds);
    const desiredIds = new Set(chunks.map((c) => c.id));
    const before = this.rows.get(accountId) ?? [];
    const removed = before.filter((c) => !activeFiles.has(c.fileId) || !desiredIds.has(c.id)).length;
    const retained = before.filter(
      (c) => activeFiles.has(c.fileId) && desiredIds.has(c.id) && !chunks.some((n) => n.id === c.id),
    );
    const byId = new Map(retained.map((c) => [c.id, c]));
    for (const chunk of chunks) byId.set(chunk.id, chunk);
    this.rows.set(accountId, [...byId.values()]);
    return { upserted: chunks.length, removed };
  }

  async syncFileChunks(accountId: string, fileId: string, chunks: IndexedChunk[]): Promise<SyncResult> {
    const before = this.rows.get(accountId) ?? [];
    const desiredIds = new Set(chunks.map((c) => c.id));
    const removed = before.filter((c) => c.fileId === fileId && !desiredIds.has(c.id)).length;
    const pool = before.filter((c) => c.fileId !== fileId);
    pool.push(...chunks);
    this.rows.set(accountId, pool);
    return { upserted: chunks.length, removed };
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
    await this.syncAccountChunks(accountId, chunks, {
      activeFileIds: [...new Set(chunks.map((c) => c.fileId))],
    });
  }

  async getChunkMeta(accountId: string): Promise<Map<string, ChunkMeta>> {
    const meta = new Map<string, ChunkMeta>();
    if (!(await this.ensurePgvector())) return meta;
    const res = await this.pool.query<{ chunk_id: string; content_hash: string; embedding: string | null }>(
      `SELECT chunk_id, content_hash, embedding::text AS embedding
       FROM library_chunks WHERE account_id = $1`,
      [accountId],
    );
    for (const row of res.rows) {
      let embedding: number[] | undefined;
      if (row.embedding) {
        embedding = row.embedding
          .replace(/[\[\]]/g, '')
          .split(',')
          .map((n) => Number(n.trim()))
          .filter((n) => Number.isFinite(n));
      }
      meta.set(row.chunk_id, { contentHash: row.content_hash, embedding });
    }
    return meta;
  }

  private async upsertChunk(client: pg.PoolClient, accountId: string, chunk: IndexedChunk): Promise<void> {
    const embeddingSql = chunk.embedding ? `[${chunk.embedding.join(',')}]` : null;
    await client.query(
      `INSERT INTO library_chunks (
        account_id, chunk_id, file_id, file_name, course_id, content_hash,
        text, heading, page, char_start, char_end, embedding, tsv, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12::vector, to_tsvector('simple', $7), NOW()
      )
      ON CONFLICT (account_id, chunk_id) DO UPDATE SET
        file_id = EXCLUDED.file_id,
        file_name = EXCLUDED.file_name,
        course_id = EXCLUDED.course_id,
        content_hash = EXCLUDED.content_hash,
        text = EXCLUDED.text,
        heading = EXCLUDED.heading,
        page = EXCLUDED.page,
        char_start = EXCLUDED.char_start,
        char_end = EXCLUDED.char_end,
        embedding = EXCLUDED.embedding,
        tsv = EXCLUDED.tsv,
        updated_at = NOW()`,
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

  async syncAccountChunks(
    accountId: string,
    chunks: IndexedChunk[],
    opts: { activeFileIds: string[] },
  ): Promise<SyncResult> {
    if (!(await this.ensurePgvector())) return { upserted: 0, removed: 0 };
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const del = await client.query<{ count: string }>(
        `WITH deleted AS (
          DELETE FROM library_chunks
          WHERE account_id = $1
            AND (
              NOT (file_id = ANY($2::text[]))
              OR NOT (chunk_id = ANY($3::text[]))
            )
          RETURNING 1
        ) SELECT COUNT(*)::text AS count FROM deleted`,
        [accountId, opts.activeFileIds, chunks.map((c) => c.id)],
      );
      const removed = Number(del.rows[0]?.count ?? 0);
      for (const chunk of chunks) {
        await this.upsertChunk(client, accountId, chunk);
      }
      await client.query('COMMIT');
      return { upserted: chunks.length, removed };
    } catch {
      await client.query('ROLLBACK');
      return { upserted: 0, removed: 0 };
    } finally {
      client.release();
    }
  }

  async syncFileChunks(accountId: string, fileId: string, chunks: IndexedChunk[]): Promise<SyncResult> {
    if (!(await this.ensurePgvector())) return { upserted: 0, removed: 0 };
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const del = await client.query<{ count: string }>(
        `WITH deleted AS (
          DELETE FROM library_chunks
          WHERE account_id = $1 AND file_id = $2
            AND NOT (chunk_id = ANY($3::text[]))
          RETURNING 1
        ) SELECT COUNT(*)::text AS count FROM deleted`,
        [accountId, fileId, chunks.map((c) => c.id)],
      );
      const removed = Number(del.rows[0]?.count ?? 0);
      for (const chunk of chunks) {
        await this.upsertChunk(client, accountId, chunk);
      }
      await client.query('COMMIT');
      return { upserted: chunks.length, removed };
    } catch {
      await client.query('ROLLBACK');
      return { upserted: 0, removed: 0 };
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
      syncAccountChunks: async (accountId, chunks, opts) => {
        await memoryStore.syncAccountChunks(accountId, chunks, opts);
        return postgresStore!.syncAccountChunks(accountId, chunks, opts);
      },
      syncFileChunks: async (accountId, fileId, chunks) => {
        await memoryStore.syncFileChunks(accountId, fileId, chunks);
        return postgresStore!.syncFileChunks(accountId, fileId, chunks);
      },
      getChunkMeta: async (accountId) => {
        const pgMeta = await postgresStore!.getChunkMeta(accountId);
        if (pgMeta.size > 0) return pgMeta;
        return memoryStore.getChunkMeta(accountId);
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
