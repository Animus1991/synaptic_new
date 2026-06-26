/**
 * Wave 8B-β — Per-token spell gate: validate words after spacing repair; fuzzy-correct OCR typos.
 */

import { fuzzyCorrectToken } from './miniSymSpell';
import { detectParagraphLang } from './paragraphLangDetect';
import { extendSpellLexicon, isKnownWord } from './spellLexicon';
import { viterbiRepairGluedTokens } from './viterbiWordSegment';

const TOKEN_SPLIT = /(\s+|[^\p{L}\p{N}'’-]+)/u;

const CHAT_SPEAKER_LINE =
  /^(?:(?:user|assistant|system)\s*:\s*|(?:Q|A|Question|Answer|Ερώτηση|Απάντηση)\s*:\s*)/i;

const PAGE_BREAK_MARKER = '--- page break ---';

/** PDF fixed-gap columns use 3+ spaces as gutters — never OCR-repair those lines. */
function lineHasFixedGapTableGutter(line: string): boolean {
  return / {3,}/.test(line);
}

export type SpellGateReport = {
  tokensChecked: number;
  unknownBefore: number;
  corrected: number;
};

export function applySpellGateLine(line: string, glossaryTerms: string[] = []): string {
  if (!line.trim()) return line;
  if (lineHasFixedGapTableGutter(line)) return line;
  if (CHAT_SPEAKER_LINE.test(line.trim())) return line;
  if (line.trim() === PAGE_BREAK_MARKER) return line;
  if (glossaryTerms.length > 0) extendSpellLexicon(glossaryTerms);

  const lang = detectParagraphLang(line);
  let working = viterbiRepairGluedTokens(line, lang);

  const parts = working.split(TOKEN_SPLIT);
  const out: string[] = [];

  for (const part of parts) {
    if (!part || /^\s+$/.test(part) || /^[^\p{L}]+$/u.test(part)) {
      out.push(part);
      continue;
    }
    if (isKnownWord(part, lang)) {
      out.push(part);
      continue;
    }
    const fixed = fuzzyCorrectToken(part, lang);
    out.push(fixed ?? part);
  }

  return out.join('');
}

export function applySpellGateDocument(text: string, glossaryTerms: string[] = []): {
  text: string;
  report: SpellGateReport;
} {
  if (glossaryTerms.length > 0) extendSpellLexicon(glossaryTerms);

  let tokensChecked = 0;
  let unknownBefore = 0;
  let corrected = 0;

  const lines = text.split('\n');
  const repaired = lines.map((line) => {
    const lang = detectParagraphLang(line);
    const tokens = line.match(/[\p{L}][\p{L}\p{N}'’-]*/gu) ?? [];
    for (const tok of tokens) {
      if (tok.length < 3) continue;
      tokensChecked += 1;
      if (!isKnownWord(tok, lang)) unknownBefore += 1;
    }
    const before = line;
    const after = applySpellGateLine(line, glossaryTerms);
    if (after !== before) corrected += 1;
    return after;
  });

  return {
    text: repaired.join('\n'),
    report: { tokensChecked, unknownBefore, corrected },
  };
}
