/**
 * Wave 8B-β — Spaced Latin OCR repair (mirror of repairSpacedGreekLine for English tokens).
 */

const LATIN_LETTER = /[A-Za-z]/;

function isSpacedLatinToken(token: string): boolean {
  if (!token || token.length > 2) return false;
  return [...token].every((c) => LATIN_LETTER.test(c));
}

/** Join single-letter Latin runs: "s u p p l y" → "supply". */
export function repairSpacedLatinLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return line;

  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 4) return line;

  const spaced = tokens.filter(isSpacedLatinToken).length;
  if (spaced / tokens.length < 0.35) return line;

  const out: string[] = [];
  let run: string[] = [];

  const flush = () => {
    if (run.length >= 3) out.push(run.join(''));
    else out.push(...run);
    run = [];
  };

  for (const tok of tokens) {
    if (isSpacedLatinToken(tok)) run.push(tok);
    else {
      flush();
      out.push(tok);
    }
  }
  flush();
  return out.join(' ');
}

export function repairSpacedLatinText(text: string): string {
  return text.split('\n').map((line) => repairSpacedLatinLine(line)).join('\n');
}
