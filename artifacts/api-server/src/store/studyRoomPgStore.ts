import { Pool } from 'pg';
import {
  createStudyRoom,
  hydrateStudyRoom,
  listStudyRoomSnapshots,
  type StudyRoomSnapshot,
} from './studyRoomStore';

export function createStudyRoomPgRepo(databaseUrl: string) {
  const pool = new Pool({ connectionString: databaseUrl });

  return {
    async loadAll(): Promise<StudyRoomSnapshot[]> {
      const res = await pool.query<{
        id: string;
        course_id: string;
        name: string;
        invite_code: string;
        jitsi_room: string;
        shared_tool: string | null;
        shared_concept: string | null;
        whiteboard_version: number;
        created_at: Date;
      }>('SELECT * FROM study_rooms ORDER BY created_at ASC');
      return res.rows.map((row) => ({
        id: row.id,
        courseId: row.course_id,
        name: row.name,
        inviteCode: row.invite_code,
        jitsiRoom: row.jitsi_room,
        members: [],
        sharedTool: row.shared_tool ?? undefined,
        sharedConcept: row.shared_concept ?? undefined,
        whiteboardVersion: row.whiteboard_version,
        version: 1,
        createdAt: row.created_at.toISOString(),
      }));
    },

    async upsert(room: StudyRoomSnapshot): Promise<void> {
      await pool.query(
        `INSERT INTO study_rooms (id, course_id, name, invite_code, jitsi_room, shared_tool, shared_concept, whiteboard_version, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           shared_tool = EXCLUDED.shared_tool,
           shared_concept = EXCLUDED.shared_concept,
           whiteboard_version = EXCLUDED.whiteboard_version`,
        [
          room.id,
          room.courseId,
          room.name,
          room.inviteCode,
          room.jitsiRoom,
          room.sharedTool ?? null,
          room.sharedConcept ?? null,
          room.whiteboardVersion ?? 0,
          room.createdAt,
        ],
      );
    },
  };
}

export async function bootstrapStudyRoomsFromPg(databaseUrl: string | undefined): Promise<void> {
  if (!databaseUrl?.trim()) return;
  const repo = createStudyRoomPgRepo(databaseUrl);
  const existing = await repo.loadAll();
  if (existing.length === 0) return;
  for (const room of existing) hydrateStudyRoom(room);
}

export function persistStudyRoom(databaseUrl: string | undefined, room: StudyRoomSnapshot): void {
  if (!databaseUrl?.trim()) return;
  void createStudyRoomPgRepo(databaseUrl).upsert(room).catch((err) => {
    console.warn('[study-rooms] persist failed', err);
  });
}

export function createStudyRoomPersisted(
  databaseUrl: string | undefined,
  courseId: string,
  name: string,
): StudyRoomSnapshot {
  const room = createStudyRoom(courseId, name);
  persistStudyRoom(databaseUrl, room);
  return room;
}

export function exportStudyRoomsForDebug(): StudyRoomSnapshot[] {
  return listStudyRoomSnapshots();
}
