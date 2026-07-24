import { createHash } from 'node:crypto';
import pg from 'pg';
import { config } from '../config';

const { Pool } = pg;

export type ThumbnailRecord = {
  accountId: string;
  fileId: string;
  contentType: string;
  width: number;
  height: number;
  pageIndex: number;
  etag: string;
  bytes: Buffer;
};

const memory = new Map<string, ThumbnailRecord>();

function rowKey(accountId: string, fileId: string): string {
  return `${accountId}/${fileId}`;
}

export function computeThumbnailEtag(bytes: Buffer): string {
  return `"${createHash('sha256').update(bytes).digest('hex').slice(0, 16)}"`;
}

let pool: pg.Pool | null = null;

function getPool(): pg.Pool | null {
  if (!config.databaseUrl?.trim()) return null;
  if (!pool) pool = new Pool({ connectionString: config.databaseUrl.trim() });
  return pool;
}

function rowToRecord(row: {
  account_id: string;
  file_id: string;
  content_type: string;
  width: number;
  height: number;
  page_index: number;
  etag: string;
  bytes: Buffer;
}): ThumbnailRecord {
  return {
    accountId: row.account_id,
    fileId: row.file_id,
    contentType: row.content_type,
    width: row.width,
    height: row.height,
    pageIndex: row.page_index,
    etag: row.etag,
    bytes: row.bytes,
  };
}

export async function putThumbnail(record: ThumbnailRecord): Promise<void> {
  memory.set(rowKey(record.accountId, record.fileId), record);
  const p = getPool();
  if (!p) return;
  await p.query(
    `INSERT INTO library_thumbnails
      (account_id, file_id, content_type, width, height, page_index, etag, bytes, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (account_id, file_id) DO UPDATE SET
       content_type = EXCLUDED.content_type,
       width = EXCLUDED.width,
       height = EXCLUDED.height,
       page_index = EXCLUDED.page_index,
       etag = EXCLUDED.etag,
       bytes = EXCLUDED.bytes,
       updated_at = NOW()`,
    [
      record.accountId,
      record.fileId,
      record.contentType,
      record.width,
      record.height,
      record.pageIndex,
      record.etag,
      record.bytes,
    ],
  );
}

export async function getThumbnail(accountId: string, fileId: string): Promise<ThumbnailRecord | null> {
  const p = getPool();
  if (p) {
    const res = await p.query<{
      account_id: string;
      file_id: string;
      content_type: string;
      width: number;
      height: number;
      page_index: number;
      etag: string;
      bytes: Buffer;
    }>(
      `SELECT account_id, file_id, content_type, width, height, page_index, etag, bytes
       FROM library_thumbnails WHERE account_id = $1 AND file_id = $2`,
      [accountId, fileId],
    );
    if ((res.rowCount ?? 0) > 0) return rowToRecord(res.rows[0]!);
  }
  return memory.get(rowKey(accountId, fileId)) ?? null;
}

export async function deleteThumbnail(accountId: string, fileId: string): Promise<void> {
  memory.delete(rowKey(accountId, fileId));
  const p = getPool();
  if (!p) return;
  await p.query('DELETE FROM library_thumbnails WHERE account_id = $1 AND file_id = $2', [
    accountId,
    fileId,
  ]);
}

export async function deleteThumbnailsForAccount(accountId: string): Promise<void> {
  for (const key of [...memory.keys()]) {
    if (key.startsWith(`${accountId}/`)) memory.delete(key);
  }
  const p = getPool();
  if (!p) return;
  await p.query('DELETE FROM library_thumbnails WHERE account_id = $1', [accountId]);
}

export function resetThumbnailStoreForTests(): void {
  memory.clear();
}
