import type { Course, GlossaryEntry } from '../types';

/** Build a NotebookLM-style markdown study guide from course structure + glossary. */
export function buildStudyGuideMarkdown(
  course: Course,
  glossary: GlossaryEntry[],
  lang: 'en' | 'el',
): string {
  const lines: string[] = [];
  const title = course.title.trim();
  lines.push(`# ${lang === 'el' ? 'Οδηγός μελέτης' : 'Study guide'}: ${title}`);
  lines.push('');
  lines.push(
    lang === 'el'
      ? `> Εξαγόμενο από Synapse · ${new Date().toLocaleDateString('el-GR')}`
      : `> Exported from Synapse · ${new Date().toLocaleDateString('en-US')}`,
  );
  lines.push('');

  if (course.description?.trim()) {
    lines.push(`## ${lang === 'el' ? 'Επισκόπηση' : 'Overview'}`);
    lines.push('');
    lines.push(course.description.trim());
    lines.push('');
  }

  const courseGlossary = glossary.filter((g) => g.courseId === course.id);
  if (courseGlossary.length > 0) {
    lines.push(`## ${lang === 'el' ? 'Γλωσσάρι' : 'Glossary'}`);
    lines.push('');
    for (const entry of courseGlossary.slice(0, 80)) {
      lines.push(`- **${entry.term}** — ${entry.definition}`);
    }
    lines.push('');
  }

  lines.push(`## ${lang === 'el' ? 'Θέματα' : 'Topics'}`);
  lines.push('');
  for (const topic of course.topics ?? []) {
    lines.push(`### ${topic.title}`);
    lines.push('');
    if (topic.description?.trim()) {
      lines.push(topic.description.trim());
      lines.push('');
    }
    const concepts = topic.keyConcepts ?? [];
    if (concepts.length > 0) {
      lines.push(lang === 'el' ? '**Έννοιες:**' : '**Concepts:**');
      for (const c of concepts.slice(0, 20)) {
        lines.push(`- ${c}`);
      }
      lines.push('');
    }
    if (topic.lessons?.length) {
      lines.push(lang === 'el' ? '**Μαθήματα:**' : '**Lessons:**');
      for (const lesson of topic.lessons) {
        lines.push(`- ${lesson.title}`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push(
    lang === 'el'
      ? '*Άνοιξε το workspace για quiz, κάρτες και Agent.*'
      : '*Open the workspace for quizzes, flashcards, and Agent.*',
  );
  return lines.join('\n');
}

export function downloadStudyGuideMarkdown(
  course: Course,
  glossary: GlossaryEntry[],
  lang: 'en' | 'el',
): void {
  const content = buildStudyGuideMarkdown(course, glossary, lang);
  const slug = course.title.replace(/[^\w\u0370-\u03FF-]+/g, '-').slice(0, 48) || 'course';
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `synapse-study-guide-${slug}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
