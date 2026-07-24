/**
 * OPT-AI-C — Library Ask-on-source: draft Agent prompt scoped to one file.
 */

import type { Lang } from './i18n';

export type LibraryAskSourceInput = {
  fileName: string;
  courseTitle?: string;
  conceptHint?: string;
};

export function buildLibraryAskPrompt(input: LibraryAskSourceInput, lang: Lang): string {
  const name = input.fileName.trim() || (lang === 'el' ? 'αυτό το αρχείο' : 'this file');
  const course = input.courseTitle?.trim();
  const concept = input.conceptHint?.trim();

  if (lang === 'el') {
    const bits = [
      `Με βάση την πηγή «${name}»`,
      course ? `(μάθημα «${course}»)` : '',
      concept ? `και εστίαση στην έννοια «${concept}»` : '',
      ', εξήγησέ μου τα βασικά σημεία και πρότεινε πώς να μελετήσω στη συνέχεια.',
    ].filter(Boolean);
    return bits.join(' ').replace(/\s+/g, ' ').trim();
  }

  const bits = [
    `Using the source “${name}”`,
    course ? `(course “${course}”)` : '',
    concept ? `focused on “${concept}”` : '',
    ', explain the key points and suggest what I should study next.',
  ].filter(Boolean);
  return bits.join(' ').replace(/\s+/g, ' ').trim();
}
