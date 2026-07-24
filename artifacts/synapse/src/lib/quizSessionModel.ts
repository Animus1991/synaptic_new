/**
 * Quiz session view-model — items, weak-extraction flag, and UI metadata
 * for the workspace Quiz tool.
 */

import type { Lang } from './i18n';
import type { GlossaryEntry, UploadedFile } from '../types';
import { buildQuizSession, type QuizSessionItem } from './quizSession';
import { filterQuizSessionItems } from './confidenceGating';
import { isGenericStudyConcept } from './workspaceContentFallback';

export type { QuizSessionItem };

export type QuizSessionContent = {
  items: QuizSessionItem[];
  sectionLabel?: string;
  weakExtraction: boolean;
  passageGrounded: boolean;
  hasSource: boolean;
};

export function quizItemQuestion(item: QuizSessionItem): string {
  return 'question' in item.quiz ? item.quiz.question : '';
}

export function filterQuizItems(items: QuizSessionItem[], query: string): QuizSessionItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => quizItemQuestion(item).toLowerCase().includes(q));
}

export function buildQuizSessionContent(opts: {
  text: string;
  concept: string;
  glossary: GlossaryEntry[];
  lang: Lang;
  ability: number;
  mastery: number;
  sectionLabel?: string;
  hasSource: boolean;
  count?: number;
  sourceFiles?: UploadedFile[];
}): QuizSessionContent {
  const {
    text,
    concept,
    glossary,
    lang,
    ability,
    mastery,
    sectionLabel,
    hasSource,
    count = 3,
    sourceFiles = [],
  } = opts;

  if (!hasSource) {
    return {
      items: [],
      sectionLabel,
      weakExtraction: true,
      passageGrounded: false,
      hasSource: false,
    };
  }

  const rawItems = buildQuizSession(text, concept, glossary, lang, ability, mastery, count, sourceFiles);
  const items = filterQuizSessionItems(rawItems);
  const generic = isGenericStudyConcept(concept);
  const passageGrounded = generic && items.length > 0;
  const weakExtraction = generic || items.length === 0 || glossary.length < 2;

  return {
    items,
    sectionLabel,
    weakExtraction,
    passageGrounded,
    hasSource: true,
  };
}
