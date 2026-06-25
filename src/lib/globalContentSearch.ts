/**
 * Global content search for CommandPalette — courses, topics, glossary, note excerpts.
 */

import type { Course, GlossaryEntry, UploadedFile } from '../types';

export type ContentSearchKind = 'course' | 'topic' | 'glossary' | 'note';

export interface ContentSearchHit {
  id: string;
  kind: ContentSearchKind;
  label: string;
  sublabel?: string;
  courseId?: string;
  concept?: string;
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function excerptAround(text: string, query: string, radius = 60): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx < 0) return text.slice(0, radius * 2).trim();
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + query.length + radius);
  const slice = text.slice(start, end).replace(/\s+/g, ' ').trim();
  return `${start > 0 ? '…' : ''}${slice}${end < text.length ? '…' : ''}`;
}

export function searchUploadedContent(
  query: string,
  courses: Course[],
  uploadedFiles: UploadedFile[],
  glossaryEntries: GlossaryEntry[],
  limit = 10,
): ContentSearchHit[] {
  const q = query.trim();
  if (q.length < 2) return [];

  const nq = norm(q);
  const hits: ContentSearchHit[] = [];
  const seen = new Set<string>();

  const push = (hit: ContentSearchHit) => {
    if (seen.has(hit.id)) return;
    seen.add(hit.id);
    hits.push(hit);
  };

  for (const course of courses) {
    if (course.status === 'generating') continue;
    if (norm(course.title).includes(nq) || norm(course.subject).includes(nq)) {
      push({
        id: `course-${course.id}`,
        kind: 'course',
        label: course.title,
        sublabel: course.subject,
        courseId: course.id,
      });
    }
    for (const topic of course.topics) {
      const title = topic.title.trim();
      if (!title) continue;
      if (norm(title).includes(nq) || (topic.keyConcepts ?? []).some((c) => norm(c).includes(nq))) {
        push({
          id: `topic-${course.id}-${topic.id}`,
          kind: 'topic',
          label: title,
          sublabel: course.title,
          courseId: course.id,
          concept: title,
        });
      }
    }
  }

  for (const g of glossaryEntries) {
    const term = g.term.trim();
    if (!term) continue;
    if (norm(term).includes(nq) || norm(g.definition ?? '').includes(nq)) {
      push({
        id: `glossary-${g.courseId}-${term}`,
        kind: 'glossary',
        label: term,
        sublabel: g.definition?.slice(0, 80),
        courseId: g.courseId,
        concept: term,
      });
    }
  }

  for (const file of uploadedFiles) {
    const text = file.extractedText?.trim();
    if (!text || text.length < 40) continue;
    if (norm(file.name).includes(nq)) {
      push({
        id: `note-name-${file.id}`,
        kind: 'note',
        label: file.name,
        sublabel: excerptAround(text, q),
        courseId: file.courseId,
      });
      continue;
    }
    if (norm(text).includes(nq)) {
      push({
        id: `note-body-${file.id}`,
        kind: 'note',
        label: excerptAround(text, q),
        sublabel: file.name,
        courseId: file.courseId,
      });
    }
  }

  return hits.slice(0, limit);
}
