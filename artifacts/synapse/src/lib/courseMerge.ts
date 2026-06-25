import type { Course, GlossaryEntry } from '../types';
import { normalizeConcept } from './contentAnalysis';
import type { GeneratedOutline } from './courseGenerator';

function dedupeGlossary(existing: GlossaryEntry[], incoming: GlossaryEntry[]): GlossaryEntry[] {
  const map = new Map(existing.map((g) => [normalizeConcept(g.term), g]));
  for (const g of incoming) {
    const k = normalizeConcept(g.term);
    if (!map.has(k)) map.set(k, g);
  }
  return [...map.values()];
}

/** Build glossary entries from an analyzed outline (shared by upload + reprocess). */
export function buildGlossaryEntriesFromOutline(
  courseId: string,
  outline: GeneratedOutline,
  sourceName: string,
): GlossaryEntry[] {
  const allConcepts = outline.topics.flatMap((t) => t.concepts);
  return outline.glossary.map((g) => {
    const termLower = g.term.toLowerCase();
    const related = allConcepts
      .filter(
        (c) =>
          c.toLowerCase() !== termLower
          && (c.toLowerCase().includes(termLower) || termLower.includes(c.toLowerCase())),
      )
      .slice(0, 5);
    return {
      term: g.term,
      definition: g.definition,
      source: sourceName,
      relatedConcepts: related,
      courseId,
    };
  });
}

/** Replace all glossary rows for one course (reprocess refresh). */
export function replaceCourseGlossary(
  existing: GlossaryEntry[],
  courseId: string,
  refreshed: GlossaryEntry[],
): GlossaryEntry[] {
  return [...existing.filter((g) => g.courseId !== courseId), ...refreshed];
}

/**
 * Merge a newly analyzed outline into an existing user course (incremental upload).
 */
export function mergeOutlineIntoCourse(
  existing: Course,
  outline: GeneratedOutline,
  newSourceFiles: string[],
  existingGlossary: GlossaryEntry[],
  incomingGlossary: GlossaryEntry[],
): { course: Course; glossary: GlossaryEntry[] } {
  const now = Date.now();
  const titleToId = new Map(existing.topics.map((t) => [normalizeConcept(t.title), t.id]));

  for (const t of outline.topics) {
    const key = normalizeConcept(t.title);
    if (!titleToId.has(key)) {
      const id = `ut-${now}-${titleToId.size}`;
      titleToId.set(key, id);
      existing.topics.push({
        id,
        title: t.title,
        description: t.description,
        lessons: [],
        mastery: 0,
        prerequisites: t.prerequisites
          .map((p) => titleToId.get(normalizeConcept(p)))
          .filter((id): id is string => Boolean(id)),
        order: existing.topics.length + 1,
        isLocked: false,
        estimatedMinutes: t.estimatedMinutes,
        conceptCount: t.concepts.length,
        retentionPrediction: 0,
        keyConcepts: t.concepts.slice(0, 8),
        ...(t.objectives?.length ? { objectives: t.objectives } : {}),
      });
    } else {
      const id = titleToId.get(key)!;
      existing.topics = existing.topics.map((topic) =>
        topic.id === id
          ? {
              ...topic,
              description: t.description || topic.description,
              keyConcepts: [...new Set([...(topic.keyConcepts ?? []), ...t.concepts.slice(0, 8)])],
              conceptCount: Math.max(topic.conceptCount, t.concepts.length),
            }
          : topic,
      );
    }
  }

  const scopedExisting = existingGlossary.filter((g) => g.courseId === existing.id);
  const mergedGlossary = dedupeGlossary(
    scopedExisting,
    incomingGlossary.map((g) => ({ ...g, courseId: existing.id })),
  );

  const course: Course = {
    ...existing,
    description: outline.summary || existing.description,
    sourceFiles: [...new Set([...existing.sourceFiles, ...newSourceFiles])],
    topics: [...existing.topics].sort((a, b) => a.order - b.order),
    conceptCount: existing.topics.reduce((s, t) => s + (t.keyConcepts?.length ?? t.conceptCount), 0),
    glossaryCount: mergedGlossary.length,
    exerciseCount: existing.topics.length * 3,
    estimatedHours: Math.max(
      existing.estimatedHours,
      Math.round(existing.topics.reduce((s, t) => s + t.estimatedMinutes, 0) / 60),
    ),
  };

  return { course, glossary: mergedGlossary };
}
