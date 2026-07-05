import { config } from '../config';
import { listStudentClassesAsync } from './classStore';
import { createTeacherRepo } from './teacherPostgres';

export type ClassAnnouncement = {
  id: string;
  classId: string;
  title: string;
  body: string;
  authorAccountId: string;
  createdAt: string;
};

export type StudentAnnouncementFeedItem = ClassAnnouncement & {
  className: string;
};

const announcementsByClass = new Map<string, ClassAnnouncement[]>();
const pgRepo = createTeacherRepo(config.databaseUrl);

export function listClassAnnouncements(classId: string): ClassAnnouncement[] {
  if (pgRepo) {
    throw new Error('Use listClassAnnouncementsAsync when DATABASE_URL is configured');
  }
  return [...(announcementsByClass.get(classId) ?? [])].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function listClassAnnouncementsAsync(classId: string): Promise<ClassAnnouncement[]> {
  if (pgRepo) return pgRepo.listClassAnnouncements(classId);
  return listClassAnnouncements(classId);
}

export function createClassAnnouncement(
  classId: string,
  payload: { title: string; body: string; authorAccountId: string },
): ClassAnnouncement {
  if (pgRepo) {
    throw new Error('Use createClassAnnouncementAsync when DATABASE_URL is configured');
  }
  const row: ClassAnnouncement = {
    id: `ann_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    classId,
    title: payload.title.trim() || 'Announcement',
    body: payload.body.trim(),
    authorAccountId: payload.authorAccountId,
    createdAt: new Date().toISOString(),
  };
  const list = announcementsByClass.get(classId) ?? [];
  list.unshift(row);
  announcementsByClass.set(classId, list);
  return row;
}

export async function createClassAnnouncementAsync(
  classId: string,
  payload: { title: string; body: string; authorAccountId: string },
): Promise<ClassAnnouncement> {
  if (pgRepo) return pgRepo.createClassAnnouncement(classId, payload);
  return createClassAnnouncement(classId, payload);
}

export function removeClassAnnouncement(classId: string, announcementId: string): boolean {
  if (pgRepo) {
    throw new Error('Use removeClassAnnouncementAsync when DATABASE_URL is configured');
  }
  const list = announcementsByClass.get(classId) ?? [];
  const next = list.filter((a) => a.id !== announcementId);
  if (next.length === list.length) return false;
  announcementsByClass.set(classId, next);
  return true;
}

export async function removeClassAnnouncementAsync(
  classId: string,
  announcementId: string,
): Promise<boolean> {
  if (pgRepo) return pgRepo.removeClassAnnouncement(classId, announcementId);
  return removeClassAnnouncement(classId, announcementId);
}

export async function listStudentAnnouncementsAsync(
  studentEmail: string,
): Promise<StudentAnnouncementFeedItem[]> {
  const rows = await listStudentClassesAsync(studentEmail);
  const feed: StudentAnnouncementFeedItem[] = [];
  for (const { class: cls } of rows) {
    const announcements = await listClassAnnouncementsAsync(cls.id);
    for (const announcement of announcements) {
      feed.push({ ...announcement, className: cls.name });
    }
  }
  feed.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return feed;
}

/** Test helper */
export function resetAnnouncementStore(): void {
  announcementsByClass.clear();
}
