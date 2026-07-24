/**
 * Leitner / flashcards session view-model — cards, weak-extraction flag, and UI metadata
 * for the workspace Flashcards tool.
 */

import type { Lang } from './i18n';
import type { GlossaryEntry, SpacingData, UploadedFile } from '../types';
import type { ContentCitation } from './contentCitation';
import type { CustomLeitnerCard } from './leitnerCustomCards';
import {
  inferLeitnerCardType,
  type LeitnerCardType,
  withLeitnerCardType,
} from './leitnerCardTypes';
import { buildFlashcards, relevantExcerpt } from './noteContentExtractors';
import { isGenericStudyConcept } from './workspaceContentFallback';
import { filterLeitnerCardsByConfidence } from './confidenceGating';
import { buildOcclusionCardsFromFiles } from './imageOcclusionCards';
import type { ImageOcclusionPayload } from './imageOcclusionCards';

export type LeitnerCard = {
  front: string;
  back: string;
  source?: CustomLeitnerCard['source'];
  cardType?: LeitnerCardType;
  citation?: ContentCitation;
  occlusion?: ImageOcclusionPayload;
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
        seen.set(key, withLeitnerCardType({
          ...prev,
          ...card,
          source: card.source ?? prev.source,
          cardType: card.cardType ?? prev.cardType,
          citation: card.citation ?? prev.citation,
          occlusion: card.occlusion ?? prev.occlusion,
        }));
      } else {
        seen.set(key, withLeitnerCardType(card));
      }
    }
  }
  return [...seen.values()];
}

/** Pull a concise, concept-relevant sentence from the notes for a flashcard back. */
function groundedSpacingBack(text: string, concept: string): string | null {
  const probe = concept.trim().toLowerCase().slice(0, 6);
  if (!probe) return null;
  const excerpt = relevantExcerpt(text, concept, 600).replace(/\s+/g, ' ').trim();
  if (excerpt.length < 12 || !excerpt.toLowerCase().includes(probe)) return null;
  const sentences = excerpt
    .split(/(?<=[.;!·])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 12);
  const pick = sentences.find((s) => s.toLowerCase().includes(probe)) ?? sentences[0] ?? excerpt;
  return pick.slice(0, 240);
}

/**
 * Build flashcards for concepts DUE in the FSRS schedule that overlap the active
 * concept. The back must be real study content — a glossary definition if
 * available, otherwise a grounded sentence from the learner's own notes. A due
 * concept with no grounded back is EXCLUDED: we never fake an answer like
 * "next review in N days" (the due date already lives in the spacing heatmap).
 */
export function buildSpacingLeitnerCards(
  spacingIntervals: SpacingData[],
  concept: string,
  glossary: GlossaryEntry[],
  text = '',
): LeitnerCard[] {
  const conceptLower = concept.toLowerCase();
  return spacingIntervals
    .filter((s) => {
      const sLower = s.concept.toLowerCase();
      return sLower.includes(conceptLower.slice(0, 5))
        || conceptLower.includes(sLower.slice(0, 5));
    })
    .map((s): LeitnerCard | null => {
      const glossaryDef = glossary.find((g) =>
        g.term.toLowerCase().includes(s.concept.toLowerCase().slice(0, 6)),
      )?.definition;
      const back = glossaryDef ?? groundedSpacingBack(text, s.concept);
      if (!back) return null;
      return { front: s.concept, back };
    })
    .filter((card): card is LeitnerCard => card !== null);
}

export function filterLeitnerCards(cards: LeitnerCard[], query: string): LeitnerCard[] {
  const q = query.trim().toLowerCase();
  if (!q) return cards;
  return cards.filter(
    (card) => card.front.toLowerCase().includes(q) || card.back.toLowerCase().includes(q),
  );
}

export function filterLeitnerCardsByType(
  cards: LeitnerCard[],
  type: LeitnerCardType | 'all',
): LeitnerCard[] {
  if (type === 'all') return cards;
  return cards.filter((card) => inferLeitnerCardType(card) === type);
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
  sourceFiles?: UploadedFile[];
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
    sourceFiles = [],
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

  const fromNotes = buildFlashcards(text, concept, glossary, lang, sourceFiles);
  const fromSpacing = buildSpacingLeitnerCards(spacingIntervals, concept, glossary, lang);
  const fromOcclusion = buildOcclusionCardsFromFiles(sourceFiles, lang);
  const cards = filterLeitnerCardsByConfidence(
    mergeLeitnerCards(customCards, fromSpacing, fromNotes, fromOcclusion),
  );
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
