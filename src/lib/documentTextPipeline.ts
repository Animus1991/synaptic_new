/**
 * Wave 8B-β — Layered document text repair pipeline (Package B).
 *
 * 1 Unicode sanitize (NFKC + PUA/control/icon strip)
 * 2 Presentation flatten (HTML/font metadata)
 * 3 Mojibake repair
 * 4 Structural whitespace / page markers
 * 5 Greek + Latin spaced/glued repair + hyphenation
 * 6 Spell gate (lexicon + fuzzy OCR correction)
 * 7 Final presentation flatten for Reader parity
 */

import { repairGreekDocumentText, repairGreekPhraseCleanup } from './greekTextRepair';
import { repairSpacedLatinText } from './latinTextRepair';
import { flattenReaderPresentation, stripPresentationMarkup } from './presentationSanitizer';
import { applySpellGateDocument } from './spellGate';
import { extendSpellLexicon, resetSpellLexiconForTests } from './spellLexicon';
import { analyzeTextHygiene, type TextHygieneReport } from './textQualityMetrics';
import { sanitizeUnicode } from './textSanitizer';
import { repairUtf8Mojibake } from './utf8MojibakeRepair';

const PAGE_BREAK_MARKER = '--- page break ---';

export type DocumentTextPipelineOptions = {
  glossaryTerms?: string[];
  /** Skip spell gate for hot display-only paths (still runs sanitize + Greek repair). */
  skipSpellGate?: boolean;
};

export type DocumentTextPipelineResult = {
  text: string;
  hygiene: TextHygieneReport;
};

function structuralNormalize(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\f/g, `\n${PAGE_BREAK_MARKER}\n`)
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

/** Full ingestion pipeline for stored extractedText / OCR output. */
export function runDocumentTextPipeline(
  raw: string,
  opts: DocumentTextPipelineOptions = {},
): DocumentTextPipelineResult {
  const glossary = opts.glossaryTerms ?? [];
  resetSpellLexiconForTests();
  if (glossary.length > 0) extendSpellLexicon(glossary);

  const hygieneBefore = analyzeTextHygiene(raw);

  let text = sanitizeUnicode(raw).text;
  text = stripPresentationMarkup(text);
  text = repairUtf8Mojibake(text);
  text = structuralNormalize(text);
  text = repairGreekDocumentText(text);
  text = repairSpacedLatinText(text);

  if (!opts.skipSpellGate) {
    text = applySpellGateDocument(text, glossary).text;
  }

  text = repairGreekPhraseCleanup(text);
  text = flattenReaderPresentation(text);

  const hygiene = analyzeTextHygiene(text);
  return {
    text,
    hygiene: {
      ...hygiene,
      flags: [...new Set([...hygieneBefore.flags, ...hygiene.flags])],
    },
  };
}

/** Reader display path — same core repair, lighter spell pass acceptable. */
export function repairDisplayPipeline(text: string, glossaryTerms: string[] = []): string {
  return runDocumentTextPipeline(text, { glossaryTerms, skipSpellGate: false }).text;
}
