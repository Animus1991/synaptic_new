/**
 * Bibliography / reference block detection for the Cognitive Reader.
 * PDFs often flatten reading lists into single lines or bracket-numbered refs.
 */

const BIBLIOGRAPHY_HEADING =
  /^(?:bibliograph(?:y|ies)|references?|πηγ(?:ές|ες)|βιβλιογραφία|suggested\s+reading|further\s+reading|recommended\s+reading|ανάγνωση|αναγνωση)/i;

const BRACKET_REF_START = /^\[\d{1,3}\]\s+/;
const PAREN_REF_START = /^\(\d{1,3}\)\s+/;
const NUMBERED_REF_START = /^\d{1,3}[.)]\s+(?=[A-ZΑ-Ω"'«])/;

const CITATION_SIGNAL =
  /\(\d{4}[a-z]?\)|,\s*\d{4}[.)]|\b(?:pp?\.|vol\.|ISBN|ISSN|doi:|https?:\/\/doi\.)/i;

export function isBibliographyHeading(heading: string | undefined): boolean {
  if (!heading) return false;
  const line = (heading.trim().replace(/^#{1,6}\s*/, '').split('\n')[0] ?? heading).trim();
  return BIBLIOGRAPHY_HEADING.test(line);
}

export function looksLikeCitationLine(line: string): boolean {
  const t = line.trim();
  if (t.length < 18) return false;
  if (BRACKET_REF_START.test(t) || PAREN_REF_START.test(t)) return true;
  if (NUMBERED_REF_START.test(t) && CITATION_SIGNAL.test(t)) return true;
  if (CITATION_SIGNAL.test(t) && /[A-ZΑ-Ω][a-zα-ω]{2,}/.test(t)) return true;
  if (/^[A-ZΑ-Ω][^.]{2,48},\s+[A-ZΑ-Ω]/.test(t) && /\d{4}/.test(t)) return true;
  return false;
}

function isBibliographyStartLine(line: string): boolean {
  return (
    BRACKET_REF_START.test(line)
    || PAREN_REF_START.test(line)
    || NUMBERED_REF_START.test(line)
  );
}

/** Fold wrapped continuation lines into one entry per reference. */
export function foldBibliographyLines(lines: string[]): string[] {
  const trimmed = lines.map((l) => l.trim()).filter(Boolean);
  if (trimmed.length === 0) return [];

  const standaloneCitations =
    trimmed.every(looksLikeCitationLine) && !trimmed.some(isBibliographyStartLine);
  if (standaloneCitations) return trimmed;

  const items: string[] = [];
  let group: string[] = [];

  const flush = () => {
    if (group.length === 0) return;
    items.push(group.join(' ').replace(/\s+/g, ' ').trim());
    group = [];
  };

  for (const line of trimmed) {
    if (isBibliographyStartLine(line) && group.length > 0) flush();
    group.push(line);
  }
  flush();

  return items;
}

/**
 * Detect a bibliography / reference list in plain text.
 * Returns cleaned entries when confident, else null.
 */
export function detectBibliographyItems(body: string): string[] | null {
  const lines = body.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return null;

  const citationLines = lines.filter(looksLikeCitationLine);
  if (citationLines.length >= 2 && citationLines.length / lines.length >= 0.55) {
    const folded = foldBibliographyLines(lines);
    return folded.length >= 2 ? folded : null;
  }

  const bracketStarts = lines.filter((l) => BRACKET_REF_START.test(l) || PAREN_REF_START.test(l));
  if (bracketStarts.length >= 2) {
    const folded = foldBibliographyLines(lines);
    return folded.length >= 2 ? folded : null;
  }

  return null;
}

export function isBibliographyBlock(heading: string | undefined, body: string): boolean {
  if (isBibliographyHeading(heading)) return true;
  return detectBibliographyItems(body) !== null;
}
