import { Pool } from 'pg';
import {
  parseCoReadingHub,
  type CoReadingHubStore,
} from '../lib/coReadingHubMerge';

export function createCoReadingPgRepo(databaseUrl: string | undefined) {
  if (!databaseUrl?.trim()) return null;
  const pool = new Pool({ connectionString: databaseUrl.trim() });

  return {
    async get(roomId: string): Promise<CoReadingHubStore | null> {
      const res = await pool.query<{ payload: unknown }>(
        'SELECT payload FROM study_room_coreading WHERE room_id = $1',
        [roomId],
      );
      if (res.rowCount === 0) return null;
      return parseCoReadingHub(res.rows[0]!.payload, roomId);
    },

    async upsert(hub: CoReadingHubStore): Promise<void> {
      await pool.query(
        `INSERT INTO study_room_coreading (room_id, payload, updated_at)
         VALUES ($1, $2::jsonb, NOW())
         ON CONFLICT (room_id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [hub.roomId, JSON.stringify(hub)],
      );
    },
  };
}
