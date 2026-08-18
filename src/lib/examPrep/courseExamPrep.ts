import type { GlossaryEntry } from '../../types';
import { extractNotesOutline } from '../notesOutline';

export type CourseExamMethod = {
  id: string;
  title: string;
  summary: string;
};

export type CourseExamPrepModel = {
  methods: CourseExamMethod[];
  glossary: Array<{ term: string; definition: string }>;
  hasCourseContent: boolean;
};

function looksLikeCs(text: string): boolean {
  return /algorithm|binary search|bfs|dfs|stack|queue|sort|pointer|γλώσσα|αλγόριθμ/i.test(text);
}

export function buildCourseExamPrepModel(opts: {
  courseTitle?: string;
  concept?: string;
  glossary?: readonly GlossaryEntry[];
  notes?: string;
  lang?: 'en' | 'el';
}): CourseExamPrepModel {
  const lang = opts.lang ?? 'en';
  const glossary = (opts.glossary ?? [])
    .filter((g) => g.term.trim() && g.definition.trim().length >= 12)
    .slice(0, 12)
    .map((g) => ({ term: g.term.trim(), definition: g.definition.trim().slice(0, 280) }));

  const outline = extractNotesOutline(opts.notes ?? '', 16);
  const headings = outline
    .split('\n')
    .map((line) => line.replace(/^#{1,6}\s+/, '').replace(/^\d+[.)]\s+/, '').replace(/:$/, '').trim())
    .filter((line) => line.length >= 3 && line.length <= 80)
    .slice(0, 8);

  const methods: CourseExamMethod[] = (headings.length >= 2 ? headings : []).map((title, i) => ({
    id: `course-method-${i}`,
    title,
    summary: lang === 'el'
      ? `Από τις σημειώσεις${opts.courseTitle ? ` του «${opts.courseTitle}»` : ''}${opts.concept ? ` · ${opts.concept}` : ''}.`
      : `From your notes${opts.courseTitle ? ` in “${opts.courseTitle}”` : ''}${opts.concept ? ` · ${opts.concept}` : ''}.`,
  }));

  return {
    methods,
    glossary,
    hasCourseContent: methods.length > 0 || glossary.length > 0,
  };
}

export function courseLooksLikeInformatics(opts: {
  courseTitle?: string;
  concept?: string;
  notes?: string;
}): boolean {
  return looksLikeCs(`${opts.courseTitle ?? ''} ${opts.concept ?? ''} ${opts.notes ?? ''}`.slice(0, 4000));
}
