import { t, type I18nKey, type Lang } from './i18n';
import type { CustomLeitnerCard } from './leitnerCustomCards';

type CardSource = NonNullable<CustomLeitnerCard['source']>;

const SOURCE_KEYS: Record<CardSource, I18nKey> = {
  scratchpad: 'leitnerCardSourceScratchpad',
  'reader-selection': 'leitnerCardSourceReaderSelection',
  'reader-occlusion': 'leitnerCardSourceReaderOcclusion',
  'concept-map': 'leitnerCardSourceConceptMap',
  'quiz-mistake': 'leitnerCardSourceQuizMistake',
  'quiz-selection': 'leitnerCardSourceQuizSelection',
  compare: 'leitnerCardSourceCompare',
  debate: 'leitnerCardSourceDebate',
};

export function leitnerCardSourceLabel(
  source: CustomLeitnerCard['source'],
  lang: Lang,
): string | null {
  if (!source) return null;
  const key = SOURCE_KEYS[source];
  return key ? t(key, lang) : null;
}
