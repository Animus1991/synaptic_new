/**
 * Leitner / flashcards session view-model — cards, weak-extraction flag, and UI metadata
 * for the workspace Flashcards tool.
 */

import type { Lang } from './i18n';
import type { GlossaryEntry, SpacingData } from '../types';
import type { CustomLeitnerCard } from './leitnerCustomCards';
import { buildFlashcards } from './noteContentExtractors';
import { isGenericStudyConcept } from './workspaceContentFallback';
import { filterLeitnerCardsByConfidence } from './confidenceGating';

export type LeitnerCard = {
  front: string;
  back: string;
  source?: CustomLeitnerCard['source'];
};

export type LeitnerSessionContent = {
  cards: LeitnerCard[];
  sectionLabel?: string;
  weakExtraction: boolean;
  passageGrounded: boolean;
  hasSource: boolean;
};

export function mergeLeitnerCards(...sources: LeitnerCard[][]): LeitnerCard[] {
  const seen = new Map<string, LeitnerCard>();
  for (const source of sources) {
    for (const card of source) {
      const key = card.front.trim().toLowerCase();
      if (!key) continue;
      const prev = seen.get(key);
      if (prev) {
        seen.set(key, { ...prev, ...card, source: card.source ?? prev.source });
      } else {
        seen.set(key, card);
      }
    }
  }
  return [...seen.values()];
}

export function buildSpacingLeitnerCards(
  spacingIntervals: SpacingData[],
  concept: string,
  glossary: GlossaryEntry[],
  lang: Lang,
): LeitnerCard[] {
  const conceptLower = concept.toLowerCase();
  return spacingIntervals
    .filter((s) => {
      const sLower = s.concept.toLowerCase();
      return sLower.includes(conceptLower.slice(0, 5))
        || conceptLower.includes(sLower.slice(0, 5));
    })
    .map((s) => ({
      front: s.concept,
      back: glossary.find((g) =>
        g.term.toLowerCase().includes(s.concept.toLowerCase().slice(0, 6)),
      )?.definition
        ?? (lang === 'el'
          ? `Επόμενη επανάληψη σε ${Math.round(s.interval)} ημέρες`
          : `Next review in ${Math.round(s.interval)} days`),
    }));
}

export function filterLeitnerCards(cards: LeitnerCard[], query: string): LeitnerCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return cards;
  return cards.filter(
    (card) => card.front.toLowerCase().includes(q) || card.back.toLowerCase().includes(q),
  );
}

export function buildLeitnerSessionContent(opts: {
  text: string;
  concept: string;
  glossary: GlossaryEntry[];
  lang: Lang;
  sectionLabel?: string;
  hasSource: boolean;
  spacingIntervals?: SpacingData[];
  customCards?: LeitnerCard[];
}): LeitnerSessionContent {
  const {
    text,
    concept,
    glossary,
    lang,
    sectionLabel,
    hasSource,
    spacingIntervals = [],
    customCards = [],
  } = opts;

  if (!hasSource) {
    return {
      cards: [],
      sectionLabel,
      weakExtraction: true,
      passageGrounded: false,
      hasSource: false,
    };
  }

  const fromNotes = buildFlashcards(text, concept, glossary, lang);
  const fromSpacing = buildSpacingLeitnerCards(spacingIntervals, concept, glossary, lang);
  const cards = filterLeitnerCardsByConfidence(mergeLeitnerCards(fromSpacing, fromNotes, customCards));
  const generic = isGenericStudyConcept(concept);
  const passageGrounded = generic && fromNotes.length > 0;
  const weakExtraction = generic || cards.length === 0 || glossary.length < 2;

  return {
    cards,
    sectionLabel,
    weakExtraction,
    passageGrounded,
    hasSource: true,
  };
}
