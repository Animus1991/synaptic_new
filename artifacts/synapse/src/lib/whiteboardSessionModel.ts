/**
 * Whiteboard session view-model — reference formulas, excerpt, and UI metadata
 * for the workspace Whiteboard tool.
 */

import type { Lang } from './i18n';
import {
  extractFormulas,
  relevantExcerpt,
  type ExtractedFormula,
} from './noteContentExtractors';
import { buildLatexStampLibrary } from './whiteboardLatexStamps';
import { isGenericStudyConcept } from './workspaceContentFallback';

export type { ExtractedFormula };

export type WhiteboardSessionContent = {
  formulas: ExtractedFormula[];
  referenceExcerpt: string;
  stampCount: number;
  sectionLabel?: string;
  weakExtraction: boolean;
  passageGrounded: boolean;
  hasSource: boolean;
  hasReferenceContent: boolean;
};

export function filterWhiteboardFormulas(
  formulas: ExtractedFormula[],
  query: string,
): ExtractedFormula[] {
  const q = query.trim().toLowerCase();
  if (!q) return formulas;
  return formulas.filter(
    (f) =>
      f.name.toLowerCase().includes(q)
      || f.formula.toLowerCase().includes(q),
  );
}

export function buildWhiteboardSessionContent(opts: {
  text: string;
  concept: string;
  lang: Lang;
  sectionLabel?: string;
  hasSource: boolean;
}): WhiteboardSessionContent {
  const { text, concept, lang, sectionLabel, hasSource } = opts;

  if (!hasSource) {
    return {
      formulas: [],
      referenceExcerpt: '',
      stampCount: 0,
      sectionLabel,
      weakExtraction: true,
      passageGrounded: false,
      hasSource: false,
      hasReferenceContent: false,
    };
  }

  const formulas = extractFormulas(text, concept);
  const referenceExcerpt = relevantExcerpt(text, concept, 400);
  const stampCount = buildLatexStampLibrary(formulas, lang).length;
  const hasReferenceContent = formulas.length > 0 || referenceExcerpt.trim().length > 40;
  const generic = isGenericStudyConcept(concept);
  const passageGrounded = generic && hasReferenceContent;
  const weakExtraction = generic || formulas.length === 0;

  return {
    formulas,
    referenceExcerpt,
    stampCount,
    sectionLabel,
    weakExtraction,
    passageGrounded,
    hasSource: true,
    hasReferenceContent,
  };
}
