import { t, type I18nKey, type Lang } from './i18n';
import type { CustomLeitnerCard } from './leitnerCustomCards';

export type LeitnerCardType = 'term' | 'definition' | 'cloze' | 'formula' | 'mistake' | 'occlusion';

export const LEITNER_CARD_TYPES: LeitnerCardType[] = [
  'term',
  'definition',
  'cloze',
  'formula',
  'mistake',
  'occlusion',
];

type CardLike = Pick<CustomLeitnerCard, 'front' | 'back' | 'source' | 'cardType'>;

const FORMULA_RE = /(?:\$[^$]+\$|\\\(|\\\[|[=≈≠≤≥±∑∫√×÷]|\s\/\s|\b\d+\s*[+\-*/]\s*\d+\b)/;
const CLOZE_RE = /\{\{[^}]+\}\}|\[\.\.\.\]|\[\s*\]/;

const TYPE_KEYS: Record<LeitnerCardType, I18nKey> = {
  term: 'leitnerCardTypeTerm',
  definition: 'leitnerCardTypeDefinition',
  cloze: 'leitnerCardTypeCloze',
  formula: 'leitnerCardTypeFormula',
  mistake: 'leitnerCardTypeMistake',
  occlusion: 'leitnerCardTypeOcclusion',
};

export function leitnerCardTypeLabel(type: LeitnerCardType, lang: Lang): string {
  return t(TYPE_KEYS[type], lang);
}

export function inferLeitnerCardType(card: CardLike): LeitnerCardType {
  if (card.cardType) return card.cardType;
  if (card.source === 'quiz-mistake') return 'mistake';

  const front = card.front.trim();
  const back = card.back.trim();
  const combined = `${front}\n${back}`;

  if (CLOZE_RE.test(front)) return 'cloze';
  if (FORMULA_RE.test(combined)) return 'formula';

  const frontShort = front.length <= 64;
  const backLong = back.length >= front.length + 12;
  if (frontShort && backLong && !front.includes('?')) return 'definition';

  return 'term';
}

export function withLeitnerCardType<T extends CardLike>(card: T): T & { cardType: LeitnerCardType } {
  return { ...card, cardType: inferLeitnerCardType(card) };
}

export function countLeitnerCardsByType(
  cards: CardLike[],
): Record<LeitnerCardType, number> {
  const counts = Object.fromEntries(LEITNER_CARD_TYPES.map((t) => [t, 0])) as Record<
    LeitnerCardType,
    number
  >;
  for (const card of cards) {
    counts[inferLeitnerCardType(card)] += 1;
  }
  return counts;
}
