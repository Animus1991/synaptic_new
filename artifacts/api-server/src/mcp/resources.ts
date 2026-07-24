/**
 * MCP resources — expose the signed-in user's courses (and a library summary)
 * as readable resources so AI clients can attach them as context.
 *
 * URI scheme:
 *   synapse://library/summary        — counts across the whole library
 *   synapse://course/{courseId}      — one course outline as JSON
 */
import { getLibraryAsync } from '../store/libraryStore';
import type { McpContext } from './types';

interface StoredLesson {
  id?: string;
  title?: string;
  status?: string;
}
interface StoredTopic {
  id?: string;
  title?: string;
  mastery?: number;
  lessons?: StoredLesson[];
}
interface StoredCourse {
  id?: string;
  title?: string;
  subject?: string;
  mastery?: number;
  totalLessons?: number;
  completedLessons?: number;
  status?: string;
  topics?: StoredTopic[];
}

export interface McpResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface McpResourceContents {
  uri: string;
  mimeType: string;
  text: string;
}

const LIBRARY_SUMMARY_URI = 'synapse://library/summary';
const COURSE_PREFIX = 'synapse://course/';

async function loadCourses(accountId: string): Promise<StoredCourse[]> {
  const library = await getLibraryAsync(accountId);
  return (library.generatedCourses ?? []) as StoredCourse[];
}

export async function listResources(ctx: McpContext): Promise<McpResource[]> {
  const courses = await loadCourses(ctx.account.id);
  const resources: McpResource[] = [
    {
      uri: LIBRARY_SUMMARY_URI,
      name: 'Library summary',
      description: 'Counts of courses, lessons and overall mastery for your Synapse library.',
      mimeType: 'application/json',
    },
  ];
  for (const c of courses) {
    if (!c.id) continue;
    resources.push({
      uri: `${COURSE_PREFIX}${c.id}`,
      name: c.title ?? 'Untitled course',
      description: `${c.subject ?? 'Course'} — ${c.completedLessons ?? 0}/${c.totalLessons ?? 0} lessons`,
      mimeType: 'application/json',
    });
  }
  return resources;
}

export function resourceTemplates() {
  return [
    {
      uriTemplate: `${COURSE_PREFIX}{courseId}`,
      name: 'Course outline',
      description: 'Full topic/lesson outline for one of your courses.',
      mimeType: 'application/json',
    },
  ];
}

export async function readResource(
  ctx: McpContext,
  uri: string,
): Promise<McpResourceContents | { error: string }> {
  const courses = await loadCourses(ctx.account.id);

  if (uri === LIBRARY_SUMMARY_URI) {
    const totalLessons = courses.reduce((s, c) => s + (c.totalLessons ?? 0), 0);
    const completedLessons = courses.reduce((s, c) => s + (c.completedLessons ?? 0), 0);
    const overallMastery =
      courses.length > 0
        ? Math.round((courses.reduce((s, c) => s + (c.mastery ?? 0), 0) / courses.length) * 100) / 100
        : 0;
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify(
        { courseCount: courses.length, totalLessons, completedLessons, overallMastery },
        null,
        2,
      ),
    };
  }

  if (uri.startsWith(COURSE_PREFIX)) {
    const courseId = uri.slice(COURSE_PREFIX.length);
    const course = courses.find((c) => c.id === courseId);
    if (!course) return { error: `Resource not found: ${uri}` };
    const payload = {
      id: course.id,
      title: course.title,
      subject: course.subject,
      mastery: course.mastery,
      completedLessons: course.completedLessons,
      totalLessons: course.totalLessons,
      status: course.status,
      topics: (course.topics ?? []).map((t) => ({
        id: t.id,
        title: t.title,
        mastery: t.mastery,
        lessons: (t.lessons ?? []).map((l) => ({ id: l.id, title: l.title, status: l.status })),
      })),
    };
    return { uri, mimeType: 'application/json', text: JSON.stringify(payload, null, 2) };
  }

  return { error: `Unknown resource URI: ${uri}` };
}
