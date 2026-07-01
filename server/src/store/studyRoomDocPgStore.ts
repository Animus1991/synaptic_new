import { Pool } from 'pg';

export function createStudyRoomDocPgRepo(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });

  return {
    async loadDoc(documentName: string): Promise<Uint8Array | null> {
      const res = await pool.query<{ state: Buffer }>(
        'SELECT state FROM study_room_docs WHERE document_name = $1',
        [documentName],
      );
      const row = res.rows[0];
      if (!row?.state) return null;
      return new Uint8Array(row.state);
    },

    async storeDoc(documentName: string, state: Uint8Array): Promise<void> {
      await pool.query(
        `INSERT INTO study_room_docs (document_name, state, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (document_name) DO UPDATE SET
           state = EXCLUDED.state,
           updated_at = NOW()`,
        [documentName, Buffer.from(state)],
      );
    },
  };
}

export function persistStudyRoomDoc(
  databaseUrl: string | undefined,
  documentName: string,
  state: Uint8Array,
): void {
  if (!databaseUrl?.trim()) return;
  void createStudyRoomDocPgRepo(databaseUrl).storeDoc(documentName, state).catch((err) => {
    console.warn('[study-room-docs] persist failed', err);
  });
}
