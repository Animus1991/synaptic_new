/**
 * Feynman session view-model — passage-grounded outline, key terms, and
 * reference excerpt for the workspace Feynman tool.
 */

import type { Lang } from './i18n';
import type { GlossaryEntry, Topic } from '../types';
import {
  buildFeynmanGaps,
  buildFeynmanGapTerms,
  buildFeynmanOutline,
  conceptRelevanceScore,
  relevantExcerpt,
} from './noteContentExtractors';
import { buildFallbackFeynmanOutline, isGenericStudyConcept } from './workspaceContentFallback';
import { rankKeyphrases, titleCasePhrase } from './contentAnalysis';

export type FeynmanKeyTerm = {
  term: string;
  definition?: string;
};

export type FeynmanSessionContent = {
  outline: string[];
  gapHints: string[];
  gapTerms: string[];
  placeholder: string;
  referenceExcerpt: string;
  keyTerms: FeynmanKeyTerm[];
  sectionLabel?: string;
  weakExtraction: boolean;
  minWordsForRubric: number;
};

function buildKeyTerms(
  glossary: GlossaryEntry[],
  concept: string,
  text: string,
): FeynmanKeyTerm[] {
  const fromGlossary: FeynmanKeyTerm[] = glossary
    .filter((g) => conceptRelevanceScore(g.term, concept) > 0.2)
    .slice(0, 4)
    .map((g) => ({ term: g.term, definition: g.definition.slice(0, 120) }));

  if (fromGlossary.length >= 2) return fromGlossary;

  const phrases = rankKeyphrases(relevantExcerpt(text, concept, 6000), 4)
    .map((p) => titleCasePhrase(p.phrase))
    .filter((p) => p.length > 3 && !isGenericStudyConcept(p));

  const seen = new Set(fromGlossary.map((g) => g.term.toLowerCase()));
  for (const phrase of phrases) {
    if (seen.has(phrase.toLowerCase())) continue;
    fromGlossary.push({ term: phrase });
    seen.add(phrase.toLowerCase());
    if (fromGlossary.length >= 4) break;
  }

  return fromGlossary;
}

function shouldUsePassageOutline(concept: string, topic?: Topic): boolean {
  if (isGenericStudyConcept(concept)) return true;
  if (!topic) return true;
  return conceptRelevanceScore(topic.title, concept) < 0.45;
}

export function buildFeynmanSessionContent(opts: {
  concept: string;
  text: string;
  lang: Lang;
  topic?: Topic;
  glossary: GlossaryEntry[];
  sectionLabel?: string;
  hasSource: boolean;
}): FeynmanSessionContent {
  const { concept, text, lang, topic, glossary, sectionLabel, hasSource } = opts;
  const isEl = lang === 'el';
  const minWordsForRubric = 8;

  if (!hasSource) {
    return {
      outline: isEl
        ? [`Ανέβασε τις σημειώσεις σου για το «${concept}»`, 'Μετά εξήγησε με δικά σου λόγια μόνο από το υλικό σου']
        : [`Upload your notes for «${concept}»`, 'Then explain in your own words using only your material'],
      gapHints: isEl
        ? ['Χωρίς ανεβασμένο υλικό δεν μπορούμε να ελέγξουμε ακρίβεια — ανέβασε πρώτα τις σημειώσεις.']
        : ['Without uploaded material we cannot verify accuracy — upload your notes first.'],
      gapTerms: [],
      placeholder: isEl
        ? `Εξήγησε το «${concept}» — ανέβασε πρώτα τις σημειώσεις σου.`
        : `Explain «${concept}» — upload your notes first.`,
      referenceExcerpt: '',
      keyTerms: [],
      sectionLabel,
      weakExtraction: true,
      minWordsForRubric,
    };
  }

  const weakExtraction = shouldUsePassageOutline(concept, topic);
  const outline = weakExtraction
    ? buildFallbackFeynmanOutline(text, concept, sectionLabel, lang)
    : buildFeynmanOutline(topic, text, concept, lang);

  const referenceExcerpt = relevantExcerpt(text, concept, 2500);
  const keyTerms = buildKeyTerms(glossary, concept, text);

  return {
    outline,
    gapHints: buildFeynmanGaps(glossary, concept, lang),
    gapTerms: buildFeynmanGapTerms(glossary, concept),
    placeholder: isEl
      ? `Εξήγησε το «${concept}» με απλά λόγια, βασιζόμενος/η μόνο στις σημειώσεις σου…`
      : `Explain «${concept}» simply, using only your uploaded notes…`,
    referenceExcerpt,
    keyTerms,
    sectionLabel,
    weakExtraction,
    minWordsForRubric,
  };
}
