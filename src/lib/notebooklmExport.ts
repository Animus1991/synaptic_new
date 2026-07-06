import type { Course, GlossaryEntry, LearnerModel, SpacingData } from '../types';
import { buildStudyGuideMarkdown } from './studyGuideExport';
import { buildFsrsDueQueue } from './leitnerDueQueue';
import { openNotebookLm } from './notebooklmBridge';

export type NotebookLmExportKind = 'study-guide' | 'review-pack' | 'fsrs-due';

export type NotebookLmExportPayload = {
  kind: NotebookLmExportKind;
  title: string;
  markdown: string;
  filename: string;
};

function exportStamp(lang: 'en' | 'el'): string {
  return lang === 'el'
    ? `> Εξαγόμενο από Synapse για NotebookLM · ${new Date().toLocaleDateString('el-GR')}`
    : `> Exported from Synapse for NotebookLM · ${new Date().toLocaleDateString('en-US')}`;
}

function slugify(title: string): string {
  return title.replace(/[^\w\u0370-\u03FF-]+/g, '-').slice(0, 48) || 'export';
}

/** Weak-area review pack markdown for a new NotebookLM notebook. */
export function buildWeakAreaReviewPackMarkdown(
  course: Course,
  weakAreas: { concept: string; mastery: number }[],
  lang: 'en' | 'el',
): string {
  const lines: string[] = [];
  const title = course.title.trim();
  lines.push(`# ${lang === 'el' ? 'Review pack' : 'Review pack'}: ${title}`);
  lines.push('');
  lines.push(exportStamp(lang));
  lines.push('');
  lines.push(
    lang === 'el'
      ? '## Θέματα προς επανάληψη'
      : '## Concepts to review',
  );
  lines.push('');

  const spots = weakAreas.length > 0
    ? weakAreas
    : (course.topics ?? []).slice(0, 5).map((t) => ({
        concept: t.title,
        mastery: t.mastery ?? 50,
      }));

  for (const spot of spots.slice(0, 12)) {
    const pct = Math.round(spot.mastery);
    lines.push(`- [ ] **${spot.concept}** (${lang === 'el' ? 'κυριαρχία' : 'mastery'} ~${pct}%)`);
  }
  lines.push('');
  lines.push(
    lang === 'el'
      ? '## Οδηγίες για NotebookLM'
      : '## NotebookLM prompts',
  );
  lines.push('');
  lines.push(
    lang === 'el'
      ? '- Ρώτα: «Εξήγησε ξανά τις παραπάνω έννοιες με απλά παραδείγματα.»'
      : '- Ask: "Explain the concepts above again with simple examples."',
  );
  lines.push(
    lang === 'el'
      ? '- Δημιούργησε Studio Quiz μόνο για τα unchecked items.'
      : '- Generate a Studio Quiz for the unchecked items only.',
  );
  return lines.join('\n');
}

/** FSRS due checklist note for NotebookLM. */
export function buildFsrsDueChecklistMarkdown(
  spacingIntervals: SpacingData[],
  lang: 'en' | 'el',
  courseTitle?: string,
  conceptFilter?: string,
): string {
  const queue = buildFsrsDueQueue(spacingIntervals, [], conceptFilter ?? '', new Date(), 14, 24);
  const lines: string[] = [];
  const heading = courseTitle?.trim()
    ? `${lang === 'el' ? 'FSRS due' : 'FSRS due'}: ${courseTitle}`
    : lang === 'el' ? 'FSRS due queue' : 'FSRS due queue';
  lines.push(`# ${heading}`);
  lines.push('');
  lines.push(exportStamp(lang));
  lines.push('');
  lines.push(lang === 'el' ? '## Κάρτες προς review' : '## Cards due for review');
  lines.push('');

  if (queue.length === 0) {
    lines.push(lang === 'el' ? '_Δεν υπάρχουν due κάρτες._' : '_No due cards right now._');
  } else {
    for (const item of queue) {
      const dueLabel = item.overdue
        ? lang === 'el' ? 'έληξε' : 'overdue'
        : item.daysUntil === 0
          ? lang === 'el' ? 'σήμερα' : 'today'
          : `${item.daysUntil}d`;
      lines.push(`- [ ] ${item.label} · ${dueLabel}`);
    }
  }
  return lines.join('\n');
}

export function buildNotebookLmExportPayload(
  kind: NotebookLmExportKind,
  opts: {
    course: Course;
    glossary?: GlossaryEntry[];
    learnerModel?: LearnerModel;
    lang: 'en' | 'el';
  },
): NotebookLmExportPayload {
  const { course, glossary = [], learnerModel, lang } = opts;
  const courseWeak = (learnerModel?.weakAreas ?? []).filter(
    (s) => s.courseId === course.id || !s.courseId,
  );

  switch (kind) {
    case 'study-guide':
      return {
        kind,
        title: course.title,
        markdown: buildStudyGuideMarkdown(course, glossary, lang),
        filename: `synapse-nlm-study-guide-${slugify(course.title)}.md`,
      };
    case 'review-pack':
      return {
        kind,
        title: `${course.title} — Review pack`,
        markdown: buildWeakAreaReviewPackMarkdown(
          course,
          courseWeak.map((s) => ({ concept: s.concept, mastery: s.mastery })),
          lang,
        ),
        filename: `synapse-nlm-review-${slugify(course.title)}.md`,
      };
    case 'fsrs-due': {
      const conceptSeed = course.topics[0]?.title ?? course.title;
      return {
        kind,
        title: `${course.title} — FSRS due`,
        markdown: buildFsrsDueChecklistMarkdown(
          learnerModel?.spacingIntervals ?? [],
          lang,
          course.title,
          conceptSeed,
        ),
        filename: `synapse-nlm-fsrs-${slugify(course.title)}.md`,
      };
    }
  }
}

export async function copyMarkdownToClipboard(markdown: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(markdown);
    return true;
  } catch {
    return false;
  }
}

export function downloadMarkdownFile(markdown: string, filename: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Copy export markdown, open NotebookLM, optionally download .md backup. */
export async function exportToNotebookLm(
  payload: NotebookLmExportPayload,
  lang: 'en' | 'el',
  opts?: { download?: boolean },
): Promise<{ copied: boolean }> {
  const copied = await copyMarkdownToClipboard(payload.markdown);
  if (opts?.download !== false) {
    downloadMarkdownFile(payload.markdown, payload.filename);
  }
  await openNotebookLm({ sourceTitle: payload.title, lang });
  return { copied };
}
