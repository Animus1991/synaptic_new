import type { Lang } from './i18n';
import type { CustomLeitnerCard } from './leitnerCustomCards';

type CardSource = NonNullable<CustomLeitnerCard['source']>;

const EN: Record<CardSource, string> = {
  scratchpad: 'Scratchpad',
  'reader-selection': 'Reader',
  'concept-map': 'Concept map',
  'quiz-mistake': 'Quiz mistake',
  'quiz-selection': 'Quiz',
  compare: 'Compare',
  debate: 'Debate',
};

const EL: Record<CardSource, string> = {
  scratchpad: 'Πρόχειρο',
  'reader-selection': 'Reader',
  'concept-map': 'Χάρτης',
  'quiz-mistake': 'Λάθος κουίζ',
  'quiz-selection': 'Κουίζ',
  compare: 'Σύγκριση',
  debate: 'Συζήτηση',
};

export function leitnerCardSourceLabel(
  source: CustomLeitnerCard['source'],
  lang: Lang,
): string | null {
  if (!source) return null;
  return (lang === 'el' ? EL : EN)[source] ?? null;
}
