import type { Course, Topic } from '../types';

/** Opaque demo / pipeline topic ids (e.g. t1, t12) — never show raw in UI. */
export function isOpaqueTopicId(ref: string): boolean {
  const t = ref.trim();
  return /^t\d+$/i.test(t) || /^ui-\d+/i.test(t);
}

/** Build id → title map across courses (demo prereqs store ids, not titles). */
export function buildTopicIdTitleMap(courses: Course[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const course of courses) {
    for (const topic of course.topics ?? []) {
      if (topic.id?.trim() && topic.title?.trim()) {
        map.set(topic.id.trim(), topic.title.trim());
      }
    }
  }
  return map;
}

/**
 * Resolve a prerequisite / topic ref to a user-facing title.
 * Returns null when the ref is an unresolved opaque id (hide from UI).
 */
export function resolveTopicRef(
  ref: string,
  idToTitle: Map<string, string>,
): string | null {
  const trimmed = ref.trim();
  if (!trimmed) return null;
  const byId = idToTitle.get(trimmed);
  if (byId) return byId;
  if (isOpaqueTopicId(trimmed)) return null;
  return trimmed;
}

/** Resolve a topic's prerequisite list to unique human titles. */
export function resolveTopicPrerequisiteTitles(
  topic: Topic,
  idToTitle: Map<string, string>,
): string[] {
  const out: string[] = [];
  for (const ref of topic.prerequisites ?? []) {
    const label = resolveTopicRef(ref, idToTitle);
    if (label && !out.includes(label) && label !== topic.title) out.push(label);
  }
  return out;
}
